"use client"

import { AuthProvider } from "@/components/providers/auth-provider"
import { NotificationProvider } from "@/components/providers/notification-provider"
import { CompactShell } from "@/components/layout/compact-shell"
import { useAuthStore } from "@/stores/auth-store"
import { Loader2 } from "lucide-react"

function MainContent({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <CompactShell>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      </CompactShell>
    )
  }

  return (
    <CompactShell>
      {children}
    </CompactShell>
  )
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainContent>{children}</MainContent>
      </NotificationProvider>
    </AuthProvider>
  )
}
