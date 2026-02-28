"use client"

import { useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, LogIn, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function CompactTeamSetup() {
  const { user, refreshProfile } = useAuthStore()
  const isAdmin = user?.role === "admin"
  const [teamName, setTeamName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return
    if (!user) {
      toast.error("로그인 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.")
      return
    }
    setIsCreating(true)
    try {
      const supabase = createClient()
      console.log("[TeamSetup] 팀 생성 시도:", { teamName, userId: user.id })

      const { data: team, error } = await supabase
        .from("teams")
        .insert({ name: teamName, created_by: user.id })
        .select()
        .single()

      if (error) {
        console.error("[TeamSetup] 팀 생성 에러:", error)
        throw error
      }
      console.log("[TeamSetup] 팀 생성 성공:", team)

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ team_id: team.id, role: "admin" })
        .eq("id", user.id)

      if (profileError) {
        console.error("[TeamSetup] 프로필 업데이트 에러:", profileError)
        throw profileError
      }

      await refreshProfile()
      toast.success("팀 생성 완료!")
    } catch (err) {
      console.error("[TeamSetup] 팀 생성 실패:", err)
      const message = err instanceof Error ? err.message :
        (err && typeof err === "object" && "message" in err) ? String((err as { message: string }).message) : "알 수 없는 오류"
      toast.error("팀 생성 실패: " + message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinTeam = async () => {
    if (!inviteCode.trim()) return
    if (!user) {
      toast.error("로그인 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.")
      return
    }
    setIsJoining(true)
    try {
      const supabase = createClient()
      console.log("[TeamSetup] 팀 참가 시도:", { inviteCode: inviteCode.trim(), userId: user.id })

      const { data: team, error } = await supabase
        .from("teams")
        .select("id")
        .eq("invite_code", inviteCode.trim())
        .single()

      if (error || !team) {
        console.error("[TeamSetup] 초대 코드 조회 실패:", error)
        toast.error("유효하지 않은 초대 코드입니다.")
        return
      }
      console.log("[TeamSetup] 팀 조회 성공:", team)

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ team_id: team.id })
        .eq("id", user.id)

      if (profileError) {
        console.error("[TeamSetup] 프로필 업데이트 에러:", profileError)
        throw profileError
      }

      await refreshProfile()
      toast.success("팀 참가 완료!")
    } catch (err) {
      console.error("[TeamSetup] 팀 참가 실패:", err)
      toast.error("팀 참가 실패")
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-5 space-y-4">
      <div className="text-center">
        <span className="text-3xl">📌</span>
        <h2 className="mt-2 text-base font-bold">팀에 참가하세요</h2>
        <p className="text-xs text-muted-foreground">
          {isAdmin ? "팀을 만들거나 초대 코드로 참가" : "초대 코드로 팀에 참가하세요"}
        </p>
      </div>

      {/* 팀 생성 - 리더(admin)만 표시 */}
      {isAdmin && (
        <>
          <div className="w-full space-y-2.5 rounded-lg border p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> 새 팀 만들기
            </div>
            <div className="space-y-1">
              <Label className="text-xs">팀 이름</Label>
              <Input
                placeholder="팀 이름을 입력하세요"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                className="h-8 text-xs"
              />
            </div>
            <Button
              onClick={handleCreateTeam}
              disabled={isCreating || !teamName.trim()}
              className="w-full h-8 text-xs"
            >
              {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {isCreating ? "생성 중..." : "만들기"}
            </Button>
          </div>

          <div className="flex w-full items-center gap-2">
            <div className="flex-1 border-t" />
            <span className="text-[10px] text-muted-foreground">또는</span>
            <div className="flex-1 border-t" />
          </div>
        </>
      )}

      {/* 팀 참가 */}
      <div className="w-full space-y-2.5 rounded-lg border p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <LogIn className="h-3.5 w-3.5" /> 팀 참가
        </div>
        <div className="space-y-1">
          <Label className="text-xs">초대 코드</Label>
          <Input
            placeholder="초대 코드를 입력하세요"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinTeam()}
            className="h-8 text-xs"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleJoinTeam}
          disabled={isJoining || !inviteCode.trim()}
          className="w-full h-8 text-xs"
        >
          {isJoining ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          {isJoining ? "참가 중..." : "참가"}
        </Button>
      </div>
    </div>
  )
}
