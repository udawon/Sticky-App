"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore, isCacheValid } from "@/stores/auth-store"
import { toast } from "sonner"
import type { Profile } from "@/types/database"

interface AuthProviderProps {
  children: ReactNode
}

// Supabase 쿠키에서 직접 세션 읽기 (initializeAsync 우회용)
function readSessionFromCookie(): { userId: string; email: string; accessToken: string; userMetadata: Record<string, unknown> } | null {
  if (typeof document === "undefined") return null
  try {
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.match(/https?:\/\/([^.]+)/)?.[1] ?? ""
    const cookieName = `sb-${projectRef}-auth-token`
    const match = document.cookie.split(";").find(c => c.trim().startsWith(cookieName + "="))
    if (!match) return null
    const value = match.split("=").slice(1).join("=")
    const decoded = value.startsWith("base64-") ? atob(value.slice(7)) : decodeURIComponent(value)
    const session = JSON.parse(decoded)
    if (!session?.user?.id || !session?.access_token) return null
    // 만료 확인
    if (session?.expires_at && (session.expires_at * 1000) < Date.now()) return null
    return {
      userId: session.user.id,
      email: session.user.email ?? "",
      accessToken: session.access_token,
      userMetadata: session.user.user_metadata ?? {},
    }
  } catch {
    return null
  }
}

// Supabase REST API 직접 호출로 프로필 조회 (initializeAsync 우회용)
async function fetchProfileDirect(userId: string, accessToken: string): Promise<Profile | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    )
    if (!res.ok) return null
    const rows = await res.json()
    return rows?.[0] ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()
    let _mounted = true

    // ── 초기 세션 확인: 쿠키 직접 읽기 → REST API로 프로필 조회 ──
    // 이유: supabase.auth.getSession() / onAuthStateChange의 INITIAL_SESSION은
    // initializeAsync()가 네트워크 행으로 수십 초 지연되는 문제가 있음
    const cookieSession = readSessionFromCookie()

    if (cookieSession) {
      const { userId, accessToken, userMetadata } = cookieSession

      // 캐시가 유효하면 DB 조회 스킵
      const cachedUser = useAuthStore.getState().user
      if (cachedUser?.id === userId && isCacheValid()) {
        setLoading(false)
      } else {
        fetchProfileDirect(userId, accessToken).then(profile => {
          if (!_mounted) return
          const metaRole = userMetadata?.role as Profile["role"] | undefined
          if (profile) {
            // DB role ↔ 가입 role 불일치 보정 (팀 없는 경우만)
            if (metaRole && profile.role !== metaRole && !profile.team_id) {
              profile.role = metaRole
              supabase.from("profiles").update({ role: metaRole }).eq("id", userId)
            }
            setUser(profile)
          } else {
            // DB 조회 실패 → 캐시 유지 또는 최소 fallback
            const cached = useAuthStore.getState().user
            if (cached?.id === userId) {
              console.info("[Auth] DB 조회 실패, 캐시 유지")
            } else {
              setUser({
                id: userId,
                email: cookieSession.email,
                nickname: (userMetadata?.nickname as string) ?? cookieSession.email.split("@")[0] ?? "사용자",
                role: metaRole ?? "member",
                team_id: null,
                avatar_body: "default",
                avatar_accessories: [],
                points: 0,
                total_points_earned: 0,
                tasks_completed: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
            }
          }
          setLoading(false)
        })
      }
    } else {
      // 쿠키에 세션 없음 → 비로그인 상태
      const current = useAuthStore.getState().user
      if (current !== null) setUser(null)
      setLoading(false)
    }

    // ── 이후 세션 변경 감지 (SIGNED_OUT, TOKEN_REFRESHED 등) ──
    // initializeAsync가 느리게 완료되면 이 구독이 활성화됨
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!_mounted) return

      // 초기 세션은 위에서 쿠키로 처리했으므로 스킵
      if (event === "INITIAL_SESSION") return

      if (session?.user) {
        const cachedUser = useAuthStore.getState().user
        if (event === "TOKEN_REFRESHED" && cachedUser && isCacheValid()) return

        const profile = await fetchProfileDirect(session.user.id, session.access_token)
        const metaRole = session.user.user_metadata?.role as Profile["role"] | undefined

        if (!_mounted) return

        if (profile) {
          if (metaRole && profile.role !== metaRole && !profile.team_id) {
            profile.role = metaRole
            supabase.from("profiles").update({ role: metaRole }).eq("id", session.user.id)
          }
          setUser(profile)
        } else {
          const cached = useAuthStore.getState().user
          if (!cached || cached.id !== session.user.id) {
            setUser({
              id: session.user.id,
              email: session.user.email ?? "",
              nickname: session.user.user_metadata?.nickname ?? session.user.email?.split("@")[0] ?? "사용자",
              role: metaRole ?? "member",
              team_id: null,
              avatar_body: "default",
              avatar_accessories: [],
              points: 0,
              total_points_earned: 0,
              tasks_completed: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
        }
      } else {
        const current = useAuthStore.getState().user
        if (current !== null) setUser(null)
        setLoading(false)
      }

      if (event === "TOKEN_REFRESHED" && !session) {
        toast.error("세션이 만료되었습니다. 다시 로그인해주세요.")
        router.push("/login")
      }
    })

    // 안전장치: 30초 후 강제 로딩 해제
    const timeout = setTimeout(() => {
      if (_mounted) setLoading(false)
    }, 30000)

    return () => {
      _mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [setUser, setLoading, router])

  return <>{children}</>
}
