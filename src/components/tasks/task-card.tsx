"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Calendar } from "lucide-react"
import { MiniAvatar } from "@/components/avatar/mini-avatar"
import type { Task, TaskStatus, UserRole, Profile } from "@/types/database"

interface TaskCardProps {
  task: Task
  teamMembers: Profile[]
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onClick: () => void
  currentUserId: string
  userRole: UserRole
}

// 상태 뱃지
const statusBadge: Record<TaskStatus, { label: string; className: string }> = {
  todo:        { label: "대기",   className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  in_progress: { label: "진행중", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  review:      { label: "검토",   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  done:        { label: "완료",   className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
}

// 우선순위 뱃지
const priorityBadge = {
  high:   { label: "높음", className: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  medium: { label: "보통", className: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  low:    { label: "낮음", className: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })

export function TaskCard({
  task,
  teamMembers,
  onStatusChange,
  onClick,
  currentUserId,
  userRole,
}: TaskCardProps) {
  const badge = statusBadge[task.status]
  const pBadge = priorityBadge[task.priority]
  const assignees = teamMembers.filter((m) => task.assigned_to.includes(m.id))

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "done"

  const canChangeStatus =
    userRole === "admin" || task.assigned_to.includes(currentUserId)

  return (
    <div
      className="rounded-xl bg-card border border-border/50 shadow-sm px-3 py-2.5 cursor-pointer hover:shadow-md hover:border-border/80 transition-all"
      onClick={onClick}
    >
      {/* 행1: 우선순위 뱃지 + 상태 뱃지 + 메뉴 */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${pBadge.className}`}>
            {pBadge.label}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        {canChangeStatus && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1 shrink-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "todo") }}>
                대기로 변경
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "in_progress") }}>
                진행중으로 변경
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "review") }}>
                검토로 변경
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "done") }}>
                완료로 변경
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 행2: 아바타 + 제목 + 날짜 범위 */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* 담당자 아바타 */}
        {assignees.length > 0 && (
          <div className="flex -space-x-2 shrink-0">
            {assignees.slice(0, 2).map((member) => (
              <div
                key={member.id}
                className="flex items-end justify-center h-[28px] w-[28px] rounded-md border border-background overflow-hidden bg-muted/30"
                title={member.nickname}
              >
                <MiniAvatar
                  hairKey={member.avatar_hair ?? "hair_default"}
                  faceKey={member.avatar_face ?? "face_default"}
                  topKey={member.avatar_top ?? "top_default"}
                  bottomKey={member.avatar_bottom ?? "bottom_default"}
                  shoesKey={member.avatar_shoes ?? "shoes_default"}
                  size={28}
                />
              </div>
            ))}
            {assignees.length > 2 && (
              <div className="flex h-[28px] w-[28px] items-center justify-center rounded-md border border-background bg-muted text-[8px] font-bold">
                +{assignees.length - 2}
              </div>
            )}
          </div>
        )}

        {/* 과제명 */}
        <p className="text-xs font-medium truncate flex-1 min-w-0">{task.title}</p>

        {/* 날짜 범위: 등록일 → 마감일 */}
        {task.due_date && (
          <span
            className={`flex items-center gap-0.5 text-[10px] shrink-0 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
          >
            <Calendar className="h-2.5 w-2.5" />
            {formatDate(task.created_at)} → {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  )
}
