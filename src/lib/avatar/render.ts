// ─── 공유 아바타 렌더링 모듈 ───
// virtual-office, compact-shop-panel, compact-mypage-panel에서 공통으로 사용

export const CHAR_SPRITE = [
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

export interface AvatarParts {
  hair: string
  face: string
  top: string
  bottom: string
  shoes: string
  hairKey: string
  faceKey: string
  topKey: string
  bottomKey: string
  shoesKey: string
}

// ─── 슬롯별 image_key → hex 색상 매핑 ───
export const PART_COLORS: Record<string, Record<string, string>> = {
  hair: {
    hair_default: "#4338ca",
    hat_cap:      "#1f2937",
    hat_crown:    "#f59e0b",
    hat_beanie:   "#ec4899",
    hat_top:      "#1c1c24",
  },
  face: {
    face_default:     "#f0c8a0",
    face_sunglasses:  "#f0c8a0",
    face_wink:        "#f0c8a0",
    face_angry:       "#f0c8a0",
    face_cat:         "#fce8d0",
  },
  top: {
    top_default: "#6366f1",
    top_hoodie:  "#16a34a",
    top_suit:    "#1e3a8a",
    top_stripe:  "#dc2626",
    top_sports:  "#2563eb",
  },
  bottom: {
    bottom_default: "#404050",
    bottom_shorts:  "#92400e",
    bottom_skirt:   "#be185d",
    bottom_cargo:   "#365314",
    bottom_slacks:  "#1e3a8a",
  },
  shoes: {
    shoes_default: "#3730a3",
    shoes_boots:   "#78350f",
    shoes_flats:   "#f9a8d4",
    shoes_heels:   "#b91c1c",
    shoes_formal:  "#111827",
  },
}

export const DEFAULT_PARTS: AvatarParts = {
  hair: "#4338ca", face: "#f0c8a0", top: "#6366f1", bottom: "#404050", shoes: "#3730a3",
  hairKey: "hair_default", faceKey: "face_default",
  topKey: "top_default", bottomKey: "bottom_default", shoesKey: "shoes_default",
}

const SKIN_DEFAULT = "#f0c8a0"

// ─── 색상 헬퍼 ───
export function darken(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.max(0, Math.floor(r * (1 - amt)))},${Math.max(0, Math.floor(g * (1 - amt)))},${Math.max(0, Math.floor(b * (1 - amt)))})`
}

export function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.min(255, Math.floor(r + (255 - r) * amt))},${Math.min(255, Math.floor(g + (255 - g) * amt))},${Math.min(255, Math.floor(b + (255 - b) * amt))})`
}

// scale 파라미터 기반 픽셀 헬퍼
function p(ctx: CanvasRenderingContext2D, scale: number, ix: number, iy: number, w = 1, h = 1) {
  ctx.fillRect(ix * scale, iy * scale, w * scale, h * scale)
}

// ─── 모자 오버레이 ───
export function drawHatOverlay(
  ctx: CanvasRenderingContext2D, scale: number,
  ox: number, oy: number, hairKey: string, hairColor: string,
) {
  switch (hairKey) {
    case "hat_cap": {
      // 야구모자: 챙 + 앞판 밴드 + 버튼
      ctx.fillStyle = darken(hairColor, 0.45)
      p(ctx, scale, ox + 0, oy + 2, 9, 1) // 챙
      ctx.fillStyle = darken(hairColor, 0.25)
      p(ctx, scale, ox + 3, oy - 1, 3, 1) // 앞판 밴드
      ctx.fillStyle = lighten(hairColor, 0.5)
      p(ctx, scale, ox + 4, oy + 0, 1, 1) // 캡 버튼
      break
    }
    case "hat_crown": {
      // 왕관: 두꺼운 밴드 + 기둥 + 보석
      ctx.fillStyle = "#e7a000"
      p(ctx, scale, ox + 1, oy - 1, 7, 2) // 왕관 밴드 (2행)
      p(ctx, scale, ox + 2, oy - 3, 2, 2) // 좌 기둥
      p(ctx, scale, ox + 4, oy - 4, 1, 3) // 중앙 기둥
      p(ctx, scale, ox + 5, oy - 3, 2, 2) // 우 기둥
      ctx.fillStyle = "#ef4444"
      p(ctx, scale, ox + 4, oy - 4, 1, 1) // 루비
      ctx.fillStyle = "#3b82f6"
      p(ctx, scale, ox + 2, oy - 3, 1, 1) // 사파이어 좌
      p(ctx, scale, ox + 6, oy - 3, 1, 1) // 사파이어 우
      ctx.fillStyle = "#f7d060"
      p(ctx, scale, ox + 3, oy - 1, 1, 1) // 하이라이트1
      p(ctx, scale, ox + 5, oy - 1, 1, 1) // 하이라이트2
      break
    }
    case "hat_beanie": {
      // 비니: 두꺼운 몸통 + 폼폼
      ctx.fillStyle = hairColor
      p(ctx, scale, ox + 2, oy - 1, 5, 2) // 몸통 (2행)
      p(ctx, scale, ox + 3, oy - 3, 3, 2) // 상단 볼록
      ctx.fillStyle = lighten(hairColor, 0.55)
      p(ctx, scale, ox + 3, oy - 5, 3, 2) // 폼폼 (2행)
      p(ctx, scale, ox + 4, oy - 6, 1, 1) // 폼폼 꼭대기
      break
    }
    case "hat_top": {
      // 중절모: 키 큰 몸체 + 넓은 챙
      ctx.fillStyle = hairColor
      p(ctx, scale, ox + 3, oy - 4, 3, 4) // 몸체 (4행)
      ctx.fillStyle = lighten(hairColor, 0.18)
      p(ctx, scale, ox + 3, oy - 4, 3, 1) // 상단 하이라이트
      ctx.fillStyle = darken(hairColor, 0.15)
      p(ctx, scale, ox + 1, oy + 0, 7, 1) // 넓은 챙
      break
    }
  }
}

// ─── 표정 오버레이 ───
export function drawFaceOverlay(
  ctx: CanvasRenderingContext2D, scale: number,
  ox: number, oy: number, faceKey: string, faceColor: string,
) {
  switch (faceKey) {
    case "face_sunglasses": {
      // 2x2 어두운 렌즈 + 프레임
      ctx.fillStyle = "#1c1c2c"
      p(ctx, scale, ox + 2, oy + 3, 2, 2) // 좌 렌즈
      p(ctx, scale, ox + 5, oy + 3, 2, 2) // 우 렌즈
      p(ctx, scale, ox + 4, oy + 3, 1, 1) // 코 브릿지
      ctx.fillStyle = "#2c2c44"
      p(ctx, scale, ox + 1, oy + 3, 1, 2) // 좌 다리
      p(ctx, scale, ox + 7, oy + 3, 1, 2) // 우 다리
      break
    }
    case "face_wink": {
      // 좌 눈 닫기 (두꺼운 선)
      ctx.fillStyle = faceColor
      p(ctx, scale, ox + 2, oy + 3, 3, 2)
      ctx.fillStyle = darken(faceColor, 0.5)
      p(ctx, scale, ox + 2, oy + 3, 3, 1) // 닫힌 눈
      p(ctx, scale, ox + 2, oy + 4, 3, 1) // 속눈썹
      break
    }
    case "face_angry": {
      // 사선 눈썹 + 붉은 기운
      ctx.fillStyle = darken(faceColor, 0.55)
      p(ctx, scale, ox + 2, oy + 2, 2, 1) // 좌 눈썹
      p(ctx, scale, ox + 5, oy + 2, 2, 1) // 우 눈썹
      ctx.fillStyle = "rgba(239,68,68,0.3)"
      p(ctx, scale, ox + 2, oy + 4, 2, 1) // 붉은 볼 좌
      p(ctx, scale, ox + 5, oy + 4, 2, 1) // 붉은 볼 우
      break
    }
    case "face_cat": {
      // 큰 귀 + 분홍 코 + 수염
      ctx.fillStyle = darken(faceColor, 0.12)
      p(ctx, scale, ox + 2, oy - 1, 2, 1) // 좌 귀
      p(ctx, scale, ox + 3, oy - 2, 1, 1) // 좌 귀 뾰족
      p(ctx, scale, ox + 5, oy - 2, 1, 1) // 우 귀 뾰족
      p(ctx, scale, ox + 5, oy - 1, 2, 1) // 우 귀
      ctx.fillStyle = "#f472b6"
      p(ctx, scale, ox + 3, oy + 4, 3, 1) // 분홍 코
      ctx.fillStyle = darken(faceColor, 0.3)
      p(ctx, scale, ox + 1, oy + 5, 2, 1) // 좌 수염
      p(ctx, scale, ox + 6, oy + 5, 2, 1) // 우 수염
      break
    }
  }
}

// ─── 상의 오버레이 (rows 6-9 영역) ───
export function drawTopOverlay(
  ctx: CanvasRenderingContext2D, scale: number,
  ox: number, oy: number, topKey: string, topColor: string,
) {
  switch (topKey) {
    case "top_hoodie": {
      // 후드 (양 사이드) + 앞 포켓 + 끈
      ctx.fillStyle = darken(topColor, 0.12)
      p(ctx, scale, ox + 1, oy + 1, 1, 4) // 좌 후드
      p(ctx, scale, ox + 7, oy + 1, 1, 4) // 우 후드
      ctx.fillStyle = darken(topColor, 0.22)
      p(ctx, scale, ox + 3, oy + 8, 3, 2) // 앞 포켓
      ctx.fillStyle = lighten(topColor, 0.35)
      p(ctx, scale, ox + 3, oy + 6, 1, 2) // 좌 후드 끈
      p(ctx, scale, ox + 5, oy + 6, 1, 2) // 우 후드 끈
      break
    }
    case "top_suit": {
      // 흰 셔츠 + 빨간 넥타이 + 재킷 라펠
      ctx.fillStyle = "#f4f6f8"
      p(ctx, scale, ox + 3, oy + 6, 1, 3) // 좌 셔츠
      p(ctx, scale, ox + 5, oy + 6, 1, 3) // 우 셔츠
      ctx.fillStyle = "#ef4444"
      p(ctx, scale, ox + 4, oy + 6, 1, 3) // 넥타이
      ctx.fillStyle = darken("#ef4444", 0.25)
      p(ctx, scale, ox + 4, oy + 9, 1, 1) // 넥타이 끝
      ctx.fillStyle = darken(topColor, 0.28)
      p(ctx, scale, ox + 2, oy + 7, 1, 2) // 좌 라펠
      p(ctx, scale, ox + 6, oy + 7, 1, 2) // 우 라펠
      ctx.fillStyle = "#f0f8ff"
      p(ctx, scale, ox + 2, oy + 6, 1, 1) // 가슴 포켓 치프
      break
    }
    case "top_stripe": {
      // 가로 스트라이프
      ctx.fillStyle = lighten(topColor, 0.45)
      p(ctx, scale, ox + 2, oy + 7, 5, 1) // 상단 스트라이프
      p(ctx, scale, ox + 1, oy + 9, 7, 1) // 하단 스트라이프
      // 셔츠 칼라
      ctx.fillStyle = "#f4f6f8"
      p(ctx, scale, ox + 3, oy + 6, 1, 2)
      p(ctx, scale, ox + 5, oy + 6, 1, 2)
      break
    }
    case "top_sports": {
      // V넥 + 사이드 화이트 스트라이프
      ctx.fillStyle = SKIN_DEFAULT
      p(ctx, scale, ox + 3, oy + 6, 1, 2) // 좌 V넥
      p(ctx, scale, ox + 5, oy + 6, 1, 2) // 우 V넥
      ctx.fillStyle = "rgba(255,255,255,0.55)"
      p(ctx, scale, ox + 2, oy + 6, 1, 4) // 좌 사이드 스트라이프
      p(ctx, scale, ox + 6, oy + 6, 1, 4) // 우 사이드 스트라이프
      break
    }
  }
}

// ─── 하의 오버레이 (rows 10-11 영역) ───
export function drawBottomOverlay(
  ctx: CanvasRenderingContext2D, scale: number,
  ox: number, oy: number, bottomKey: string, bottomColor: string,
) {
  switch (bottomKey) {
    case "bottom_shorts": {
      // 반바지: 다리 부분을 피부색으로 덮기
      ctx.fillStyle = SKIN_DEFAULT
      p(ctx, scale, ox + 2, oy + 11, 2, 1) // 좌 종아리 (피부)
      p(ctx, scale, ox + 5, oy + 11, 2, 1) // 우 종아리 (피부)
      ctx.fillStyle = darken(bottomColor, 0.2)
      p(ctx, scale, ox + 3, oy + 10, 3, 1) // 반바지 밑단 라인
      break
    }
    case "bottom_skirt": {
      // A라인 스커트: 더 넓게 퍼짐
      ctx.fillStyle = bottomColor
      p(ctx, scale, ox + 1, oy + 11, 7, 1) // 넓은 스커트 밑단
      ctx.fillStyle = darken(bottomColor, 0.22)
      p(ctx, scale, ox + 2, oy + 10, 1, 2) // 좌 주름
      p(ctx, scale, ox + 6, oy + 10, 1, 2) // 우 주름
      ctx.fillStyle = lighten(bottomColor, 0.2)
      p(ctx, scale, ox + 4, oy + 10, 1, 2) // 중앙 하이라이트
      break
    }
    case "bottom_cargo": {
      // 카고팬츠: 사이드 포켓 플랩
      ctx.fillStyle = darken(bottomColor, 0.22)
      p(ctx, scale, ox + 1, oy + 10, 1, 2) // 좌 포켓 플랩
      p(ctx, scale, ox + 7, oy + 10, 1, 2) // 우 포켓 플랩
      ctx.fillStyle = lighten(bottomColor, 0.18)
      p(ctx, scale, ox + 1, oy + 10, 1, 1) // 포켓 상단 라인 좌
      p(ctx, scale, ox + 7, oy + 10, 1, 1) // 포켓 상단 라인 우
      break
    }
    case "bottom_slacks": {
      // 슬랙스: 중심 크리즈 라인
      ctx.fillStyle = lighten(bottomColor, 0.25)
      p(ctx, scale, ox + 3, oy + 10, 1, 2) // 좌 크리즈
      p(ctx, scale, ox + 5, oy + 10, 1, 2) // 우 크리즈
      break
    }
  }
}

// ─── 신발 오버레이 (row 12 영역) ───
export function drawShoesOverlay(
  ctx: CanvasRenderingContext2D, scale: number,
  ox: number, oy: number, shoesKey: string, shoesColor: string,
) {
  switch (shoesKey) {
    case "shoes_boots": {
      // 부츠: 다리 위로 올라오는 부분 + 버클
      ctx.fillStyle = shoesColor
      p(ctx, scale, ox + 2, oy + 11, 2, 1) // 좌 부츠 상단
      p(ctx, scale, ox + 5, oy + 11, 2, 1) // 우 부츠 상단
      ctx.fillStyle = "#ca8a04" // 골드 버클
      p(ctx, scale, ox + 3, oy + 11, 1, 1) // 좌 버클
      p(ctx, scale, ox + 5, oy + 11, 1, 1) // 우 버클
      break
    }
    case "shoes_flats": {
      // 플랫슈즈: 앞 리본 장식
      ctx.fillStyle = lighten(shoesColor, 0.45)
      p(ctx, scale, ox + 2, oy + 12, 1, 1) // 좌 리본
      p(ctx, scale, ox + 5, oy + 12, 1, 1) // 우 리본
      break
    }
    case "shoes_heels": {
      // 힐: 앞코 반짝 + 굽
      ctx.fillStyle = lighten(shoesColor, 0.35)
      p(ctx, scale, ox + 2, oy + 12, 1, 1) // 좌 앞코 광택
      p(ctx, scale, ox + 5, oy + 12, 1, 1) // 우 앞코 광택
      ctx.fillStyle = darken(shoesColor, 0.1)
      p(ctx, scale, ox + 3, oy + 13, 1, 1) // 좌 굽
      p(ctx, scale, ox + 6, oy + 13, 1, 1) // 우 굽
      break
    }
    case "shoes_formal": {
      // 구두: 광택 하이라이트 + 밑창
      ctx.fillStyle = lighten(shoesColor, 0.5)
      p(ctx, scale, ox + 2, oy + 12, 1, 1) // 좌 광택
      p(ctx, scale, ox + 5, oy + 12, 1, 1) // 우 광택
      ctx.fillStyle = "#1c1c1c"
      p(ctx, scale, ox + 2, oy + 13, 2, 1) // 좌 밑창
      p(ctx, scale, ox + 5, oy + 13, 2, 1) // 우 밑창
      break
    }
  }
}

// ─── 파츠 단독 렌더링 ───
const PART_ROW_RANGE: Record<string, { start: number; end: number }> = {
  hair:   { start: 0,  end: 5  },
  face:   { start: 2,  end: 5  },
  top:    { start: 6,  end: 9  },
  bottom: { start: 10, end: 11 },
  shoes:  { start: 12, end: 12 },
}

// 각 슬롯 파츠의 스프라이트 내 시각적 중심 행 (canvas 중앙에 배치하기 위해 사용)
const PART_CENTER_ROW: Record<string, number> = {
  hair: 1, face: 3.5, top: 7.5, bottom: 10.5, shoes: 12.5,
}

export function renderPartOnly(
  ctx: CanvasRenderingContext2D,
  slot: "hair" | "face" | "top" | "bottom" | "shoes",
  parts: AvatarParts,
  scale: number,
  canvasW: number,
  canvasH: number,
) {
  const gridH = canvasH / scale
  const oy = Math.round(gridH / 2 - PART_CENTER_ROW[slot])
  const ox = 1

  const colors: Record<string, string> = {
    H: parts.hair,
    S: parts.face,
    E: "#282830",
    Q: lighten(parts.face, 0.1),
    M: darken(parts.face, 0.08),
    B: parts.top,
    C: lighten(parts.top, 0.15),
    L: parts.bottom,
    F: parts.shoes,
  }

  const { start, end } = PART_ROW_RANGE[slot]
  for (let ry = start; ry <= end; ry++) {
    const srow = CHAR_SPRITE[ry]
    for (let rx = 0; rx < srow.length; rx++) {
      const ch = srow[rx]
      if (ch === ".") continue
      ctx.fillStyle = colors[ch] || "#ff0000"
      p(ctx, scale, ox + rx, oy + ry)
    }
  }

  switch (slot) {
    case "hair":
      ctx.fillStyle = darken(parts.hair, 0.3)
      p(ctx, scale, ox + 2, oy - 1, 5, 1)
      p(ctx, scale, ox + 1, oy, 1, 4)
      p(ctx, scale, ox + 7, oy, 1, 4)
      drawHatOverlay(ctx, scale, ox, oy, parts.hairKey, parts.hair)
      break
    case "face":
      drawFaceOverlay(ctx, scale, ox, oy, parts.faceKey, parts.face)
      break
    case "top":
      drawTopOverlay(ctx, scale, ox, oy, parts.topKey, parts.top)
      break
    case "bottom":
      drawBottomOverlay(ctx, scale, ox, oy, parts.bottomKey, parts.bottom)
      break
    case "shoes":
      drawShoesOverlay(ctx, scale, ox, oy, parts.shoesKey, parts.shoes)
      break
  }
}

// ─── 전체 아바타 렌더링 ───
// ox, oy: 캔버스 내 스프라이트 시작 위치 (grid pixel 단위)
// scale: 1 grid pixel당 canvas pixel 수
export function renderAvatar(
  ctx: CanvasRenderingContext2D,
  parts: AvatarParts,
  scale: number,
  ox = 1,    // 좌우 패딩
  oy = 7,    // 상단 패딩 (모자 여유)
) {
  const colors: Record<string, string> = {
    H: parts.hair,
    S: parts.face,
    E: "#282830",
    Q: lighten(parts.face, 0.1),
    M: darken(parts.face, 0.08),
    B: parts.top,
    C: lighten(parts.top, 0.15),
    L: parts.bottom,
    F: parts.shoes,
  }

  // 스프라이트 기본 렌더링
  CHAR_SPRITE.forEach((srow, ry) => {
    for (let rx = 0; rx < srow.length; rx++) {
      const ch = srow[rx]
      if (ch === ".") continue
      ctx.fillStyle = colors[ch] || "#ff0000"
      p(ctx, scale, ox + rx, oy + ry)
    }
  })

  // 표정 오버레이 (아웃라인 이전)
  drawFaceOverlay(ctx, scale, ox, oy, parts.faceKey, parts.face)

  // 아웃라인 (머리 위)
  ctx.fillStyle = darken(parts.hair, 0.3)
  p(ctx, scale, ox + 2, oy - 1, 5, 1)
  p(ctx, scale, ox + 1, oy, 1, 4)
  p(ctx, scale, ox + 7, oy, 1, 4)

  // 모자 오버레이 (아웃라인 이후)
  drawHatOverlay(ctx, scale, ox, oy, parts.hairKey, parts.hair)

  // 상의/하의/신발 오버레이
  drawTopOverlay(ctx, scale, ox, oy, parts.topKey, parts.top)
  drawBottomOverlay(ctx, scale, ox, oy, parts.bottomKey, parts.bottom)
  drawShoesOverlay(ctx, scale, ox, oy, parts.shoesKey, parts.shoes)
}
