# 📌 Claude Sticky

**Virtual Office with Team** — 팀이 함께 일하는 가상 사무실 협업 도구

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://claude-sticky.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?logo=supabase)](https://supabase.com)

---

## 🌐 데모

> **바로 체험하기** → [https://claude-sticky.vercel.app](https://claude-sticky.vercel.app)

1. 링크 접속 후 **"앱 실행하기"** 클릭
2. **"🎮 데모로 체험하기"** 선택
3. **팀원** 또는 **팀 리더** 역할 선택 후 바로 체험

> 회원가입 없이 즉시 체험 가능합니다.

---

## 💡 소개

Claude Sticky는 Gather.town 스타일의 **픽셀 아트 가상 사무실**에서 팀원들이 함께 존재하며 과제를 관리하고, 완료 시 포인트로 보상받는 **팀 협업 + 게이미피케이션** 도구입니다.

| 기능 | 설명 |
|------|------|
| 🏢 가상 사무실 | 팀원과 함께 캐릭터로 같은 공간에 존재 |
| 📋 과제 관리 | 생성·배분·상태 관리·댓글 |
| 🎮 게이미피케이션 | 포인트·레벨·룰렛·아바타 커스터마이징 |
| 🏆 리더보드 | 팀 내 포인트 순위 |
| 🔔 실시간 알림 | 과제 배정·댓글 알림 |
| 🛒 상점 | 포인트로 아바타 파츠 구매 |

---

## 🎮 주요 기능

### 가상 사무실
- WASD 키보드로 캐릭터 이동
- Space / Enter 로 오브젝트 상호작용
- 실시간 팀원 위치 동기화

### 과제 관리
- 상태: `todo → in_progress → review → done`
- 우선순위, 담당자, 마감일, 포인트 설정
- 검색, 필터, 정렬 지원

### 게이미피케이션
- 레벨: 새싹 → 묘목 → 나무 → 숲 → 산 → 전설
- 룰렛으로 추가 포인트 획득
- 아바타 파츠(헤어/얼굴/상의/하의/신발) 커스터마이징

---

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16 (App Router) + React 19 + TypeScript |
| 스타일 | Tailwind CSS v4 + shadcn/ui |
| 상태관리 | Zustand |
| 백엔드/DB | Supabase (PostgreSQL + Auth + Realtime) |
| 가상 사무실 | Canvas API (2D 픽셀 아트) |
| 배포 | Vercel |

---

## 🚀 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일에 Supabase 정보 입력:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. DB 스키마 적용

Supabase SQL Editor에서 순서대로 실행:

```
supabase/schema.sql
supabase/functions.sql
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속

---

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/          # 로그인, 회원가입
│   └── (main)/          # 메인 레이아웃 (가상 사무실 + 패널)
├── components/
│   ├── layout/          # 타이틀바, 쉘
│   ├── office/          # 가상 사무실 Canvas
│   ├── panels/          # 과제/상점/마이페이지 등 패널
│   └── providers/       # Auth, Notification Provider
├── stores/              # Zustand 스토어
└── lib/
    ├── supabase/         # Supabase 클라이언트
    └── notion/           # Notion API 연동
```

---

## 📄 문서

| 문서 | 경로 |
|------|------|
| 제품 요구사항 정의서 (PRD) | [`docs/PRD.md`](docs/PRD.md) |
| PDCA 완료 보고서 | [`docs/04-report/features/`](docs/04-report/features/) |

---

## 👥 역할

| 역할 | 권한 |
|------|------|
| **Admin (팀 리더)** | 팀 관리, 과제 CRUD, 포인트 부여 |
| **Member (팀원)** | 과제 수행, 포인트 획득, 아바타 커스터마이징 |
