import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

// 로그아웃 API: 서버사이드에서 Set-Cookie 헤더로 세션 쿠키를 확실하게 제거
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // scope: "local" → 서버 API 호출 없이 로컬 세션만 즉시 제거
  await supabase.auth.signOut({ scope: "local" })

  return response
}
