"use client"

import { useEffect, useRef, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  ROULETTE_SEGMENTS,
  spinRoulette,
  getLandingRotation,
} from "@/lib/roulette/logic"
import type { RouletteLog } from "@/types/database"

// 세그먼트별 색상 (ROULETTE_SEGMENTS 순서와 동일)
const SEG_COLORS = [
  "#6b7280", // nothing - 회색
  "#10b981", // free_spin - 초록
  "#3b82f6", // points_150 - 파랑
  "#8b5cf6", // points_300 - 보라
  "#f59e0b", // points_500 - 황금
  "#ef4444", // coffee_voucher - 빨강
]

// 결과 → 사람이 읽을 수 있는 메시지
function getResultMessage(result: string): string {
  switch (result) {
    case "nothing":        return "꽝... 아쉽네요 😢"
    case "free_spin":      return "🎉 한번 더 돌리기!"
    case "points_150":     return "✨ 150포인트 획득!"
    case "points_300":     return "🌟 300포인트 획득!"
    case "points_500":     return "💫 500포인트 획득!"
    case "coffee_voucher": return "☕ 커피이용권 당첨! 팀장님께 알림 발송됨"
    default:               return result
  }
}

// Canvas로 룰렛 휠 그리기 (conic-gradient 대체)
function drawWheel(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const size = 160
  const cx = size / 2
  const cy = size / 2
  const r = 74

  ctx.clearRect(0, 0, size, size)

  // 세그먼트 그리기
  let angle = -Math.PI / 2 // 12시(top) 방향 시작
  ROULETTE_SEGMENTS.forEach((seg, i) => {
    const sweep = (seg.degree * Math.PI) / 180
    const endAngle = angle + sweep

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, angle, endAngle)
    ctx.closePath()
    ctx.fillStyle = SEG_COLORS[i]
    ctx.fill()

    // 구분선
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, angle, endAngle)
    ctx.closePath()
    ctx.strokeStyle = "rgba(255,255,255,0.5)"
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 세그먼트 라벨 (중심각 방향으로 회전)
    const mid = angle + sweep / 2
    const lr = r * 0.65
    const lx = cx + lr * Math.cos(mid)
    const ly = cy + lr * Math.sin(mid)

    ctx.save()
    ctx.translate(lx, ly)
    ctx.rotate(mid + Math.PI / 2)
    ctx.font = "bold 8px 'Segoe UI', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#ffffff"
    ctx.shadowColor = "rgba(0,0,0,0.7)"
    ctx.shadowBlur = 3
    ctx.fillText(seg.label, 0, 0)
    ctx.restore()

    angle = endAngle
  })

  // 외부 테두리
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = "rgba(255,255,255,0.4)"
  ctx.lineWidth = 2
  ctx.stroke()

  // 중앙 원
  ctx.beginPath()
  ctx.arc(cx, cy, 14, 0, Math.PI * 2)
  ctx.fillStyle = "#f1f5f9"
  ctx.fill()
  ctx.strokeStyle = "#94a3b8"
  ctx.lineWidth = 2
  ctx.stroke()
}

export function CompactRoulettePanel() {
  const { user, setUser } = useAuthStore()
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const rotationRef = useRef(0)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [chainCount, setChainCount] = useState(0)
  const [recentLogs, setRecentLogs] = useState<RouletteLog[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Canvas 휠 초기 렌더링
  useEffect(() => {
    if (canvasRef.current) drawWheel(canvasRef.current)
  }, [])

  useEffect(() => {
    if (user?.id) loadRecentLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const loadRecentLogs = async () => {
    if (!user?.id) return
    const supabase = createClient()
    const { data } = await supabase
      .from("roulette_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
    if (data) setRecentLogs(data as RouletteLog[])
  }

  const handleSpin = async () => {
    const currentUser = useAuthStore.getState().user
    if (!currentUser || spinning) return
    if (currentUser.points < 100) {
      toast.error("포인트가 부족합니다 (100P 필요)")
      return
    }

    setSpinning(true)
    setResultMsg(null)
    setChainCount(0)

    const supabase = createClient()
    let currentPoints = currentUser.points
    let currentTotalEarned = currentUser.total_points_earned
    let chainIdx = 0

    // 루프: free_spin이면 자동 재스핀
    while (true) {
      const isFreeSpin = chainIdx > 0

      // 포인트 차감 (유료 스핀만)
      if (!isFreeSpin) {
        currentPoints -= 100
        await supabase
          .from("profiles")
          .update({ points: currentPoints })
          .eq("id", currentUser.id)
        // 포인트 이력 기록 (차감)
        await supabase.from("point_logs").insert({
          user_id: currentUser.id,
          amount: -100,
          reason: "룰렛 스핀",
          task_id: null,
        })
      }

      // 결과 결정
      const result = spinRoulette()
      const seg = ROULETTE_SEGMENTS.find(s => s.result === result)!

      // 휠 애니메이션: 세그먼트 중심각이 포인터(12시)에 오도록 회전
      const segCenter = seg.startDeg + seg.degree / 2
      const newRotation = getLandingRotation(rotationRef.current, segCenter)
      rotationRef.current = newRotation
      setRotation(newRotation)
      setChainCount(chainIdx)

      // 애니메이션 완료 대기 (2.5초)
      await new Promise<void>(res => setTimeout(res, 2500))

      // 포인트 보상 처리
      let gained = 0
      if (result === "points_150") gained = 150
      else if (result === "points_300") gained = 300
      else if (result === "points_500") gained = 500

      if (gained > 0) {
        currentPoints += gained
        currentTotalEarned += gained
        await supabase
          .from("profiles")
          .update({ points: currentPoints, total_points_earned: currentTotalEarned })
          .eq("id", currentUser.id)
        // 포인트 이력 기록 (보상)
        await supabase.from("point_logs").insert({
          user_id: currentUser.id,
          amount: gained,
          reason: `룰렛 보상 (${result})`,
          task_id: null,
        })
      }

      // 스핀 기록 INSERT (트리거가 coffee_voucher 시 어드민 알림 발송)
      await supabase.from("roulette_logs").insert({
        user_id: currentUser.id,
        result,
        points_spent: isFreeSpin ? 0 : 100,
        points_gained: gained,
        is_free_spin: isFreeSpin,
        spin_chain: chainIdx,
      })

      // 결과 메시지 표시
      if (result === "free_spin") {
        setResultMsg(`🎉 한번 더! (${chainIdx + 1}번 연속 무료)`)
        chainIdx++
        await new Promise<void>(res => setTimeout(res, 1000))
        continue
      }

      setResultMsg(getResultMessage(result))
      break
    }

    // 스토어 갱신 (UI 즉시 반영)
    setUser({ ...currentUser, points: currentPoints, total_points_earned: currentTotalEarned })
    setSpinning(false)
    loadRecentLogs()
  }

  if (!user) return null

  const canSpin = user.points >= 100 && !spinning

  return (
    <div className="p-3 space-y-3">
      {/* 보유 포인트 */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">보유 포인트</span>
        <span className="text-sm font-bold">{user.points}P</span>
      </div>

      {/* 룰렛 휠 영역 */}
      <div className="flex flex-col items-center gap-2">
        {/* 포인터 + 캔버스 래퍼: 높이 180 = 포인터 20px + 캔버스 160px */}
        <div className="relative" style={{ width: 160, height: 180 }}>
          {/* 포인터 (12시 방향, 컨테이너 내부 상단에 고정) */}
          <div
            className="absolute z-10 text-lg leading-none select-none text-red-500"
            style={{ top: 2, left: "50%", transform: "translateX(-50%)" }}
          >
            ▼
          </div>

          {/* Canvas 휠: 포인터 아래 20px에서 시작 */}
          <canvas
            ref={canvasRef}
            width={160}
            height={160}
            className="absolute block rounded-full"
            style={{
              top: 20,
              left: 0,
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? "transform 2.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                : "none",
            }}
          />
        </div>

        {/* 결과 메시지 */}
        {resultMsg && (
          <p className="text-xs font-semibold text-center">{resultMsg}</p>
        )}

        {/* 연속 무료 스핀 카운터 */}
        {spinning && chainCount > 0 && (
          <p className="text-[10px] text-muted-foreground">{chainCount}번 연속 무료 스핀 중...</p>
        )}

        {/* 스핀 버튼 */}
        <button
          onClick={handleSpin}
          disabled={!canSpin}
          className="w-full h-9 text-xs font-bold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {spinning ? "스핀 중..." : canSpin ? "🎰 스핀 (100P)" : "포인트 부족 (100P 필요)"}
        </button>
      </div>

      {/* 보상 테이블 */}
      <div className="rounded-lg border bg-muted/20 p-2 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">보상 테이블</p>
        {ROULETTE_SEGMENTS.map((seg, i) => (
          <div key={seg.result} className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: SEG_COLORS[i] }} />
              <span>{seg.label}</span>
            </div>
            <span className="text-muted-foreground">{(seg.probability * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* 최근 스핀 히스토리 */}
      {recentLogs.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">최근 스핀</p>
          {recentLogs.map((log) => {
            const segIdx = ROULETTE_SEGMENTS.findIndex(s => s.result === log.result)
            const seg = ROULETTE_SEGMENTS[segIdx]
            return (
              <div key={log.id} className="flex items-center justify-between text-[10px] rounded border p-1.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: SEG_COLORS[segIdx] ?? "#6b7280" }}
                  />
                  <span>{seg?.label ?? log.result}</span>
                  {log.is_free_spin && <span className="text-muted-foreground">(무료)</span>}
                </div>
                {log.points_gained > 0 && (
                  <span className="font-medium text-green-600">+{log.points_gained}P</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
