import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack 설정 (Next.js 16 기본 번들러)
  turbopack: {},
  // Electron 빌드 시에만 standalone 출력 (Vercel은 기본값 사용)
  output: process.env.BUILD_FOR_ELECTRON === "1" ? "standalone" : undefined,
  // 개발 모드 Next.js 오버레이 아이콘 숨김
  devIndicators: false,
};

export default nextConfig;
