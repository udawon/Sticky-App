# 알람(Notification) 기능 플랜

## Context

팀 과제 관리 앱에 실시간 알람 기능을 추가한다.
`notifications` 테이블 / `useNotificationStore` / `CompactNotificationsPanel`은 이미 존재하지만,
**알람을 자동으로 생성하는 DB 트리거**, **Realtime 구독**, **Electron 트레이 뱃지**가 없는 상태.

**알람 조건 (사용자 요청):**

| # | 조건 | 트리거 위치 |
|---|------|------------|
| A | 사용자가 담당자로 지정된 과제가 생성됨 | `tasks` INSERT |
| B | 기존 과제에서 담당자에 사용자가 추가됨 | `tasks` UPDATE (assigned_to 배열 확장) |
| C | 사용자가 담당자로 지정된 과제에 메모가 새롭게 생김 | `task_comments` INSERT |

**UI 요구사항:**
- 조건 달성 시 Electron 트레이 아이콘에 빨간색 불빛(badge icon) 표시
- 앱 내 타이틀바 Bell 아이콘에도 빨간 점(unread dot) 표시

---

## 현재 상태 분석

### 이미 있는 것

| 파일/테이블 | 상태 |
|-------------|------|
| `supabase/schema.sql` — `notifications` 테이블 | ✅ 존재 (id, user_id, title, message, read, link, created_at) |
| `src/types/database.ts` — `Notification` 타입 | ✅ 존재 |
| `src/stores/notification-store.ts` | ✅ 존재 (addNotification, markAsRead, unreadCount 등) |
| `src/components/panels/compact-notifications-panel.tsx` | ✅ 존재 (수동 로드, 읽음 처리) |
| `src/components/layout/title-bar.tsx` — Bell 아이콘 | ✅ 존재 (클릭 → notifications 패널, 빨간 점 없음) |
| `electron/main.js` — 트레이 | ✅ 존재 (단일 아이콘, 뱃지 없음) |
| `electron/preload.js` | ✅ minimize, hide, isElectron만 노출 |

### 없는 것 (신규 구현)

| 항목 | 설명 |
|------|------|
| DB `notifications.type` 필드 | 알람 종류 구분 (task_assigned / assignee_added / comment_added) |
| Supabase 트리거 × 3 | 조건 A·B·C 충족 시 notifications 자동 삽입 |
| Supabase Realtime 구독 | notifications 테이블 INSERT 실시간 감지 |
| `NotificationProvider` | 구독 로직을 앱 전체에 주입하는 React Provider |
| Bell 아이콘 빨간 점 | title-bar에서 unreadCount > 0 시 dot 표시 |
| Electron 트레이 뱃지 | IPC: `set-badge` → 트레이 아이콘 교체 |
| `public/icon-badge.ico` | 빨간 점이 있는 뱃지 트레이 아이콘 |
| preload.js `setBadge` 노출 | 웹앱 → Electron IPC 연결 |

---

## 수정/신규 대상 파일

| 파일 | 작업 |
|------|------|
| `supabase/migration_notifications_v2.sql` | **신규** — type 컬럼 추가 + 3개 트리거 |
| `src/types/database.ts` | `Notification`에 `type` 필드 추가 |
| `src/components/providers/notification-provider.tsx` | **신규** — Realtime 구독 + 초기 로드 |
| `src/app/(main)/layout.tsx` | `NotificationProvider` 래핑 추가 |
| `src/components/layout/title-bar.tsx` | Bell 아이콘 빨간 dot 추가 |
| `electron/preload.js` | `setBadge(count)` IPC 노출 |
| `electron/main.js` | `set-badge` IPC 핸들러 + 트레이 아이콘 교체 |
| `public/icon-badge.ico` | **신규** — 뱃지 버전 아이콘 (빨간 점) |

---

## 구현 세부 사항

### 1. DB 마이그레이션 (`supabase/migration_notifications_v2.sql`)

#### 1-1. type 컬럼 추가

```sql
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';
```

#### 1-2. 조건 A — 과제 생성 시 담당자에게 알람

```sql
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  assignee_id UUID;
BEGIN
  -- 새로 생성된 과제의 assigned_to 배열 순회
  FOREACH assignee_id IN ARRAY COALESCE(NEW.assigned_to, ARRAY[]::UUID[])
  LOOP
    -- 과제 생성자 본인 제외
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

CREATE OR REPLACE TRIGGER on_task_insert_notify
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();
```

#### 1-3. 조건 B — 기존 과제에 담당자 추가 시 알람

```sql
CREATE OR REPLACE FUNCTION notify_assignee_added()
RETURNS TRIGGER AS $$
DECLARE
  new_assignee UUID;
BEGIN
  -- UPDATE 이벤트이고 assigned_to가 변경된 경우만 처리
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    -- 신규 추가된 담당자만 처리 (NEW - OLD)
    FOREACH new_assignee IN ARRAY (
      SELECT unnest(NEW.assigned_to)
      EXCEPT
      SELECT unnest(COALESCE(OLD.assigned_to, ARRAY[]::UUID[]))
    )
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

CREATE OR REPLACE TRIGGER on_task_update_notify
  AFTER UPDATE OF assigned_to ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_assignee_added();
```

#### 1-4. 조건 C — 담당 과제에 메모 생성 시 알람

```sql
CREATE OR REPLACE FUNCTION notify_comment_added()
RETURNS TRIGGER AS $$
DECLARE
  task_record RECORD;
  assignee_id UUID;
BEGIN
  -- 댓글이 달린 과제 정보 조회
  SELECT * INTO task_record FROM tasks WHERE id = NEW.task_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- 과제의 각 담당자에게 알람 (댓글 작성자 본인 제외)
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

CREATE OR REPLACE TRIGGER on_comment_insert_notify
  AFTER INSERT ON task_comments
  FOR EACH ROW EXECUTE FUNCTION notify_comment_added();
```

---

### 2. TypeScript 타입 업데이트 (`src/types/database.ts`)

```typescript
export type NotificationType = 'task_assigned' | 'assignee_added' | 'comment_added' | 'general'

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

### 3. NotificationProvider (`src/components/providers/notification-provider.tsx`)

역할: 앱 레이아웃에 마운트되어 알람 실시간 구독 + 뱃지 IPC 관리

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

  // 초기 미읽은 알람 로드
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
  }, [user?.id])

  // Realtime 구독 — notifications INSERT 감지
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

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  // unreadCount 변화 → Electron 트레이 뱃지 IPC 전송
  useEffect(() => {
    window.electronAPI?.setBadge(unreadCount)
  }, [unreadCount])

  return <>{children}</>
}
```

---

### 4. 레이아웃에 Provider 추가 (`src/app/(main)/layout.tsx`)

```tsx
// 기존 AuthProvider 아래에 NotificationProvider 추가
<AuthProvider>
  <NotificationProvider>
    {children}
  </NotificationProvider>
</AuthProvider>
```

---

### 5. 타이틀바 Bell 빨간 점 (`src/components/layout/title-bar.tsx`)

```tsx
// useNotificationStore import 추가
const { unreadCount } = useNotificationStore()

// Bell 버튼을 relative 컨테이너로 래핑
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
    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
  )}
</div>
```

---

### 6. Electron Preload (`electron/preload.js`)

```js
contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  hide:     () => ipcRenderer.send("window-hide"),
  isElectron: true,
  // 신규: 트레이 뱃지 제어
  setBadge: (count) => ipcRenderer.send("set-badge", count),
})
```

---

### 7. Electron Main (`electron/main.js`)

트레이 변수를 모듈 스코프에 유지하고, `set-badge` IPC 핸들러에서 아이콘 교체.

```js
// 기존 변수에 추가
let trayIconNormal = null   // 기본 아이콘 (NativeImage 캐시)
let trayIconBadge = null    // 빨간 점 아이콘 (NativeImage 캐시)

// createTray() 수정 — 아이콘 캐시 저장
function createTray() {
  trayIconNormal = nativeImage.createFromPath(iconPath)
  trayIconBadge  = nativeImage.createFromPath(
    path.join(__dirname, "../public/icon-badge.ico")
  )
  tray = new Tray(trayIconNormal)
  // ... 기존 코드 유지
}

// 신규 IPC 핸들러 — 알람 뱃지 제어
ipcMain.on("set-badge", (_, count) => {
  if (!tray) return
  tray.setImage(count > 0 ? trayIconBadge : trayIconNormal)
  tray.setToolTip(
    count > 0
      ? `Sticky — 읽지 않은 알림 ${count}건`
      : "Sticky — 팀 메모 & 과제 관리"
  )
})
```

---

### 8. 뱃지 아이콘 생성 (`public/icon-badge.ico`)

- 기존 `public/icon.ico`에 우상단 빨간 원(●) overlay 추가
- 직접 제작하거나 any 이미지 편집 도구로 생성
- 크기: 16×16 / 32×32 포함된 ICO 파일 (Windows 트레이 권장)

---

## Window.electronAPI 타입 업데이트

`title-bar.tsx`의 전역 타입 선언을 확장:

```tsx
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

---

## 구현 순서 (권장)

1. **DB 마이그레이션** 파일 생성 → Supabase SQL Editor 실행
2. **TypeScript 타입** `Notification.type` 추가
3. **NotificationProvider** 생성
4. **레이아웃** Provider 추가
5. **타이틀바** Bell 빨간 dot 추가
6. **Electron preload** `setBadge` 노출
7. **Electron main** `set-badge` IPC 핸들러 + 아이콘 교체
8. **icon-badge.ico** 뱃지 아이콘 파일 추가
9. 검증 (알람 조건 3가지 + 뱃지 표시)

---

## 검증 방법

### 조건 A — 과제 생성 시 담당자 알람
1. A 계정으로 로그인, B 계정을 담당자로 지정해 과제 생성
2. B 계정의 Bell 아이콘에 빨간 점 표시 확인
3. B 계정의 알람 패널에 "새 과제가 배정되었습니다" 확인

### 조건 B — 기존 과제에 담당자 추가
1. 기존 과제를 상세 패널에서 열고 담당자에 C 계정 추가
2. C 계정 Bell 아이콘 빨간 점 + "담당자로 추가" 알람 확인

### 조건 C — 메모 추가
1. B 계정이 담당인 과제에 A 계정이 댓글 작성
2. B 계정 Bell 아이콘 빨간 점 + "메모가 추가" 알람 확인

### Electron 트레이 뱃지
1. 미읽은 알람 있을 때 시스템 트레이 아이콘이 뱃지 버전으로 교체 확인
2. 모두 읽음 처리 후 기본 아이콘으로 복귀 확인

---

## 주의사항

- DB 트리거는 `SECURITY DEFINER`로 실행 → RLS 우회하여 다른 사용자 레코드에 INSERT 가능
- `notify_assignee_added()` 에서 `ARRAY EXCEPT ARRAY` 구문은 PostgreSQL 14+ 지원
  - Supabase는 PostgreSQL 15 기반이므로 문제 없음
- `icon-badge.ico` 파일이 없으면 Electron에서 아이콘 로드 오류 → try/catch로 방어 처리 필요
- 웹 브라우저 환경에서 `window.electronAPI?.setBadge`는 `undefined` → optional chaining으로 안전 처리됨
