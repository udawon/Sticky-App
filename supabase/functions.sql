-- 포인트 증가 RPC 함수
-- 과제 완료 시 포인트와 누적 포인트를 동시에 증가
CREATE OR REPLACE FUNCTION increment_points(user_id_input UUID, amount_input INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    points = points + amount_input,
    total_points_earned = total_points_earned + amount_input,
    tasks_completed = tasks_completed + 1
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
