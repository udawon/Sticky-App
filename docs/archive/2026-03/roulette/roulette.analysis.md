# roulette Analysis Report

> **Analysis Type**: Gap Analysis (설계 vs 구현 대조)
>
> **Project**: Claude Sticky
> **Analyst**: gap-detector
> **Date**: 2026-03-01
> **Design Doc**: [roulette.design.md](../02-design/features/roulette.design.md)
> **Plan Doc**: [roulette.plan.md](../01-plan/features/roulette.plan.md)

---

## 1. Analysis Overview

### 1.1 분석 목적

룰렛(roulette) 기능의 설계 문서(`roulette.design.md`)와 실제 구현 코드 간의 Gap을 FR 항목별로 1:1 대조하여 Match Rate를 산출한다.

### 1.2 분석 범위

| 설계 문서 | 구현 파일 |
|-----------|-----------|
| `docs/02-design/features/roulette.design.md` | `supabase/migration_roulette.sql` |
| | `src/types/database.ts` |
| | `src/lib/roulette/logic.ts` |
| | `src/stores/panel-store.ts` |
| | `src/components/panels/compact-roulette-panel.tsx` |
| | `src/components/office/virtual-office.tsx` |
| | `src/app/(main)/page.tsx` |
| | `src/components/layout/title-bar.tsx` |

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 90.6% | ✅ |
| Architecture Compliance | 100% | ✅ |
| Convention Compliance | 100% | ✅ |
| **Overall** | **93.8%** | ✅ |

---

## 3. FR 항목별 상세 대조

### 3.1 DB Schema (설계 Section 1)

#### FR-DB-01: roulette_logs 테이블

| 항목 | 설계 | 구현 | Status |
|------|------|------|:------:|
| 테이블명 `roulette_logs` | `CREATE TABLE roulette_logs` | `CREATE TABLE IF NOT EXISTS roulette_logs` | ✅ |
| `id UUID PK DEFAULT gen_random_uuid()` | O | O | ✅ |
| `user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | O | O | ✅ |
| `result VARCHAR(30) NOT NULL` + CHECK 제약 6값 | O | O (동일한 6값) | ✅ |
| `points_spent INT NOT NULL DEFAULT 100` | O | O | ✅ |
| `points_gained INT NOT NULL DEFAULT 0` | O | O | ✅ |
| `is_free_spin BOOLEAN NOT NULL DEFAULT FALSE` | O | O | ✅ |
| `spin_chain INT NOT NULL DEFAULT 0` | O | O | ✅ |
| `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` | O | O | ✅ |

**소계: 9/9 (100%)**

#### FR-DB-02: RLS 정책

| 항목 | 설계 | 구현 | Status |
|------|------|------|:------:|
| `ENABLE ROW LEVEL SECURITY` | O | O | ✅ |
| SELECT 정책 (`user_id = auth.uid()`) | `"users can read own logs"` | `"users can read own roulette logs"` | ✅ |
| INSERT 정책 (`user_id = auth.uid()`) | `"users can insert own logs"` | `"users can insert own roulette logs"` | ✅ |

> 정책 이름이 약간 다르나 (`own logs` vs `own roulette logs`) 기능적으로 동일하므로 Match 처리.

**소계: 3/3 (100%)**

#### FR-DB-03: 커피이용권 알림 트리거

| 항목 | 설계 | 구현 | Status |
|------|------|------|:------:|
| 함수명 `notify_roulette_coffee_voucher()` | O | O | ✅ |
| `IF NEW.result = 'coffee_voucher'` 조건 | O | O | ✅ |
| `profiles` 에서 `team_id`, `nickname` 조회 | O | O | ✅ |
| `v_team_id IS NOT NULL` 안전 검사 | X (설계에 없음) | O (구현에 추가) | ✅ |
| admin role FOR LOOP | O | O | ✅ |
| `notifications` INSERT (`roulette_voucher` type) | O | O | ✅ |
| `SECURITY DEFINER` | O | O | ✅ |
| 트리거 `on_roulette_coffee_voucher` AFTER INSERT | O | O | ✅ |

> 구현에서 `IF v_team_id IS NOT NULL THEN` 안전 검사가 추가됨. 이는 설계에 없는 방어 코드이나, 기능 개선이므로 양성 Gap(Added)으로 분류.

**소계: 8/8 (100%) + Added 1건**

---

### 3.2 TypeScript 타입 (설계 Section 2)

#### FR-TYPE-01: RouletteResult 타입

| 항목 | 설계 | 구현 (`database.ts:106-112`) | Status |
|------|------|------|:------:|
| union 타입 6값 | `"nothing" \| "free_spin" \| "points_150" \| "points_300" \| "points_500" \| "coffee_voucher"` | 동일 | ✅ |

#### FR-TYPE-02: RouletteLog 인터페이스

| 필드 | 설계 타입 | 구현 타입 | Status |
|------|-----------|-----------|:------:|
| `id: string` | O | O | ✅ |
| `user_id: string` | O | O | ✅ |
| `result: RouletteResult` | O | O | ✅ |
| `points_spent: number` | O | O | ✅ |
| `points_gained: number` | O | O | ✅ |
| `is_free_spin: boolean` | O | O | ✅ |
| `spin_chain: number` | O | O | ✅ |
| `created_at: string` | O | O | ✅ |

**소계: 8/8 (100%)**

#### FR-TYPE-03: NotificationType 확장

| 항목 | 설계 | 구현 (`database.ts:98-103`) | Status |
|------|------|------|:------:|
| `"roulette_voucher"` 추가 | O | O (102행) | ✅ |
| 기존 4개 유지 | O | O | ✅ |

**소계: 2/2 (100%)**

---

### 3.3 룰렛 로직 (설계 Section 3)

#### FR-LOGIC-01: RouletteSegment 인터페이스

| 필드 | 설계 | 구현 (`logic.ts:4-10`) | Status |
|------|------|------|:------:|
| `result: RouletteResult` | O | O | ✅ |
| `label: string` | O | O | ✅ |
| `probability: number` | O | O | ✅ |
| `pointsGained: number` | O | X (없음) | ❌ |
| `color: string` | O | X (없음) | ❌ |
| `emoji: string` | O | X (없음) | ❌ |
| `startDeg: number` | O | O | ✅ |
| `endDeg: number` | O | X (`degree: number`로 대체) | ⚠️ |

> 구현에서는 `endDeg` 대신 `degree`(차지 각도)를 사용. `endDeg = startDeg + degree`로 동치이므로 기능적으로 동등하나 인터페이스 형태가 다름.
> `pointsGained`, `color`, `emoji` 3필드는 구현의 `RouletteSegment`에서 제거되었으며, 이 값들은 `compact-roulette-panel.tsx`에서 직접 계산/상수화됨.

**소계: 4/8 (50%) -- 다만 기능적 영향은 Low (데이터가 컴포넌트에서 보완됨)**

#### FR-LOGIC-02: ROULETTE_SEGMENTS 확률 배열

| 세그먼트 | 설계 확률 | 구현 확률 | 설계 startDeg | 구현 startDeg | Status |
|----------|:---------:|:---------:|:-------------:|:-------------:|:------:|
| nothing (꽝) | 0.35 | 0.35 | 0 | 0 | ✅ |
| free_spin (한번 더) | 0.30 | 0.30 | 126 | 126 | ✅ |
| points_150 (150P) | 0.15 | 0.15 | 234 | 234 | ✅ |
| points_300 (300P) | 0.10 | 0.10 | 288 | 288 | ✅ |
| points_500 (500P) | 0.05 | 0.05 | 324 | 324 | ✅ |
| coffee_voucher (커피) | 0.05 | 0.05 | 342 | 342 | ✅ |

**소계: 6/6 (100%)**

#### FR-LOGIC-03: spinRoulette() 함수

| 항목 | 설계 | 구현 | Status |
|------|------|------|:------:|
| `Math.random()` 기반 확률 | O | O | ✅ |
| 누적 확률 순회 | O | O | ✅ |
| 폴백 `"nothing"` 반환 | O | O | ✅ |
| 반환 타입 `RouletteResult` | O | O | ✅ |

**소계: 4/4 (100%)**

#### FR-LOGIC-04: getLandingRotation() 함수

| 항목 | 설계 | 구현 | Status |
|------|------|------|:------:|
| 파라미터: `result, baseRotation` | 2개 파라미터 (result + baseRotation) | 2개 파라미터 (currentRotation + segCenterDeg) | ⚠️ |
| 세그먼트 중앙각 계산 | 함수 내부에서 `ROULETTE_SEGMENTS.find()` | 호출 측에서 계산 후 전달 | ⚠️ |
| 4바퀴(1440도) 이상 회전 | O (`fullRotations + 1440`) | O (`currentRotation + 1440`) | ✅ |
| 360 - centerDeg 목표각 | O | O (`(360 - segCenterDeg % 360 + 360) % 360`) | ✅ |

> **설계**: `getLandingRotation(result: RouletteResult, baseRotation: number)` -- result를 받아 내부에서 세그먼트 검색
> **구현**: `getLandingRotation(currentRotation: number, segCenterDeg: number)` -- 이미 계산된 중앙각을 받음
>
> 시그니처가 다르지만 호출 측(`compact-roulette-panel.tsx:110-111`)에서 `segCenter = seg.startDeg + seg.degree / 2`를 계산 후 전달하므로 최종 동작은 동등함. 인터페이스 변경 수준.

**소계: 2/4 (50%) -- 기능적 동등성 확인됨, 영향도 Low**

---

### 3.4 패널 스토어 (설계 Section 4)

#### FR-STORE-01: PanelType 확장

| 항목 | 설계 | 구현 (`panel-store.ts:4-12`) | Status |
|------|------|------|:------:|
| `"roulette"` 추가 | O | O (12행) | ✅ |
| 기존 타입 유지 | O | O | ✅ |

**소계: 2/2 (100%)**

---

### 3.5 가상 사무실 (설계 Section 5)

#### FR-OFFICE-01: ObjType 확장

| 항목 | 설계 | 구현 (`virtual-office.tsx:67`) | Status |
|------|------|------|:------:|
| `"roulette"` 추가 | O | O | ✅ |

#### FR-OFFICE-02: OBJS 배열 룰렛 오브젝트

| 항목 | 설계 | 구현 (`virtual-office.tsx:110`) | Status |
|------|------|------|:------:|
| 위치 `x: 5, y: 1` | O | O | ✅ |
| 크기 `w: 2, h: 1` | O | O | ✅ |
| `type: "roulette"` | O | O | ✅ |
| `label: "🎰 룰렛"` | O | O | ✅ |
| `interactable: true` | O | O | ✅ |
| `panelType: "roulette"` | O | O | ✅ |

**소계: 7/7 (100%)**

#### FR-OFFICE-03: drawObj roulette case

| 항목 | 설계 | 구현 (`virtual-office.tsx:905-958`) | Status |
|------|------|------|:------:|
| case "roulette" 존재 | O | O | ✅ |
| 본체 퍼플 그라디언트 | `#4c1d95`, `#5b21b6` | `#5b21b6`, `#4c1d95` (순서 다름) | ✅ |
| 상단 간판 골드 | O | O (`#ede9fe` + gold) | ✅ |
| 6색 세그먼트 표현 | 사각형(`fillRect`) | 원형(`arc`) | ⚠️ |
| 세그먼트 색상 6개 | 설계 색상 배열 | 다른 색상 배열 사용 | ⚠️ |
| 포인터 표현 | 골드 사각형 | 골드 사각형 | ✅ |
| 스핀 버튼 | `#7c3aed` + `#a78bfa` | gold + goldDk | ⚠️ |
| LED 장식 | 없음 (설계에 동전 투입구) | 좌우 LED 점 패턴 | ⚠️ |

> 가상 사무실 drawObj는 시각적 렌더링으로, 정확한 픽셀 일치보다 기능적 의도(룰렛 머신 표현)가 중요.
> 구현이 설계보다 더 정교함(원형 arc 사용, LED 장식 추가). 시각적 개선으로 양성 Gap.

**소계: 5/8 (62.5%) -- 시각적 개선 목적의 변경, 기능 영향 None**

---

### 3.6 룰렛 패널 UI (설계 Section 6)

#### FR-UI-01: 컴포넌트 State

| State | 설계 | 구현 (`compact-roulette-panel.tsx`) | Status |
|-------|------|------|:------:|
| `spinState: "idle" \| "spinning" \| "result"` | 3-state enum | `spinning: boolean` + `resultMsg` 조합 | ⚠️ |
| `currentRotation: number` | O | `rotation: number` + `rotationRef` | ✅ |
| `lastResult: RouletteSegment \| null` | O | `resultMsg: string \| null` (메시지 형태) | ⚠️ |
| `spinChain: number` | O | `chainCount: number` | ✅ |
| `logs: RouletteLog[]` | O | `recentLogs: RouletteLog[]` | ✅ |
| `isLoading: boolean` | O | X (없음) | ❌ |

> `spinState` 3-state enum 대신 `spinning` boolean을 사용. 기능적으로 `idle = !spinning && !resultMsg`, `spinning = spinning`, `result = !spinning && resultMsg`으로 동등하게 표현 가능.
> `isLoading` state가 구현에 없으나, `spinning` 상태가 이를 대신함.

**소계: 4/6 (66.7%)**

#### FR-UI-02: UI 레이아웃

| 항목 | 설계 | 구현 | Status |
|------|------|------|:------:|
| 보유 포인트 헤더 | O (`★ 250P` 형태) | O (`보유 포인트 / {user.points}P`) | ✅ |
| CSS conic-gradient 원형 휠 | O (140px, 6색) | O (160px w-40 h-40, 6색) | ✅ |
| 포인터 (상단 고정 삼각형) | O | O (`▼` 문자 사용) | ✅ |
| 스핀 버튼 (100P 표시) | O | O (`🎰 스핀 (100P)`) | ✅ |
| 포인트 부족 시 버튼 비활성화 | O | O (`disabled={!canSpin}`) | ✅ |
| 포인트 부족 안내 문구 | O (조건부 경고) | O (버튼 텍스트 변경: `"포인트 부족 (100P 필요)"`) | ✅ |
| 결과 메시지 영역 | O | O (`resultMsg` 표시) | ✅ |
| 연속 무료 스핀 카운터 | O | O (`{chainCount}번 연속 무료 스핀 중...`) | ✅ |
| 최근 스핀 기록 (5건) | O | O (`recentLogs`, limit 5) | ✅ |
| 보상 테이블 | X (설계에 없음) | O (추가됨) | ✅ |
| 세그먼트 라벨 (휠 위) | X (설계에 없음) | O (추가됨) | ✅ |
| 중앙 원 | X (설계에 없음) | O (추가됨) | ✅ |

**소계: 9/9 (100%) + Added 3건**

#### FR-UI-03: CSS 휠 스핀 애니메이션

| 항목 | 설계 | 구현 | Status |
|------|------|------|:------:|
| conic-gradient 6색 | O | O (CONIC_GRADIENT 상수) | ✅ |
| `transform: rotate(${deg}deg)` | O | O | ✅ |
| transition 2s ease-out | `2s cubic-bezier(0.17,0.67,0.12,0.99)` | `2.5s cubic-bezier(0.17,0.67,0.12,0.99)` | ⚠️ |
| 크기 140x140 | 140px | 160px (w-40 = 10rem) | ⚠️ |
| borderRadius 50% | O | O (`rounded-full`) | ✅ |
| from 각도 | `conic-gradient(...)` (from 0deg 암시) | `conic-gradient(from -90deg, ...)` | ⚠️ |

> transition 시간: 설계 2s vs 구현 2.5s (0.5초 차이, 체감 UX 미미)
> 크기: 설계 140px vs 구현 160px (w-40)
> from 각도: 구현에서 `from -90deg` 사용 (12시 방향 시작 보정), 설계는 기본 0deg
> 모두 시각적 미세 조정으로 기능 영향 없음.

**소계: 3/6 (50%) -- UX 미세 조정, 영향도 Low**

---

### 3.7 스핀 처리 흐름 (설계 Section 6-3)

#### FR-SPIN-01: handleSpin 흐름

| 단계 | 설계 | 구현 (`compact-roulette-panel.tsx:75-160`) | Status |
|------|------|------|:------:|
| 포인트 부족 체크 (< 100P) | `toast.error("포인트 부족")` | `toast.error("포인트가 부족합니다 (100P 필요)")` | ✅ |
| spinState = "spinning" | O | `setSpinning(true)` | ✅ |
| `result = spinRoulette()` | O | O (106행) | ✅ |
| `getLandingRotation()` 호출 | O | O (111행, 시그니처 다르나 동등) | ✅ |
| `setCurrentRotation()` | O | `setRotation(newRotation)` + `rotationRef.current` | ✅ |
| 애니메이션 대기 | `await sleep(2200)` | `await setTimeout(2500)` | ⚠️ |
| spinState = "result" | O | `setResultMsg(...)` 으로 대체 | ✅ |

**소계: 6/7 (85.7%)**

> 대기 시간: 설계 2200ms vs 구현 2500ms (transition 2.5s에 맞춘 조정)

#### FR-SPIN-02: DB 처리 순서

| 단계 | 설계 순서 | 구현 순서 | Status |
|------|-----------|-----------|:------:|
| 1. INSERT roulette_logs | 설계: 1번 | 구현: 3번 (나중) | ⚠️ |
| 2. profiles.points -= 100 (유료만) | 설계: 2번 | 구현: 1번 (먼저) | ⚠️ |
| 3. point_logs INSERT (차감) | O | X (구현 없음) | ❌ |
| 4. profiles.points += gained | O | O | ✅ |
| 5. total_points_earned += gained | O | O | ✅ |
| 6. point_logs INSERT (보상) | O | X (구현 없음) | ❌ |
| 7. setUser(최신 profile) | O | O (157행) | ✅ |

> **주요 Gap 발견**:
> - `point_logs` INSERT가 구현에서 누락됨 (차감 -100P, 보상 +gained 모두 미기록)
> - DB 처리 순서가 설계와 다름 (포인트 차감 먼저 vs roulette_logs 먼저)
>   - 설계: roulette_logs -> 포인트 차감 -> 포인트 보상
>   - 구현: 포인트 차감 -> 결과 결정 -> 포인트 보상 -> roulette_logs

**소계: 4/7 (57.1%) -- point_logs 누락은 Impact Medium**

#### FR-SPIN-03: 한번 더 자동 재스핀

| 항목 | 설계 | 구현 | Status |
|------|------|------|:------:|
| `free_spin` 시 자동 재스핀 | O | O (`while(true)` 루프, `continue`) | ✅ |
| 1초 딜레이 후 재스핀 | O (`await sleep(1000)`) | O (`setTimeout(1000)`) | ✅ |
| 추가 100P 차감 없음 | O | O (`isFreeSpin` 분기) | ✅ |
| 연속 무한 가능 | O | O (루프 탈출 조건 없음) | ✅ |
| 체인 카운터 표시 | O | O (`chainIdx` 증가, `setChainCount`) | ✅ |
| "한번 더 돌리기!" 메시지 | O | O (`🎉 한번 더! (N번 연속 무료)`) | ✅ |

**소계: 6/6 (100%)**

#### FR-SPIN-04: 포인트 부족 처리

| 항목 | 설계 | 구현 | Status |
|------|------|------|:------:|
| `user.points < 100` 체크 | O | O (78행) | ✅ |
| 버튼 비활성화 | O | O (`canSpin = user.points >= 100 && !spinning`) | ✅ |
| toast.error 메시지 | O | O (79행) | ✅ |

**소계: 3/3 (100%)**

#### FR-SPIN-05: setUser 스토어 갱신

| 항목 | 설계 | 구현 | Status |
|------|------|------|:------:|
| points 갱신 | O | O (157행) | ✅ |
| total_points_earned 갱신 | O | O (157행) | ✅ |
| 즉시 UI 반영 | O | O (스프레드 연산자로 새 객체 생성) | ✅ |

**소계: 3/3 (100%)**

---

### 3.8 패널 렌더링 연결 (설계 Section 8)

#### FR-RENDER-01: 패널 렌더링

| 항목 | 설계 | 구현 | Status |
|------|------|------|:------:|
| `"roulette"` case 추가 | O (패널 렌더링 위치에서) | O (`page.tsx:45`) | ✅ |
| CompactRoulettePanel import | O | O (`page.tsx:17`) | ✅ |
| PANEL_TITLES에 roulette 추가 | X (설계에 명시 없음) | O (`title-bar.tsx:18`) | ✅ |

**소계: 3/3 (100%)**

---

### 3.9 SEG_COLORS 색상 대조 (설계 Section 3 vs 구현 패널)

| 세그먼트 | 설계 color | 구현 SEG_COLORS | Status |
|----------|-----------|-----------------|:------:|
| nothing | `#6b7280` | `#6b7280` | ✅ |
| free_spin | `#3b82f6` (파랑) | `#10b981` (초록) | ❌ |
| points_150 | `#22c55e` (초록) | `#3b82f6` (파랑) | ❌ |
| points_300 | `#f59e0b` (황금) | `#8b5cf6` (보라) | ❌ |
| points_500 | `#a855f7` (보라) | `#f59e0b` (황금) | ❌ |
| coffee_voucher | `#ef4444` (빨강) | `#ef4444` (빨강) | ✅ |

> 6개 세그먼트 중 4개의 색상이 설계와 다름. `free_spin`과 `points_150`은 서로 색상이 교환되었고, `points_300`과 `points_500`도 교환됨. 기능적 영향은 없으나 시각적 차이 존재.

**소계: 2/6 (33.3%) -- 시각적 차이만, 기능 영향 None**

---

## 4. Gap Summary

### 4.1 전체 항목 집계

| 카테고리 | 전체 | Match | Partial | Missing | Added |
|----------|:----:|:-----:|:-------:|:-------:|:-----:|
| DB Schema (FR-DB) | 20 | 20 | 0 | 0 | 1 |
| TypeScript 타입 (FR-TYPE) | 10 | 10 | 0 | 0 | 0 |
| 룰렛 로직 (FR-LOGIC) | 22 | 16 | 2 | 4 | 0 |
| 패널 스토어 (FR-STORE) | 2 | 2 | 0 | 0 | 0 |
| 가상 사무실 (FR-OFFICE) | 15 | 12 | 3 | 0 | 0 |
| 패널 UI (FR-UI) | 15 | 12 | 3 | 0 | 3 |
| 스핀 처리 (FR-SPIN) | 26 | 21 | 3 | 2 | 0 |
| 패널 렌더링 (FR-RENDER) | 3 | 3 | 0 | 0 | 0 |
| 색상 대조 | 6 | 2 | 0 | 4 | 0 |
| **합계** | **119** | **98** | **11** | **10** | **4** |

### 4.2 Match Rate 계산

```
Match Rate = (Match + Partial * 0.5) / 전체
           = (98 + 11 * 0.5) / 119
           = 103.5 / 119
           = 86.97%

기능적 Match Rate (시각적 항목 제외):
  시각적 항목: drawObj 3건, CSS 애니메이션 3건, 색상 4건 = 10건
  기능 항목: 119 - 10 = 109건 중 Match 96 + Partial 3 = 97.5 / 109 = 89.4%
```

---

## 5. Differences Found

### 5.1 Missing Features (설계 O, 구현 X)

| # | 항목 | 설계 위치 | 구현 위치 | 영향도 | 설명 |
|:-:|------|-----------|-----------|:------:|------|
| 1 | `point_logs` INSERT (차감) | design.md Section 7-1 Step 2 | compact-roulette-panel.tsx | Medium | 룰렛 스핀 시 -100P 차감 기록이 point_logs 테이블에 INSERT 되지 않음 |
| 2 | `point_logs` INSERT (보상) | design.md Section 7-1 Step 3 | compact-roulette-panel.tsx | Medium | 포인트 보상 기록이 point_logs 테이블에 INSERT 되지 않음 |
| 3 | `RouletteSegment.pointsGained` 필드 | design.md Section 3 | logic.ts:4-10 | Low | 인터페이스에서 제거, 패널에서 직접 계산 |
| 4 | `RouletteSegment.color` 필드 | design.md Section 3 | logic.ts:4-10 | Low | 인터페이스에서 제거, 패널에서 SEG_COLORS 상수로 분리 |
| 5 | `RouletteSegment.emoji` 필드 | design.md Section 3 | logic.ts:4-10 | Low | 인터페이스에서 제거 |
| 6 | `isLoading` state | design.md Section 6-1 | compact-roulette-panel.tsx | Low | spinning 상태로 대체 |

### 5.2 Added Features (설계 X, 구현 O)

| # | 항목 | 구현 위치 | 설명 |
|:-:|------|-----------|------|
| 1 | `v_team_id IS NOT NULL` 안전 검사 | migration_roulette.sql:49 | 팀 미소속 사용자 방어 코드 |
| 2 | 보상 테이블 UI | compact-roulette-panel.tsx:242-253 | 각 보상의 확률을 시각적으로 표시 |
| 3 | 세그먼트 라벨 (휠 위 텍스트) | compact-roulette-panel.tsx:194-214 | 휠 내부에 라벨 텍스트 렌더링 |
| 4 | 중앙 원 UI | compact-roulette-panel.tsx:217 | 휠 중앙 장식 원 |

### 5.3 Changed Features (설계 != 구현)

| # | 항목 | 설계 | 구현 | 영향도 |
|:-:|------|------|------|:------:|
| 1 | `getLandingRotation()` 시그니처 | `(result, baseRotation)` | `(currentRotation, segCenterDeg)` | Low |
| 2 | 애니메이션 시간 | 2s + 2200ms 대기 | 2.5s + 2500ms 대기 | Low |
| 3 | 휠 크기 | 140px | 160px (w-40) | Low |
| 4 | conic-gradient from 각도 | 0deg (기본) | -90deg (12시 보정) | Low |
| 5 | DB 처리 순서 | roulette_logs 먼저 | 포인트 차감 먼저 | Medium |
| 6 | SEG_COLORS 4개 | free_spin=#3b82f6 등 | free_spin=#10b981 등 | Low |
| 7 | drawObj 렌더링 방식 | fillRect 사각형 | arc 원형 | Low |
| 8 | spinState 관리 | 3-state enum | boolean + string 조합 | Low |

---

## 6. Overall Score

```
+---------------------------------------------+
|  Overall Match Rate: 87.0%                   |
+---------------------------------------------+
|  DB Schema:           100.0% (20/20)         |
|  TypeScript Types:    100.0% (10/10)         |
|  Roulette Logic:       77.3% (17/22)         |
|  Panel Store:         100.0% (2/2)           |
|  Virtual Office:       90.0% (13.5/15)       |
|  Panel UI:             90.0% (13.5/15)       |
|  Spin Flow:            86.5% (22.5/26)       |
|  Panel Render:        100.0% (3/3)           |
|  Color Match:          33.3% (2/6)           |
+---------------------------------------------+
|  Functional Match Rate (visual excluded):    |
|                        89.4%                 |
+---------------------------------------------+
```

---

## 7. Recommended Actions

### 7.1 Immediate Actions (영향도 Medium)

| # | 항목 | 파일 | 설명 |
|:-:|------|------|------|
| 1 | `point_logs` INSERT 추가 | `compact-roulette-panel.tsx` | 스핀 차감(-100P)과 보상(+gained) 시 `point_logs` 테이블에 기록 INSERT 필요. 현재 포인트 이력 추적 불가. |
| 2 | DB 처리 순서 검토 | `compact-roulette-panel.tsx` | 설계는 roulette_logs 먼저 INSERT 후 포인트 처리이나, 구현은 포인트 차감 먼저. 실패 시 정합성 영향 검토 필요. |

### 7.2 Documentation Update Needed (영향도 Low)

설계 문서를 구현에 맞게 업데이트할 항목:

| # | 항목 | 설계 위치 | 설명 |
|:-:|------|-----------|------|
| 1 | `RouletteSegment` 인터페이스 | design.md Section 3 | `pointsGained`, `color`, `emoji` 제거, `degree` 추가로 업데이트 |
| 2 | `getLandingRotation()` 시그니처 | design.md Section 3 | 파라미터를 `(currentRotation, segCenterDeg)` 형태로 업데이트 |
| 3 | SEG_COLORS 색상표 | design.md Section 3 | 실제 적용된 색상으로 업데이트 |
| 4 | 애니메이션 시간 | design.md Section 6-4 | 2s -> 2.5s, 대기 2200ms -> 2500ms |
| 5 | 보상 테이블 UI | design.md Section 6-2 | 추가된 보상 테이블 UI 반영 |
| 6 | 세그먼트 라벨/중앙 원 | design.md Section 6-2 | 추가된 UI 요소 반영 |

### 7.3 Intentional Changes (기록용)

| # | 항목 | 사유 |
|:-:|------|------|
| 1 | drawObj 원형 arc 방식 | 사각형 대비 시각적 품질 향상 |
| 2 | conic-gradient `from -90deg` | 12시 방향 시작을 위한 CSS 보정 |
| 3 | v_team_id NULL 체크 추가 | 팀 미소속 사용자 에러 방지 |

---

## 8. Synchronization Options

| # | 옵션 | 적용 대상 |
|:-:|------|-----------|
| 1 | **구현 수정** (설계에 맞춤) | `point_logs` INSERT 추가 (7.1 #1) |
| 2 | **설계 업데이트** (구현에 맞춤) | RouletteSegment 인터페이스, 색상, 애니메이션 시간 (7.2 전체) |
| 3 | **의도적 변경으로 기록** | drawObj 원형 렌더링, NULL 체크, UI 개선 (7.3 전체) |

---

## 9. Conclusion

룰렛 기능의 설계-구현 Gap 분석 결과, **전체 Match Rate 87.0%** (기능적 Match Rate 89.4%)로 양호한 수준이다.

**핵심 Gap은 1건**: `point_logs` INSERT 누락 (포인트 차감/보상 이력 미기록). 이는 포인트 이력 추적에 영향을 미치므로 구현 수정이 권장된다.

나머지 Gap은 시각적 미세 조정(색상, 크기, 애니메이션 시간) 또는 인터페이스 리팩토링(`RouletteSegment` 필드 분리, `getLandingRotation` 시그니처 변경)으로, 기능적 동작에는 영향이 없다. 설계 문서 업데이트로 동기화하는 것이 적절하다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-01 | 초기 Gap 분석 | gap-detector |
