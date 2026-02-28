"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { usePanelStore, type PanelType } from "@/stores/panel-store"
import { createClient } from "@/lib/supabase/client"

// ─── 픽셀아트 설정 ───
const T = 15
const COLS = 12
const ROWS = 17
const IW = COLS * T
const IH = ROWS * T
const S = 2
const DW = IW * S
const DH = IH * S

// ─── 모던 오피스 팔레트 (다크 월 + 라이트 플로어) ───
const P = {
  // 바닥 (밝은 회색 타일)
  floor0: "#b8bcc2", floor1: "#c0c4ca", floor2: "#b4b8be", floor3: "#c4c8ce",
  floorJoint: "#a8acb4", floorHi: "rgba(255,255,255,0.08)",
  // 카펫 (미팅존 - 딥 네이비)
  carpet0: "#3c4860", carpet1: "#384458", carpetDot: "#445070",
  // 벽 (진한 네이비/슬레이트)
  wallMain: "#3b4660", wallLt: "#455070", wallDk: "#2d3748",
  wallAccent: "#2c3e50", wallTrim: "#344058",
  // 가구 표면 (밝은 톤 - 벽과 분리)
  surfaceLt: "#f8f9fa", surfaceDk: "#d0d4d8",
  // 하늘/창문 (도시 스카이라인)
  sky: "#6cb4d8", skyLt: "#88c8e8", cloud: "#e0f0f8",
  bldgDk: "#505868", bldgMd: "#687080", bldgLt: "#8890a0",
  bldgWin: "#a8c8e0",
  winFrame: "#252f40", winFrameLt: "#354050",
  // 가구 (화이트 + 다크메탈 + 우드 악센트)
  white: "#f4f6f8", offWhite: "#eaecf0", cream: "#f0ede8",
  black: "#1c1c24", charcoal: "#2c2c38",
  metalLt: "#c0c8d0", metalMd: "#8898a8", metalDk: "#506070",
  deskTop: "#f0f2f4", deskFront: "#e4e8ec", deskLeg: "#404850",
  ashWood: "#c4b498", ashLt: "#d4c4a8", ashDk: "#a49478",
  // 스크린/모니터
  scrFrame: "#1c2028", scrBlue: "#3b82f6", scrGreen: "#22c55e", scrTeal: "#14b8a6",
  // 소파 (다크그레이 패브릭)
  sofa: "#505860", sofaLt: "#606870", sofaCushion: "#687078",
  // 의자 (모던 3색)
  chairBlue: "#3b82f6", chairOrange: "#f59e0b", chairGray: "#6b7280",
  // 디스플레이/LED
  ledBlue: "#60a5fa", ledTeal: "#2dd4bf",
  // 유리/금속
  glass: "#d0e4f0", glassDk: "#b0c8d8",
  // 식물
  green: "#22c55e", greenDk: "#16a34a", greenLt: "#4ade80",
  // 악센트 컬러
  gold: "#f59e0b", goldDk: "#d97706", silver: "#94a3b8", bronze: "#c2854a",
  red: "#ef4444", blue: "#3b82f6", purple: "#8b5cf6",
  // 러그 (기하학적)
  rugA: "#334155", rugB: "#475569", rugBd: "#1e293b", rugLt: "#64748b",
  // 조명/그림자
  shadow: "rgba(0,0,0,0.18)",
  windowLight: "rgba(200,230,255,0.06)",
  skin: "#f0c8a0", skinLt: "#f8d8b8",
}

// ─── 오브젝트 ───
type ObjType =
  | "wall" | "chalkboard" | "trophy_case" | "mirror"
  | "printer" | "vending" | "admin_desk"
  | "plant" | "desk" | "bookshelf" | "sofa" | "water_cooler" | "chair"

interface MapObj {
  x: number; y: number; w: number; h: number
  type: ObjType; label?: string; variant?: number
  interactable?: boolean; panelType?: PanelType; adminOnly?: boolean
}

// ─── 컴팩트 사무실 레이아웃 (중앙 집중, 5발자국 내 동선) ───
// 중심: (5, 8) 기준, 모든 인터랙션 오브젝트 3발자국 이내
// 구조: 상단 워크존 → 중앙 인터랙션 → 하단 워크존/라운지
const OBJS: MapObj[] = [
  // 외벽
  ...Array.from({ length: COLS }, (_, i) => ({ x: i, y: 0, w: 1, h: 1, type: "wall" as const })),
  ...Array.from({ length: ROWS }, (_, i) => ({ x: 0, y: i, w: 1, h: 1, type: "wall" as const })),
  ...Array.from({ length: ROWS }, (_, i) => ({ x: COLS - 1, y: i, w: 1, h: 1, type: "wall" as const })),
  ...Array.from({ length: COLS }, (_, i) => ({ x: i, y: ROWS - 1, w: 1, h: 1, type: "wall" as const })),

  // ── 인터랙션 오브젝트 (중앙 집중) ──
  //  북: 과제보드(5,5) 4w / 동북: 리더보드(8,7)
  //  서: 거울(2,7) 자판기(2,9) / 동: 설정(8,9)
  //  남: 관리자(5,11)
  { x: 5, y: 5, w: 2, h: 1, type: "chalkboard", label: "📋 과제 보드", interactable: true, panelType: "tasks" },
  { x: 9, y: 7, w: 1, h: 1, type: "trophy_case", label: "🏆 리더보드", interactable: true, panelType: "league" },
  { x: 2, y: 7, w: 1, h: 1, type: "mirror", label: "🪞 마이페이지", interactable: true, panelType: "mypage" },
  { x: 9, y: 9, w: 1, h: 1, type: "printer", label: "🖨️ 설정", interactable: true, panelType: "settings" },
  { x: 2, y: 9, w: 1, h: 1, type: "vending", label: "🏪 자판기", interactable: true, panelType: "shop" },
  { x: 5, y: 11, w: 2, h: 1, type: "admin_desk", label: "🔒 관리자", interactable: true, panelType: "admin", adminOnly: true },

  // ── 워크존 A (상단, row 3) ──
  { x: 2, y: 3, w: 1, h: 1, type: "desk", variant: 0 },
  { x: 3, y: 3, w: 1, h: 1, type: "chair", variant: 0 },
  { x: 7, y: 3, w: 1, h: 1, type: "desk", variant: 1 },
  { x: 8, y: 3, w: 1, h: 1, type: "chair", variant: 1 },

  // ── 워크존 B (하단, row 13) ──
  { x: 2, y: 13, w: 1, h: 1, type: "desk", variant: 1 },
  { x: 3, y: 13, w: 1, h: 1, type: "chair", variant: 2 },
  { x: 7, y: 13, w: 1, h: 1, type: "desk", variant: 0 },
  { x: 8, y: 13, w: 1, h: 1, type: "chair", variant: 0 },

  // ── 상단 벽 장식 ──
  { x: 1, y: 1, w: 1, h: 1, type: "plant", variant: 0 },
  { x: 3, y: 1, w: 1, h: 1, type: "bookshelf" },
  { x: 10, y: 1, w: 1, h: 1, type: "plant", variant: 1 },

  // ── 식물 (장식) ──
  { x: 6, y: 4, w: 1, h: 1, type: "plant", variant: 1 },
  { x: 10, y: 5, w: 1, h: 1, type: "plant", variant: 0 },
  { x: 1, y: 12, w: 1, h: 1, type: "plant", variant: 1 },
  { x: 10, y: 12, w: 1, h: 1, type: "plant", variant: 0 },

  // ── 라운지 (하단, row 15) ──
  { x: 1, y: 15, w: 1, h: 1, type: "plant", variant: 2 },
  { x: 3, y: 15, w: 2, h: 1, type: "sofa" },
  { x: 7, y: 15, w: 1, h: 1, type: "water_cooler" },
  { x: 10, y: 15, w: 1, h: 1, type: "plant", variant: 0 },
]

// 통유리 창문 (모던: 확장)
const WIN_TOP = [2, 3, 4, 5, 6, 7, 8, 9]
const WIN_LEFT = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
const WIN_RIGHT = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

// ─── 바닥: 폴리싱 콘크리트 타일 ───
const FLOOR_COLORS = [P.floor0, P.floor1, P.floor2, P.floor3]
function drawFloorTile(c: CanvasRenderingContext2D, col: number, row: number) {
  const x = col * T, y = row * T
  c.fillStyle = FLOOR_COLORS[(col * 3 + row * 7) % 4]
  c.fillRect(x, y, T, T)
  // 타일 이음새 (얇은 밝은 줄)
  c.fillStyle = P.floorJoint
  c.fillRect(x, y, T, 1)
  c.fillRect(x, y, 1, T)
  // 미세 반사
  c.fillStyle = P.floorHi
  c.fillRect(x + 3, y + 3, 4, 2)
}

function drawCarpetTile(c: CanvasRenderingContext2D, col: number, row: number) {
  const x = col * T, y = row * T
  c.fillStyle = P.carpet0
  c.fillRect(x, y, T, T)
  // 텍스처 (미세 도트)
  c.fillStyle = P.carpet1
  for (let dy = 0; dy < T; dy += 2)
    for (let dx = (dy % 4 === 0 ? 0 : 1); dx < T; dx += 2)
      c.fillRect(x + dx, y + dy, 1, 1)
  // 밝은 도트 악센트
  c.fillStyle = P.carpetDot
  for (let dy = 1; dy < T; dy += 4)
    for (let dx = 2; dx < T; dx += 4)
      c.fillRect(x + dx, y + dy, 1, 1)
}

function isMeetZone(col: number, row: number): boolean {
  return row >= 7 && row <= 9 && col >= 4 && col <= 7
}

// ─── 충돌/인터랙션 ───
function isBlocked(c: number, r: number): boolean {
  return OBJS.some(o => c >= o.x && c < o.x + o.w && r >= o.y && r < o.y + o.h)
}
function getNearby(c: number, r: number, admin: boolean): MapObj | undefined {
  return OBJS.find(o => {
    if (!o.interactable || (o.adminOnly && !admin)) return false
    const cx = Math.max(o.x, Math.min(c, o.x + o.w - 1))
    const cy = Math.max(o.y, Math.min(r, o.y + o.h - 1))
    return Math.abs(c - cx) <= 1 && Math.abs(r - cy) <= 1
  })
}

// ─── 아바타 ───
interface AvatarPos { id: string; col: number; row: number; nickname: string; avatarBody: string }
const ACOL: Record<string, string> = {
  default: "#6366f1", avatar_blue: "#3b82f6", avatar_red: "#ef4444", avatar_gold: "#f59e0b",
}

// ─── 캐릭터 스프라이트 (9x13) ───
const CHAR_SPRITE = [
  "...HHH...",
  "..HHHHH..",
  "..HSSSH..",
  "..SEQES..",
  "..SSMSS..",
  "...SSS...",
  "..BCBCB..",
  "..BBBBB..",
  ".BBBBBBB.",
  "..BBBBB..",
  "...LLL...",
  "..LL.LL..",
  "..FF.FF..",
]

// ─── 픽셀 헬퍼 ───
function px(ctx: CanvasRenderingContext2D, ix: number, iy: number, w = 1, h = 1) {
  ctx.fillRect(ix * S, iy * S, w * S, h * S)
}

// ─── 정적 레이어 빌드 ───
function buildStatic(role?: string): HTMLCanvasElement {
  const cv = document.createElement("canvas")
  cv.width = IW; cv.height = IH
  const c = cv.getContext("2d")!
  c.imageSmoothingEnabled = false

  // ── 1. 바닥 ──
  for (let r = 1; r < ROWS - 1; r++)
    for (let col = 1; col < COLS - 1; col++)
      isMeetZone(col, r) ? drawCarpetTile(c, col, r) : drawFloorTile(c, col, r)

  // 벽 영역 바닥
  c.fillStyle = P.floor2
  for (let col = 0; col < COLS; col++) { c.fillRect(col * T, 0, T, T); c.fillRect(col * T, (ROWS - 1) * T, T, T) }
  for (let r = 0; r < ROWS; r++) { c.fillRect(0, r * T, T, T); c.fillRect((COLS - 1) * T, r * T, T, T) }

  // 벽 근처 AO
  for (let i = 0; i < 4; i++) {
    c.fillStyle = `rgba(0,0,0,${0.06 - i * 0.015})`
    c.fillRect(T + i, T + i, IW - 2 * T - i * 2, 1)
    c.fillRect(T + i, IH - T - 1 - i, IW - 2 * T - i * 2, 1)
    c.fillRect(T + i, T + i, 1, IH - 2 * T - i * 2)
    c.fillRect(IW - T - 1 - i, T + i, 1, IH - 2 * T - i * 2)
  }

  // ── 2. 미팅존 러그 (기하학적 패턴) ──
  const rx = 4 * T, ry = 7 * T, rw = 4 * T, rh = 3 * T
  c.fillStyle = "rgba(0,0,0,0.06)"
  c.fillRect(rx + 1, ry + rh, rw, 2) // 그림자
  c.fillStyle = P.rugBd
  c.fillRect(rx - 1, ry - 1, rw + 2, rh + 2)
  c.fillStyle = P.rugA
  c.fillRect(rx, ry, rw, rh)
  // 기하학 패턴 (V자 반복)
  c.fillStyle = P.rugB
  for (let py = ry + 2; py < ry + rh - 2; py += 3)
    for (let ppx = rx + 2; ppx < rx + rw - 2; ppx += 6) {
      c.fillRect(ppx, py + 1, 1, 1)
      c.fillRect(ppx + 1, py, 1, 1)
      c.fillRect(ppx + 2, py + 1, 1, 1)
    }
  // 러그 테두리 라인 (더블)
  c.fillStyle = P.rugLt
  c.fillRect(rx + 1, ry + 1, rw - 2, 1)
  c.fillRect(rx + 1, ry + rh - 2, rw - 2, 1)
  c.fillRect(rx + 1, ry + 1, 1, rh - 2)
  c.fillRect(rx + rw - 2, ry + 1, 1, rh - 2)

  // ── 3. 벽 (클린 화이트 + 통유리) ──
  OBJS.forEach(o => {
    if (o.type !== "wall") return
    const x = o.x * T, y = o.y * T
    const isCorner = (o.x === 0 || o.x === COLS - 1) && (o.y === 0 || o.y === ROWS - 1)

    // 벽 기본 (깨끗한 흰색)
    c.fillStyle = isCorner ? P.wallDk : P.wallMain
    c.fillRect(x, y, T, T)

    if (!isCorner) {
      c.fillStyle = P.wallMain
      c.fillRect(x, y, T, T)
      c.fillStyle = P.wallLt
      c.fillRect(x, y, T, 1) // 상단 하이라이트
      c.fillStyle = P.wallDk
      c.fillRect(x, y + T - 1, T, 1) // 하단 라인
      // 얇은 걸레받이 (다크)
      c.fillStyle = P.wallTrim
      c.fillRect(x, y + T - 2, T, 2)
    }

    // ─ 통유리 창문 (모던: 슬림 블랙 프레임) ─
    let hasWindow = false
    if (o.y === 0 && WIN_TOP.includes(o.x)) hasWindow = true
    if (o.x === 0 && WIN_LEFT.includes(o.y)) hasWindow = true
    if (o.x === COLS - 1 && WIN_RIGHT.includes(o.y)) hasWindow = true

    if (hasWindow) {
      // 슬림 블랙 프레임
      c.fillStyle = P.winFrame
      c.fillRect(x + 1, y + 1, 13, 13)
      // 유리 (도시 스카이라인)
      c.fillStyle = P.skyLt
      c.fillRect(x + 2, y + 2, 11, 5)
      c.fillStyle = P.sky
      c.fillRect(x + 2, y + 7, 11, 6)
      // 구름
      c.fillStyle = P.cloud
      c.fillRect(x + 3, y + 3, 3, 1)
      c.fillRect(x + 4, y + 2, 2, 1)
      c.fillRect(x + 9, y + 4, 2, 1)
      // 도시 빌딩 (실루엣)
      c.fillStyle = P.bldgDk
      c.fillRect(x + 3, y + 8, 2, 5) // 큰 빌딩
      c.fillRect(x + 4, y + 7, 1, 1) // 꼭대기
      c.fillStyle = P.bldgMd
      c.fillRect(x + 6, y + 9, 2, 4) // 중간 빌딩
      c.fillStyle = P.bldgLt
      c.fillRect(x + 9, y + 10, 2, 3) // 작은 빌딩
      c.fillRect(x + 10, y + 9, 1, 1)
      // 빌딩 창문 (밝은 점)
      c.fillStyle = P.bldgWin
      c.fillRect(x + 3, y + 9, 1, 1)
      c.fillRect(x + 3, y + 11, 1, 1)
      c.fillRect(x + 6, y + 10, 1, 1)
      c.fillRect(x + 7, y + 11, 1, 1)
      c.fillRect(x + 9, y + 11, 1, 1)
      // 슬림 프레임 십자
      c.fillStyle = P.winFrame
      c.fillRect(x + 7, y + 2, 1, 11)
      // 유리 반사
      c.fillStyle = "rgba(255,255,255,0.18)"
      c.fillRect(x + 3, y + 3, 1, 4)
      c.fillRect(x + 4, y + 2, 1, 2)
    }
  })

  // ── 하단 유리창 (대형 2×3 패널) ──
  {
    const gy = (ROWS - 1) * T
    const gx = T
    const gw = (COLS - 2) * T
    // 프레임 배경 (진한 네이비)
    c.fillStyle = "#252f40"
    c.fillRect(gx, gy, gw, T)
    // 상단 프레임 라인
    c.fillStyle = "#1a2230"
    c.fillRect(gx, gy, gw, 1)
    // 3개 패널 배치
    const fw = 2
    const pw = Math.floor((gw - fw * 2) / 3)
    const rh = 6
    for (let pi = 0; pi < 3; pi++) {
      const ppx = gx + pi * (pw + fw)
      const pWidth = pi === 2 ? gw - 2 * (pw + fw) : pw
      // 상단 유리 (밝은 하늘색)
      c.fillStyle = "#7ec8e3"
      c.fillRect(ppx, gy + 1, pWidth, rh)
      c.fillStyle = "#a0daf0"
      c.fillRect(ppx, gy + 1, pWidth, 2)
      // 하단 유리 (약간 어두운 하늘색)
      c.fillStyle = "#6bb8d8"
      c.fillRect(ppx, gy + 1 + rh + 1, pWidth, rh)
      c.fillStyle = "#7ec8e3"
      c.fillRect(ppx, gy + 1 + rh + 1, pWidth, 2)
      // 유리 반사 (좌상단 하이라이트)
      c.fillStyle = "rgba(255,255,255,0.15)"
      c.fillRect(ppx + 1, gy + 2, 2, rh - 2)
      c.fillRect(ppx + 1, gy + 2 + rh + 1, 2, rh - 2)
    }
  }

  // ── 4. 창문 빛 ──
  WIN_TOP.forEach(col => {
    c.fillStyle = P.windowLight
    c.fillRect(col * T + 2, T + 1, T - 4, T * 2)
  })
  WIN_LEFT.forEach(row => {
    c.fillStyle = P.windowLight
    c.fillRect(T + 1, row * T + 2, T * 2, T - 4)
  })
  WIN_RIGHT.forEach(row => {
    c.fillStyle = P.windowLight
    c.fillRect((COLS - 3) * T, row * T + 2, T * 2, T - 4)
  })
  // 하단 유리창 빛 (위로 투사)
  for (let col = 2; col <= 9; col++) {
    c.fillStyle = P.windowLight
    c.fillRect(col * T + 2, (ROWS - 3) * T, T - 4, T * 2)
  }

  // ── 5. 오브젝트 (그림자 + 렌더링) ──
  OBJS.filter(o => o.type !== "wall").forEach(o => {
    const sx = o.x * T + 2, sy = o.y * T + o.h * T - 1
    c.fillStyle = P.shadow
    c.fillRect(sx, sy, o.w * T - 3, 2)
    drawObj(c, o, role)
  })

  return cv
}

// ─── 오브젝트 렌더링 (모던 스타일) ───
function drawObj(c: CanvasRenderingContext2D, o: MapObj, role?: string) {
  const x = o.x * T, y = o.y * T, w = o.w * T, h = o.h * T

  switch (o.type) {
    case "chalkboard": {
      // 화이트보드 + 알록달록 포스트잇
      // 알루미늄 프레임
      c.fillStyle = P.metalLt
      c.fillRect(x + 1, y + 1, w - 2, h - 2)
      c.fillStyle = P.metalMd
      c.fillRect(x + 1, y + h - 2, w - 2, 1) // 하단 프레임
      // 화이트보드 면 (밝은 흰색)
      c.fillStyle = "#f8fafb"
      c.fillRect(x + 2, y + 2, w - 4, h - 4)
      // 보드 하이라이트
      c.fillStyle = "rgba(255,255,255,0.5)"
      c.fillRect(x + 2, y + 2, w - 4, 1)
      // 포스트잇들 (알록달록하게 배치)
      const postits: [number, number, string][] = [
        [x + 3, y + 3, "#fde047"],   // 노랑
        [x + 8, y + 3, "#fb923c"],   // 주황
        [x + 13, y + 3, "#f87171"],  // 빨강
        [x + 18, y + 3, "#a78bfa"],  // 보라
        [x + 23, y + 3, "#60a5fa"],  // 파랑
        [x + 28, y + 3, "#34d399"],  // 초록
        [x + 5, y + 7, "#fbbf24"],   // 진노랑
        [x + 10, y + 7, "#f472b6"],  // 핑크
        [x + 15, y + 7, "#38bdf8"],  // 하늘
        [x + 20, y + 7, "#4ade80"],  // 연초록
        [x + 25, y + 7, "#fb923c"],  // 주황
        [x + 30, y + 7, "#c084fc"],  // 연보라
      ]
      postits.forEach(([px, py, color]) => {
        if (px + 4 > x + w - 2) return // 보드 밖 방지
        c.fillStyle = color
        c.fillRect(px, py, 4, 3)
        // 포스트잇 접힌 모서리
        c.fillStyle = "rgba(0,0,0,0.1)"
        c.fillRect(px + 3, py, 1, 1)
        // 텍스트 선
        c.fillStyle = "rgba(0,0,0,0.15)"
        c.fillRect(px + 1, py + 1, 2, 1)
      })
      // 하단 트레이 (마커 받침)
      c.fillStyle = P.metalMd
      c.fillRect(x + 4, y + h - 3, w - 8, 1)
      // 마커들
      c.fillStyle = "#ef4444"; c.fillRect(x + 6, y + h - 4, 1, 1)
      c.fillStyle = "#3b82f6"; c.fillRect(x + 8, y + h - 4, 1, 1)
      c.fillStyle = "#22c55e"; c.fillRect(x + 10, y + h - 4, 1, 1)
      break
    }

    case "trophy_case": {
      // 실적표 (1블럭 컴팩트 차트 보드)
      // 프레임 (다크 우드)
      c.fillStyle = P.ashDk
      c.fillRect(x + 1, y + 1, 13, 13)
      // 보드 면 (아이보리)
      c.fillStyle = "#faf8f5"
      c.fillRect(x + 2, y + 2, 11, 11)
      // 상단 헤더 (진한 네이비)
      c.fillStyle = "#1e293b"
      c.fillRect(x + 2, y + 2, 11, 2)
      // 헤더 텍스트 라인
      c.fillStyle = P.gold
      c.fillRect(x + 4, y + 3, 5, 1)
      // 바 차트 (1~3등 막대, 컴팩트)
      const barData: [string, number][] = [[P.gold, 7], [P.silver, 5], [P.bronze, 3]]
      barData.forEach(([bc, bh], i) => {
        const bx = x + 3 + i * 3
        const by = y + 12 - bh
        c.fillStyle = bc
        c.fillRect(bx, by, 2, bh)
        c.fillStyle = "rgba(255,255,255,0.25)"
        c.fillRect(bx, by, 2, 1)
      })
      // 그리드 라인
      c.fillStyle = "rgba(0,0,0,0.06)"
      for (let gy = y + 5; gy < y + 12; gy += 2) {
        c.fillRect(x + 3, gy, 9, 1)
      }
      break
    }

    case "mirror": {
      // 타원형 전신 거울 (골드 프레임)
      // 프레임 (골드)
      c.fillStyle = P.goldDk
      c.fillRect(x + 3, y + 1, 9, 13)
      c.fillStyle = P.gold
      c.fillRect(x + 4, y + 0, 7, 1) // 상단 장식
      c.fillRect(x + 3, y + 1, 1, 13)
      c.fillRect(x + 11, y + 1, 1, 13)
      // 거울면 (타원 근사)
      c.fillStyle = "#d0e0ec"
      c.fillRect(x + 4, y + 1, 7, 13)
      // 타원 모서리 (프레임색으로 채워 타원 느낌)
      c.fillStyle = P.goldDk
      c.fillRect(x + 4, y + 1, 1, 1)
      c.fillRect(x + 10, y + 1, 1, 1)
      c.fillRect(x + 4, y + 13, 1, 1)
      c.fillRect(x + 10, y + 13, 1, 1)
      // 반사광 (대각선 하이라이트)
      c.fillStyle = "#e8f4ff"
      c.fillRect(x + 5, y + 3, 3, 5)
      c.fillStyle = "#f0f8ff"
      c.fillRect(x + 5, y + 3, 1, 3)
      c.fillRect(x + 6, y + 2, 1, 2)
      // 사람 실루엣 (거울에 비침)
      c.fillStyle = "rgba(100,120,140,0.2)"
      c.fillRect(x + 7, y + 5, 2, 1) // 머리
      c.fillRect(x + 7, y + 6, 2, 3) // 몸
      c.fillRect(x + 7, y + 9, 1, 2) // 다리
      c.fillRect(x + 8, y + 9, 1, 2)
      // 거울 받침대
      c.fillStyle = P.metalDk
      c.fillRect(x + 6, y + 14, 3, 1)
      break
    }

    case "printer": {
      // 모던 프린터 (화이트 본체)
      // 본체 (화이트)
      c.fillStyle = P.offWhite
      c.fillRect(x + 2, y + 5, 11, 7)
      c.fillStyle = P.white
      c.fillRect(x + 2, y + 5, 11, 2) // 상판
      // 상판 하이라이트
      c.fillStyle = "rgba(255,255,255,0.6)"
      c.fillRect(x + 2, y + 5, 11, 1)
      // 전면 (살짝 어둡게)
      c.fillStyle = P.surfaceDk
      c.fillRect(x + 2, y + 11, 11, 1)
      // 용지 투입구 (상단 슬롯)
      c.fillStyle = P.metalMd
      c.fillRect(x + 4, y + 3, 7, 2)
      c.fillStyle = P.metalLt
      c.fillRect(x + 4, y + 3, 7, 1)
      // 투입된 용지 (흰 종이)
      c.fillStyle = "#fff"
      c.fillRect(x + 5, y + 1, 5, 3)
      c.fillStyle = "rgba(0,0,0,0.04)"
      c.fillRect(x + 5, y + 3, 5, 1)
      // 출력 용지 (하단에서 나오는 종이)
      c.fillStyle = "#fff"
      c.fillRect(x + 4, y + 11, 7, 2)
      c.fillStyle = "rgba(0,0,0,0.05)"
      c.fillRect(x + 4, y + 12, 7, 1)
      // 출력 용지 텍스트 라인
      c.fillStyle = "rgba(0,0,0,0.12)"
      c.fillRect(x + 5, y + 11, 4, 1)
      // 조작 패널 (전면)
      c.fillStyle = P.charcoal
      c.fillRect(x + 3, y + 8, 4, 2)
      // 디스플레이
      c.fillStyle = P.scrTeal
      c.fillRect(x + 3, y + 8, 3, 1)
      // 버튼
      c.fillStyle = P.scrGreen
      c.fillRect(x + 3, y + 9, 1, 1)
      c.fillStyle = P.metalLt
      c.fillRect(x + 5, y + 9, 1, 1)
      // LED 표시등
      c.fillStyle = P.scrGreen
      c.fillRect(x + 10, y + 7, 1, 1)
      break
    }

    case "vending": {
      // 음료 자판기 (1블럭 컴팩트)
      // 본체 (빨간색 프레임)
      c.fillStyle = "#dc2626"
      c.fillRect(x + 1, y + 1, 13, 13)
      c.fillStyle = "#b91c1c"
      c.fillRect(x + 1, y + 13, 13, 1)
      // 상단 간판
      c.fillStyle = "#fef2f2"
      c.fillRect(x + 2, y + 1, 11, 2)
      c.fillStyle = "#dc2626"
      c.fillRect(x + 4, y + 2, 5, 1)
      // 유리문 (투명 블루)
      c.fillStyle = "#d0e8f8"
      c.fillRect(x + 2, y + 3, 9, 7)
      // 유리 반사
      c.fillStyle = "rgba(255,255,255,0.25)"
      c.fillRect(x + 3, y + 3, 1, 5)
      c.fillRect(x + 4, y + 4, 1, 3)
      // 선반
      c.fillStyle = P.metalMd
      c.fillRect(x + 2, y + 6, 9, 1)
      // 음료 캔 (상단)
      const vendCans: [number, string][] = [[3, "#ef4444"], [5, "#3b82f6"], [7, "#22c55e"], [9, "#f59e0b"]]
      vendCans.forEach(([dx, cc]) => {
        c.fillStyle = cc
        c.fillRect(x + dx, y + 4, 1, 2)
        c.fillStyle = "rgba(255,255,255,0.3)"
        c.fillRect(x + dx, y + 4, 1, 1)
      })
      // 음료 병 (하단)
      const vendBottles: [number, string][] = [[3, "#06b6d4"], [5, "#ec4899"], [7, "#84cc16"], [9, "#f97316"]]
      vendBottles.forEach(([dx, cc]) => {
        c.fillStyle = cc
        c.fillRect(x + dx, y + 7, 1, 2)
        c.fillStyle = "rgba(255,255,255,0.2)"
        c.fillRect(x + dx, y + 7, 1, 1)
      })
      // 우측 버튼 패널
      c.fillStyle = "#991b1b"
      c.fillRect(x + 11, y + 3, 2, 7)
      c.fillStyle = P.metalLt
      c.fillRect(x + 11, y + 4, 1, 1)
      c.fillStyle = P.scrGreen; c.fillRect(x + 11, y + 6, 1, 1)
      c.fillStyle = P.gold; c.fillRect(x + 11, y + 7, 1, 1)
      // 하단 추출구
      c.fillStyle = P.black
      c.fillRect(x + 3, y + 11, 7, 2)
      c.fillStyle = P.charcoal
      c.fillRect(x + 4, y + 11, 5, 1)
      break
    }

    case "admin_desk": {
      const isAdm = role === "admin"
      // 모던 데스크 다리 (슬림 블랙)
      c.fillStyle = P.deskLeg
      c.fillRect(x + 3, y + 12, 1, 3)
      c.fillRect(x + w - 4, y + 12, 1, 3)
      // 앞면 패널
      c.fillStyle = P.deskFront
      c.fillRect(x + 2, y + 8, w - 4, 5)
      c.fillStyle = P.surfaceDk
      c.fillRect(x + 2, y + 12, w - 4, 1)
      // 상판 (화이트)
      c.fillStyle = P.deskTop
      c.fillRect(x + 2, y + 5, w - 4, 4)
      c.fillStyle = P.surfaceLt
      c.fillRect(x + 2, y + 5, w - 4, 1)
      // 경계
      c.fillStyle = P.surfaceDk
      c.fillRect(x + 2, y + 8, w - 4, 1)
      // 울트라와이드 모니터
      c.fillStyle = P.scrFrame
      c.fillRect(x + w / 2 - 5, y + 1, 10, 5)
      c.fillStyle = isAdm ? "#1e1b4b" : P.scrBlue
      c.fillRect(x + w / 2 - 4, y + 2, 8, 3)
      c.fillStyle = "rgba(255,255,255,0.1)"
      c.fillRect(x + w / 2 - 4, y + 2, 8, 1)
      // 스탠드
      c.fillStyle = P.scrFrame
      c.fillRect(x + w / 2 - 1, y + 6, 3, 1)
      // 키보드
      c.fillStyle = P.charcoal
      c.fillRect(x + w / 2 - 3, y + 7, 6, 1)
      // 관리자 배지
      if (isAdm) {
        c.fillStyle = P.gold
        c.fillRect(x + 3, y + 6, 2, 1)
        c.fillStyle = P.goldDk
        c.fillRect(x + 3, y + 7, 2, 1)
      }
      break
    }

    case "desk": {
      // 모던 스탠딩 데스크 (슬림 다리)
      c.fillStyle = P.deskLeg
      c.fillRect(x + 3, y + 12, 1, 3)
      c.fillRect(x + 11, y + 12, 1, 3)
      // 앞면
      c.fillStyle = P.deskFront
      c.fillRect(x + 2, y + 9, 11, 4)
      c.fillStyle = P.wallDk
      c.fillRect(x + 2, y + 12, 11, 1)
      // 상판 (화이트)
      c.fillStyle = P.deskTop
      c.fillRect(x + 2, y + 6, 11, 4)
      c.fillStyle = P.surfaceLt
      c.fillRect(x + 2, y + 6, 11, 1)
      c.fillStyle = P.surfaceDk
      c.fillRect(x + 2, y + 9, 11, 1)
      // 모니터
      c.fillStyle = P.scrFrame
      c.fillRect(x + 5, y + 2, 5, 4)
      c.fillStyle = (o.variant ?? 0) % 2 === 0 ? P.scrBlue : P.scrTeal
      c.fillRect(x + 6, y + 3, 3, 2)
      c.fillStyle = "rgba(255,255,255,0.12)"
      c.fillRect(x + 6, y + 3, 3, 1)
      // 스탠드
      c.fillStyle = P.scrFrame
      c.fillRect(x + 7, y + 6, 1, 1)
      // 키보드
      c.fillStyle = P.charcoal
      c.fillRect(x + 5, y + 7, 4, 1)
      // 마우스
      c.fillStyle = P.metalLt
      c.fillRect(x + 11, y + 7, 1, 1)
      // 머그
      c.fillStyle = P.white
      c.fillRect(x + 3, y + 7, 1, 1)
      break
    }

    case "chair": {
      const colors = [P.chairBlue, P.chairOrange, P.chairGray]
      const chairColor = colors[(o.variant ?? 0) % colors.length]
      const chairDk = darken(chairColor, 0.2)
      const chairLt = lighten(chairColor, 0.15)
      // 별 다리 (크롬)
      c.fillStyle = P.metalMd
      c.fillRect(x + 5, y + 13, 5, 1)
      c.fillRect(x + 7, y + 11, 1, 3)
      c.fillRect(x + 4, y + 13, 1, 1)
      c.fillRect(x + 10, y + 13, 1, 1)
      // 기둥 (크롬)
      c.fillStyle = P.metalLt
      c.fillRect(x + 7, y + 10, 1, 2)
      // 좌석 (메쉬)
      c.fillStyle = chairColor
      c.fillRect(x + 4, y + 6, 7, 5)
      c.fillStyle = chairLt
      c.fillRect(x + 5, y + 7, 5, 3)
      // 등받이 (메쉬)
      c.fillStyle = chairDk
      c.fillRect(x + 4, y + 3, 7, 4)
      c.fillStyle = chairColor
      c.fillRect(x + 5, y + 4, 5, 2)
      // 메쉬 텍스처 (등받이)
      c.fillStyle = "rgba(255,255,255,0.06)"
      c.fillRect(x + 5, y + 4, 1, 2)
      c.fillRect(x + 7, y + 4, 1, 2)
      c.fillRect(x + 9, y + 4, 1, 2)
      // 팔걸이 (크롬)
      c.fillStyle = P.metalMd
      c.fillRect(x + 3, y + 6, 1, 3)
      c.fillRect(x + 11, y + 6, 1, 3)
      break
    }

    case "plant": {
      const variant = o.variant ?? 0
      // 모던 화분 (콘크리트/세라믹)
      const potY = variant === 2 ? 9 : 10
      if (variant === 2) {
        // 큰 원통형 화분 (콘크리트)
        c.fillStyle = "#8890a0"
        c.fillRect(x + 4, y + potY, 7, 5)
        c.fillStyle = "#9098a8"
        c.fillRect(x + 4, y + potY, 7, 1)
        c.fillStyle = "#787f90"
        c.fillRect(x + 5, y + potY + 3, 5, 1)
      } else {
        // 작은 세라믹 화분 (화이트)
        c.fillStyle = P.offWhite
        c.fillRect(x + 5, y + potY + 1, 5, 3)
        c.fillStyle = P.white
        c.fillRect(x + 5, y + potY, 5, 2)
        c.fillStyle = P.wallDk
        c.fillRect(x + 6, y + potY + 3, 3, 1)
      }
      // 흙
      c.fillStyle = "#5c4830"
      c.fillRect(x + 5, y + potY, 5, 1)

      if (variant === 2) {
        // 피카수 야자 (큰)
        c.fillStyle = P.greenDk
        c.fillRect(x + 7, y + 4, 1, 5)
        c.fillStyle = P.green
        c.fillRect(x + 3, y + 1, 4, 3)
        c.fillRect(x + 8, y + 1, 4, 3)
        c.fillRect(x + 5, y + 0, 4, 2)
        c.fillStyle = P.greenLt
        c.fillRect(x + 4, y + 2, 2, 1)
        c.fillRect(x + 9, y + 2, 2, 1)
        c.fillRect(x + 6, y + 0, 2, 1)
      } else if (variant === 1) {
        // 몬스테라 (중간)
        c.fillStyle = P.greenDk
        c.fillRect(x + 7, y + 5, 1, 5)
        c.fillStyle = P.green
        c.fillRect(x + 4, y + 2, 3, 4)
        c.fillRect(x + 8, y + 3, 3, 3)
        c.fillStyle = P.greenLt
        c.fillRect(x + 5, y + 3, 2, 2)
        c.fillRect(x + 6, y + 1, 2, 2)
        // 잎 구멍 (몬스테라 특징)
        c.fillStyle = P.greenDk
        c.fillRect(x + 5, y + 4, 1, 1)
        c.fillRect(x + 9, y + 4, 1, 1)
      } else {
        // 산세베리아 (작은, 직립)
        c.fillStyle = P.greenDk
        c.fillRect(x + 6, y + 5, 1, 5)
        c.fillRect(x + 8, y + 4, 1, 6)
        c.fillStyle = P.green
        c.fillRect(x + 7, y + 3, 1, 7)
        c.fillStyle = P.greenLt
        c.fillRect(x + 7, y + 3, 1, 1)
        c.fillRect(x + 8, y + 4, 1, 1)
        c.fillRect(x + 6, y + 5, 1, 1)
        // 노란 줄무늬
        c.fillStyle = "#bef264"
        c.fillRect(x + 7, y + 5, 1, 1)
        c.fillRect(x + 7, y + 7, 1, 1)
      }
      break
    }

    case "bookshelf": {
      // 오픈 셸프 (블랙 메탈 프레임)
      c.fillStyle = P.scrFrame
      c.fillRect(x + 2, y + 1, 1, 13) // 좌 기둥
      c.fillRect(x + 12, y + 1, 1, 13) // 우 기둥
      // 선반 (우드 악센트)
      c.fillStyle = P.ashWood
      c.fillRect(x + 2, y + 1, 11, 1)
      c.fillRect(x + 2, y + 7, 11, 1)
      c.fillRect(x + 2, y + 13, 11, 1)
      // 상단 책들
      const booksT: [string, number][] = [[P.blue, 5], ["#6366f1", 4], [P.green, 5], [P.gold, 3], [P.purple, 5], ["#ec4899", 4]]
      booksT.forEach(([bc, bh], i) => {
        c.fillStyle = bc
        c.fillRect(x + 3 + i * 1.5, y + 7 - bh, 1, bh)
        c.fillStyle = "rgba(255,255,255,0.15)"
        c.fillRect(x + 3 + i * 1.5, y + 7 - bh, 1, 1)
      })
      // 하단 (오브제 + 책)
      c.fillStyle = P.blue
      c.fillRect(x + 3, y + 8, 2, 4)
      c.fillStyle = P.gold
      c.fillRect(x + 6, y + 9, 2, 3)
      // 작은 화분
      c.fillStyle = P.white
      c.fillRect(x + 9, y + 10, 2, 2)
      c.fillStyle = P.greenLt
      c.fillRect(x + 9, y + 8, 2, 2)
      break
    }

    case "sofa": {
      // 모던 로우 소파 (다크 패브릭)
      c.fillStyle = P.sofa
      c.fillRect(x + 1, y + 4, w - 2, 4) // 등받이
      c.fillStyle = darken(P.sofa, 0.12)
      c.fillRect(x + 1, y + 7, w - 2, 1)
      // 좌석
      c.fillStyle = P.sofaLt
      c.fillRect(x + 1, y + 8, w - 2, 4)
      // 팔걸이 (로우)
      c.fillStyle = P.sofa
      c.fillRect(x, y + 5, 2, 7)
      c.fillRect(x + w - 2, y + 5, 2, 7)
      // 팔걸이 하이라이트
      c.fillStyle = "rgba(255,255,255,0.05)"
      c.fillRect(x, y + 5, 2, 1)
      c.fillRect(x + w - 2, y + 5, 2, 1)
      // 쿠션 (2개)
      c.fillStyle = P.sofaCushion
      c.fillRect(x + 3, y + 8, w / 2 - 4, 3)
      c.fillRect(x + w / 2 + 1, y + 8, w / 2 - 4, 3)
      c.fillStyle = "rgba(255,255,255,0.06)"
      c.fillRect(x + 4, y + 9, w / 2 - 6, 1)
      c.fillRect(x + w / 2 + 2, y + 9, w / 2 - 6, 1)
      // 구분선
      c.fillStyle = darken(P.sofa, 0.08)
      c.fillRect(x + w / 2, y + 8, 1, 4)
      // 다리 (슬림 블랙)
      c.fillStyle = P.black
      c.fillRect(x + 1, y + 12, 1, 1)
      c.fillRect(x + w - 2, y + 12, 1, 1)
      break
    }

    case "water_cooler": {
      // 스마트 정수기 (슬림 블랙)
      c.fillStyle = P.charcoal
      c.fillRect(x + 5, y + 7, 5, 7)
      c.fillStyle = P.metalDk
      c.fillRect(x + 5, y + 7, 5, 1) // 상단
      // 물탱크 (반투명 블루)
      c.fillStyle = "#68c0e8"
      c.fillRect(x + 5, y + 2, 5, 4)
      c.fillStyle = "#88d8f8"
      c.fillRect(x + 6, y + 2, 3, 2) // 하이라이트
      // 물통 바닥
      c.fillStyle = "#50a8d0"
      c.fillRect(x + 5, y + 6, 5, 1)
      // 추출 버튼 (터치)
      c.fillStyle = P.ledTeal
      c.fillRect(x + 6, y + 8, 1, 1)
      c.fillStyle = P.ledBlue
      c.fillRect(x + 8, y + 8, 1, 1)
      // LED 표시
      c.fillStyle = P.scrGreen
      c.fillRect(x + 7, y + 10, 1, 1)
      // 컵 받침
      c.fillStyle = P.metalMd
      c.fillRect(x + 5, y + 12, 5, 1)
      break
    }
  }
}

function ly_safe(v: number, max: number): number { return Math.min(v, max) }

function darken(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.max(0, Math.floor(r * (1 - amt)))},${Math.max(0, Math.floor(g * (1 - amt)))},${Math.max(0, Math.floor(b * (1 - amt)))})`
}

function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.min(255, Math.floor(r + (255 - r) * amt))},${Math.min(255, Math.floor(g + (255 - g) * amt))},${Math.min(255, Math.floor(b + (255 - b) * amt))})`
}

// ─── 아바타 렌더링 ───
function drawChar(ctx: CanvasRenderingContext2D, col: number, row: number, nickname: string, color: string, isMe: boolean) {
  const icx = col * T + Math.floor(T / 2)
  const icy = row * T + Math.floor(T / 2)
  const ox = icx - 4, oy = icy - 6

  // 바닥 그림자
  ctx.fillStyle = "rgba(0,0,0,0.15)"
  px(ctx, ox + 2, oy + 13, 5, 1)
  ctx.fillStyle = "rgba(0,0,0,0.06)"
  px(ctx, ox + 1, oy + 13, 1, 1)
  px(ctx, ox + 7, oy + 13, 1, 1)

  const bodyColor = darken(color, 0.05)
  const bodyLt = lighten(color, 0.15)
  const hairColor = darken(color, 0.3)
  const shoeColor = darken(color, 0.4)
  const colors: Record<string, string> = {
    H: hairColor, S: P.skin, E: "#282830", Q: P.skinLt, M: darken(P.skin, 0.08),
    B: bodyColor, C: bodyLt, L: "#404050", F: shoeColor,
  }

  CHAR_SPRITE.forEach((srow, ry) => {
    for (let rx = 0; rx < srow.length; rx++) {
      const ch = srow[rx]
      if (ch === ".") continue
      ctx.fillStyle = colors[ch] || "#ff0000"
      px(ctx, ox + rx, oy + ry)
    }
  })

  // 아웃라인
  ctx.fillStyle = darken(hairColor, 0.3)
  px(ctx, ox + 2, oy - 1, 5, 1)
  px(ctx, ox + 1, oy, 1, 4)
  px(ctx, ox + 7, oy, 1, 4)

  // 내 캐릭터 표시 (▼)
  if (isMe) {
    ctx.fillStyle = "#f0f0f0"
    px(ctx, ox + 4, oy - 4)
    px(ctx, ox + 3, oy - 3, 3, 1)
    px(ctx, ox + 2, oy - 2, 5, 1)
    ctx.fillStyle = darken(color, 0.2)
    px(ctx, ox + 4, oy - 5)
    px(ctx, ox + 2, oy - 3, 1, 1)
    px(ctx, ox + 6, oy - 3, 1, 1)
    px(ctx, ox + 1, oy - 2, 1, 1)
    px(ctx, ox + 7, oy - 2, 1, 1)
  }
}

// ─── 컴포넌트 ───
interface VirtualOfficeProps { onOnlineCountChange?: (n: number) => void }

export function VirtualOffice({ onOnlineCountChange }: VirtualOfficeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const staticRef = useRef<HTMLCanvasElement | null>(null)
  const { user } = useAuthStore()
  const { activePanel, openPanel } = usePanelStore()
  const [myPos, setMyPos] = useState({ col: 5, row: 8 })
  const [others, setOthers] = useState<AvatarPos[]>([])
  const nearby = useMemo(
    () => user ? (getNearby(myPos.col, myPos.row, user.role === "admin") ?? null) : null,
    [myPos, user]
  )

  useEffect(() => { staticRef.current = buildStatic(user?.role) }, [user?.role])
  useEffect(() => { onOnlineCountChange?.(others.length + 1) }, [others.length, onOnlineCountChange])

  useEffect(() => {
    if (!user?.team_id) return
    const supabase = createClient()
    const ch = supabase.channel(`office:${user.team_id}`)
    ch.on("broadcast", { event: "position" }, ({ payload }) => {
      if (payload.id === user.id) return
      setOthers(prev => { const i = prev.findIndex(a => a.id === payload.id); if (i >= 0) { const u = [...prev]; u[i] = payload; return u }; return [...prev, payload] })
    }).on("broadcast", { event: "leave" }, ({ payload }) => {
      setOthers(prev => prev.filter(a => a.id !== payload.id))
    }).subscribe()
    ch.send({ type: "broadcast", event: "position", payload: { id: user.id, col: myPos.col, row: myPos.row, nickname: user.nickname, avatarBody: user.avatar_body } })
    return () => { ch.send({ type: "broadcast", event: "leave", payload: { id: user.id } }); supabase.removeChannel(ch) }
  }, [user])

  useEffect(() => {
    if (!user?.team_id) return
    const supabase = createClient()
    const ch = supabase.channel(`office:${user.team_id}`)
    ch.send({ type: "broadcast", event: "position", payload: { id: user.id, col: myPos.col, row: myPos.row, nickname: user.nickname, avatarBody: user.avatar_body } })
  }, [myPos])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (activePanel) return
      let nc = myPos.col, nr = myPos.row
      switch (e.key) {
        case "ArrowUp": case "w": case "W": nr--; break
        case "ArrowDown": case "s": case "S": nr++; break
        case "ArrowLeft": case "a": case "A": nc--; break
        case "ArrowRight": case "d": case "D": nc++; break
        case " ": case "Enter": if (nearby?.panelType) openPanel(nearby.panelType); return
        default: return
      }
      e.preventDefault()
      if (nc >= 1 && nc < COLS - 1 && nr >= 1 && nr < ROWS - 1 && !isBlocked(nc, nr)) setMyPos({ col: nc, row: nr })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [myPos, nearby, activePanel, openPanel])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    if (staticRef.current) ctx.drawImage(staticRef.current, 0, 0, DW, DH)

    others.forEach(a => drawChar(ctx, a.col, a.row, a.nickname, ACOL[a.avatarBody] ?? ACOL.default, false))
    if (user) drawChar(ctx, myPos.col, myPos.row, user.nickname, ACOL[user.avatar_body] ?? ACOL.default, true)

    // 하이라이트 (모던: 블루 글로우)
    if (nearby && !activePanel) {
      const hx = nearby.x * T, hy = nearby.y * T, hw = nearby.w * T, hh = nearby.h * T
      ctx.fillStyle = "rgba(59,130,246,0.35)"
      for (let i = 0; i < hw; i += 2) { px(ctx, hx + i, hy - 1); px(ctx, hx + i, hy + hh) }
      for (let i = 0; i < hh; i += 2) { px(ctx, hx - 1, hy + i); px(ctx, hx + hw, hy + i) }
    }

    // 텍스트 (네이티브 해상도)
    ctx.imageSmoothingEnabled = true

    // ── 오브젝트 상시 라벨 ──
    ctx.font = "bold 7px 'Segoe UI', sans-serif"
    ctx.textAlign = "center"
    OBJS.forEach(o => {
      if (!o.interactable || !o.label) return
      if (o.adminOnly && user?.role !== "admin") return
      const isNearby = nearby === o
      const shortLabel = o.label.replace(/^[^\s]+\s/, "")
      const cx = (o.x + o.w / 2) * T * S
      const cy = (o.y + o.h) * T * S + 6
      const tw = ctx.measureText(shortLabel).width + 8
      const bx = cx - tw / 2, by = cy - 1
      ctx.fillStyle = isNearby ? "rgba(59,130,246,0.9)" : "rgba(15,23,42,0.55)"
      ctx.beginPath(); ctx.roundRect(bx, by, tw, 12, 3); ctx.fill()
      ctx.fillStyle = "#fff"
      ctx.fillText(shortLabel, cx, cy + 8)
    })

    // ── 아바타 닉네임 ──
    const allAv = [...others.map(a => ({ ...a, isMe: false })), ...(user ? [{ col: myPos.col, row: myPos.row, nickname: user.nickname, avatarBody: user.avatar_body, isMe: true, id: user.id }] : [])]
    allAv.forEach(a => {
      const dx = a.col * T * S + T * S / 2, dy = a.row * T * S - 4
      ctx.font = `${a.isMe ? "bold " : ""}9px 'Segoe UI', sans-serif`
      ctx.textAlign = "center"
      const tw = ctx.measureText(a.nickname).width + 12, nx = dx - tw / 2, ny = dy - 14
      ctx.fillStyle = a.isMe ? "rgba(99,102,241,0.9)" : "rgba(15,23,42,0.75)"
      ctx.beginPath(); ctx.roundRect(nx, ny, tw, 14, 4); ctx.fill()
      ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(nx + 5, ny + 7, 2.5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "#fff"; ctx.fillText(a.nickname, dx + 2, ny + 10.5)
    })

    // ── 상호작용 안내 바 ──
    if (nearby && !activePanel) {
      const label = nearby.label?.replace(/^[^\s]+\s/, "") ?? "상호작용"
      ctx.font = "bold 10px 'Segoe UI', sans-serif"
      ctx.textAlign = "center"
      const tw = ctx.measureText(label).width + 50, hx = DW / 2 - tw / 2, hy = DH - 26
      ctx.fillStyle = "rgba(15,23,42,0.9)"; ctx.beginPath(); ctx.roundRect(hx, hy, tw, 22, 6); ctx.fill()
      // SPACE 키 배지
      ctx.fillStyle = "rgba(59,130,246,0.3)"; ctx.beginPath(); ctx.roundRect(hx + 4, hy + 3, 36, 16, 3); ctx.fill()
      ctx.fillStyle = "#93c5fd"; ctx.font = "bold 8px monospace"; ctx.fillText("SPACE", hx + 22, hy + 14)
      ctx.fillStyle = "#fff"; ctx.font = "bold 10px 'Segoe UI', sans-serif"; ctx.fillText(label, hx + tw / 2 + 14, hy + 15)
    }

  }, [myPos, others, nearby, user, activePanel])

  useEffect(() => {
    let animId: number
    const loop = () => { render(); animId = requestAnimationFrame(loop) }
    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [render])

  return (
    <div className="relative flex-1" style={{ backgroundColor: "#b4b8be" }}>
      <canvas ref={canvasRef} width={DW} height={DH} className="block w-full" tabIndex={0} style={{ imageRendering: "pixelated" }} />
      {/* HUD 오버레이 */}
      {!activePanel && user && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center p-2">
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-[10px] text-white backdrop-blur-sm">
            <span className="font-medium">{user.nickname}</span>
            <span className="h-2.5 w-px bg-white/30" />
            <span className="text-amber-300 font-semibold">{user.points}P</span>
            <span className="h-2.5 w-px bg-white/30" />
            <span className="text-white/60">WASD 이동 · Space 상호작용</span>
          </div>
        </div>
      )}
    </div>
  )
}
