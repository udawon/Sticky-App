-- 알람 기능 v2 마이그레이션
-- 실행 위치: Supabase SQL Editor
-- 목적: notifications.type 컬럼 추가 + 자동 알람 트리거 3개

-- ─────────────────────────────────────────────
-- 1. type 컬럼 추가
-- ─────────────────────────────────────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';

-- ─────────────────────────────────────────────
-- 2. 트리거 A — 과제 생성 시 담당자 알람
--    조건: tasks INSERT + assigned_to 배열의 각 멤버 (생성자 제외)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  assignee_id UUID;
BEGIN
  FOREACH assignee_id IN ARRAY COALESCE(NEW.assigned_to, ARRAY[]::UUID[])
  LOOP
    IF assignee_id <> NEW.created_by THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        assignee_id,
        'task_assigned',
        '새 과제가 배정되었습니다',
        '과제 "' || NEW.title || '"의 담당자로 지정되었습니다.',
        '/tasks'
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_insert_notify ON tasks;
CREATE TRIGGER on_task_insert_notify
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();

-- ─────────────────────────────────────────────
-- 3. 트리거 B — 기존 과제 담당자 추가 시 알람
--    조건: tasks.assigned_to UPDATE → 신규 추가된 UUID에게만 알람
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_assignee_added()
RETURNS TRIGGER AS $$
DECLARE
  new_assignees UUID[];
  new_assignee  UUID;
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    -- 집합 차이: NEW - OLD (신규 추가된 UUID만)
    SELECT array_agg(a) INTO new_assignees
    FROM (
      SELECT unnest(COALESCE(NEW.assigned_to, ARRAY[]::UUID[]))
      EXCEPT
      SELECT unnest(COALESCE(OLD.assigned_to, ARRAY[]::UUID[]))
    ) t(a);

    FOREACH new_assignee IN ARRAY COALESCE(new_assignees, ARRAY[]::UUID[])
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        new_assignee,
        'assignee_added',
        '과제 담당자로 추가되었습니다',
        '과제 "' || NEW.title || '"의 담당자로 추가되었습니다.',
        '/tasks'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_update_notify ON tasks;
CREATE TRIGGER on_task_update_notify
  AFTER UPDATE OF assigned_to ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_assignee_added();

-- ─────────────────────────────────────────────
-- 4. 트리거 C — 담당 과제에 메모 생성 시 알람
--    조건: task_comments INSERT → 해당 과제 담당자 (작성자 제외)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_comment_added()
RETURNS TRIGGER AS $$
DECLARE
  task_record  RECORD;
  assignee_id  UUID;
BEGIN
  SELECT id, title, assigned_to INTO task_record
  FROM tasks
  WHERE id = NEW.task_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  FOREACH assignee_id IN ARRAY COALESCE(task_record.assigned_to, ARRAY[]::UUID[])
  LOOP
    IF assignee_id <> NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        assignee_id,
        'comment_added',
        '과제에 메모가 추가되었습니다',
        '담당 중인 과제 "' || task_record.title || '"에 새 메모가 달렸습니다.',
        '/tasks'
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_insert_notify ON task_comments;
CREATE TRIGGER on_comment_insert_notify
  AFTER INSERT ON task_comments
  FOR EACH ROW EXECUTE FUNCTION notify_comment_added();
