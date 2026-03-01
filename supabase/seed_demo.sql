-- ─────────────────────────────────────────────────────────────────────
-- Claude Sticky 데모 계정 시드 데이터
-- 실행 위치: Supabase SQL Editor (postgres 역할, service_role 권한)
-- 목적: 포트폴리오 방문자가 회원가입 없이 체험할 수 있는 데이터 생성
--
-- 데모 계정:
--   어드민: admin@demo.com / Demo1234!
--   멤버:   demo@sticky.app / DemoSticky2026!  ← "데모로 체험하기" 버튼 연결
-- ─────────────────────────────────────────────────────────────────────

-- pgcrypto 확장 (비밀번호 해싱용, 이미 활성화된 경우 무시됨)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_admin_id UUID := '10000000-0000-0000-0000-000000000001';
  v_demo_id  UUID := '10000000-0000-0000-0000-000000000002';
  v_team_id  UUID;
  v_task1_id UUID;
  v_task2_id UUID;
  v_task3_id UUID;
  v_task4_id UUID;
  v_task5_id UUID;
BEGIN

  -- ─── 기존 데모 계정 정리 (재실행 안전) ───
  DELETE FROM auth.users WHERE email IN ('admin@demo.com', 'demo@sticky.app');

  -- ─── 어드민 계정 생성 ───
  -- 주의: email_change 등 문자열 컬럼은 NULL 대신 '' 필수 (GoTrue Go 드라이버 호환)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    reauthentication_token, email_change_confirm_status
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated', 'authenticated',
    'admin@demo.com',
    crypt('Demo1234!', gen_salt('bf', 10)),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nickname":"데모 팀장","role":"admin"}',
    FALSE, '', '',
    '', '', '', '', 0
  );

  -- ─── 데모 멤버 계정 생성 ───
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    reauthentication_token, email_change_confirm_status
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_demo_id,
    'authenticated', 'authenticated',
    'demo@sticky.app',
    crypt('DemoSticky2026!', gen_salt('bf', 10)),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nickname":"체험 사용자","role":"member"}',
    FALSE, '', '',
    '', '', '', '', 0
  );

  -- ─── auth.identities 생성 (이메일 로그인 활성화) ───
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (
      v_admin_id::text,
      v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@demo.com'),
      'email',
      NOW(), NOW(), NOW()
    ),
    (
      v_demo_id::text,
      v_demo_id,
      jsonb_build_object('sub', v_demo_id::text, 'email', 'demo@sticky.app'),
      'email',
      NOW(), NOW(), NOW()
    )
  ON CONFLICT DO NOTHING;

  -- ─── 팀 생성 ───
  INSERT INTO teams (name, invite_code, created_by)
  VALUES ('포트폴리오 데모팀', 'DEMO2026', v_admin_id)
  RETURNING id INTO v_team_id;

  -- ─── 프로필 업데이트 (트리거로 자동 생성된 프로필에 팀/포인트 배정) ───
  UPDATE profiles SET
    team_id             = v_team_id,
    role                = 'admin',
    points              = 450,
    total_points_earned = 800,
    tasks_completed     = 5,
    avatar_hair         = 'hair_gold',
    avatar_face         = 'face_default',
    avatar_top          = 'top_black',
    avatar_bottom       = 'bottom_navy',
    avatar_shoes        = 'shoes_black'
  WHERE id = v_admin_id;

  UPDATE profiles SET
    team_id             = v_team_id,
    role                = 'member',
    points              = 220,
    total_points_earned = 380,
    tasks_completed     = 3,
    avatar_hair         = 'hair_pink',
    avatar_face         = 'face_rosy',
    avatar_top          = 'top_blue',
    avatar_bottom       = 'bottom_navy',
    avatar_shoes        = 'shoes_white'
  WHERE id = v_demo_id;

  -- ─── 과제 5개 생성 ───
  INSERT INTO tasks (id, team_id, title, description, status, priority, assigned_to, created_by, points, due_date, updated_by)
  VALUES
    (
      gen_random_uuid(),
      v_team_id,
      '디자인 시스템 구축',
      '공통 컴포넌트 라이브러리 구성 및 Storybook 문서화. shadcn/ui 기반으로 프로젝트 전용 컴포넌트 정리.',
      'done', 'high',
      ARRAY[v_admin_id, v_demo_id], v_admin_id, 100,
      NOW() - INTERVAL '3 days', v_demo_id
    ),
    (
      gen_random_uuid(),
      v_team_id,
      'API 연동 구현',
      'Supabase REST API 클라이언트 설정 및 커스텀 훅 구현. RLS 정책 검증 포함.',
      'in_progress', 'high',
      ARRAY[v_demo_id], v_admin_id, 80,
      NOW() + INTERVAL '2 days', v_demo_id
    ),
    (
      gen_random_uuid(),
      v_team_id,
      'QA 테스트 진행',
      '주요 사용자 시나리오 E2E 테스트 및 버그 리포트 작성. Playwright 활용.',
      'in_progress', 'medium',
      ARRAY[v_admin_id], v_admin_id, 60,
      NOW() + INTERVAL '5 days', v_admin_id
    ),
    (
      gen_random_uuid(),
      v_team_id,
      '배포 환경 설정',
      'Vercel + Supabase 프로덕션 환경 구성. 환경변수 및 GitHub Actions CI/CD 설정.',
      'todo', 'medium',
      ARRAY[v_admin_id, v_demo_id], v_admin_id, 50,
      NOW() + INTERVAL '7 days', NULL
    ),
    (
      gen_random_uuid(),
      v_team_id,
      '사용자 피드백 수집',
      'MVP 출시 후 초기 사용자 인터뷰 진행. 개선 포인트 정리 및 백로그 업데이트.',
      'todo', 'low',
      ARRAY[v_demo_id], v_admin_id, 40,
      NOW() + INTERVAL '14 days', NULL
    );

  -- ─── 포인트 기록 ───
  INSERT INTO point_logs (user_id, amount, reason) VALUES
    (v_admin_id, 100, '과제 완료: 디자인 시스템 구축'),
    (v_admin_id, 200, '어드민 지급: 1주 우수 팀원 보너스'),
    (v_admin_id, 150, '룰렛 당첨: points_150'),
    (v_demo_id,  100, '과제 완료: 디자인 시스템 구축'),
    (v_demo_id,  80,  '과제 완료: API 연동 1차 PR'),
    (v_demo_id,  200, '룰렛 당첨: points_300 - 50% 포인트 사용');

  -- ─── 룰렛 기록 ───
  INSERT INTO roulette_logs (user_id, result, points_spent, points_gained, is_free_spin, spin_chain) VALUES
    (v_admin_id, 'points_150', 100, 150, FALSE, 0),
    (v_admin_id, 'free_spin',  100, 0,   FALSE, 1),
    (v_admin_id, 'nothing',    0,   0,   TRUE,  0),
    (v_demo_id,  'points_300', 100, 300, FALSE, 0),
    (v_demo_id,  'nothing',    100, 0,   FALSE, 0),
    (v_demo_id,  'free_spin',  100, 0,   FALSE, 1);

  -- ─── 아바타 파츠 구매 기록 ───
  -- 어드민: 골드 헤어, 블랙 상의, 네이비 하의, 블랙 신발
  INSERT INTO purchases (user_id, item_id)
  SELECT v_admin_id, id FROM shop_items
  WHERE image_key IN ('hair_gold', 'top_black', 'bottom_navy', 'shoes_black')
  ON CONFLICT DO NOTHING;

  -- 데모 멤버: 핑크 헤어, 발그레 피부, 블루 상의, 네이비 하의, 화이트 신발
  INSERT INTO purchases (user_id, item_id)
  SELECT v_demo_id, id FROM shop_items
  WHERE image_key IN ('hair_pink', 'face_rosy', 'top_blue', 'bottom_navy', 'shoes_white')
  ON CONFLICT DO NOTHING;

  -- ─── 알림 샘플 (데모 멤버 기준) ───
  INSERT INTO notifications (user_id, title, message, read) VALUES
    (v_demo_id, '새 과제 배정', '어드민이 "QA 테스트 진행" 과제를 배정했습니다.', TRUE),
    (v_demo_id, '포인트 획득', '룰렛에서 300P를 획득했습니다! 🎉', FALSE);

  RAISE NOTICE '데모 데이터 시드 완료!';
  RAISE NOTICE '팀 ID: %', v_team_id;
  RAISE NOTICE '어드민: admin@demo.com / Demo1234!';
  RAISE NOTICE '데모 멤버: demo@sticky.app / DemoSticky2026!';

END $$;
