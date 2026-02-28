"use client"

import { useEffect, useRef } from "react"
import {
  renderAvatar, renderPartOnly, PART_COLORS, DEFAULT_PARTS,
  type AvatarParts,
} from "@/lib/avatar/render"

const SPRITE_W = 9
const SPRITE_H = 13
const HAT_OVERHEAD = 7  // 모자/왕관 위 여유 (grid px)

function buildParts(
  hairKey: string,
  faceKey: string,
  topKey: string,
  bottomKey: string,
  shoesKey: string,
): AvatarParts {
  return {
    hair:   PART_COLORS.hair[hairKey]     ?? DEFAULT_PARTS.hair,
    face:   PART_COLORS.face[faceKey]     ?? DEFAULT_PARTS.face,
    top:    PART_COLORS.top[topKey]       ?? DEFAULT_PARTS.top,
    bottom: PART_COLORS.bottom[bottomKey] ?? DEFAULT_PARTS.bottom,
    shoes:  PART_COLORS.shoes[shoesKey]   ?? DEFAULT_PARTS.shoes,
    hairKey, faceKey, topKey, bottomKey, shoesKey,
  }
}

// ─── 전체 아바타 미니 캔버스 ───
export function MiniAvatar({
  hairKey  = "hair_default",
  faceKey  = "face_default",
  topKey   = "top_default",
  bottomKey = "bottom_default",
  shoesKey = "shoes_default",
  size = 52,
}: {
  hairKey?:   string
  faceKey?:   string
  topKey?:    string
  bottomKey?: string
  shoesKey?:  string
  size?: number
}) {
  // size 기준으로 scale 계산 (최소 2)
  const scale = Math.max(2, Math.floor(size / (SPRITE_H + 4)))
  const W = (SPRITE_W + 2) * scale
  const H = (SPRITE_H + HAT_OVERHEAD) * scale
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
    ctx.imageSmoothingEnabled = false
    renderAvatar(
      ctx,
      buildParts(hairKey, faceKey, topKey, bottomKey, shoesKey),
      scale,
      1,        // ox: 좌우 패딩 1px
      HAT_OVERHEAD,  // oy: 상단 모자 여유
    )
  }, [hairKey, faceKey, topKey, bottomKey, shoesKey, scale, W, H])

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ imageRendering: "pixelated" }}
    />
  )
}

// ─── 파츠 아이콘 (슬롯별 파츠만 독립 표시) ───
export function PartIcon({
  slot,
  imageKey,
  size = 40,
}: {
  slot: "hair" | "face" | "top" | "bottom" | "shoes"
  imageKey: string
  size?: number
}) {
  // 정사각형 캔버스: 가로 스프라이트 너비(9) + 좌우 패딩(2) = 11 grid
  const scale = Math.max(2, Math.floor(size / 11))
  const W = 11 * scale
  const H = 11 * scale
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
    ctx.imageSmoothingEnabled = false

    const parts = buildParts(
      slot === "hair"   ? imageKey : "hair_default",
      slot === "face"   ? imageKey : "face_default",
      slot === "top"    ? imageKey : "top_default",
      slot === "bottom" ? imageKey : "bottom_default",
      slot === "shoes"  ? imageKey : "shoes_default",
    )
    renderPartOnly(ctx, slot, parts, scale, W, H)
  }, [slot, imageKey, scale, W, H])

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ imageRendering: "pixelated" }}
    />
  )
}
