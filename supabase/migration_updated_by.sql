-- tasks 테이블에 updated_by 컬럼 추가
-- 상태를 가장 최근에 변경한 사용자 ID를 저장

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
