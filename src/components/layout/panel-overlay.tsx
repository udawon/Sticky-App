"use client"

import { useEffect } from "react"
import { usePanelStore } from "@/stores/panel-store"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PanelOverlayProps {
  children: React.ReactNode
}

export function PanelOverlay({ children }: PanelOverlayProps) {
  const { activePanel, closePanel } = usePanelStore()

  // ESC 키로 패널 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activePanel) {
        closePanel()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activePanel, closePanel])

  if (!activePanel) return null

  return (
    // 전체 영역: 투명 + 클릭 시 패널 닫기 (사무실 영역 클릭 감지)
    <div
      className="absolute inset-0 z-20 flex flex-col"
      onClick={closePanel}
    >
      {/* 상단 투명 영역 — 사무실이 비치고, 클릭 시 패널 닫힘 */}
      <div className="h-16 shrink-0 cursor-pointer" />

      {/* 하단 패널 내용 — stopPropagation으로 클릭이 위로 전달되지 않음 */}
      <div
        className="flex-1 overflow-hidden bg-background animate-in slide-in-from-bottom-4 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <ScrollArea className="h-full">
          {children}
        </ScrollArea>
      </div>
    </div>
  )
}
