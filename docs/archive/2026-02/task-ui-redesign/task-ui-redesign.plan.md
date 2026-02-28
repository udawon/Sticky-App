# 과제 UI 디자인 개편 플랜

## Context

현재 과제 카드 UI는 좌측 컬러 보더 + 우선순위 화살표 아이콘 방식의 기능 중심 디자인.
참고 이미지(Notion/Linear 스타일)처럼 클린한 카드형 디자인으로 개편.

**사용자 결정사항:**
- 날짜: `created_at → due_date` 범위 표시
- 상태: 뱃지(badge) 방식 추가
- 아바타: 담당자별 고유 색상 적용

---

## 수정 대상

| 파일 | 변경 내용 |
|------|----------|
| `src/components/tasks/task-card.tsx` | 카드 디자인 전면 개편 |
| `src/components/tasks/task-detail-panel.tsx` | 상태 표시 뱃지로 통일, 상단 컬러 보더 제거 |

---

## 구현 세부 사항

### 1. task-card.tsx — 카드 레이아웃 개편

**새 카드 레이아웃:**
```
┌─────────────────────────────────────────┐
│ 📋  [상태 뱃지]                   [⋮]   │  ← 아이콘 + 상태 + 메뉴
│                                          │
│  제목 텍스트 (bold)                      │
│  설명 텍스트 (회색, 2줄 말줄임)          │
│                                          │
│  [MT][FM]          등록일 → 마감일       │  ← 아바타 + 날짜 범위
└─────────────────────────────────────────┘
```

**변경 항목:**

1. **카드 컨테이너**: 좌측 보더 제거 → 전체 라운드 + 그림자
   ```tsx
   // 변경 전
   className="border-l-[3px] {statusBorderColor[task.status]} rounded-r-md bg-card px-3 py-2.5 ..."
   // 변경 후
   className="rounded-xl bg-card border border-border/50 shadow-sm px-3.5 py-3 ..."
   ```

2. **상단 행**: 우선순위 화살표 아이콘 제거 → `ClipboardList` 아이콘 + 상태 뱃지 + 메뉴
   ```tsx
   import { ClipboardList, MoreVertical, Calendar } from "lucide-react"

   // 상태 뱃지 설정
   const statusBadge: Record<TaskStatus, { label: string; className: string }> = {
     todo:        { label: "대기",   className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
     in_progress: { label: "진행중", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
     review:      { label: "검토",   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
     done:        { label: "완료",   className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
   }
   ```

3. **설명 추가**: title 아래에 description 표시 (line-clamp-2)
   ```tsx
   {task.description && (
     <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 mb-2.5">
       {task.description}
     </p>
   )}
   ```

4. **하단 행**: 아바타(좌) + 날짜 범위(우)
   ```tsx
   // 날짜 범위: created_at → due_date
   const formatDate = (dateStr: string) =>
     new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })

   // 하단 우측
   <span>{formatDate(task.created_at)} → {formatDate(task.due_date)}</span>
   ```

5. **아바타 색상**: userId 해시 기반으로 8가지 색상 중 선택
   ```typescript
   const AVATAR_COLORS = [
     "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
     "bg-red-500",    "bg-pink-500", "bg-teal-500",    "bg-orange-500",
   ]
   function getAvatarColor(userId: string): string {
     const hash = userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
     return AVATAR_COLORS[hash % AVATAR_COLORS.length]
   }
   ```

6. **제거 항목**: `priorityConfig`, `statusBorderColor`, `ArrowUp/Right/Down`, `Star` import, 포인트 표시 (상세 패널에만 유지)

---

### 2. task-detail-panel.tsx — 상태 뱃지 통일

**변경 항목:**

1. **제목 영역**: 컬러 보더(`border-l-[3px]`) 제거 → 상태 뱃지로 교체
   ```tsx
   // 변경 전
   <div className={`border-l-[3px] ${status.borderClass} pl-2`}>
     <div className="flex items-center gap-1.5 mb-1">
       <PriorityIcon className={...} />
       <span>{priority.label}</span>
       <span>·</span>
       <span>{status.label}</span>
     </div>
     <h3 className="text-base font-semibold">{task.title}</h3>
   </div>

   // 변경 후 (task-card.tsx와 동일한 statusBadge 공유 또는 복붙)
   <div>
     <div className="flex items-center gap-2 mb-1.5">
       <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusBadge[task.status].className}`}>
         {statusBadge[task.status].label}
       </span>
       <PriorityIcon className={`h-3.5 w-3.5 ${priority.color}`} />
       <span className="text-xs text-muted-foreground">{priority.label}</span>
     </div>
     <h3 className="text-base font-semibold leading-snug">{task.title}</h3>
   </div>
   ```

2. **담당자 아바타**: task-card.tsx와 동일한 `getAvatarColor()` 함수 적용 (중복 방지를 위해 `src/lib/utils/avatar.ts` 유틸로 분리)

3. **기타**: 나머지 레이아웃은 유지 (설명, 메타정보, 상태 변경 버튼, 댓글 섹션)

---

### 3. 아바타 색상 유틸 분리 (선택적)

두 파일에서 동일 함수가 필요하므로 `src/lib/utils/avatar.ts`에 추출:
```typescript
export const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-red-500",    "bg-pink-500", "bg-teal-500",    "bg-orange-500",
]
export function getAvatarColor(userId: string): string {
  const hash = userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
```

---

## 검증 방법

1. 로컬 개발 서버 실행 후 `/tasks` 페이지 접속
2. 과제 카드가 이미지 참고 디자인처럼 표시되는지 확인:
   - 흰 배경 + 둥근 모서리 + 그림자
   - 클립보드 아이콘 + 상태 뱃지
   - 제목 + 설명 2줄
   - 담당자별 다양한 색상 아바타
   - 날짜 범위 (등록일 → 마감일)
3. 과제 카드 클릭 → 상세 패널에서도 상태 뱃지가 일관성 있게 표시되는지 확인
4. 다크 모드 확인 (뱃지 dark: 클래스 적용 여부)
