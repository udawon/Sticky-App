"use client"

import { useAuthStore } from "@/stores/auth-store"
import { usePanelStore } from "@/stores/panel-store"
import { useNotificationStore } from "@/stores/notification-store"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bell, LogOut, Users, X } from "lucide-react"

// 패널별 제목 매핑
const PANEL_TITLES: Record<string, string> = {
  tasks: "과제 보드",
  league: "리더보드",
  shop: "자판기",
  mypage: "마이페이지",
  settings: "설정",
  admin: "관리자",
  notifications: "알림",
}

// Electron API 타입 (preload.js에서 주입)
declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void
      hide: () => void
      isElectron: boolean
      setBadge: (count: number) => void
    }
  }
}

interface TitleBarProps {
  onlineCount?: number
}

export function TitleBar({ onlineCount = 1 }: TitleBarProps) {
  const { user } = useAuthStore()
  const { activePanel, closePanel, openPanel } = usePanelStore()
  const { unreadCount } = useNotificationStore()

  const handleLogout = async () => {
    useAuthStore.getState().setUser(null)
    usePanelStore.getState().closePanel()
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  const handleMinimize = () => window.electronAPI?.minimize()
  const handleClose = () => window.electronAPI?.hide()

  const isElectron = typeof window !== "undefined" && !!window.electronAPI?.isElectron

  return (
    // drag-region: 이 영역 드래그로 창 이동 가능
    <div className="drag-region flex h-9 shrink-0 items-center justify-between border-b bg-card px-2">
      {/* 좌측: 뒤로가기 또는 로고 */}
      <div className="no-drag flex items-center gap-1">
        {activePanel ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={closePanel}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <span className="flex items-center gap-1 px-1 text-sm font-semibold select-none">
            <span>📌</span>
            <span>Sticky</span>
          </span>
        )}
        {activePanel && (
          <span className="text-sm font-medium select-none">
            {PANEL_TITLES[activePanel]}
          </span>
        )}
      </div>

      {/* 우측: 접속자수 + 알림 + 로그아웃 + 창 컨트롤 */}
      <div className="no-drag flex items-center gap-1">
        {!activePanel && (
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {onlineCount}
          </span>
        )}
        {!activePanel && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => openPanel("notifications")}
            >
              <Bell className="h-3.5 w-3.5" />
            </Button>
            {unreadCount > 0 && (
              <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>

        {/* Electron 전용: 창 컨트롤 버튼 */}
        {isElectron && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-destructive/80 hover:text-white"
            onClick={handleClose}
            title="닫기 (트레이로 숨기기)"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
