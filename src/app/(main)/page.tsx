"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { useAuthStore } from "@/stores/auth-store"
import { usePanelStore } from "@/stores/panel-store"
import { TitleBar } from "@/components/layout/title-bar"
import { PanelOverlay } from "@/components/layout/panel-overlay"
import { CompactTeamSetup } from "@/components/panels/compact-team-setup"
import { CompactTasksPanel } from "@/components/panels/compact-tasks-panel"
import { CompactLeaguePanel } from "@/components/panels/compact-league-panel"
import { CompactShopPanel } from "@/components/panels/compact-shop-panel"
import { CompactMypagePanel } from "@/components/panels/compact-mypage-panel"
import { CompactSettingsPanel } from "@/components/panels/compact-settings-panel"
import { CompactAdminPanel } from "@/components/panels/compact-admin-panel"
import { CompactNotificationsPanel } from "@/components/panels/compact-notifications-panel"
import { CompactRoulettePanel } from "@/components/panels/compact-roulette-panel"

// Canvas는 SSR 불가
const VirtualOffice = dynamic(
  () =>
    import("@/components/office/virtual-office").then(
      (mod) => mod.VirtualOffice
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 w-full animate-pulse bg-muted" />
    ),
  }
)

// 패널 타입 → 컴포넌트 매핑
function PanelContent() {
  const { activePanel } = usePanelStore()

  switch (activePanel) {
    case "tasks": return <CompactTasksPanel />
    case "league": return <CompactLeaguePanel />
    case "shop": return <CompactShopPanel />
    case "mypage": return <CompactMypagePanel />
    case "settings": return <CompactSettingsPanel />
    case "admin": return <CompactAdminPanel />
    case "notifications": return <CompactNotificationsPanel />
    case "roulette": return <CompactRoulettePanel />
    default: return null
  }
}

export default function HomePage() {
  const { user } = useAuthStore()
  const { activePanel } = usePanelStore()
  const [onlineCount, setOnlineCount] = useState(1)

  const handleOnlineCountChange = useCallback((count: number) => {
    setOnlineCount(count)
  }, [])

  // 팀이 없는 경우: 컴팩트 팀 설정
  if (!user?.team_id) {
    return (
      <>
        <TitleBar />
        <div className="flex-1 overflow-y-auto">
          <CompactTeamSetup />
        </div>
      </>
    )
  }

  // 팀이 있는 경우: 가상 사무실 + 패널 오버레이
  return (
    <>
      <TitleBar onlineCount={onlineCount} />
      <div className="relative flex-1 overflow-hidden">
        {/* 가상 사무실 (항상 렌더링) */}
        <VirtualOffice onOnlineCountChange={handleOnlineCountChange} />

        {/* 패널 오버레이 */}
        <PanelOverlay>
          <PanelContent />
        </PanelOverlay>
      </div>
    </>
  )
}
