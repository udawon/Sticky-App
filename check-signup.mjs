// 회원가입 에러 디버깅 스크립트
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://vaekvowvaohfqpcsqrxu.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZWt2b3d2YW9oZnFwY3Nxcnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODIxNTQsImV4cCI6MjA4NzU1ODE1NH0.GJC7vM9S-lELmI0mTqoNoBNlxHenaTLZ7DK-w47mowE"

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSignup() {
  console.log("=== 회원가입 디버깅 ===\n")

  // 1. 회원가입 시도
  console.log("1. 회원가입 시도...")
  const { data, error } = await supabase.auth.signUp({
    email: "test-debug-" + Date.now() + "@test.com",
    password: "test123456",
    options: {
      data: {
        nickname: "테스트",
        role: "member",
      },
    },
  })

  if (error) {
    console.log("   ❌ 회원가입 실패:", error.message)
    console.log("   코드:", error.status)
    console.log("   상세:", JSON.stringify(error, null, 2))
  } else {
    console.log("   ✅ 회원가입 성공! User ID:", data.user?.id)

    if (data.user) {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single()

      if (profileErr) {
        console.log("   ❌ 프로필 조회 실패:", profileErr.message)
      } else {
        console.log("   ✅ 프로필:", JSON.stringify(profile, null, 2))
      }
    }
  }

  // 2. 이메일 확인 설정 체크
  console.log("\n2. Supabase 설정 확인...")
  const { data: session } = await supabase.auth.getSession()
  console.log("   현재 세션:", session.session ? "있음" : "없음")

  console.log("\n=== 디버깅 완료 ===")
}

testSignup()
