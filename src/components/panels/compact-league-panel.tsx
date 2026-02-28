"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { createClient } from "@/lib/supabase/client"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Star, Target, Flame } from "lucide-react"
import type { Profile } from "@/types/database"

export function CompactLeaguePanel() {
  const { user } = useAuthStore()
  const [members, setMembers] = useState<Profile[]>([])

  useEffect(() => {
    if (!user?.team_id) return
    const loadMembers = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("team_id", user.team_id!)
        .order("total_points_earned", { ascending: false })

      if (data) setMembers(data as Profile[])
    }
    loadMembers()
  }, [user?.team_id])

  const maxPoints = Math.max(...members.map((m) => m.total_points_earned), 1)

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-4 w-4 text-amber-500" />
      case 1: return <Medal className="h-4 w-4 text-gray-400" />
      case 2: return <Medal className="h-4 w-4 text-amber-700" />
      default:
        return (
          <span className="flex h-4 w-4 items-center justify-center text-xs font-bold text-muted-foreground">
            {index + 1}
          </span>
        )
    }
  }

  return (
    <div className="p-3 space-y-3">
      {/* 나의 현황 */}
      {user && (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
          <div className="flex flex-col items-center gap-1">
            <Star className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-muted-foreground">총 포인트</p>
            <p className="text-sm font-bold">{user.total_points_earned}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Target className="h-4 w-4 text-green-600" />
            <p className="text-xs text-muted-foreground">완료 과제</p>
            <p className="text-sm font-bold">{user.tasks_completed}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Flame className="h-4 w-4 text-purple-600" />
            <p className="text-xs text-muted-foreground">보유</p>
            <p className="text-sm font-bold">{user.points}P</p>
          </div>
        </div>
      )}

      {/* 랭킹 목록 */}
      {members.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          팀원이 없습니다
        </p>
      ) : (
        <div className="space-y-2">
          {members.map((member, index) => (
            <div
              key={member.id}
              className={`flex items-center gap-2 rounded-lg border p-2.5 ${
                index === 0
                  ? "bg-amber-50/50 border-amber-200"
                  : index === 1
                    ? "bg-gray-50/50 border-gray-200"
                    : index === 2
                      ? "bg-orange-50/50 border-orange-200"
                      : "border-border"
              } ${member.id === user?.id ? "ring-1 ring-primary/30" : ""}`}
            >
              <div className="flex w-5 justify-center">{getRankIcon(index)}</div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {member.nickname.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium truncate">{member.nickname}</p>
                  {member.role === "admin" && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">리더</Badge>
                  )}
                  {member.id === user?.id && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">나</Badge>
                  )}
                </div>
                <Progress
                  value={(member.total_points_earned / maxPoints) * 100}
                  className="h-1.5 mt-1"
                />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold">{member.total_points_earned}P</p>
                <p className="text-[10px] text-muted-foreground">{member.tasks_completed}건</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
