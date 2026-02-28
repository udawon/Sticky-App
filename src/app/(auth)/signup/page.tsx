"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { UserRole } from "@/types/database"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [role, setRole] = useState<UserRole>("member")
  const [isLoading, setIsLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.")
      return
    }

    if (password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.")
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname, role },
        },
      })

      if (error) {
        toast.error("회원가입 실패", { description: error.message })
        return
      }

      toast.success("회원가입 완료!", { description: "팀을 만들거나 초대 코드로 참가하세요." })
      router.push("/")
    } catch {
      toast.error("오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-xl shadow-black/20 border-0 max-h-[540px] overflow-hidden">
      <ScrollArea className="max-h-[540px]">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl shadow-lg shadow-primary/30">
            📌
          </div>
          <CardTitle className="text-lg">회원가입</CardTitle>
          <CardDescription className="text-xs">
            Claude Sticky에 가입하세요
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-2.5 pb-2">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">이메일</Label>
              <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nickname" className="text-xs">닉네임</Label>
              <Input id="nickname" type="text" placeholder="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} required autoComplete="nickname" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role" className="text-xs">역할</Label>
              <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">리더 (팀 관리자)</SelectItem>
                  <SelectItem value="member">팀원</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs">비밀번호</Label>
              <Input id="password" type="password" placeholder="6자 이상" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="text-xs">비밀번호 확인</Label>
              <Input id="confirmPassword" type="password" placeholder="비밀번호 확인" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" className="h-8 text-sm" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full h-8 text-sm" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              가입하기
            </Button>
            <p className="text-xs text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </p>
          </CardFooter>
        </form>
      </ScrollArea>
    </Card>
  )
}
