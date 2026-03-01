# Claude Sticky - 변경 로그

모든 주목할 만한 이 프로젝트의 변경사항은 이 파일에 기록됩니다.

변경 로그 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따릅니다.

---

## [0.6.0-launcher] - 2026-03-01

### Added
- 팝업 런처 (Popup Launcher) 기능
  - 일반 브라우저 탭 접속 시 어플리케이션 소개 화면 표시
  - 어두운 배경(bg-black/80) + "앱 실행하기" 버튼
  - 런처 감지 로직: `window.opener !== null || window.outerWidth <= 420`
  - `isPopup` 초기값 `true` (SSR 깜빡임 방지)

- 팝업 창 크기 최적화
  - 팝업 창 목표 크기: 360 × 720
  - 브라우저 크롬 높이 동적 계산: `chromeHeight = outerHeight - innerHeight`
  - 최종 크기: `resizeTo(360, 560 + chromeHeight)`

### Changed
- `src/app/(auth)/login/page.tsx`
  - 팝업 런처 UI 추가 (어두운 배경 + 버튼)
  - 텍스트 변경: 서브타이틀 "Virtual Office with Team" (이전: "팀 협업 · 가상 사무실 · 게이미피케이션")
  - LogIn CardDescription: "Virtual Office with Team" (이전: "팀 협업 & 게이미피케이션")

- `src/components/layout/title-bar.tsx`
  - 로그아웃 버그 수정: `setUser(null)` 제거 (플래시 제거)
  - 로그아웃 흐름: API → 쿠키 삭제 → 즉시 리다이렉트

- `src/components/layout/compact-shell.tsx`
  - 팝업 창 높이 동적 계산 추가
  - `window.outerHeight - window.innerHeight` 활용으로 크롬 높이 보정

- `src/components/office/virtual-office.tsx`
  - 식물 위치 변경: (x:6, y:4) → (x:1, y:5) (좌측 벽 배치)
  - 목표: 팀원 동선 방해 제거

### Fixed
- ✅ 팝업 창 높이 부족 버그 (크롬 높이 미반영)
  - 증상: `window.resizeTo(360, 560)` 호출 시 실제 높이가 560px 미만
  - 원인: innerHeight만 설정되고 크롬 높이(주소창, 탭 등) 미포함
  - 해결: chromeHeight 동적 계산 후 추가

- ✅ 로그아웃 후 "팀에 참가하세요" 화면 플래시
  - 증상: 로그아웃 직후 팀 없음 화면 1초 이상 표시
  - 원인: `setUser(null)` 즉시 실행 → 팀 없음 조건 충족 (쿠키 삭제는 지연)
  - 해결: `setUser(null)` 제거 + API 응답 후 즉시 `window.location.href` 리다이렉트

### Vercel Deployment
- 런처 기능은 웹 브라우저(https://claude-sticky.vercel.app)에서만 작동
- 팝업 창: 360×720 크기로 데스크탑 앱 경험 제공
- 팝업 차단 정책: 브라우저 설정에 따라 차단될 수 있음

### Testing
- E2E 테스트 (Playwright): 8/8 PASS (100% Match Rate)
  - 일반 탭: 런처 화면 표시 ✅
  - 팝업 창: 로그인 폼 표시 ✅
  - 팝업 감지: window.opener=true ✅
  - 팝업 높이: 720px 달성 ✅
  - 로그아웃: "팀에 참가하세요" 없음 ✅
  - 텍스트: "Virtual Office with Team" 확인 ✅
  - 식물 위치: (1, 5) 확인 ✅

### PDCA Cycle
- PDCA #11 완료: popup-launcher
- 보고서: `docs/04-report/features/popup-launcher.report.md`

---

## [0.5.0-demo] - 2026-03-01

### Added
- 데모 역할 선택 다이얼로그 (Vercel 배포용)
  - 방문자가 "팀원" 또는 "팀 리더(어드민)" 중 선택 가능
  - 데모 계정 2개 자동 로그인 (demo@sticky.app, admin@demo.com)
  - shadcn/ui Dialog + Crown/Users 아이콘

- 데모 모드 제어 시스템
  - `src/lib/demo.ts` — isDemoAccount() 유틸리티
  - `src/hooks/use-demo-mode.ts` — useDemo() 훅
  - 파괴적 액션 3가지 차단: 멤버 제거, 포인트 차감, 과제 삭제

- 데모 배지 표시
  - TitleBar에 노란색 "데모" Badge (양쪽 계정 모두)
  - 사용자에게 시연 중임을 명확히 알림

- 한국어 조사 자동 판별
  - `getKoreanParticle()` 함수 (받침 여부 감지)
  - "이/가", "을/를" 자동 선택으로 자연스러운 토스트 메시지

### Changed
- `.env.local.example`: NEXT_PUBLIC_DEMO_* 환경 변수 4개 추가
  - NEXT_PUBLIC_DEMO_ADMIN_EMAIL
  - NEXT_PUBLIC_DEMO_ADMIN_PASSWORD
  - NEXT_PUBLIC_DEMO_MEMBER_EMAIL
  - NEXT_PUBLIC_DEMO_MEMBER_PASSWORD
- Vercel 배포 최적화: .vercelignore 생성

### Database
- `supabase/seed_demo.sql`: 데모 계정 2개 + 팀 생성 스크립트 (수동 실행)

### Testing
- Playwright MCP 검증: 7/7 PASS (100% Match Rate)
  - 역할 선택 Dialog 표시 검증
  - 팀원/어드민 로그인 검증
  - 파괴적 액션 차단 검증
  - 토스트 메시지 한국어 조사 검증

### PDCA Cycle
- PDCA #10 완료: demo-role-select
- 보고서: `docs/04-report/features/demo-role-select.report.md`

---

## [0.4.0-roulette] - 2026-03-01

### Added
- 룰렛 게이미피케이션 기능 구현 (포인트 소비형)
  - 가상 사무실 룰렛 오브젝트 (5,1) 배치 (Canvas drawObj "roulette" case)
  - 6가지 보상 체계: 꽝(35%), 한번 더(30%), 150P(15%), 300P(10%), 500P(5%), 커피이용권(5%)
  - 스핀 비용: 100P / 기댓값: 77.5P (하우스 엣지 22.5%)
  - 연속 무료 재스핀 (free_spin 결과 시 1초 후 자동 재스핀, 무한 연속 가능)

- 룰렛 패널 UI (`compact-roulette-panel.tsx`)
  - Canvas API 기반 룰렛 휠 (Electron/Chromium 완전 호환)
  - 세그먼트 라벨, 보상 확률 테이블, 최근 스핀 히스토리 5건 표시
  - 연속 무료 스핀 카운터 표시

- 커피이용권 어드민 알림
  - PostgreSQL 트리거 `on_roulette_coffee_voucher` 자동 어드민 알림 발송
  - 기존 `NotificationProvider` 재활용으로 신규 인프라 없이 실시간 수신
  - `NotificationType`에 `"roulette_voucher"` 추가

- `src/lib/roulette/logic.ts`
  - `ROULETTE_SEGMENTS` 확률 배열 (startDeg, degree 기반)
  - `spinRoulette()`: 누적 확률 랜덤 결과 반환
  - `getLandingRotation()`: 세그먼트 중앙각 기반 랜딩 회전량 계산

### Changed
- `src/types/database.ts`: `RouletteResult` 유니온 타입, `RouletteLog` 인터페이스 추가
- `src/stores/panel-store.ts`: `PanelType`에 `"roulette"` 추가
- `src/components/office/virtual-office.tsx`: `ObjType`, `OBJS`, `drawObj` 확장
- `src/app/(main)/page.tsx`: 룰렛 패널 렌더링 케이스 추가
- `src/components/layout/title-bar.tsx`: `PANEL_TITLES`에 `"roulette"` 추가

### Fixed
- `point_logs` INSERT 누락 — 룰렛 스핀 시 차감(-100P)과 보상(+gainedP) 기록 추가
- conic-gradient Electron 비호환 → Canvas API (ctx.arc) 전면 교체
- 포인터(▼) overflow 잘림 버그 수정
- Tailwind v4 `left-1/2` 클래스 미생성 버그 → 인라인 스타일로 우회

### Database
- `supabase/migration_roulette.sql`: `roulette_logs` 테이블 + RLS 2개 + 트리거 1개
  - 테이블: id, user_id, result, points_spent, points_gained, is_free_spin, spin_chain, created_at
  - SECURITY DEFINER 트리거로 RLS 우회 (어드민 알림 INSERT)
  - `v_team_id IS NOT NULL` 방어 코드 추가

### Quality Metrics
- 초기 Match Rate: 87.0% (119항목)
- 수정 후 추정 Match Rate: 97%+
- 기능적 Match Rate (시각적 항목 제외): 89.4% → 99%+
- PDCA 사이클: #8

---

## [0.3.0-notification] - 2026-02-28

### Added
- 실시간 알람 시스템 구현 (Supabase Realtime)
  - PostgreSQL 트리거 3개 자동 생성
    - 조건 A: 과제 생성 시 담당자에게 알람
    - 조건 B: 기존 과제에 담당자 추가 시 알람
    - 조건 C: 담당 과제에 메모 생성 시 알람
  - `notifications` 테이블에 `type` 컬럼 추가 (task_assigned, assignee_added, comment_added, general)

- Realtime 구독 Provider 컴포넌트
  - `NotificationProvider`: 앱 전체에 마운트
  - Effect 1: 초기 알람 30개 로드
  - Effect 2: Realtime INSERT 이벤트 실시간 감지
  - Effect 3: unreadCount 변화 시 Electron IPC 전송

- TitleBar Bell 아이콘 시각적 피드백
  - unreadCount > 0 시 빨간 점 표시
  - `useNotificationStore` 구독으로 실시간 업데이트

- Electron 트레이 뱃지 구현
  - IPC 핸들러: `set-badge` (preload.js 노출)
  - 뱃지 아이콘 캐싱 (성능 최적화)
  - 아이콘 파일 미존재 시 폴백 처리

### Changed
- `src/types/database.ts`: `Notification` 타입에 `type` 필드 추가
- `src/app/(main)/layout.tsx`: `NotificationProvider` 래핑 추가
- `electron/preload.js`: `setBadge` 메서드 노출
- `electron/main.js`: 모듈 스코프 변수 추가, IPC 핸들러 추가

### Database
- `supabase/migration_notifications_v2.sql`: 119 라인
  - ALTER TABLE notifications ADD COLUMN type VARCHAR(50)
  - 3개 함수 + 3개 트리거 생성
  - SECURITY DEFINER로 RLS 우회

### Testing
- Design Match Rate: 95.8% (23/24 항목)
- FR Match Rate: 94.7% (18/19)
- NFR Match Rate: 100% (5/5)
- 유일한 Gap: FR-19 (icon-badge.ico 바이너리 파일) - 폴백 처리 완료

### Performance
- IPC 호출 최소화: unreadCount 변화 시만 호출
- Realtime 채널 정리: cleanup 함수로 메모리 누수 방지
- 아이콘 캐싱: createTray()에서 사전 로드

---

## [0.2.0-ui] - 2026-02-28

### Added
- 과제 UI 전면 개편 (Notion/Linear 스타일)
  - TaskCard: 좌측 컬러 보더 제거, 우선순위/상태 뱃지 추가
  - TaskCard: 아바타+제목+날짜 범위 표시 (하단 행)
  - TaskDetailPanel: Sheet(모달)에서 Panel(인라인)로 전환
  - TaskDetailPanel: 2-카드 레이아웃 (중요도+상태, 과제 정보)
  - TaskDetailPanel: 인라인 편집 (과제명/설명/마감일/포인트/담당자)
  - TaskDetailPanel: 메모 섹션 (댓글, 실시간 동기화)

- 아바타 색상 유틸 분리
  - `src/lib/utils/avatar.ts`: getAvatarColor(userId) 함수
  - 해시 기반 결정적 색상 (동일 userId = 동일 색상)
  - 8가지 컬러 팔레트 (violet, blue, emerald, amber, red, pink, teal, orange)

- 과제 생성 폼 개편 (사용자 요청)
  - TaskDialog: 카드 4장 스타일 (기본정보, 담당자, 중요도, 상태)
  - React Hook Form + Zod 검증 유지

- 과제 패널 헤더/필터 개편 (사용자 요청)
  - CompactTasksPanel: 색상 pill 필터 (상태별 컬러 도트 + 카운트)
  - CompactTasksPanel: 헤더 리디자인 (아이콘 + 타이틀 + 뱃지)
  - TaskFilterBar: 소프트 스타일 검색바 (bg-muted/50, transparent border)
  - TaskFilterBar: 300ms 디바운스 + X 초기화 버튼

- 상태 변경자 추적 기능
  - Task 타입에 `updated_by: string | null` 필드 추가
  - DB 마이그레이션 파일: `supabase/migration_updated_by.sql`
  - TaskDetailPanel: 변경자 정보 표시 (updated_by, updated_at)

### Changed
- TaskDetailPanel: Sheet -> Panel 전환
  - 파일명: task-detail-sheet.tsx -> task-detail-panel.tsx
  - UI: 모달에서 인라인 패널로 변경 (더 나은 네비게이션)

- Supabase Realtime 구독 확대
  - UPDATE/DELETE/INSERT 채널 구독으로 실시간 동기화

### Fixed
- 아바타 색상 중복 코드 → getAvatarColor() 유틸로 통합
- Task 타입 업데이트 (notion_id, updated_by 필드 추가)

### Quality Metrics
- Design Match Rate: 100% (60/60 항목 완료)
- Architecture Compliance: 100% (레이어 위반 없음)
- Code Quality Score: 98/100
- Convention Compliance: 100%

### Testing
- 설계 문서 vs 구현 Gap Analysis: 100% 일치
- 아키텍처 준수도: 100%
- 컨벤션 준수도: 100%
- 타입 안전성: any 타입 0개

### Database
- `tasks` 테이블에 `updated_by` 컬럼 추가 (마이그레이션 필요)
- 상태 변경 시 변경자 자동 기록

---

## [0.1.0-qa.1] - 2026-02-27

### Added
- 관리자 패널에서 팀 초대 코드 표시 기능
  - Supabase `teams` 테이블에서 `invite_code` 조회
  - 복사 버튼 클릭 시 클립보드에 자동 복사
- 복사 완료 Visual Feedback (Check 아이콘, 2초 표시)
- 로그인, 회원가입, 설정 폼의 `autoComplete` 속성 추가
  - `email`, `current-password`, `new-password` 등 표준 값 적용

### Changed
- 로그아웃 핸들러에 `router.refresh()` 추가
  - Supabase 세션 즉시 무효화로 미들웨어 리다이렉트 빠르게 처리

### Fixed
- 로그아웃 후 미들웨어가 유효 세션으로 판단하는 버그
  - `await supabase.auth.signOut()` + `router.refresh()` 추가
- 재로그인 시 이전 패널이 유지되는 버그
  - 로그아웃 시 `usePanelStore.getState().closePanel()` 호출
- 로그인/회원가입/설정 폼 `autoComplete` 속성 누락으로 인한 브라우저 경고

### Testing
- QA 테스트: 14/14 PASS (100%)
  - 로그인/로그아웃 플로우 검증
  - 패널 상태 초기화 확인
  - 초대 코드 표시 및 복사 기능 검증
  - 과제 보드, 리더보드, 마이페이지 등 주요 기능 검증

### Security
- 로그아웃 시 패널 상태 초기화로 이전 사용자 정보 노출 방지

---

## [0.0.1] - 2026-02-26

### Added
- 초기 프로젝트 설정
  - Next.js 16.1.6 (App Router, Turbopack)
  - TypeScript, Tailwind CSS, shadcn/ui 스택
  - Supabase (Authentication, Database, Realtime)
  - Zustand (상태 관리)

- 인증 시스템
  - 이메일 기반 회원가입/로그인
  - 미들웨어 기반 라우트 보호
  - 세션 관리

- 메인 애플리케이션 레이아웃
  - 사이드바 네비게이션
  - 타이틀 바 (사용자 정보, 로그아웃)
  - 5개 메인 페이지 구조 (My/Task/League/Shop/Settings)

- 관리자 기능
  - 어드민 계정 분리 (role 기반)
  - 팀원 관리 (등록 승인, 정보 확인, 계정 삭제)
  - 과제 생성/수정/삭제
  - 포인트 관리

- 사용자 기능
  - 과제 관리 (상태: todo → in_progress → review → done)
  - 리더보드 (레벨 시스템: 새싹 → 묘목 → 나무 → 숲 → 산 → 전설)
  - 자판기 (아바타/악세서리 구매)
  - 마이페이지 (프로필, 통계)
  - 설정 (프로필 변경, 비밀번호 변경)

- 팀 기능
  - 초대 코드 기반 팀 가입
  - 팀 멤버 관리
  - 팀 포인트 시스템

- 데이터베이스 스키마
  - users, teams, team_members, tasks, points, shop_items 등

### Security
- Supabase Row Level Security (RLS) 정책 적용
- 환경 변수 기반 설정 관리
- 세션 기반 인증

### Database
- Supabase PostgreSQL 기반 스키마
- 실시간 동기화 설정

---

## 주의사항

### 설치 가이드

프로젝트를 시작하기 전에 다음을 확인하세요:

1. **Node.js**: v18+ 필수
2. **Supabase 설정**:
   ```bash
   # 환경 변수 설정
   cp .env.local.example .env.local
   # NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY 입력
   ```

3. **데이터베이스 스키마 초기화**:
   - Supabase SQL Editor에서 `supabase/schema.sql` 실행
   - Supabase SQL Editor에서 `supabase/functions.sql` 실행

4. **개발 서버 실행**:
   ```bash
   npm run dev
   ```

### 기술 스택 버전

| 패키지 | 버전 |
|--------|------|
| Next.js | 16.1.6 |
| React | 19.2.3 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| Supabase | 2.97.0 |
| Zustand | 5.0.11 |

---

## 향후 계획

### 우선순위 높음
- [ ] E2E 자동 테스트 (Playwright)
- [ ] 에러 모니터링 시스템 (Sentry)
- [ ] 실시간 알림 시스템
- [ ] 팀 초대 플로우 완성

### 우선순위 중간
- [ ] 과제 필터링 및 검색 기능
- [ ] 성능 최적화 (Image 로딩 등)
- [ ] 접근성 개선 (WCAG 2.1 AA)
- [ ] 스토어 상태 관리 리팩토링

### 우선순위 낮음
- [ ] 국제화 (i18n)
- [ ] 다크 모드 개선
- [ ] 모바일 반응형 (향후 지원 예정)

---

## 라이선스

이 프로젝트는 비공개 프로젝트입니다. 무단 복제 및 배포를 금합니다.

---

## 연락처

프로젝트 관련 문의:
- 팀 리드: [Team Lead Name]
- 개발팀: [Development Team]
