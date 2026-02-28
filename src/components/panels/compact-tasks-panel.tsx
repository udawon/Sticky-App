"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useTaskStore } from "@/stores/task-store"
import { createClient } from "@/lib/supabase/client"
import { TaskCard } from "@/components/tasks/task-card"
import { TaskDialog } from "@/components/tasks/task-dialog"
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel"
import { TaskFilterBar } from "@/components/tasks/task-filter-bar"
import { Button } from "@/components/ui/button"
import { Plus, ClipboardList } from "lucide-react"
import type { TaskStatus, Profile } from "@/types/database"

// 상태별 컬러 설정
const STATUS_CONFIG: Record<TaskStatus | "all", {
  label: string
  dot: string
  active: string
  activeDot: string
}> = {
  all:         { label: "전체",  dot: "bg-slate-400",  active: "bg-slate-700 text-white",          activeDot: "bg-white/70" },
  todo:        { label: "대기",  dot: "bg-slate-400",  active: "bg-slate-600 text-white",          activeDot: "bg-white/70" },
  in_progress: { label: "진행중", dot: "bg-blue-500",  active: "bg-blue-600 text-white",           activeDot: "bg-white/70" },
  review:      { label: "검토",  dot: "bg-amber-500", active: "bg-amber-500 text-white",           activeDot: "bg-white/70" },
  done:        { label: "완료",  dot: "bg-green-500", active: "bg-green-600 text-white",           activeDot: "bg-white/70" },
}

export function CompactTasksPanel() {
  const { user, setUser } = useAuthStore()
  const {
    tasks,
    filter,
    setTasks,
    setFilter,
    addTask,
    updateTask,
    removeTask,
    setChangingStatus,
    isChangingStatus,
    getFilteredSortedTasks,
  } = useTaskStore()

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<Profile[]>([])

  const loadTasks = useCallback(async () => {
    if (!user?.team_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("team_id", user.team_id)
      .order("created_at", { ascending: false })
    if (data) setTasks(data as Parameters<typeof setTasks>[0])
  }, [user?.team_id, setTasks])

  const loadTeamMembers = useCallback(async () => {
    if (!user?.team_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("team_id", user.team_id)
    if (data) setTeamMembers(data as Profile[])
  }, [user?.team_id])

  useEffect(() => {
    loadTasks()
    loadTeamMembers()
  }, [loadTasks, loadTeamMembers])

  useEffect(() => {
    if (!user?.team_id) return
    const supabase = createClient()
    const channel = supabase
      .channel("tasks-realtime-compact")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks", filter: `team_id=eq.${user.team_id}` }, (payload) => {
        addTask(payload.new as Parameters<typeof addTask>[0])
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks", filter: `team_id=eq.${user.team_id}` }, (payload) => {
        const updated = payload.new as Parameters<typeof addTask>[0]
        updateTask(updated.id, updated)
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks", filter: `team_id=eq.${user.team_id}` }, (payload) => {
        const deleted = payload.old as { id: string }
        removeTask(deleted.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.team_id, addTask, updateTask, removeTask])

  const filteredTasks = getFilteredSortedTasks(user?.id)

  const displayTasks = useMemo(() => {
    if (!user) return filteredTasks
    if (user.role === "admin") return filteredTasks.filter((t) => t.created_by === user.id)
    return filteredTasks.filter((t) => t.assigned_to.includes(user.id))
  }, [filteredTasks, user])

  // 상태별 과제 수 계산
  const statusCounts = useMemo(() => {
    const base = filteredTasks
    return {
      all: base.length,
      todo: base.filter((t) => t.status === "todo").length,
      in_progress: base.filter((t) => t.status === "in_progress").length,
      review: base.filter((t) => t.status === "review").length,
      done: base.filter((t) => t.status === "done").length,
    }
  }, [filteredTasks])

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (isChangingStatus(taskId)) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    setChangingStatus(taskId, true)
    try {
      const supabase = createClient()
      const previousStatus = task.status
      const updates: Partial<typeof task> = {
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null,
        updated_by: user?.id ?? null,
      }
      const { error } = await supabase.from("tasks").update(updates).eq("id", taskId)
      if (!error) {
        updateTask(taskId, updates)
        if (newStatus === "done" && previousStatus !== "done" && task.points > 0) {
          for (const assigneeId of task.assigned_to) {
            await supabase.from("point_logs").insert({
              user_id: assigneeId,
              amount: task.points,
              reason: `과제 완료: ${task.title}`,
              task_id: taskId,
            })
            await supabase.rpc("increment_points", {
              user_id_input: assigneeId,
              amount_input: task.points,
            })
          }
          if (user && task.assigned_to.includes(user.id)) {
            setUser({
              ...user,
              points: user.points + task.points,
              total_points_earned: user.total_points_earned + task.points,
              tasks_completed: user.tasks_completed + 1,
            })
          }
        }
      }
    } finally {
      setChangingStatus(taskId, false)
    }
  }

  if (selectedTaskId) {
    return (
      <TaskDetailPanel
        taskId={selectedTaskId}
        teamMembers={teamMembers}
        onStatusChange={handleStatusChange}
        onUpdate={loadTasks}
        onBack={() => setSelectedTaskId(null)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-muted/30">

      {/* ── 헤더 영역 ── */}
      <div className="bg-background border-b px-4 pt-4 pb-3 shrink-0">
        {/* 타이틀 + 새 과제 버튼 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-bold">과제 보드</h2>
            <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {displayTasks.length}
            </span>
          </div>
          {user?.role === "admin" && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3 w-3" />
              새 과제
            </Button>
          )}
        </div>

        {/* 상태 필터 — 컬러 도트 pill */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {(Object.keys(STATUS_CONFIG) as (TaskStatus | "all")[]).map((status) => {
            const cfg = STATUS_CONFIG[status]
            const count = statusCounts[status]
            const isActive = filter === status
            return (
              <button
                key={status}
                onClick={() => setFilter(status as TaskStatus | "all")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? `${cfg.active} shadow-sm`
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? cfg.activeDot : cfg.dot}`} />
                {cfg.label}
                <span className={`${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 검색/정렬 바 ── */}
      <div className="bg-background border-b px-4 py-2 shrink-0">
        <TaskFilterBar />
      </div>

      {/* ── 과제 목록 ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {displayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <ClipboardList className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium">과제가 없습니다</p>
            <p className="text-xs text-muted-foreground/60 mt-1">새 과제를 만들어 시작해보세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                teamMembers={teamMembers}
                onStatusChange={handleStatusChange}
                onClick={() => setSelectedTaskId(task.id)}
                currentUserId={user?.id ?? ""}
                userRole={user?.role ?? "member"}
              />
            ))}
          </div>
        )}
      </div>

      <TaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        teamMembers={teamMembers}
        onSuccess={loadTasks}
      />
    </div>
  )
}
