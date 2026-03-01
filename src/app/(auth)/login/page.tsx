"use client"

import { useState, useEffect } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2, Users, Crown, ExternalLink } from "lucide-react"

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD
const DEMO_ADMIN_EMAIL = process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL
const DEMO_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD

const isDemoEnabled = !!(DEMO_EMAIL && DEMO_PASSWORD)

const APP_WIDTH = 360
const APP_HEIGHT = 720  // 브라우저 크롬(주소창+타이틀바) 높이 보정 증가

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [demoDialogOpen, setDemoDialogOpen] = useState(false)
  // SSR 기본 true → 깜빡임 방지 (클라이언트에서 팝업 여부 감지 후 변경)
  const [isPopup, setIsPopup] = useState(true)

  useEffect(() => {
    // opener 있거나 창 폭이 앱 크기에 가까우면 팝업 창으로 간주
    const inPopup = !!window.opener || window.outerWidth <= APP_WIDTH + 60
    setIsPopup(inPopup)
  }, [])

  const handleLaunch = () => {
    const x = Math.round((screen.width - APP_WIDTH) / 2)
    const y = Math.round((screen.height - APP_HEIGHT) / 2)
    window.open(
      window.location.href,
      "sticky-app",
      `width=${APP_WIDTH},height=${APP_HEIGHT},left=${x},top=${y},` +
      `menubar=no,toolbar=no,location=no,status=no,resizable=no`
    )
  }

  const signInAs = async (loginEmail: string, loginPassword: string) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
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

  const handleDemoMember = async () => {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return
    setDemoDialogOpen(false)
    await signInAs(DEMO_EMAIL, DEMO_PASSWORD)
  }

  const handleDemoAdmin = async () => {
    if (!DEMO_ADMIN_EMAIL || !DEMO_ADMIN_PASSWORD) {
      // 어드민 env 미설정 시 멤버 계정으로 fallback
      toast.info("어드민 데모 계정이 설정되지 않아 팀원으로 체험합니다.")
      setDemoDialogOpen(false)
      await signInAs(DEMO_EMAIL!, DEMO_PASSWORD!)
      return
    }
    setDemoDialogOpen(false)
    await signInAs(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD)
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

  // 런처 화면 (일반 탭에서 접속 시)
  if (!isPopup) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center space-y-2">
          <p className="text-4xl">📌</p>
          <h1 className="text-2xl font-bold text-white">Claude Sticky</h1>
          <p className="text-sm text-slate-400">Virtual Office with Team</p>
        </div>
        <Button size="lg" onClick={handleLaunch} className="gap-2 px-8">
          <ExternalLink className="h-4 w-4" />
          앱 실행하기
        </Button>
        <p className="text-xs text-slate-500">앱 크기(360×560)의 새 창으로 열립니다</p>
      </div>
    )
  }

  return (
    <>
      <Card className="shadow-xl shadow-black/20 border-0">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl shadow-lg shadow-primary/30">
            📌
          </div>
          <CardTitle className="text-lg">Claude Sticky</CardTitle>
          <CardDescription className="text-xs">
            Virtual Office with Team
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
            {isDemoEnabled && (
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
                  onClick={() => setDemoDialogOpen(true)}
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

      {/* 역할 선택 Dialog */}
      <Dialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen}>
        <DialogContent className="max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-sm">역할을 선택하세요</DialogTitle>
            <DialogDescription className="text-xs">
              어떤 역할로 체험하시겠어요? 데모 데이터는 공유됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* 팀원 카드 */}
            <button
              className="flex flex-col items-center gap-2 rounded-xl border bg-muted/40 px-3 py-4 hover:bg-muted transition-colors text-center disabled:opacity-50"
              onClick={handleDemoMember}
              disabled={isLoading}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-xl">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </span>
              <div>
                <p className="text-xs font-semibold">팀원</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  과제 확인 & 룰렛 체험
                </p>
              </div>
            </button>

            {/* 팀 리더 카드 */}
            <button
              className="flex flex-col items-center gap-2 rounded-xl border bg-muted/40 px-3 py-4 hover:bg-muted transition-colors text-center disabled:opacity-50"
              onClick={handleDemoAdmin}
              disabled={isLoading}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-xl">
                <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </span>
              <div>
                <p className="text-xs font-semibold">팀 리더</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  관리자 기능 체험
                </p>
              </div>
            </button>
          </div>
          {isLoading && (
            <div className="flex justify-center pt-1">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
