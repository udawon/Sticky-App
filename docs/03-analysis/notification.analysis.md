# Notification (알람) 기능 Gap Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: claude-sticky
> **Analyst**: Claude (gap-detector)
> **Date**: 2026-02-28
> **Design Doc**: [notification.design.md](../02-design/features/notification.design.md)

---

## 1. 분석 개요

### 1.1 분석 목적

알람(Notification) 기능의 설계 문서(Design)와 실제 구현 코드(Do)를 항목별로 대조하여
Match Rate를 산출하고, Gap이 존재하는 항목을 식별한다.

### 1.2 분석 범위

| 구분 | 경로 |
|------|------|
| 설계 문서 | `docs/02-design/features/notification.design.md` |
| DB 마이그레이션 | `supabase/migration_notifications_v2.sql` |
| 타입 정의 | `src/types/database.ts` |
| Provider 컴포넌트 | `src/components/providers/notification-provider.tsx` |
| 메인 레이아웃 | `src/app/(main)/layout.tsx` |
| 타이틀바 | `src/components/layout/title-bar.tsx` |
| Electron preload | `electron/preload.js` |
| Electron main | `electron/main.js` |
| 뱃지 아이콘 | `public/icon-badge.ico` |

---

## 2. FR (기능 요구사항) 대조 결과

| ID | 항목 | 설계 위치 | 구현 위치 | 결과 | 비고 |
|----|------|----------|----------|:----:|------|
| FR-01 | `notifications.type` 컬럼 추가 | design.md 3-1절 | `migration_notifications_v2.sql:9` | Match | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general'` 일치 |
| FR-02 | 트리거 A: 과제 생성 -> 담당자 알람 | design.md 3-2절 | `migration_notifications_v2.sql:15-40` | Match | `notify_task_assigned()` + `on_task_insert_notify` 함수/트리거 일치 |
| FR-03 | 트리거 B: 담당자 추가 -> 알람 | design.md 3-3절 | `migration_notifications_v2.sql:46-80` | Match | `notify_assignee_added()` + `on_task_update_notify` 집합 차이 로직 일치 |
| FR-04 | 트리거 C: 메모 생성 -> 담당자 알람 | design.md 3-4절 | `migration_notifications_v2.sql:86-118` | Match | `notify_comment_added()` + `on_comment_insert_notify` 일치 |
| FR-05 | `NotificationType` 타입 export | design.md 2-2절 | `src/types/database.ts:92-96` | Match | 4개 리터럴 타입 (`task_assigned`, `assignee_added`, `comment_added`, `general`) 일치 |
| FR-06 | `Notification.type` 필드 추가 | design.md 2-2절 | `src/types/database.ts:102` | Match | `type: NotificationType` 일치 |
| FR-07 | `NotificationProvider` 컴포넌트 신규 생성 | design.md 4절 | `src/components/providers/notification-provider.tsx` | Match | 파일 존재, `"use client"` 선언 포함 |
| FR-08 | Effect 1: 초기 알람 30개 로드 | design.md 4절 코드 | `notification-provider.tsx:14-27` | Match | `.limit(30)` + `setNotifications(data as Notification[])` 일치 |
| FR-09 | Effect 2: Realtime INSERT 구독 | design.md 4절 코드 | `notification-provider.tsx:29-53` | Match | `postgres_changes`, `event: "INSERT"`, `filter: user_id=eq.${user.id}` 일치 |
| FR-10 | Effect 3: unreadCount -> IPC setBadge | design.md 4절 코드 | `notification-provider.tsx:55-58` | Match | `window.electronAPI?.setBadge(unreadCount)` 일치 |
| FR-11 | MainLayout에 NotificationProvider 래핑 | design.md 4절 배치 | `src/app/(main)/layout.tsx:38-42` | Match | `<AuthProvider><NotificationProvider><MainContent>` 순서 일치 |
| FR-12 | TitleBar Bell 빨간 dot UI | design.md 5절 코드 | `title-bar.tsx:88-101` | Match | `relative` 컨테이너 + `unreadCount > 0` 조건부 `bg-red-500` dot 일치 |
| FR-13 | `useNotificationStore` import 추가 | design.md 5절 | `title-bar.tsx:5` | Match | `import { useNotificationStore } from "@/stores/notification-store"` 일치 |
| FR-14 | `Window.electronAPI.setBadge` 타입 선언 | design.md 5절 | `title-bar.tsx:21-30` | Match | `setBadge: (count: number) => void` 타입 확장 일치 |
| FR-15 | preload.js `setBadge` IPC 노출 | design.md 6-1절 | `electron/preload.js:12` | Match | `setBadge: (count) => ipcRenderer.send("set-badge", count)` 일치 |
| FR-16 | main.js `trayIconNormal/Badge` 변수 | design.md 6-2절 | `electron/main.js:19-20` | Match | 모듈 스코프에 두 변수 `null` 초기화 일치 |
| FR-17 | main.js `createTray()` 아이콘 사전 로드 | design.md 6-2절 | `electron/main.js:110-128` | Match | try/catch + `isEmpty()` 검사 + 폴백 로직 일치 |
| FR-18 | main.js `set-badge` IPC 핸들러 | design.md 6-2절 | `electron/main.js:96-105` | Match | `ipcMain.on("set-badge", ...)` + 조건부 아이콘/툴팁 교체 일치 |
| FR-19 | 뱃지 아이콘 파일 (`icon-badge.ico`) | design.md 6-3절 | `public/icon-badge.ico` | **Gap** | 파일 미존재 (수동 생성 필요 항목) |

### FR 결과 요약

| 구분 | 건수 |
|------|:----:|
| Match | 18 |
| Gap | 1 |
| **합계** | **19** |
| **FR Match Rate** | **94.7%** |

---

## 3. NFR (비기능 요구사항) 대조 결과

| ID | 항목 | 기준 | 구현 확인 위치 | 결과 | 비고 |
|----|------|------|--------------|:----:|------|
| NFR-01 | 브라우저 환경 안전성 | `electronAPI?.setBadge` optional chaining | `notification-provider.tsx:57` | Match | `window.electronAPI?.setBadge(unreadCount)` 확인 |
| NFR-02 | 아이콘 파일 누락 폴백 | `trayIconBadge` 로드 실패 시 `trayIconNormal`로 대체 | `electron/main.js:123-128` | Match | `catch { trayIconBadge = trayIconNormal }` + `isEmpty()` 검사 확인. icon-badge.ico 미존재이나 폴백 코드 동작 |
| NFR-03 | Realtime 채널 정리 | 언마운트 시 `removeChannel` 호출 | `notification-provider.tsx:50-52` | Match | `return () => { supabase.removeChannel(channel) }` cleanup 함수 확인 |
| NFR-04 | 자기 자신 알람 제외 | 트리거 A: `created_by`, 트리거 C: `user_id` 조건 | `migration SQL:22, 100` | Match | 트리거 A: `IF assignee_id <> NEW.created_by`, 트리거 C: `IF assignee_id <> NEW.user_id` 확인 |
| NFR-05 | TypeScript any 금지 | `payload.new as Notification` 타입 캐스팅 사용 | `notification-provider.tsx` 전체 | Match | `any` 키워드 미사용, `as Notification` 명시적 캐스팅 확인 |

### NFR 결과 요약

| 구분 | 건수 |
|------|:----:|
| Match | 5 |
| Gap | 0 |
| **합계** | **5** |
| **NFR Match Rate** | **100%** |

---

## 4. Overall Score

```
+-------------------------------------------------+
|  Overall Match Rate: 95.8%  (23/24)             |
+-------------------------------------------------+
|  FR  Match Rate:  94.7%  (18/19)                |
|  NFR Match Rate: 100.0%  ( 5/ 5)               |
+-------------------------------------------------+
|  Match:  23 items                               |
|  Gap:     1 item  (FR-19: icon-badge.ico 미존재) |
+-------------------------------------------------+
```

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match (FR) | 94.7% | Pass |
| Non-Functional (NFR) | 100% | Pass |
| **Overall** | **95.8%** | **Pass** |

---

## 5. Gap 상세

### 5.1 Missing (설계 O, 구현 X)

| ID | 항목 | 설계 위치 | 설명 | 영향도 |
|----|------|----------|------|:------:|
| FR-19 | `public/icon-badge.ico` | design.md 6-3절 | 뱃지 아이콘 ICO 파일 미존재. 설계 문서에서도 "수동 생성 필요" 및 "없을 경우 폴백" 명시. `main.js`의 try/catch 폴백 코드(NFR-02)가 정상 작동하므로 앱 크래시 없음 | Low |

### 5.2 추가된 기능 (설계 X, 구현 O)

없음.

### 5.3 변경된 기능 (설계 != 구현)

없음.

---

## 6. 코드 품질 체크

### 6.1 구현 코드-설계 코드 세부 일치도

설계 문서에 포함된 코드 블록과 실제 구현 코드를 라인 단위로 비교한 결과:

| 파일 | 설계 코드 | 구현 코드 | 일치 수준 |
|------|----------|----------|:---------:|
| `migration_notifications_v2.sql` | 3-1 ~ 3-4절 SQL | 전체 119행 | 완전 일치 |
| `database.ts` (NotificationType, Notification) | 2-2절 TypeScript | 92-108행 | 완전 일치 |
| `notification-provider.tsx` | 4절 컴포넌트 코드 | 전체 61행 | 완전 일치 |
| `layout.tsx` | 4절 배치 코드 | 37-44행 | 완전 일치 |
| `title-bar.tsx` | 5절 Bell UI 코드 | 88-101행 | 완전 일치 |
| `preload.js` | 6-1절 코드 | 12행 | 완전 일치 |
| `main.js` (변수/createTray/IPC) | 6-2절 코드 | 19-20, 96-105, 110-128행 | 완전 일치 |

### 6.2 잠재 이슈

| 구분 | 파일 | 설명 | 심각도 |
|------|------|------|:------:|
| 성능 | `notification-provider.tsx` | 빠른 연속 알람 시 매 `unreadCount` 변화마다 IPC 호출 발생 (설계 문서 10절 엣지 케이스에 인지 기록됨) | Info |

---

## 7. 권장 조치

### 7.1 즉시 조치 (선택적)

| 우선순위 | 항목 | 설명 |
|:--------:|------|------|
| Low | FR-19 `icon-badge.ico` 생성 | `public/icon.ico`를 기반으로 우상단 빨간 원 추가 ICO 생성. 16x16 + 32x32 복합 포맷 권장. 없어도 폴백 동작하므로 기능 장애 없음 |

### 7.2 설계 문서 업데이트

없음. 현재 설계 문서와 구현이 완전히 동기화되어 있음.

---

## 8. 결론

설계 문서와 구현 코드의 Overall Match Rate는 **95.8%** 로, 90% 기준을 충족합니다.

유일한 Gap인 FR-19(`icon-badge.ico` 파일 미존재)는 설계 문서 자체에서 "수동 생성 필요" 및
"없을 경우 폴백: 기본 아이콘 그대로 사용"이라고 명시되어 있으며, 실제 `main.js`의
폴백 코드(NFR-02)가 정상 구현되어 있으므로 앱 동작에 영향 없음(Low 영향도).

나머지 18개 FR 항목과 5개 NFR 항목은 설계 코드와 구현 코드가 라인 단위로 완전 일치합니다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-28 | 초기 Gap 분석 수행 | Claude (gap-detector) |
