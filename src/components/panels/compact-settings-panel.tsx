"use client"

import { useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function CompactSettingsPanel() {
  const { user, refreshProfile } = useAuthStore()
  const [nickname, setNickname] = useState(user?.nickname ?? "")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !nickname.trim()) return
    setIsSavingProfile(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("profiles").update({ nickname: nickname.trim() }).eq("id", user.id)
      if (error) throw error
      await refreshProfile()
      toast.success("프로필 저장됨")
    } catch {
      toast.error("저장 실패")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error("비밀번호 불일치"); return }
    if (newPassword.length < 6) { toast.error("6자 이상 필요"); return }

    setIsSavingPassword(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword("")
      setConfirmPassword("")
      toast.success("비밀번호 변경 완료")
    } catch {
      toast.error("비밀번호 변경 실패")
    } finally {
      setIsSavingPassword(false)
    }
  }

  if (!user) return null

  return (
    <div className="p-3 space-y-4">
      {/* 프로필 설정 */}
      <div>
        <p className="mb-2 text-xs font-semibold">프로필 설정</p>
        <form onSubmit={handleUpdateProfile} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">이메일</Label>
            <Input id="email" value={user.email} disabled autoComplete="email" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nickname" className="text-xs">닉네임</Label>
            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required autoComplete="nickname" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">역할</Label>
            <Input value={user.role === "admin" ? "리더" : "팀원"} disabled autoComplete="off" className="h-8 text-xs" />
          </div>
          <Button type="submit" size="sm" disabled={isSavingProfile} className="h-7 text-xs">
            {isSavingProfile && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            저장
          </Button>
        </form>
      </div>

      <div className="border-t" />

      {/* 비밀번호 변경 */}
      <div>
        <p className="mb-2 text-xs font-semibold">비밀번호 변경</p>
        <form onSubmit={handleUpdatePassword} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="newPw" className="text-xs">새 비밀번호</Label>
            <Input id="newPw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPw" className="text-xs">비밀번호 확인</Label>
            <Input id="confirmPw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" className="h-8 text-xs" />
          </div>
          <Button type="submit" size="sm" disabled={isSavingPassword} className="h-7 text-xs">
            {isSavingPassword && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            비밀번호 변경
          </Button>
        </form>
      </div>
    </div>
  )
}
