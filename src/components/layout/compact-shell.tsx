"use client"

import { useEffect } from "react"

interface CompactShellProps {
  children: React.ReactNode
}

const APP_WIDTH = 360
const APP_CONTENT_HEIGHT = 560  // 앱 콘텐츠 높이 (브라우저 크롬 제외)

// 프레임리스 Electron 창에 꽉 채워지는 컨테이너
export function CompactShell({ children }: CompactShellProps) {
  useEffect(() => {
    // Electron이 아닌 웹 브라우저에서 앱과 동일한 창 크기로 조정
    if (typeof window !== "undefined" && !window.electronAPI?.isElectron) {
      // 브라우저 크롬(주소창+타이틀바) 높이를 동적으로 계산해 보정
      const chromeHeight = window.outerHeight - window.innerHeight
      const windowHeight = APP_CONTENT_HEIGHT + chromeHeight
      window.resizeTo(APP_WIDTH, windowHeight)
      // 화면 중앙에 배치
      const x = Math.round((screen.width - APP_WIDTH) / 2)
      const y = Math.round((screen.height - windowHeight) / 2)
      window.moveTo(x, y)
    }
  }, [])

  return (
    <div className="flex h-[560px] w-[360px] flex-col overflow-hidden rounded-xl bg-background shadow-2xl">
      {children}
    </div>
  )
}
