"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Star, TrendingUp, Target, Award, Calendar } from "lucide-react"
import type { PointLog, Task } from "@/types/database"

function getLevel(totalPoints: number) {
  const levels = [
    { level: 1, name: "새싹", min: 0, max: 100 },
    { level: 2, name: "묘목", min: 100, max: 300 },
    { level: 3, name: "나무", min: 300, max: 600 },
    { level: 4, name: "숲", min: 600, max: 1000 },
    { level: 5, name: "산", min: 1000, max: 2000 },
    { level: 6, name: "전설", min: 2000, max: Infinity },
  ]
  const current = levels.find((l) => totalPoints >= l.min && totalPoints < l.max) ?? levels[levels.length - 1]
  const progress = current.max === Infinity ? 100 : ((totalPoints - current.min) / (current.max - current.min)) * 100
  return { ...current, progress }
}

const LEVEL_EMOJI: Record<number, string> = {
  1: "🌱", 2: "🌿", 3: "🌳", 4: "🌲", 5: "⛰️", 6: "🏔️",
}

export function CompactMypagePanel() {
  const { user, refreshProfile } = useAuthStore()
  const [pointLogs, setPointLogs] = useState<PointLog[]>([])
  const [recentTasks, setRecentTasks] = useState<Task[]>([])

  useEffect(() => {
    if (!user) return
    refreshProfile()
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const loadData = async () => {
    if (!user) return
    const supabase = createClient()
    const [pointResult, taskResult] = await Promise.all([
      supabase.from("point_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
      supabase.from("tasks").select("*").contains("assigned_to", [user.id]).eq("status", "done").order("completed_at", { ascending: false }).limit(8),
    ])
    if (pointResult.data) setPointLogs(pointResult.data as PointLog[])
    if (taskResult.data) setRecentTasks(taskResult.data as Task[])
  }

  if (!user) return null
  const level = getLevel(user.total_points_earned)

  return (
    <div className="p-3 space-y-3">
      {/* 프로필 헤더 */}
      <div className="rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
              {user.nickname.charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-1 -right-1 text-sm">{LEVEL_EMOJI[level.level] ?? "🌱"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold truncate">{user.nickname}</p>
              <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-[10px] px-1 py-0 h-4">
                {user.role === "admin" ? "리더" : "팀원"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <div className="mt-1.5 space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span>Lv.{level.level} {level.name}</span>
                {level.max !== Infinity && (
                  <span className="text-muted-foreground">{user.total_points_earned}/{level.max}</span>
                )}
              </div>
              <Progress value={level.progress} className="h-1.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 통계 2x2 그리드 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Star, color: "text-amber-600", bg: "bg-amber-50", label: "보유 포인트", value: `${user.points}P` },
          { icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", label: "누적 포인트", value: `${user.total_points_earned}P` },
          { icon: Target, color: "text-green-600", bg: "bg-green-50", label: "완료 과제", value: `${user.tasks_completed}건` },
          { icon: Award, color: "text-purple-600", bg: "bg-purple-50", label: "레벨", value: `Lv.${level.level}` },
        ].map(({ icon: Icon, color, bg, label, value }) => (
          <div key={label} className="flex items-center gap-2 rounded-lg border p-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-xs font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 포인트 내역 */}
      <div>
        <p className="mb-1.5 text-xs font-semibold">포인트 내역</p>
        <ScrollArea className="h-[120px]">
          {pointLogs.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">내역 없음</p>
          ) : (
            <div className="space-y-1">
              {pointLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded border px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate">{log.reason}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${log.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                    {log.amount > 0 ? "+" : ""}{log.amount}P
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* 완료 과제 */}
      <div>
        <p className="mb-1.5 text-xs font-semibold">완료한 과제</p>
        <ScrollArea className="h-[100px]">
          {recentTasks.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">없음</p>
          ) : (
            <div className="space-y-1">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded border px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Calendar className="h-2.5 w-2.5" />
                      {task.completed_at ? new Date(task.completed_at).toLocaleDateString("ko-KR") : "-"}
                    </p>
                  </div>
                  {task.points > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 h-4">+{task.points}P</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
