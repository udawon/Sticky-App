-- ============================================================
-- Realtime 활성화 마이그레이션
-- Supabase Dashboard → SQL Editor 에서 실행
-- ============================================================

-- tasks 테이블: UPDATE/DELETE 이벤트에서 payload.old 포함
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- task_comments 테이블: 상세 패널 댓글 실시간 반영
ALTER TABLE task_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
