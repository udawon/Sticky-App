-- Notion 연동 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- tasks 테이블에 notion_id 컬럼 추가 (중복 import 방지)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notion_id TEXT;

-- 동일 팀 내 notion_id 유일성 보장 (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS tasks_notion_id_unique
  ON tasks (notion_id)
  WHERE notion_id IS NOT NULL;
