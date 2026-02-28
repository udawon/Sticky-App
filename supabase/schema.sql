-- Claude Sticky MVP 데이터베이스 스키마
-- Supabase SQL Editor에서 실행

-- 팀 테이블
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  avatar_body TEXT DEFAULT 'default',
  avatar_accessories TEXT[] DEFAULT '{}',
  points INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 과제 테이블
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  assigned_to UUID[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  points INTEGER DEFAULT 0,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 과제 댓글 테이블
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 상점 아이템 테이블
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('body', 'accessory')),
  image_key TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 구매 기록 테이블
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- 포인트 기록 테이블
CREATE TABLE IF NOT EXISTS point_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_profiles_team ON profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_user ON point_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read);

-- RLS (Row Level Security) 정책
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 프로필: 같은 팀원 조회 가능, 본인만 수정 가능
CREATE POLICY "프로필 조회" ON profiles FOR SELECT USING (true);
CREATE POLICY "프로필 수정" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "프로필 생성" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 팀: 소속 팀원만 조회 가능
CREATE POLICY "팀 조회" ON teams FOR SELECT USING (true);
CREATE POLICY "팀 생성" ON teams FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "팀 수정" ON teams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = teams.id AND role = 'admin')
);

-- 과제: 같은 팀원만 조회/생성/수정 가능
CREATE POLICY "과제 조회" ON tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = tasks.team_id)
);
CREATE POLICY "과제 생성" ON tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = tasks.team_id AND role = 'admin')
);
CREATE POLICY "과제 수정" ON tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = tasks.team_id)
);
CREATE POLICY "과제 삭제" ON tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = tasks.team_id AND role = 'admin')
);

-- 과제 댓글: 같은 팀원만 조회/생성 가능
CREATE POLICY "댓글 조회" ON task_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN profiles p ON p.team_id = t.team_id
    WHERE t.id = task_comments.task_id AND p.id = auth.uid()
  )
);
CREATE POLICY "댓글 생성" ON task_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "댓글 삭제" ON task_comments FOR DELETE USING (auth.uid() = user_id);

-- 상점: 모든 사용자 조회 가능
CREATE POLICY "상점 조회" ON shop_items FOR SELECT USING (true);

-- 구매: 본인 기록만 조회/생성 가능
CREATE POLICY "구매 조회" ON purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "구매 생성" ON purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 포인트 기록: 본인 기록만 조회 가능
CREATE POLICY "포인트 조회" ON point_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "포인트 생성" ON point_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 알림: 본인만 조회/수정 가능
CREATE POLICY "알림 조회" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "알림 수정" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "알림 생성" ON notifications FOR INSERT WITH CHECK (true);

-- 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nickname, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
