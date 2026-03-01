-- 룰렛 기능 마이그레이션
-- 실행 위치: Supabase SQL Editor

-- ─────────────────────────────────────────────
-- 1. roulette_logs 테이블 생성
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roulette_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  result        VARCHAR(30) NOT NULL
                CHECK (result IN (
                  'nothing', 'free_spin', 'points_150',
                  'points_300', 'points_500', 'coffee_voucher'
                )),
  points_spent  INT NOT NULL DEFAULT 100,
  points_gained INT NOT NULL DEFAULT 0,
  is_free_spin  BOOLEAN NOT NULL DEFAULT FALSE,
  spin_chain    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. RLS 정책
-- ─────────────────────────────────────────────
ALTER TABLE roulette_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own roulette logs"
  ON roulette_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users can insert own roulette logs"
  ON roulette_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- 3. 커피이용권 당첨 → 어드민 알림 트리거
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_roulette_coffee_voucher()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id  UUID;
  v_nickname VARCHAR;
  v_admin_id UUID;
BEGIN
  IF NEW.result = 'coffee_voucher' THEN
    SELECT team_id, nickname INTO v_team_id, v_nickname
      FROM profiles WHERE id = NEW.user_id;

    IF v_team_id IS NOT NULL THEN
      FOR v_admin_id IN
        SELECT id FROM profiles
        WHERE team_id = v_team_id AND role = 'admin'
      LOOP
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (
          v_admin_id,
          'roulette_voucher',
          '☕ 커피이용권 당첨!',
          v_nickname || '님이 커피이용권에 당첨되었습니다! ☕',
          NULL
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_roulette_coffee_voucher ON roulette_logs;
CREATE TRIGGER on_roulette_coffee_voucher
  AFTER INSERT ON roulette_logs
  FOR EACH ROW EXECUTE FUNCTION notify_roulette_coffee_voucher();
