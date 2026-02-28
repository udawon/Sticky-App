/**
 * 트레이 아이콘 생성 스크립트
 * public/icon.ico (16×16, 32×32, 256×256, 32bpp) 생성
 * electron-builder는 최소 256×256 요구
 * 색상: Sticky 브랜드 노란빛 초록 (#AEED28)
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 브랜드 색상: R=174, G=237, B=40 (#AEED28)
const COLOR = { r: 174, g: 237, b: 40, a: 255 };

function buildIcoEntry(width, height) {
  // BITMAPINFOHEADER (40 bytes)
  const bih = Buffer.alloc(40);
  bih.writeUInt32LE(40, 0);
  bih.writeInt32LE(width, 4);
  bih.writeInt32LE(height * 2, 8); // ICO는 높이 2배
  bih.writeUInt16LE(1, 12);
  bih.writeUInt16LE(32, 14);       // 32bpp BGRA

  // XOR 마스크: width×height×4 bytes (BGRA, bottom-to-top)
  const xorMask = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = (row * width + col) * 4;
      // 원형 클리핑 + 안티앨리어싱
      const cx = col - width / 2 + 0.5;
      const cy = row - height / 2 + 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const radius = width / 2 - 1.5;

      let alpha;
      if (dist < radius - 1) {
        alpha = COLOR.a;
      } else if (dist < radius + 1) {
        alpha = Math.round(COLOR.a * (radius + 1 - dist) / 2);
      } else {
        alpha = 0;
      }

      // 핀 아이콘 느낌: 중앙에 작은 원형 하이라이트
      const hx = col - width * 0.38;
      const hy = row - height * 0.35;
      const hDist = Math.sqrt(hx * hx + hy * hy);
      const hRadius = width * 0.18;
      let r = COLOR.r, g = COLOR.g, b = COLOR.b;
      if (hDist < hRadius && alpha > 0) {
        const blend = Math.max(0, 1 - hDist / hRadius) * 0.35;
        r = Math.min(255, Math.round(r + (255 - r) * blend));
        g = Math.min(255, Math.round(g + (255 - g) * blend));
        b = Math.min(255, Math.round(b + (255 - b) * blend));
      }

      xorMask[i + 0] = b;
      xorMask[i + 1] = g;
      xorMask[i + 2] = r;
      xorMask[i + 3] = alpha;
    }
  }

  // AND 마스크: 행당 4바이트 경계 패딩 (1bpp)
  const rowBytes = Math.ceil(width / 32) * 4;
  const andMask = Buffer.alloc(rowBytes * height, 0);

  return Buffer.concat([bih, xorMask, andMask]);
}

// 세 가지 크기: 16×16, 32×32, 256×256
const sizes = [16, 32, 256];
const images = sizes.map((s) => buildIcoEntry(s, s));

const count = sizes.length;
const dirOffset = 6;
const entrySize = 16;
const imagesOffset = dirOffset + entrySize * count;

// ICONDIR (6 bytes)
const iconDir = Buffer.alloc(6);
iconDir.writeUInt16LE(0, 0);
iconDir.writeUInt16LE(1, 2);
iconDir.writeUInt16LE(count, 4);

// ICONDIRENTRY × count
let currentOffset = imagesOffset;
const entries = images.map((img, i) => {
  const size = sizes[i];
  const entry = Buffer.alloc(16);
  // 256은 ICO 규격상 0으로 표기 (0 = 256)
  entry[0] = size === 256 ? 0 : size;
  entry[1] = size === 256 ? 0 : size;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(img.length, 8);
  entry.writeUInt32LE(currentOffset, 12);
  currentOffset += img.length;
  return entry;
});

const ico = Buffer.concat([iconDir, ...entries, ...images]);
const outPath = join(__dirname, "../public/icon.ico");
writeFileSync(outPath, ico);

console.log(`✅ 아이콘 생성 완료: public/icon.ico`);
sizes.forEach((s, i) => console.log(`   - ${s}×${s} (${images[i].length} bytes)`));
console.log(`   - 총 ${ico.length} bytes`);
