"use client"

import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth-store"
import { isDemoAccount } from "@/lib/demo"

export function useDemoMode() {
  const user = useAuthStore((s) => s.user)
  const isDemo = isDemoAccount(user?.email)

  const blockAction = (actionName: string): boolean => {
    if (isDemo) {
      toast.warning(`데모 모드에서는 ${actionName}이 제한됩니다.`)
      return true
    }
    return false
  }

  return { isDemo, blockAction }
}
