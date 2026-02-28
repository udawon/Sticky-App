"use client"

import { useEffect } from "react"

interface CompactShellProps {
  children: React.ReactNode
}

const APP_WIDTH = 360
const APP_HEIGHT = 560

// 프레임리스 Electron 창에 꽉 채워지는 컨테이너
export function CompactShell({ children }: CompactShellProps) {
  useEffect(() => {
    // Electron이 아닌 웹 브라우저에서 앱과 동일한 창 크기로 조정
    if (typeof window !== "undefined" && !window.electronAPI?.isElectron) {
      window.resizeTo(APP_WIDTH, APP_HEIGHT)
      // 화면 중앙에 배치
      const x = Math.round((screen.width - APP_WIDTH) / 2)
      const y = Math.round((screen.height - APP_HEIGHT) / 2)
      window.moveTo(x, y)
    }
  }, [])

  return (
    <div className="flex h-[560px] w-[360px] flex-col overflow-hidden rounded-xl bg-background shadow-2xl">
      {children}
    </div>
  )
}
