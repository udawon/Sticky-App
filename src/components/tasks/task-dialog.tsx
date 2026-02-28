"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuthStore } from "@/stores/auth-store"
import { createClient } from "@/lib/supabase/client"
import { taskSchema, type TaskFormValues } from "@/lib/validations/task-schema"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { getAvatarColor } from "@/lib/utils/avatar"
import type { Task, TaskPriority, Profile } from "@/types/database"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamMembers: Profile[]
  onSuccess: () => void
  editTask?: Task
}

// 우선순위 버튼 스타일 (상세 페이지와 동일)
const priorityActiveStyle: Record<TaskPriority, string> = {
  high:   "bg-red-500 text-white hover:bg-red-600 border-transparent",
  medium: "bg-amber-500 text-white hover:bg-amber-600 border-transparent",
  low:    "bg-blue-500 text-white hover:bg-blue-600 border-transparent",
}

const priorityLabel: Record<TaskPriority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
}

const inactiveBtn = "bg-transparent text-muted-foreground border-border hover:bg-muted"

export function TaskDialog({
  open,
  onOpenChange,
  teamMembers,
  onSuccess,
  editTask,
}: TaskDialogProps) {
  const { user } = useAuthStore()

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      points: 10,
      dueDate: "",
      assignedTo: [],
    },
  })

  useEffect(() => {
    if (open) {
      if (editTask) {
        reset({
          title: editTask.title,
          description: editTask.description ?? "",
          priority: editTask.priority,
          points: editTask.points,
          dueDate: editTask.due_date
            ? new Date(editTask.due_date).toISOString().split("T")[0]
            : "",
          assignedTo: editTask.assigned_to,
        })
      } else {
        reset({
          title: "",
          description: "",
          priority: "medium",
          points: 10,
          dueDate: "",
          assignedTo: [],
        })
      }
    }
  }, [open, editTask, reset])

  const assignedTo = watch("assignedTo")

  const toggleAssignee = (memberId: string) => {
    const current = assignedTo ?? []
    const next = current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId]
    setValue("assignedTo", next)
  }

  const onSubmit = async (values: TaskFormValues) => {
    let teamId = user?.team_id
    let userId = user?.id

    if (!teamId || !userId) {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, team_id")
          .eq("id", session.user.id)
          .single()
        teamId = profile?.team_id
        userId = profile?.id ?? session.user.id
      }
    }

    if (!teamId) {
      toast.error("팀 정보를 찾을 수 없습니다. 페이지를 새로고침 해주세요.")
      return
    }

    try {
      const supabase = createClient()
      const taskData = {
        title: values.title.trim(),
        description: (values.description ?? "").trim(),
        priority: values.priority,
        assigned_to: values.assignedTo,
        points: values.points,
        due_date: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        team_id: teamId,
        created_by: userId!,
      }

      if (editTask) {
        const { error } = await supabase.from("tasks").update(taskData).eq("id", editTask.id)
        if (error) throw error
        toast.success("과제가 수정되었습니다.")
      } else {
        const { error } = await supabase.from("tasks").insert(taskData)
        if (error) throw error
        toast.success("과제가 생성되었습니다.")
      }

      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error("오류가 발생했습니다.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-sm font-bold">
            {editTask ? "과제 수정" : "새 과제 만들기"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editTask ? "과제 정보를 수정합니다" : "새 과제를 생성합니다"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* 폼 본문: 카드 스타일 */}
          <div className="bg-muted/30 px-4 py-3 space-y-2.5 max-h-[70vh] overflow-y-auto">

            {/* 카드1: 과제명 + 설명 */}
            <div className="bg-card rounded-xl border border-border/50 shadow-sm px-4 py-3 space-y-2.5">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/70 mb-1">
                  과제명 <span className="text-destructive">*</span>
                </p>
                <Input
                  placeholder="과제 제목을 입력하세요"
                  autoComplete="off"
                  className="h-8 text-sm"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="border-t border-border/50" />

              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/70 mb-1">설명</p>
                <Textarea
                  placeholder="과제에 대한 상세 설명"
                  rows={3}
                  className="resize-none text-xs"
                  {...register("description")}
                />
              </div>
            </div>

            {/* 카드2: 중요도 */}
            <div className="bg-card rounded-xl border border-border/50 shadow-sm px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground/70 mb-1.5">중요도</p>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-1.5">
                    {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`h-6 text-xs px-2.5 rounded-md border font-medium transition-colors ${
                          field.value === p ? priorityActiveStyle[p] : inactiveBtn
                        }`}
                        onClick={() => field.onChange(p)}
                      >
                        {priorityLabel[p]}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* 카드3: 마감일 + 포인트 */}
            <div className="bg-card rounded-xl border border-border/50 shadow-sm px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                {/* 마감일 */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground/70 mb-1">마감일</p>
                  <input
                    type="date"
                    className="h-7 text-xs px-2 rounded-md border border-border bg-background text-foreground"
                    {...register("dueDate")}
                  />
                </div>
                {/* 포인트 */}
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-muted-foreground/70 mb-1">포인트</p>
                  <Input
                    type="number"
                    min="0"
                    max="1000"
                    autoComplete="off"
                    className="h-7 w-20 text-xs text-right"
                    {...register("points", { valueAsNumber: true })}
                  />
                  {errors.points && (
                    <p className="text-xs text-destructive mt-1">{errors.points.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 카드4: 담당자 */}
            <div className="bg-card rounded-xl border border-border/50 shadow-sm px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground/70 mb-1.5">담당자</p>
              <div className="flex flex-wrap gap-1.5">
                {teamMembers.map((member) => {
                  const isAssigned = assignedTo?.includes(member.id) ?? false
                  const avatarColor = getAvatarColor(member.id)
                  return (
                    <button
                      key={member.id}
                      type="button"
                      className={`flex items-center gap-1.5 rounded-full pl-0.5 pr-2.5 py-0.5 border text-xs font-medium transition-all ${
                        isAssigned
                          ? `${avatarColor} text-white border-transparent shadow-sm`
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                      }`}
                      onClick={() => toggleAssignee(member.id)}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold shrink-0 ${
                          isAssigned ? "bg-black/10 text-white" : `${avatarColor} text-white`
                        }`}
                      >
                        {member.nickname.charAt(0).toUpperCase()}
                      </div>
                      {member.nickname}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>

          {/* 하단 버튼 */}
          <DialogFooter className="px-5 py-3 border-t bg-background">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editTask ? "수정 완료" : "과제 생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
