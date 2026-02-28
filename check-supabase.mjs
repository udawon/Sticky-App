// Supabase 연결 테스트 스크립트
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://vaekvowvaohfqpcsqrxu.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZWt2b3d2YW9oZnFwY3Nxcnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODIxNTQsImV4cCI6MjA4NzU1ODE1NH0.GJC7vM9S-lELmI0mTqoNoBNlxHenaTLZ7DK-w47mowE"

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkConnection() {
  console.log("=== Supabase 연결 테스트 ===\n")

  // 1. 기본 연결 확인
  console.log("1. 기본 연결 확인...")
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.log("   ❌ Auth 연결 실패:", error.message)
    } else {
      console.log("   ✅ Auth 연결 성공 (세션:", data.session ? "있음" : "없음", ")")
    }
  } catch (e) {
    console.log("   ❌ Auth 연결 실패:", e.message)
  }

  // 2. 테이블 존재 확인
  const tables = ["profiles", "teams", "tasks", "task_comments", "shop_items", "purchases", "point_logs", "notifications"]

  console.log("\n2. 테이블 존재 확인...")
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(1)
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`)
      } else {
        console.log(`   ✅ ${table}: 정상 (${data.length}개 행)`)
      }
    } catch (e) {
      console.log(`   ❌ ${table}: ${e.message}`)
    }
  }

  // 3. RPC 함수 확인
  console.log("\n3. RPC 함수 확인...")
  try {
    const { error } = await supabase.rpc("increment_points", {
      user_id_input: "00000000-0000-0000-0000-000000000000",
      amount_input: 0,
    })
    if (error && error.message.includes("does not exist")) {
      console.log("   ❌ increment_points: 함수가 존재하지 않음")
    } else if (error) {
      // 유효하지 않은 UUID로 인한 에러는 함수 자체는 존재한다는 의미
      console.log("   ✅ increment_points: 함수 존재 (실행 에러:", error.message, ")")
    } else {
      console.log("   ✅ increment_points: 정상")
    }
  } catch (e) {
    console.log("   ❌ increment_points:", e.message)
  }

  console.log("\n=== 테스트 완료 ===")
}

checkConnection()
