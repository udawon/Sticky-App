import type { RouletteResult } from "@/types/database"

// 룰렛 세그먼트 정의
export interface RouletteSegment {
  result: RouletteResult
  label: string
  probability: number  // 0~1
  degree: number       // 차지하는 각도 (degrees)
  startDeg: number     // 시작 각도 (degrees, 12시 방향 0°, 시계방향)
}

export const ROULETTE_SEGMENTS: RouletteSegment[] = [
  { result: "nothing",        label: "꽝",        probability: 0.35, degree: 126, startDeg: 0   },
  { result: "free_spin",      label: "한번 더",   probability: 0.30, degree: 108, startDeg: 126 },
  { result: "points_150",     label: "150P",      probability: 0.15, degree: 54,  startDeg: 234 },
  { result: "points_300",     label: "300P",      probability: 0.10, degree: 36,  startDeg: 288 },
  { result: "points_500",     label: "500P",      probability: 0.05, degree: 18,  startDeg: 324 },
  { result: "coffee_voucher", label: "☕ 커피",   probability: 0.05, degree: 18,  startDeg: 342 },
]

// 확률 기반 결과 결정
export function spinRoulette(): RouletteResult {
  const rand = Math.random()
  let cumulative = 0
  for (const seg of ROULETTE_SEGMENTS) {
    cumulative += seg.probability
    if (rand < cumulative) return seg.result
  }
  return "nothing"
}

// 목표 세그먼트가 포인터(12시)에 오도록 회전 각도 계산
// - 현재 누적 회전값 currentRotation 에서 최소 4바퀴(1440°) 이상 돌고 착지
export function getLandingRotation(currentRotation: number, segCenterDeg: number): number {
  const clockwiseToTop = (360 - segCenterDeg % 360 + 360) % 360
  return Math.ceil((currentRotation + 1440) / 360) * 360 + clockwiseToTop
}
