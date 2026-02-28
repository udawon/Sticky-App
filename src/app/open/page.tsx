"use client"

import { useEffect } from "react"

// 웹 브라우저에서 앱을 Electron과 동일한 크기(360×560)의 팝업으로 열어주는 런처 페이지
// 사용법: localhost:3000/open 접속 → 자동으로 360×560 팝업 창이 열림
export default function OpenPage() {
  useEffect(() => {
    const W = 360
    const H = 560
    const x = Math.round((screen.width - W) / 2)
    const y = Math.round((screen.height - H) / 2)

    const popup = window.open(
      "/",
      "sticky-app",
      `width=${W},height=${H},left=${x},top=${y},resizable=no,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
    )

    if (!popup) {
      // 팝업 차단 시 현재 창을 앱 크기로 조정 (fallback)
      window.resizeTo(W, H)
      window.moveTo(x, y)
    }
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-[#0f172a] text-white">
      <p className="text-sm text-white">Sticky 앱 창이 열렸습니다.</p>
      <p className="text-xs text-slate-400">이 탭은 닫아도 됩니다.</p>
    </div>
  )
}
