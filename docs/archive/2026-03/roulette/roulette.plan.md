# roulette Plan

## 개요

유저가 포인트를 소비해서 룰렛을 돌리는 게이미피케이션 기능.
가상 사무실 내 룰렛 머신 오브젝트를 통해 접근하며, 다양한 보상을 확률적으로 획득한다.

---

## 목표

- 포인트 소비 경로를 다양화해 게이미피케이션 재미 강화
- 팀원 간 커피이용권 이벤트로 오프라인 교류 촉진
- 기존 알림 시스템을 활용한 어드민 당첨 알림 연동

---

## 확정된 요구사항 (사용자 답변 기반)

| 항목 | 결정 |
|------|------|
| 스핀 비용 | 100포인트 / 회 |
| 한번 더 돌리기 | 즉시 자동 재스핀 (추가 비용 없음, 연속 가능) |
| 커피이용권 처리 | 어드민에게 알림 발송 + DB 기록 |
| 일일 스핀 제한 | 없음 (포인트만 있으면 무제한) |
| 가상 사무실 위치 | 과제보드(5,5)로부터 4칸 위 → (5, 1) |

---

## 보상 체계

| 결과 | 확률 | 처리 |
|------|------|------|
| 꽝 | 35% | 아무 일 없음 |
| 한번 더 돌리기 | 30% | 즉시 무료 재스핀 (자동) |
| 150포인트 획득 | 15% | points +150, total_points_earned +150 |
| 300포인트 획득 | 10% | points +300, total_points_earned +300 |
| 500포인트 획득 | 5% | points +500, total_points_earned +500 |
| 팀장님 커피이용권 | 5% | DB 기록 + 어드민 알림 발송 |

> **기댓값 계산**: 0.15×150 + 0.10×300 + 0.05×500 = 22.5 + 30 + 25 = **77.5P**
> (100P 투입 대비 기댓값 77.5P → 하우스 엣지 22.5%)

---

## 기능 요구사항 (FR)

### FR-01: 가상 사무실 룰렛 오브젝트
- 위치: (5, 1) — 과제보드(5,5)로부터 4칸 위
- 오브젝트 타입: `roulette` (신규)
- 상호작용 시 `panelType: "roulette"` 패널 오픈
- 아이콘: 🎰 (슬롯머신 emoji 또는 픽셀아트)
- 레이블: `🎰 룰렛`

### FR-02: 룰렛 패널 UI
- 헤더: 현재 보유 포인트 표시
- 스피닝 휠: CSS 애니메이션 (6칸 원형 휠, 확률별 비율 표시)
- 스핀 버튼: 100P 차감 확인 후 스핀
- 포인트 부족(< 100P) 시 버튼 비활성화 + 안내 문구
- 결과 표시: 스핀 후 팝업/배너로 결과 메시지

### FR-03: 스핀 로직 (클라이언트 → 서버 API)
- 클라이언트에서 랜덤 결과를 계산하되 서버(Supabase Edge Function 또는 API Route)에서 검증 처리
  - **단순화 방안**: 클라이언트 랜덤 → Supabase RPC로 결과 및 포인트 처리 원자적 실행
- 100P 차감 → 보상 적용 → `roulette_logs` 기록 을 하나의 트랜잭션으로 처리

### FR-04: 한번 더 돌리기 자동 재스핀
- 결과가 `free_spin`인 경우 1초 딜레이 후 자동으로 다시 스핀
- 연속 `free_spin` 무한 가능 (의도된 동작)
- 재스핀 시 추가 100P 차감 없음

### FR-05: 커피이용권 당첨 어드민 알림
- 결과 `coffee_voucher` 시:
  1. `roulette_logs` 테이블에 기록 (result = 'coffee_voucher')
  2. 기존 `notifications` 테이블에 어드민용 알림 INSERT
  3. 어드민이 실시간 알림으로 수신 (기존 NotificationProvider 활용)
  4. 알림 내용: `"{닉네임}님이 커피이용권에 당첨되었습니다! ☕"`

### FR-06: 포인트 업데이트
- `profiles.points` 차감 (−100) + 보상 포인트 가산
- 포인트 보상 시 `profiles.total_points_earned`도 함께 증가
- `auth-store`의 `user` 상태 즉시 갱신 (UI 반영)

### FR-07: 스핀 히스토리 저장
- `roulette_logs` 테이블에 모든 스핀 기록 저장
- 보상 내역은 패널 하단에 최근 5건 표시

---

## 비기능 요구사항

- 스핀 애니메이션: 2초 내외로 완료
- 서버 왕복 없이 애니메이션 진행, 완료 후 결과 반영
- 포인트 처리 실패 시 토스트 오류 메시지 표시

---

## 구현 범위

### 신규 생성 파일 (3개)

| 파일 | 내용 |
|------|------|
| `supabase/migration_roulette.sql` | `roulette_logs` 테이블 + 커피이용권 알림 트리거 |
| `src/components/panels/compact-roulette-panel.tsx` | 룰렛 UI 패널 |
| `src/lib/roulette/logic.ts` | 확률 계산 및 보상 타입 정의 |

### 수정 파일 (4개)

| 파일 | 변경 내용 |
|------|-----------|
| `src/stores/panel-store.ts` | `"roulette"` PanelType 추가 |
| `src/components/office/virtual-office.tsx` | 룰렛 오브젝트 (5,1) 추가, drawRoulette 함수 추가 |
| `src/types/database.ts` | `RouletteLog` 타입 추가 |
| `src/app/(main)/layout.tsx` | 룰렛 패널 렌더링 추가 |

---

## 구현 순서

1. `supabase/migration_roulette.sql` 작성 및 실행
2. `src/types/database.ts` — RouletteLog 타입
3. `src/stores/panel-store.ts` — "roulette" 추가
4. `src/lib/roulette/logic.ts` — 확률/보상 로직
5. `src/components/panels/compact-roulette-panel.tsx` — UI
6. `src/components/office/virtual-office.tsx` — 오브젝트 + 드로우 함수
7. `src/app/(main)/layout.tsx` — 패널 연결

---

## 스코프 외 (Out of Scope)

- 서버사이드 확률 조작 방지 (추후 Edge Function으로 강화 가능)
- 룰렛 히스토리 전체 조회 페이지
- 커피이용권 사용 처리 (어드민 확인으로 종료)

---

## 리스크

| 리스크 | 대응 |
|--------|------|
| 클라이언트 랜덤 조작 가능성 | MVP 단계 수용 (팀 내부 서비스), 추후 서버 검증 추가 |
| 연속 free_spin 무한 루프 UX | 스핀 카운터 UI 표시 ("n번 연속 무료!")로 피드백 제공 |
| 포인트 차감 실패 시 보상 지급 | Supabase RPC 원자적 처리로 방지 |
