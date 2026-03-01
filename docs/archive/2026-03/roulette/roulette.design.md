# roulette Design

## 참조 문서
- Plan: `docs/01-plan/features/roulette.plan.md`

---

## 1. DB 스키마

### 1-1. 신규 테이블: `roulette_logs`

```sql
CREATE TABLE roulette_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  result      VARCHAR(30) NOT NULL
              CHECK (result IN (
                'nothing','free_spin','points_150',
                'points_300','points_500','coffee_voucher'
              )),
  points_spent  INT NOT NULL DEFAULT 100,   -- 0 = free_spin 재스핀
  points_gained INT NOT NULL DEFAULT 0,
  is_free_spin  BOOLEAN NOT NULL DEFAULT FALSE,
  spin_chain    INT NOT NULL DEFAULT 0,     -- 연속 free_spin 카운트
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE roulette_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can read own logs"
  ON roulette_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users can insert own logs"
  ON roulette_logs FOR INSERT WITH CHECK (user_id = auth.uid());
```

### 1-2. 커피이용권 알림 트리거

```sql
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_roulette_coffee_voucher ON roulette_logs;
CREATE TRIGGER on_roulette_coffee_voucher
  AFTER INSERT ON roulette_logs
  FOR EACH ROW EXECUTE FUNCTION notify_roulette_coffee_voucher();
```

### 1-3. `notifications.type` CHECK 제약 확장

```sql
-- 기존 type 컬럼에 'roulette_voucher' 허용 (CHECK 없으면 VARCHAR 자동 허용)
-- CHECK 제약이 있는 경우에만 아래 실행
-- ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
```

---

## 2. TypeScript 타입

### 2-1. `src/types/database.ts` 추가

```typescript
// 룰렛 결과 타입
export type RouletteResult =
  | "nothing"
  | "free_spin"
  | "points_150"
  | "points_300"
  | "points_500"
  | "coffee_voucher"

// 룰렛 기록
export interface RouletteLog {
  id: string
  user_id: string
  result: RouletteResult
  points_spent: number
  points_gained: number
  is_free_spin: boolean
  spin_chain: number
  created_at: string
}
```

### 2-2. `NotificationType` 확장

```typescript
// 기존:
export type NotificationType =
  | "task_assigned"
  | "assignee_added"
  | "comment_added"
  | "general"

// 변경 후 (roulette_voucher 추가):
export type NotificationType =
  | "task_assigned"
  | "assignee_added"
  | "comment_added"
  | "roulette_voucher"   // 신규
  | "general"
```

---

## 3. 룰렛 로직 (`src/lib/roulette/logic.ts`)

```typescript
import type { RouletteResult } from "@/types/database"

export interface RouletteSegment {
  result: RouletteResult
  label: string
  probability: number
  pointsGained: number
  color: string
  emoji: string
  /** conic-gradient 시작 각도 (deg) */
  startDeg: number
  /** conic-gradient 종료 각도 (deg) */
  endDeg: number
}

export const ROULETTE_SEGMENTS: RouletteSegment[] = [
  { result: "nothing",        label: "꽝",         probability: 0.35, pointsGained: 0,   color: "#6b7280", emoji: "😢", startDeg: 0,   endDeg: 126 },
  { result: "free_spin",      label: "한번 더!",    probability: 0.30, pointsGained: 0,   color: "#3b82f6", emoji: "🔄", startDeg: 126, endDeg: 234 },
  { result: "points_150",     label: "150P",       probability: 0.15, pointsGained: 150, color: "#22c55e", emoji: "💰", startDeg: 234, endDeg: 288 },
  { result: "points_300",     label: "300P",       probability: 0.10, pointsGained: 300, color: "#f59e0b", emoji: "💎", startDeg: 288, endDeg: 324 },
  { result: "points_500",     label: "500P",       probability: 0.05, pointsGained: 500, color: "#a855f7", emoji: "👑", startDeg: 324, endDeg: 342 },
  { result: "coffee_voucher", label: "☕ 커피",     probability: 0.05, pointsGained: 0,   color: "#ef4444", emoji: "☕", startDeg: 342, endDeg: 360 },
]

/** 확률 기반 랜덤 결과 반환 */
export function spinRoulette(): RouletteResult {
  const rand = Math.random()
  let cumulative = 0
  for (const seg of ROULETTE_SEGMENTS) {
    cumulative += seg.probability
    if (rand < cumulative) return seg.result
  }
  return "nothing"
}

/**
 * 결과에 해당하는 세그먼트 중앙 각도 반환
 * 포인터가 최상단(0°)에 고정 → 해당 각도가 최상단에 오도록 회전량 계산
 */
export function getLandingRotation(result: RouletteResult, baseRotation: number): number {
  const seg = ROULETTE_SEGMENTS.find(s => s.result === result)!
  const centerDeg = (seg.startDeg + seg.endDeg) / 2
  // 세그먼트 중앙이 포인터(0°)에 오려면: 360 - centerDeg
  const targetAngle = 360 - centerDeg
  // 현재 회전에서 4바퀴(1440°) 추가 + 목표 각도
  const fullRotations = Math.ceil(baseRotation / 360) * 360 + 1440
  return fullRotations + targetAngle
}
```

---

## 4. 패널 스토어 (`src/stores/panel-store.ts`)

```typescript
// 변경 전:
export type PanelType =
  | "tasks" | "league" | "shop" | "mypage" | "settings" | "admin" | "notifications"

// 변경 후:
export type PanelType =
  | "tasks" | "league" | "shop" | "mypage"
  | "settings" | "admin" | "notifications"
  | "roulette"   // 신규 추가
```

---

## 5. 가상 사무실 (`src/components/office/virtual-office.tsx`)

### 5-1. `ObjType` 확장

```typescript
// 변경 전:
type ObjType =
  | "wall" | "chalkboard" | "trophy_case" | "mirror"
  | "printer" | "vending" | "admin_desk"
  | "plant" | "desk" | "bookshelf" | "sofa" | "water_cooler" | "chair"

// 변경 후 (roulette 추가):
type ObjType =
  | "wall" | "chalkboard" | "trophy_case" | "mirror"
  | "printer" | "vending" | "admin_desk" | "roulette"    // roulette 추가
  | "plant" | "desk" | "bookshelf" | "sofa" | "water_cooler" | "chair"
```

### 5-2. `OBJS` 배열에 룰렛 오브젝트 추가

```typescript
// 기존 과제보드:
{ x: 5, y: 5, w: 2, h: 1, type: "chalkboard", label: "📋 과제 보드", interactable: true, panelType: "tasks" },

// 신규 룰렛 (과제보드 4칸 위):
{ x: 5, y: 1, w: 2, h: 1, type: "roulette", label: "🎰 룰렛", interactable: true, panelType: "roulette" },
```

> 위치 충돌 확인: (5,1), (6,1) — 현재 (1,1) 식물, (3,1) 책장, (10,1) 식물만 배치, **충돌 없음**

### 5-3. `drawObj` switch-case 추가

```typescript
case "roulette": {
  // 2타일 너비 슬롯머신 스타일 룰렛 머신
  // 본체 (딥 퍼플 그라디언트 효과)
  c.fillStyle = "#4c1d95"          // 어두운 보라
  c.fillRect(x + 1, y + 1, w - 2, h * T - 2)
  c.fillStyle = "#5b21b6"          // 중간 보라 (하이라이트)
  c.fillRect(x + 1, y + 1, w - 2, 2)

  // 상단 간판 ("ROULETTE" 텍스트 대신 황금 LED 패턴)
  c.fillStyle = "#fbbf24"          // 골드
  c.fillRect(x + 2, y + 1, w - 4, 2)
  c.fillStyle = "#f59e0b"
  for (let i = x + 3; i < x + w - 3; i += 2)
    c.fillRect(i, y + 1, 1, 1)    // LED 점 패턴

  // 휠 영역 (원형 표현 → 타일 제약으로 사각형 중앙 원형 느낌)
  c.fillStyle = "#1c1917"          // 어두운 배경
  c.fillRect(x + 3, y + 3, w - 6, 7)
  // 6칸 컬러 세그먼트 (휠 미니어처)
  const segColors = ["#6b7280","#3b82f6","#22c55e","#f59e0b","#a855f7","#ef4444"]
  segColors.forEach((col, i) => {
    c.fillStyle = col
    c.fillRect(x + 3 + i * 2, y + 4, 2, 5)
  })
  // 포인터 (삼각형 → 직사각형으로 표현)
  c.fillStyle = "#fbbf24"
  c.fillRect(x + Math.floor(w / 2) - 1, y + 3, 2, 2)

  // 스핀 버튼 (중앙 하단)
  c.fillStyle = "#7c3aed"
  c.fillRect(x + 4, y + 10, w - 8, 2)
  c.fillStyle = "#a78bfa"          // 버튼 하이라이트
  c.fillRect(x + 4, y + 10, w - 8, 1)

  // 하단 동전 투입구
  c.fillStyle = "#1c1917"
  c.fillRect(x + Math.floor(w / 2) - 1, y + 12, 2, 1)
  break
}
```

---

## 6. 룰렛 패널 UI (`src/components/panels/compact-roulette-panel.tsx`)

### 6-1. 컴포넌트 구조

```
CompactRoulettePanelProps: (없음)

State:
  - spinState: "idle" | "spinning" | "result"
  - currentRotation: number          // 현재 휠 회전 각도 (CSS transform)
  - lastResult: RouletteSegment | null
  - spinChain: number                // 연속 free_spin 횟수
  - logs: RouletteLog[]              // 최근 스핀 기록 (최대 5건)
  - isLoading: boolean

Hooks:
  - useAuthStore() → user, setUser

Functions:
  - handleSpin(isFreeSpin: boolean)
  - loadLogs()
  - renderWheel()
  - renderResult()
  - renderHistory()
```

### 6-2. UI 레이아웃

```
┌──────────────────────────────────┐
│  🎰 룰렛         ★ 250P          │  ← header (bg-primary/10)
├──────────────────────────────────┤
│                                  │
│         ▼ (포인터, 고정)           │
│      ┌──────────┐                │
│      │  conic   │  ← 150px 원형   │
│      │ gradient │    CSS 휠       │
│      │   wheel  │                │
│      └──────────┘                │
│                                  │
│  [  🎰 스핀하기! 100P  ]          │  ← spin button
│  ※ 포인트가 부족합니다 (100P 필요)   │  ← 조건부 경고
│                                  │
│  ┌─ 결과 메시지 ─────────────────┐ │
│  │  "💰 +150포인트 획득!"         │ │  ← lastResult 있을 때
│  │  "🔄 3번 연속 무료 스핀!"       │ │
│  └──────────────────────────────┘ │
├──────────────────────────────────┤
│  최근 스핀 기록                    │
│  😢 꽝          방금              │
│  💰 +150P       2분 전            │
│  🔄 한번 더     5분 전            │
└──────────────────────────────────┘
```

### 6-3. 스핀 처리 흐름

```
handleSpin(isFreeSpin)
  ├── if !isFreeSpin && user.points < 100 → toast.error("포인트 부족")
  ├── spinState = "spinning"
  ├── result = spinRoulette()
  ├── newRotation = getLandingRotation(result, currentRotation)
  ├── setCurrentRotation(newRotation)  ← CSS transition 2s ease-out 시작
  ├── await sleep(2200)               ← 애니메이션 완료 대기
  ├── spinState = "result"
  ├── [DB 처리]
  │   ├── supabase INSERT roulette_logs(result, points_spent, is_free_spin, spin_chain)
  │   ├── if !isFreeSpin → profiles.points -= 100 + point_logs INSERT
  │   ├── if pointsGained > 0 → profiles.points += gained, total_points_earned += gained
  │   │   + point_logs INSERT
  │   └── setUser(updated profile)
  ├── if result === "free_spin"
  │   ├── show "🔄 한번 더 돌리기!" message
  │   ├── await sleep(1000)
  │   └── handleSpin(isFreeSpin: true, chain: spinChain + 1)
  └── loadLogs()  ← 기록 갱신
```

### 6-4. CSS 휠 스핀 애니메이션

```tsx
// 휠 div style
const wheelStyle = {
  background: `conic-gradient(
    #6b7280 0deg 126deg,   /* 꽝 35% */
    #3b82f6 126deg 234deg, /* 한번 더 30% */
    #22c55e 234deg 288deg, /* 150P 15% */
    #f59e0b 288deg 324deg, /* 300P 10% */
    #a855f7 324deg 342deg, /* 500P 5% */
    #ef4444 342deg 360deg  /* 커피 5% */
  )`,
  transform: `rotate(${currentRotation}deg)`,
  transition: spinState === "spinning"
    ? "transform 2s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
    : "none",
  width: 140,
  height: 140,
  borderRadius: "50%",
}
```

> **참고**: 포인터는 `position: absolute` 로 휠 컨테이너 상단에 고정 삼각형(▼).

---

## 7. DB 처리 세부 설계 (포인트 트랜잭션)

### 7-1. 스핀 시 포인트 처리 순서

```
1. INSERT roulette_logs
2. if !isFreeSpin:
   - UPDATE profiles SET points = points - 100 WHERE id = user_id
   - INSERT point_logs (amount: -100, reason: "룰렛 스핀")
3. if result in ['points_150', 'points_300', 'points_500']:
   - UPDATE profiles SET
       points = points + gained,
       total_points_earned = total_points_earned + gained
   - INSERT point_logs (amount: +gained, reason: "룰렛 당첨: {label}")
4. setUser(최신 profile)
```

### 7-2. 오류 처리

- Step 1 실패 → toast.error, spinState = "idle", 포인트 차감 없음
- Step 2-3 실패 → toast.error, 이미 기록된 roulette_logs는 유지 (정합성 경고)

---

## 8. layout.tsx 변경 없음

`compact-roulette-panel.tsx`는 기존 패널들과 동일하게 `compact-shell.tsx` 내에서 렌더링된다.
라우팅 기반이 아닌 패널 스토어(`panelType: "roulette"`) 방식이므로 layout.tsx 수정 불필요.

대신 **패널을 렌더링하는 컴포넌트** (현재 `CompactShell` 내부 또는 페이지 파일)에서
`"roulette"` 케이스를 추가해야 한다. 기존 패턴 확인 필요.

---

## 9. 구현 순서

1. `supabase/migration_roulette.sql`
2. `src/types/database.ts` — RouletteResult, RouletteLog, NotificationType 확장
3. `src/lib/roulette/logic.ts` — ROULETTE_SEGMENTS, spinRoulette(), getLandingRotation()
4. `src/stores/panel-store.ts` — "roulette" 추가
5. `src/components/panels/compact-roulette-panel.tsx` — 전체 UI
6. `src/components/office/virtual-office.tsx` — ObjType, OBJS, drawObj case
7. 패널 렌더링 위치 확인 후 "roulette" 케이스 추가

---

## 10. 파일 목록 요약

| 파일 | 유형 | 주요 변경 |
|------|------|-----------|
| `supabase/migration_roulette.sql` | 신규 | roulette_logs 테이블 + 커피 알림 트리거 |
| `src/types/database.ts` | 수정 | RouletteResult, RouletteLog, NotificationType |
| `src/lib/roulette/logic.ts` | 신규 | 확률/세그먼트/회전각 계산 |
| `src/stores/panel-store.ts` | 수정 | "roulette" PanelType 추가 |
| `src/components/panels/compact-roulette-panel.tsx` | 신규 | 룰렛 UI 패널 전체 |
| `src/components/office/virtual-office.tsx` | 수정 | ObjType + OBJS(5,1) + drawObj case |
| 패널 렌더링 파일 (구현 중 확인) | 수정 | "roulette" 케이스 렌더링 |
