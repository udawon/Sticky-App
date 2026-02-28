# 알람(Notification) 기능 설계 문서

> **기반 플랜**: `docs/01-plan/features/notification.plan.md`
> **작성일**: 2026-02-28
> **상태**: Design Phase

---

## 1. 아키텍처 개요

```
┌────────────────────────────────────────────────────────┐
│                 Supabase (PostgreSQL)                  │
│                                                        │
│  tasks INSERT ──→ on_task_insert_notify ──┐            │
│  tasks UPDATE ──→ on_task_update_notify ──┤──→ notifications INSERT │
│  task_comments INSERT → on_comment_insert_notify ──┘   │
└────────────────┬───────────────────────────────────────┘
                 │ Realtime (postgres_changes)
                 ↓
┌────────────────────────────────────────────────────────┐
│             NotificationProvider (React)               │
│  - useEffect: 초기 알람 30개 로드                       │
│  - useEffect: Realtime 구독 (INSERT 감지)              │
│  - useEffect: unreadCount 변화 → IPC setBadge          │
└────────────┬───────────────────────────────────────────┘
             │ Zustand
             ↓
┌────────────────────────────────────────────────────────┐
│         useNotificationStore                           │
│  notifications[], unreadCount                          │
│  addNotification / markAsRead / markAllAsRead          │
└────────┬───────────────────────────────────────────────┘
         │                           │
         ↓                           ↓
┌─────────────────────┐    ┌─────────────────────────────┐
│    TitleBar          │    │  CompactNotificationsPanel  │
│  Bell + 빨간 dot     │    │  알람 목록 + 읽음 처리       │
└─────────────────────┘    └─────────────────────────────┘
         │ IPC (window.electronAPI.setBadge)
         ↓
┌────────────────────────────────────────────────────────┐
│             Electron Main Process                      │
│  ipcMain.on("set-badge") → tray.setImage(badge/normal) │
└────────────────────────────────────────────────────────┘
```

---

## 2. 데이터 모델

### 2-1. notifications 테이블 변경

기존 스키마에 `type` 컬럼만 추가 (나머지 그대로 유지):

```sql
-- notifications 테이블 현재 구조
CREATE TABLE notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       VARCHAR(50) DEFAULT 'general',   -- ← 추가
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN DEFAULT false,
  link       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2-2. TypeScript 타입

**`src/types/database.ts` 변경 사항:**

```typescript
// 추가
export type NotificationType =
  | 'task_assigned'    // 조건 A: 과제 생성 시 담당자
  | 'assignee_added'   // 조건 B: 기존 과제 담당자 추가
  | 'comment_added'    // 조건 C: 담당 과제에 메모 생성
  | 'general'          // 기타 수동 알람

// 수정 (type 필드 추가)
export interface Notification {
  id: string
  user_id: string
  type: NotificationType   // ← 추가
  title: string
  message: string
  read: boolean
  link: string | null
  created_at: string
}
```

---

## 3. DB 마이그레이션 (`supabase/migration_notifications_v2.sql`)

### 3-1. type 컬럼 추가

```sql
-- type 컬럼 추가 (기존 레코드는 'general'로 기본값)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';
```

### 3-2. 트리거 A — 과제 생성 시 담당자 알람

발동 조건: `tasks` 테이블 `INSERT` → `assigned_to` 배열의 각 멤버에게 알람
제외: 과제 생성자(`created_by`) 본인

```sql
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  assignee_id UUID;
BEGIN
  -- assigned_to 배열을 순회하며 각 담당자에게 알람 삽입
  FOREACH assignee_id IN ARRAY COALESCE(NEW.assigned_to, ARRAY[]::UUID[])
  LOOP
    -- 과제 생성자 본인은 제외
    IF assignee_id <> NEW.created_by THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        assignee_id,
        'task_assigned',
        '새 과제가 배정되었습니다',
        '과제 "' || NEW.title || '"의 담당자로 지정되었습니다.',
        '/tasks'
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 있을 경우 교체
DROP TRIGGER IF EXISTS on_task_insert_notify ON tasks;
CREATE TRIGGER on_task_insert_notify
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();
```

### 3-3. 트리거 B — 기존 과제 담당자 추가 시 알람

발동 조건: `tasks.assigned_to` 컬럼 `UPDATE` → 신규 추가된 멤버에게만 알람
핵심 로직: `NEW.assigned_to - OLD.assigned_to` 집합 차이 계산

```sql
CREATE OR REPLACE FUNCTION notify_assignee_added()
RETURNS TRIGGER AS $$
DECLARE
  new_assignees UUID[];
  new_assignee  UUID;
BEGIN
  -- assigned_to 변경 감지
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    -- 신규 추가된 UUID만 배열로 추출 (집합 차이)
    SELECT array_agg(a) INTO new_assignees
    FROM (
      SELECT unnest(COALESCE(NEW.assigned_to, ARRAY[]::UUID[]))
      EXCEPT
      SELECT unnest(COALESCE(OLD.assigned_to, ARRAY[]::UUID[]))
    ) t(a);

    -- 신규 담당자마다 알람 삽입
    FOREACH new_assignee IN ARRAY COALESCE(new_assignees, ARRAY[]::UUID[])
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        new_assignee,
        'assignee_added',
        '과제 담당자로 추가되었습니다',
        '과제 "' || NEW.title || '"의 담당자로 추가되었습니다.',
        '/tasks'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_update_notify ON tasks;
CREATE TRIGGER on_task_update_notify
  AFTER UPDATE OF assigned_to ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_assignee_added();
```

### 3-4. 트리거 C — 담당 과제 메모 생성 시 알람

발동 조건: `task_comments` 테이블 `INSERT` → 해당 과제의 담당자에게 알람
제외: 댓글 작성자(`user_id`) 본인

```sql
CREATE OR REPLACE FUNCTION notify_comment_added()
RETURNS TRIGGER AS $$
DECLARE
  task_record  RECORD;
  assignee_id  UUID;
BEGIN
  -- 댓글 달린 과제 조회
  SELECT id, title, assigned_to INTO task_record
  FROM tasks
  WHERE id = NEW.task_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- 각 담당자에게 알람 (댓글 작성자 본인 제외)
  FOREACH assignee_id IN ARRAY COALESCE(task_record.assigned_to, ARRAY[]::UUID[])
  LOOP
    IF assignee_id <> NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        assignee_id,
        'comment_added',
        '과제에 메모가 추가되었습니다',
        '담당 중인 과제 "' || task_record.title || '"에 새 메모가 달렸습니다.',
        '/tasks'
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_insert_notify ON task_comments;
CREATE TRIGGER on_comment_insert_notify
  AFTER INSERT ON task_comments
  FOR EACH ROW EXECUTE FUNCTION notify_comment_added();
```

---

## 4. NotificationProvider 컴포넌트 설계

**경로**: `src/components/providers/notification-provider.tsx`

### 역할
- 앱 전체에 마운트되어 알람 기능의 중앙 관리자로 동작
- AuthProvider 내부에 배치되어 `user.id` 사용
- 3개의 독립 `useEffect`로 관심사 분리

### 상태 흐름

```
user 로그인
    ↓
[Effect 1] 기존 알람 30개 로드 → setNotifications()
    ↓
[Effect 2] Realtime 채널 구독 시작
    ↓ (새 알람 도착 시)
addNotification() → unreadCount 증가
    ↓
[Effect 3] unreadCount 변화 감지
    ↓
window.electronAPI?.setBadge(unreadCount)
    ↓
Electron IPC → tray.setImage(badgeIcon)
```

### 컴포넌트 코드

```tsx
"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/stores/auth-store"
import { useNotificationStore } from "@/stores/notification-store"
import type { Notification } from "@/types/database"

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const { addNotification, setNotifications, unreadCount } = useNotificationStore()

  // Effect 1: 초기 알람 로드 (최근 30개)
  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[])
      })
  }, [user?.id, setNotifications])

  // Effect 2: Realtime 구독 — notifications INSERT 실시간 감지
  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          addNotification(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, addNotification])

  // Effect 3: unreadCount 변화 → Electron 트레이 뱃지 동기화
  useEffect(() => {
    window.electronAPI?.setBadge(unreadCount)
  }, [unreadCount])

  return <>{children}</>
}
```

### 배치 위치 (`src/app/(main)/layout.tsx`)

```tsx
// 변경 전
<AuthProvider>
  <MainContent>{children}</MainContent>
</AuthProvider>

// 변경 후
<AuthProvider>
  <NotificationProvider>
    <MainContent>{children}</MainContent>
  </NotificationProvider>
</AuthProvider>
```

---

## 5. TitleBar Bell 배지 설계

**경로**: `src/components/layout/title-bar.tsx`

### 변경 사항

```tsx
// 추가 import
import { useNotificationStore } from "@/stores/notification-store"

// 컴포넌트 내부 — unreadCount 구독
const { unreadCount } = useNotificationStore()

// Window 타입 확장 — setBadge 추가
declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void
      hide: () => void
      isElectron: boolean
      setBadge: (count: number) => void   // ← 추가
    }
  }
}
```

### Bell 버튼 UI

```tsx
{/* 변경 전 — 뱃지 없음 */}
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7 text-muted-foreground hover:text-foreground"
  onClick={() => openPanel("notifications")}
>
  <Bell className="h-3.5 w-3.5" />
</Button>

{/* 변경 후 — relative 컨테이너 + 빨간 dot */}
<div className="relative">
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 text-muted-foreground hover:text-foreground"
    onClick={() => openPanel("notifications")}
  >
    <Bell className="h-3.5 w-3.5" />
  </Button>
  {unreadCount > 0 && (
    <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
  )}
</div>
```

---

## 6. Electron IPC 설계

### 6-1. preload.js 변경

```js
const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  // 기존
  minimize: () => ipcRenderer.send("window-minimize"),
  hide:     () => ipcRenderer.send("window-hide"),
  isElectron: true,
  // 신규
  setBadge: (count) => ipcRenderer.send("set-badge", count),
})
```

### 6-2. main.js 변경

**변수 추가** (모듈 스코프):
```js
let trayIconNormal = null  // NativeImage 캐시 — 기본 아이콘
let trayIconBadge  = null  // NativeImage 캐시 — 뱃지 아이콘
```

**createTray() 수정** — 아이콘 사전 로드:
```js
function createTray() {
  const iconPath = path.join(__dirname, "../public/icon.ico")
  const badgePath = path.join(__dirname, "../public/icon-badge.ico")

  try {
    trayIconNormal = nativeImage.createFromPath(iconPath)
    if (trayIconNormal.isEmpty()) throw new Error("기본 아이콘 비어있음")
  } catch {
    trayIconNormal = nativeImage.createEmpty()
  }

  try {
    trayIconBadge = nativeImage.createFromPath(badgePath)
    if (trayIconBadge.isEmpty()) trayIconBadge = trayIconNormal // 폴백
  } catch {
    trayIconBadge = trayIconNormal // 폴백: 뱃지 없이 기본 아이콘 사용
  }

  tray = new Tray(trayIconNormal)
  // ... 기존 contextMenu, click 핸들러 유지
}
```

**set-badge IPC 핸들러** (신규):
```js
ipcMain.on("set-badge", (_, count) => {
  if (!tray) return

  if (count > 0) {
    tray.setImage(trayIconBadge)
    tray.setToolTip(`Sticky — 읽지 않은 알림 ${count}건`)
  } else {
    tray.setImage(trayIconNormal)
    tray.setToolTip("Sticky — 팀 메모 & 과제 관리")
  }
})
```

### 6-3. 뱃지 아이콘 (`public/icon-badge.ico`)

- 기존 `public/icon.ico`를 기반으로 우상단에 빨간 원 추가
- 크기: 16×16 + 32×32 포함된 복합 ICO 파일
- Windows 시스템 트레이 최적 해상도: 16×16
- 없을 경우 폴백: 기본 아이콘 그대로 사용 (알람 기능은 동작, 뱃지만 없음)

---

## 7. 컴포넌트 계층

```
src/app/(main)/layout.tsx
└── AuthProvider
    └── NotificationProvider       ← 신규
        └── MainContent
            └── CompactShell
                ├── TitleBar       ← Bell dot 추가
                └── [각 패널]
                    └── CompactNotificationsPanel  ← 기존 유지
```

---

## 8. 구현 항목 목록 (Gap 분석용)

### FR (기능 요구사항)

| ID | 항목 | 파일 | 체크 기준 |
|----|------|------|----------|
| FR-01 | `notifications.type` 컬럼 추가 | `migration_notifications_v2.sql` | ALTER TABLE 실행 확인 |
| FR-02 | 트리거 A: 과제 생성 → 담당자 알람 | `migration_notifications_v2.sql` | `on_task_insert_notify` 존재 |
| FR-03 | 트리거 B: 담당자 추가 → 알람 | `migration_notifications_v2.sql` | `on_task_update_notify` 존재 |
| FR-04 | 트리거 C: 메모 생성 → 담당자 알람 | `migration_notifications_v2.sql` | `on_comment_insert_notify` 존재 |
| FR-05 | `NotificationType` 타입 추가 | `src/types/database.ts` | `NotificationType` export |
| FR-06 | `Notification.type` 필드 추가 | `src/types/database.ts` | `type: NotificationType` 존재 |
| FR-07 | `NotificationProvider` 컴포넌트 신규 생성 | `src/components/providers/notification-provider.tsx` | 파일 존재 |
| FR-08 | Effect 1: 초기 알람 30개 로드 | `notification-provider.tsx` | `setNotifications` 호출 |
| FR-09 | Effect 2: Realtime INSERT 구독 | `notification-provider.tsx` | `postgres_changes` 구독 |
| FR-10 | Effect 3: unreadCount → IPC setBadge | `notification-provider.tsx` | `electronAPI?.setBadge` 호출 |
| FR-11 | `MainLayout`에 NotificationProvider 래핑 | `src/app/(main)/layout.tsx` | Provider 감싸기 확인 |
| FR-12 | TitleBar Bell 빨간 dot UI | `src/components/layout/title-bar.tsx` | `unreadCount > 0` 조건 렌더 |
| FR-13 | `useNotificationStore` import 추가 | `title-bar.tsx` | store 구독 코드 |
| FR-14 | `Window.electronAPI.setBadge` 타입 선언 | `title-bar.tsx` | 타입 확장 코드 |
| FR-15 | preload.js `setBadge` IPC 노출 | `electron/preload.js` | `setBadge` 메서드 존재 |
| FR-16 | main.js `trayIconNormal/Badge` 변수 | `electron/main.js` | 2개 변수 선언 |
| FR-17 | main.js `createTray()` 아이콘 사전 로드 | `electron/main.js` | try/catch 아이콘 로드 |
| FR-18 | main.js `set-badge` IPC 핸들러 | `electron/main.js` | `ipcMain.on("set-badge")` |
| FR-19 | 뱃지 아이콘 파일 | `public/icon-badge.ico` | 파일 존재 |

### NFR (비기능 요구사항)

| ID | 항목 | 기준 |
|----|------|------|
| NFR-01 | 브라우저 환경 안전성 | `electronAPI?.setBadge` optional chaining 사용 |
| NFR-02 | 아이콘 파일 누락 폴백 | `trayIconBadge` 로드 실패 시 `trayIconNormal`로 대체 |
| NFR-03 | Realtime 채널 정리 | 언마운트 시 `removeChannel` 호출 |
| NFR-04 | 자기 자신 알람 제외 | 트리거 A: `created_by`, 트리거 C: `user_id` 조건 |
| NFR-05 | TypeScript any 금지 | `payload.new as Notification` 타입 캐스팅 사용 |

---

## 9. 구현 순서

```
[1] supabase/migration_notifications_v2.sql 파일 생성
    └── ALTER TABLE + 3개 함수 + 3개 트리거
[2] Supabase SQL Editor에서 마이그레이션 실행
[3] src/types/database.ts — NotificationType + type 필드
[4] src/components/providers/notification-provider.tsx 신규 생성
[5] src/app/(main)/layout.tsx — NotificationProvider 래핑
[6] src/components/layout/title-bar.tsx — Bell dot + 타입 확장
[7] electron/preload.js — setBadge IPC 노출
[8] electron/main.js — 아이콘 캐시 + IPC 핸들러
[9] public/icon-badge.ico — 뱃지 아이콘 파일 추가
```

---

## 10. 엣지 케이스

| 케이스 | 처리 방식 |
|--------|----------|
| `icon-badge.ico` 없음 | `trayIconBadge = trayIconNormal` 폴백 (앱 크래시 없음) |
| 담당자 없는 과제 생성 | `COALESCE(assigned_to, ARRAY[]::UUID[])` → FOREACH 0회 실행 |
| 자기 자신만 담당자인 과제 생성 | `IF assignee_id <> created_by THEN` → 알람 없음 |
| 브라우저 환경 (Electron 아님) | `window.electronAPI?.setBadge` optional → 조용히 무시 |
| 로그아웃 후 Realtime 채널 | `useEffect` cleanup → `removeChannel` 호출로 구독 해제 |
| 빠른 연속 알람 (다량) | Zustand `addNotification` 각 호출마다 unreadCount++ → IPC도 매번 전송 |
