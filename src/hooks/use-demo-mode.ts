"use client"

import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth-store"
import { isDemoAccount } from "@/lib/demo"

export function useDemoMode() {
  const user = useAuthStore((s) => s.user)
  const isDemo = isDemoAccount(user?.email)

  const blockAction = (actionName: string): boolean => {
    if (isDemo) {
      // 마지막 글자 받침 여부에 따라 조사 선택 (받침 없으면 "가", 있으면 "이")
      const last = actionName.charCodeAt(actionName.length - 1)
      const josa = last >= 0xAC00 && last <= 0xD7A3 && (last - 0xAC00) % 28 === 0 ? "가" : "이"
      toast.warning(`데모 모드에서는 ${actionName}${josa} 제한됩니다.`)
      return true
    }
    return false
  }

  return { isDemo, blockAction }
}
