import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  "https://vaekvowvaohfqpcsqrxu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZWt2b3d2YW9oZnFwY3Nxcnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODIxNTQsImV4cCI6MjA4NzU1ODE1NH0.GJC7vM9S-lELmI0mTqoNoBNlxHenaTLZ7DK-w47mowE"
)

const passwords = ["admin123", "admin123456", "test1234", "password123", "Admin123!", "123456789", "admin1234"]

for (const pw of passwords) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: "admin@test.com", password: pw })
  if (data.session) {
    console.log("✅ 성공:", pw)
    await supabase.auth.signOut()
    break
  } else {
    console.log("❌ 실패:", pw, "-", error?.message)
  }
}
