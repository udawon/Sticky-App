"use client"

import { useState } from "react"
import Link from "next/link"
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
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleDemoLogin = async () => {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      })
      if (error) {
        toast.error("데모 로그인 실패", { description: "잠시 후 다시 시도해주세요." })
        return
      }
      window.location.href = "/"
    } catch {
      toast.error("오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error("로그인 실패", {
          description: "이메일 또는 비밀번호를 확인해주세요.",
        })
        return
      }

      toast.success("로그인 성공!")
      // router.push + router.refresh 조합은 쿠키 처리 타이밍 문제로 미들웨어가 /login으로 튕길 수 있음
      window.location.href = "/"
    } catch {
      toast.error("오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-xl shadow-black/20 border-0">
      <CardHeader className="text-center pb-3">
        <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl shadow-lg shadow-primary/30">
          📌
        </div>
        <CardTitle className="text-lg">Claude Sticky</CardTitle>
        <CardDescription className="text-xs">
          팀 협업 & 게이미피케이션
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-3 pb-3">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-8 text-sm"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full h-8 text-sm" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            로그인
          </Button>
          <p className="text-xs text-muted-foreground">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              회원가입
            </Link>
          </p>
          {DEMO_EMAIL && DEMO_PASSWORD && (
            <>
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">또는</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-8 text-sm"
                disabled={isLoading}
                onClick={handleDemoLogin}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                🎮 데모로 체험하기
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                (회원가입 없이 바로 체험 가능)
              </p>
            </>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
