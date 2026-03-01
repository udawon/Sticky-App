// 데모 계정 판별 유틸리티
const DEMO_EMAILS = new Set(
  [
    process.env.NEXT_PUBLIC_DEMO_EMAIL,
    process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL,
  ].filter(Boolean)
)

export function isDemoAccount(email: string | undefined): boolean {
  return !!email && DEMO_EMAILS.has(email)
}
