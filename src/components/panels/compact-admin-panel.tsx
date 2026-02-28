"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Users, Star, Trash2, Plus, Minus, Copy, Check, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { CompactNotionPanel } from "@/components/panels/compact-notion-panel"
import type { Profile } from "@/types/database"

export function CompactAdminPanel() {
  const { user } = useAuthStore()
  const [members, setMembers] = useState<Profile[]>([])
  const [pointDialogOpen, setPointDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null)
  const [pointAmount, setPointAmount] = useState("")
  const [pointReason, setPointReason] = useState("")
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadInviteCode = async () => {
    if (!user?.team_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from("teams")
      .select("invite_code")
      .eq("id", user.team_id)
      .single()
    if (data) setInviteCode(data.invite_code)
  }

  const handleCopyCode = async () => {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    toast.success("초대 코드가 복사되었습니다.")
    setTimeout(() => setCopied(false), 2000)
  }

  const loadMembers = async () => {
    if (!user?.team_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("team_id", user.team_id)
      .order("created_at", { ascending: true })
    if (data) setMembers(data as Profile[])
  }

  useEffect(() => {
    loadMembers()
    loadInviteCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.team_id])

  const handleRemoveMember = async (memberId: string) => {
    if (memberId === user?.id) { toast.error("자신은 추방 불가"); return }
    if (!confirm("정말 이 팀원을 제거하시겠습니까?")) return

    const supabase = createClient()
    const { error } = await supabase.from("profiles").update({ team_id: null }).eq("id", memberId)
    if (!error) {
      toast.success("팀원 제거됨")
      loadMembers()
    } else {
      toast.error("제거 실패")
    }
  }

  const handlePointAction = async (isAdd: boolean) => {
    if (!selectedMember || !pointAmount || !pointReason) return
    const amount = parseInt(pointAmount) * (isAdd ? 1 : -1)
    const supabase = createClient()

    await supabase.from("point_logs").insert({ user_id: selectedMember.id, amount, reason: pointReason })

    const newPoints = Math.max(0, selectedMember.points + amount)
    const newTotal = isAdd ? selectedMember.total_points_earned + amount : selectedMember.total_points_earned

    await supabase.from("profiles").update({ points: newPoints, total_points_earned: newTotal }).eq("id", selectedMember.id)

    toast.success(`${selectedMember.nickname}: ${Math.abs(amount)}P ${isAdd ? "지급" : "차감"}`)
    setPointDialogOpen(false)
    setPointAmount("")
    setPointReason("")
    loadMembers()
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <span className="mb-2 text-2xl">🔒</span>
        <p className="text-sm">관리자 권한이 필요합니다</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      {/* 초대 코드 */}
      <div className="rounded-lg border bg-muted/40 px-3 py-2">
        <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">팀 초대 코드</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-background px-2 py-1 text-sm font-mono font-bold tracking-widest text-center border">
            {inviteCode ?? "불러오는 중..."}
          </code>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleCopyCode}
            disabled={!inviteCode}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="w-full h-7">
          <TabsTrigger value="members" className="flex-1 text-xs h-6">
            <Users className="mr-1 h-3 w-3" />팀원
          </TabsTrigger>
          <TabsTrigger value="points" className="flex-1 text-xs h-6">
            <Star className="mr-1 h-3 w-3" />포인트
          </TabsTrigger>
          <TabsTrigger value="notion" className="flex-1 text-xs h-6">
            <BookOpen className="mr-1 h-3 w-3" />Notion
          </TabsTrigger>
        </TabsList>

        {/* 팀원 관리 */}
        <TabsContent value="members" className="mt-2 space-y-1.5">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 rounded-lg border p-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {member.nickname.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium truncate">{member.nickname}</p>
                  <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-[10px] px-1 py-0 h-4">
                    {member.role === "admin" ? "리더" : "팀원"}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
              </div>
              <div className="text-right text-[10px]">
                <p>{member.points}P</p>
                <p className="text-muted-foreground">{member.tasks_completed}건</p>
              </div>
              {member.id !== user.id && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveMember(member.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </TabsContent>

        {/* 포인트 관리 */}
        <TabsContent value="points" className="mt-2 space-y-1.5">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 rounded-lg border p-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{member.nickname}</p>
                <p className="text-[10px] text-muted-foreground">
                  보유: {member.points}P / 누적: {member.total_points_earned}P
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => { setSelectedMember(member); setPointDialogOpen(true) }}
              >
                <Star className="mr-1 h-3 w-3" />관리
              </Button>
            </div>
          ))}
        </TabsContent>

        {/* Notion 연동 */}
        <TabsContent value="notion" className="mt-2 -mx-3 -mb-3">
          <CompactNotionPanel />
        </TabsContent>
      </Tabs>

      <Dialog open={pointDialogOpen} onOpenChange={setPointDialogOpen}>
        <DialogContent className="max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-sm">{selectedMember?.nickname} 포인트</DialogTitle>
            <DialogDescription className="sr-only">팀원 포인트 지급 및 차감</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">수량</Label>
              <Input type="number" min="1" value={pointAmount} onChange={(e) => setPointAmount(e.target.value)} placeholder="포인트" autoComplete="off" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">사유</Label>
              <Input value={pointReason} onChange={(e) => setPointReason(e.target.value)} placeholder="사유 입력" autoComplete="off" className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePointAction(false)} disabled={!pointAmount || !pointReason} className="text-destructive text-xs">
              <Minus className="mr-1 h-3 w-3" />차감
            </Button>
            <Button size="sm" onClick={() => handlePointAction(true)} disabled={!pointAmount || !pointReason} className="text-xs">
              <Plus className="mr-1 h-3 w-3" />지급
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
