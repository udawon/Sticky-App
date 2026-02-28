"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useTaskStore } from "@/stores/task-store"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  ChevronLeft,
  Calendar,
  Star,
  Trash2,
  Send,
  Pencil,
  Check,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { getAvatarColor } from "@/lib/utils/avatar"
import type { Task, TaskStatus, TaskPriority, TaskComment, Profile } from "@/types/database"

interface TaskDetailPanelProps {
  taskId: string
  teamMembers: Profile[]
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onUpdate: () => void
  onBack: () => void
}

const statusActiveStyle: Record<TaskStatus, string> = {
  todo:        "bg-slate-600 text-white hover:bg-slate-700 border-transparent",
  in_progress: "bg-blue-600 text-white hover:bg-blue-700 border-transparent",
  review:      "bg-amber-500 text-white hover:bg-amber-600 border-transparent",
  done:        "bg-green-600 text-white hover:bg-green-700 border-transparent",
}

const statusLabel: Record<TaskStatus, string> = {
  todo: "대기",
  in_progress: "진행중",
  review: "검토",
  done: "완료",
}

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

export function TaskDetailPanel({
  taskId,
  teamMembers,
  onStatusChange,
  onUpdate,
  onBack,
}: TaskDetailPanelProps) {
  const { user } = useAuthStore()
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === taskId))
  const { updateTask, removeTask } = useTaskStore()

  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSending, setIsSending] = useState(false)

  // 과제명/설명 편집
  const [editingContent, setEditingContent] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")

  // 포인트 인라인 편집
  const [editingPoints, setEditingPoints] = useState(false)
  const [pointsInput, setPointsInput] = useState("")

  // 마감일 인라인 편집
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [dueDateInput, setDueDateInput] = useState("")

  useEffect(() => {
    if (!task) onBack()
  }, [task, onBack])

  useEffect(() => {
    if (task) setPointsInput(String(task.points))
  }, [task?.points])

  const loadComments = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })
    if (data) setComments(data as TaskComment[])
  }, [taskId])

  useEffect(() => {
    if (task) loadComments()
  }, [taskId, task, loadComments])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`task-detail-${taskId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks", filter: `id=eq.${taskId}` }, (payload) => {
        updateTask((payload.new as Task).id, payload.new as Task)
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks", filter: `id=eq.${taskId}` }, () => {
        removeTask(taskId)
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` }, () => {
        loadComments()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [taskId, updateTask, removeTask, loadComments])

  // 편집 모드 진입
  const startEditing = () => {
    if (!task) return
    setEditTitle(task.title)
    setEditDescription(task.description ?? "")
    setEditingContent(true)
  }

  // 과제명/설명 저장
  const handleContentSave = async () => {
    if (!editTitle.trim()) {
      toast.error("과제명을 입력하세요.")
      return
    }
    const supabase = createClient()
    const { error } = await supabase
      .from("tasks")
      .update({ title: editTitle.trim(), description: editDescription.trim() })
      .eq("id", taskId)
    if (error) {
      toast.error("저장에 실패했습니다.")
    } else {
      setEditingContent(false)
    }
  }

  // 중요도 변경 (즉시 저장)
  const handlePriorityChange = async (priority: TaskPriority) => {
    const supabase = createClient()
    const { error } = await supabase.from("tasks").update({ priority }).eq("id", taskId)
    if (error) toast.error("중요도 변경에 실패했습니다.")
  }

  // 담당자 토글 (즉시 저장)
  const handleAssigneeToggle = async (memberId: string) => {
    if (!task) return
    const newAssigned = task.assigned_to.includes(memberId)
      ? task.assigned_to.filter((id) => id !== memberId)
      : [...task.assigned_to, memberId]
    const supabase = createClient()
    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: newAssigned })
      .eq("id", taskId)
    if (error) toast.error("담당자 변경에 실패했습니다.")
  }

  // 마감일 저장
  const handleDueDateSave = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from("tasks")
      .update({ due_date: dueDateInput || null })
      .eq("id", taskId)
    if (error) {
      toast.error("마감일 저장에 실패했습니다.")
    } else {
      setEditingDueDate(false)
    }
  }

  // 포인트 저장 (엔터)
  const handlePointsSave = async () => {
    const points = parseInt(pointsInput, 10)
    if (isNaN(points) || points < 0) {
      toast.error("올바른 포인트 값을 입력하세요.")
      return
    }
    const supabase = createClient()
    const { error } = await supabase.from("tasks").update({ points }).eq("id", taskId)
    if (error) {
      toast.error("포인트 저장에 실패했습니다.")
    } else {
      setEditingPoints(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return
    setIsSending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("task_comments").insert({
        task_id: taskId,
        user_id: user.id,
        content: newComment.trim(),
      })
      if (error) throw error
      setNewComment("")
      loadComments()
    } catch {
      toast.error("댓글 작성에 실패했습니다.")
    } finally {
      setIsSending(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("정말로 이 과제를 삭제하시겠습니까?")) return
    const supabase = createClient()
    const { error } = await supabase.from("tasks").delete().eq("id", taskId)
    if (!error) {
      toast.success("과제가 삭제되었습니다.")
      onUpdate()
      onBack()
    } else {
      toast.error("삭제에 실패했습니다.")
    }
  }

  const getCommentAuthor = (userId: string) => teamMembers.find((m) => m.id === userId)

  if (!task) return null

  // 상태 변경자: updated_by가 있으면 그 사람, 없으면 생성자
  const updater = task.updated_by
    ? teamMembers.find((m) => m.id === task.updated_by)
    : null
  const creator = teamMembers.find((m) => m.id === task.created_by)
  const wasUpdated = task.updated_at !== task.created_at
  const displayPerson = updater ?? creator
  const displayDate = wasUpdated ? task.updated_at : task.created_at
  const isAdmin = user?.role === "admin"

  return (
    <div className="flex flex-col h-full bg-muted/40 dark:bg-muted/20">

      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2 text-xs gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          뒤로
        </Button>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* 고정 섹션 */}
      <div className="shrink-0 px-3 pt-3 space-y-2.5">

        {/* ━━ 카드1: 중요도 + 상태 변경 ━━ */}
        <div className="bg-card rounded-xl border border-border/50 shadow-sm px-4 py-3">

          {/* 중요도 */}
          <p className="text-[10px] font-semibold text-muted-foreground/70 mb-1.5">중요도</p>
          <div className="flex gap-1.5">
            {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
              <Button
                key={p}
                size="sm"
                className={`h-6 text-xs px-2.5 border transition-colors ${
                  task.priority === p ? priorityActiveStyle[p] : inactiveBtn
                }`}
                onClick={() => handlePriorityChange(p)}
              >
                {priorityLabel[p]}
              </Button>
            ))}
          </div>

          {/* 구분선 */}
          <div className="border-t border-border/50 my-3" />

          {/* 상태 변경 */}
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground/70">상태 변경</p>
            {displayPerson && (
              <p className="text-[10px] text-muted-foreground">
                {displayPerson.nickname}
                {" · "}
                {new Date(displayDate).toLocaleDateString("ko-KR")}
                {wasUpdated ? " 변경함" : " 등록"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["todo", "in_progress", "review", "done"] as TaskStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                className={`h-6 text-xs px-2.5 border transition-colors ${
                  task.status === s ? statusActiveStyle[s] : inactiveBtn
                }`}
                onClick={() => onStatusChange(task.id, s)}
              >
                {statusLabel[s]}
              </Button>
            ))}
          </div>
        </div>

        {/* ━━ 카드2: 과제명/설명 + 마감일/포인트 + 담당자 ━━ */}
        <div className="bg-card rounded-xl border border-border/50 shadow-sm px-4 py-3">

          {/* 과제명 + 편집 버튼 */}
          <div className="flex items-start justify-between gap-2 mb-1">
            {editingContent ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-7 text-sm font-bold flex-1"
                autoFocus
              />
            ) : (
              <h3 className="text-sm font-bold leading-snug flex-1">{task.title}</h3>
            )}
            {isAdmin && (
              <div className="flex items-center gap-0.5 shrink-0">
                {editingContent ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-green-600 hover:text-green-700"
                      onClick={handleContentSave}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground"
                      onClick={() => setEditingContent(false)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={startEditing}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 설명 */}
          {editingContent ? (
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="설명을 입력하세요..."
              rows={3}
              className="resize-none text-xs mt-1"
            />
          ) : task.description ? (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {task.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/40 italic">설명 없음</p>
          )}

          {/* 구분선 */}
          <div className="border-t border-border/50 my-2.5" />

          {/* 마감일 + 포인트 (레이블 포함) */}
          <div className="flex items-start justify-between gap-4">
            {/* 마감일 */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/70 mb-1">마감일</p>
              {isAdmin && editingDueDate ? (
                <input
                  type="date"
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDueDateSave()
                    if (e.key === "Escape") setEditingDueDate(false)
                  }}
                  onBlur={handleDueDateSave}
                  className="h-6 text-xs px-2 rounded border border-border bg-background text-foreground"
                  autoFocus
                />
              ) : (
                <button
                  className={`flex items-center gap-1.5 rounded px-1 -ml-1 ${
                    isAdmin ? "cursor-pointer hover:bg-muted transition-colors" : "cursor-default"
                  }`}
                  onClick={() => {
                    if (!isAdmin) return
                    setDueDateInput(task.due_date ? task.due_date.slice(0, 10) : "")
                    setEditingDueDate(true)
                  }}
                  title={isAdmin ? "클릭하여 마감일 수정" : undefined}
                >
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString("ko-KR")
                      : "미설정"}
                  </span>
                </button>
              )}
            </div>

            {/* 포인트 */}
            <div className="text-right">
              <p className="text-[10px] font-semibold text-muted-foreground/70 mb-1">포인트</p>
              {isAdmin && editingPoints ? (
                <Input
                  type="number"
                  min={0}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePointsSave()
                    if (e.key === "Escape") setEditingPoints(false)
                  }}
                  onBlur={() => setEditingPoints(false)}
                  className="h-6 w-20 text-xs px-2 text-right"
                  autoFocus
                />
              ) : (
                <button
                  className={`flex items-center gap-1 rounded px-1 ${
                    isAdmin ? "cursor-pointer hover:bg-muted transition-colors" : "cursor-default"
                  }`}
                  onClick={() => isAdmin && setEditingPoints(true)}
                  title={isAdmin ? "클릭하여 포인트 수정" : undefined}
                >
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {task.points}P
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-border/50 my-2.5" />

          {/* 담당자 (레이블 포함) */}
          <p className="text-[10px] font-semibold text-muted-foreground/70 mb-1.5">담당자</p>
          <div className="flex flex-wrap gap-1.5">
            {teamMembers.map((member) => {
              const isAssigned = task.assigned_to.includes(member.id)
              const avatarColor = getAvatarColor(member.id)
              return (
                <button
                  key={member.id}
                  className={`flex items-center gap-1.5 rounded-full pl-0.5 pr-2.5 py-0.5 border text-xs font-medium transition-all ${
                    isAssigned
                      ? `${avatarColor} text-white border-transparent shadow-sm`
                      : "bg-muted/50 text-muted-foreground border-border"
                  } ${isAdmin ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
                  onClick={() => isAdmin && handleAssigneeToggle(member.id)}
                  title={isAdmin ? (isAssigned ? "담당 해제" : "담당자 지정") : undefined}
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

      {/* 메모 (flex-1 + 내부 스크롤) */}
      <div className="flex-1 overflow-hidden px-3 py-2 min-h-0">
        <div className="h-full bg-card rounded-xl border border-border/50 shadow-sm flex flex-col">
          <p className="text-[10px] font-semibold text-muted-foreground/70 px-4 pt-3 pb-2 shrink-0">
            메모 ({comments.length})
          </p>
          <div className="flex-1 overflow-y-auto px-4 pb-3 min-h-0">
            <div className="space-y-2">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">아직 메모가 없습니다.</p>
              ) : (
                comments.map((comment) => {
                  const author = getCommentAuthor(comment.user_id)
                  return (
                    <div key={comment.id} className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded-full ${
                            author ? getAvatarColor(author.id) : "bg-muted"
                          } text-white text-[9px] font-bold shrink-0`}
                        >
                          {author?.nickname?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <span className="text-xs font-medium">{author?.nickname ?? "알 수 없음"}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(comment.created_at).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 메모 입력 고정 */}
      <div className="border-t bg-background px-3 py-2 shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="메모를 입력하세요..."
            rows={2}
            className="resize-none text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleAddComment()
              }
            }}
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 self-end"
            onClick={handleAddComment}
            disabled={isSending || !newComment.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

    </div>
  )
}
