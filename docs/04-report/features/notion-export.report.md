# Notion Export 고도화 & 앱 이슈 수정 보고서

> **상태**: 완료 ✅
>
> **프로젝트**: claude-sticky (Next.js + Electron + Supabase 팀 과제 관리 MVP)
> **버전**: v2.2.0
> **작성자**: Claude (Report Generator)
> **완료 날짜**: 2026-02-28
> **PDCA 사이클**: 기존 "과제-보드-고도화-및-notion-연동" 후속 버그 수정 사이클

---

## 1. 요약

### 1.1 피처 개요

| 항목 | 내용 |
|------|------|
| **작업명** | Notion Export 담당자 필드 추가 + 앱 이슈 3개 수정 |
| **목적** | Notion 내보내기 정확성 향상 및 Electron 앱 실행 오류 해소 |
| **시작일** | 2026-02-28 |
| **완료일** | 2026-02-28 |
| **기간** | 1일 |
| **담당자** | Claude |

### 1.2 결과 요약

```
┌──────────────────────────────────────────────┐
│  Notion Export Fix                            │
│  exported: 2  /  skipped: 0  /  errors: 0    │
│  담당자(담당자) 필드 정상 저장 ✅               │
├──────────────────────────────────────────────┤
│  ESLint / Runtime Issues                      │
│  수정 전: 3개 오류                             │
│  수정 후: 0개 오류 (ESLint + 빌드 + 콘솔 0)   │
└──────────────────────────────────────────────┘
```

---

## 2. 작업 1 — Notion Export 담당자 필드 + DEFAULT_FIELD_MAPPING 수정

### 2.1 문제 현황

| 증상 | 원인 |
|------|------|
| `exported: 0, errors: 2` | DEFAULT_FIELD_MAPPING 필드명이 영어인데 Notion DB 컬럼은 한국어 |
| 담당자 필드 미전송 | `mapTaskToNotionProperties`에 assignee 처리 로직 자체 없음 |

### 2.2 수정 내용

#### `src/lib/notion/mapper.ts`

- `mapTaskToNotionProperties` 함수 시그니처에 `assigneeField: string` 추가
- `assigneeNames: string = ""` 파라미터 추가
- assigneeNames가 있을 경우 `rich_text` 형식으로 Notion 프로퍼티에 출력

```ts
// 담당자 필드 추가 (assigneeNames: "user거덩요, PM입니다, user1 입니다" 형식)
if (assigneeNames) {
  props[fieldMapping.assigneeField] = {
    rich_text: [{ type: "text", text: { content: assigneeNames } }],
  }
}
```

#### `src/app/api/notion/export/route.ts`

- `ExportBody.fieldMapping`에 `assigneeField: string` 추가
- `DEFAULT_FIELD_MAPPING` 전면 수정 — 영어 → 한국어 (Notion DB 실제 컬럼명과 일치)

```ts
// 수정 전 (잘못됨)
const DEFAULT_FIELD_MAPPING = {
  titleField: "Title",
  descriptionField: "Description",
  ...
}

// 수정 후 (올바름)
const DEFAULT_FIELD_MAPPING = {
  titleField: "과제명",
  descriptionField: "설명",
  dueDateField: "마감일",
  priorityField: "중요도",
  statusField: "상태변경",
  pointsField: "포인트",
  assigneeField: "담당자",
}
```

- tasks 조회 후 `assigned_to` UUID 배열 → profiles 테이블에서 닉네임 맵 생성
- `mapTaskToNotionProperties` 호출 시 `assigneeNames` 전달

```ts
const allAssigneeIds = [...new Set(tasks.flatMap((t) => t.assigned_to ?? []))]
const nicknameMap: Record<string, string> = {}
if (allAssigneeIds.length > 0) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", allAssigneeIds)
  for (const p of profiles ?? []) {
    nicknameMap[p.id] = p.nickname
  }
}
```

### 2.3 검증 결과

| 항목 | 결과 |
|------|------|
| exported | 2 |
| skipped | 0 |
| errors | 0 |
| Notion DB 담당자 컬럼 | `user거덩요, PM입니다, user1 입니다` (3명 정상 저장) |
| 과제명 컬럼 | 정상 저장 |
| 마감일, 중요도, 상태, 포인트 | 정상 저장 |

---

## 3. 작업 2 — Electron 앱 이슈 3개 수정 (ESLint)

### 3.1 이슈 목록

| # | 파일 | 오류 유형 | 내용 |
|---|------|-----------|------|
| 1 | `compact-admin-panel.tsx:35` | TDZ (Temporal Dead Zone) | `useEffect`에서 선언 전 함수 호출 |
| 2 | `virtual-office.tsx:1087` | `react-hooks/immutability` + `react-hooks/set-state-in-effect` | `render` useCallback 자기 참조 및 `setNearby` in effect |
| 3 | `src/middleware.ts` | Next.js 16 deprecated | 미들웨어 파일 컨벤션 변경 |

### 3.2 수정 내용

#### 이슈 1: `compact-admin-panel.tsx` — TDZ 해결

- `loadInviteCode`, `loadMembers` 함수를 `useEffect` **위로 이동**
- `eslint-disable-next-line react-hooks/exhaustive-deps` 주석 추가

```ts
// 수정 전: useEffect 아래에 선언된 함수를 useEffect에서 호출 → TDZ 오류
// 수정 후: 함수를 useEffect 위로 이동
const loadInviteCode = async () => { /* ... */ }
const loadMembers = async () => { /* ... */ }

useEffect(() => {
  loadMembers()
  loadInviteCode()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.team_id])
```

#### 이슈 2: `virtual-office.tsx` — RAF 루프 + useMemo 리팩토링

**`setNearby` → `useMemo` 교체**
```ts
// 수정 전
const [nearby, setNearby] = useState<MapObj | null>(null)
// useEffect 내에서 setNearby() 호출 → react-hooks/set-state-in-effect 오류

// 수정 후
const nearby = useMemo(
  () => user ? (getNearby(myPos.col, myPos.row, user.role === "admin") ?? null) : null,
  [myPos, user]
)
```

**render 자기 참조 제거 → loop 패턴**
```ts
// 수정 전: render useCallback 내에서 requestAnimationFrame(render) 자기 참조
// → react-hooks/immutability 오류

// 수정 후: render에서 자기 참조 제거, useEffect에서 loop 패턴으로 관리
const render = useCallback(() => {
  // 렌더링 로직만 (자기 참조 없음)
}, [myPos, others, nearby, user, activePanel])

useEffect(() => {
  let animId: number
  const loop = () => { render(); animId = requestAnimationFrame(loop) }
  animId = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(animId)
}, [render])
```

**추가 정리**
- 사용하지 않게 된 `rafRef` useRef 선언 제거
- `useMemo` import 추가

#### 이슈 3: `middleware.ts` → `proxy.ts` — Next.js 16 컨벤션

```ts
// src/middleware.ts 삭제

// src/proxy.ts 신규 생성
import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

### 3.3 검증 결과

| 검증 방법 | 결과 |
|-----------|------|
| `npx next lint` | 0 errors, 0 warnings |
| `next build` | ✅ 성공 |
| 브라우저 콘솔 (localhost:3000) | 0 errors |
| Electron 앱 실행 | ✅ 이슈 없음 (간접 검증) |

---

## 4. 수정 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `src/lib/notion/mapper.ts` | 수정 | assigneeField/assigneeNames 파라미터 추가 |
| `src/app/api/notion/export/route.ts` | 수정 | DEFAULT_FIELD_MAPPING 한국어화, 담당자 UUID→닉네임 변환 추가 |
| `src/components/panels/compact-admin-panel.tsx` | 수정 | 함수 선언 위치 변경 (TDZ 해결) |
| `src/components/office/virtual-office.tsx` | 수정 | useMemo 교체, RAF loop 패턴, rafRef 제거 |
| `src/middleware.ts` | 삭제 | Next.js 16 deprecated |
| `src/proxy.ts` | 신규 | Next.js 16 proxy 컨벤션 |

---

## 5. 기술적 배경 (학습 포인트)

### Notion API 필드명은 대소문자 구분 필수
- Notion DB 컬럼명이 한국어인 경우, `DEFAULT_FIELD_MAPPING`은 반드시 한국어로 설정해야 함
- curl로 직접 Notion DB 구조를 조회하여 실제 컬럼명을 확인하는 절차가 필요

### React Hooks — useCallback 내 자기 참조 금지
- `react-hooks/immutability` 규칙: `useCallback` 내에서 의존 배열에 포함된 동일 함수를 호출하면 안 됨
- RAF 루프는 반드시 `useEffect` 내 `loop` 패턴으로 분리

### useState vs useMemo — 파생 상태
- 다른 상태에서 계산 가능한 값(`nearby = f(myPos, user)`)은 `useState`가 아닌 `useMemo` 사용
- `useEffect` 내 `setState`는 `react-hooks/set-state-in-effect` 오류 유발

### Next.js 16 미들웨어 컨벤션 변경
- `src/middleware.ts` (기존) → `src/proxy.ts` (Next.js 16)
- 함수명도 `middleware` → `proxy`로 변경 필요

---

## 6. 다음 단계 제안

| 우선순위 | 작업 | 설명 |
|----------|------|------|
| 높음 | `migration_notion.sql` 실행 확인 | Notion 연동 테이블/컬럼이 Supabase에 적용되었는지 확인 |
| 중간 | Notion Export — 이미 내보낸 과제 재내보내기 옵션 | `notion_id`가 있는 과제도 업데이트 내보내기 기능 |
| 중간 | E2E 테스트 자동화 | Playwright로 Notion 내보내기 플로우 자동 검증 |
| 낮음 | `public/icon-badge.ico` 생성 | Notification 뱃지 전용 아이콘 (현재 폴백으로 동작) |

---

*보고서 작성: Claude (report-generator) — 2026-02-28*
