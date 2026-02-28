import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack 설정 (Next.js 16 기본 번들러)
  turbopack: {},
  // Electron 패키징을 위한 standalone 출력 모드
  output: "standalone",
};

export default nextConfig;
