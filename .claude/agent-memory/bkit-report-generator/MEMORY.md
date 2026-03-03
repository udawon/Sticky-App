# Report Generator 에이전트 메모리

## 프로젝트 기본 정보
- 프로젝트: claude-sticky (Next.js + Electron + Supabase 팀 과제 관리 MVP)
- 보고서 저장 경로: `docs/04-report/features/{feature}.report.md`
- changelog 경로: `docs/04-report/CHANGELOG.md`

## 완료된 PDCA 보고서 목록
| PDCA # | 피처명 | Match Rate | 보고서 경로 |
|--------|--------|:----------:|------------|
| #5 | Notification (알람) | 95.8% | features/notification.report.md |
| #6 | Notion Export | - | features/notion-export.report.md |
| #8 | Roulette (룰렛) | 97%+ | features/roulette.report.md |

## 주요 패턴 및 컨벤션

### 보고서 섹션 구성 (한국어 기준)
1. 요약 (피처 개요 + 결과 요약 박스)
2. 관련 문서 (Plan/Design/Check/Act 링크)
3. 구현 결과 (신규 파일, 수정 파일, FR 완료 표, NFR 달성)
4. Gap 분석 결과 및 해결 (초기 Match Rate, 수정 항목 상세)
5. 기술적 성과 (주목할 만한 구현 포인트)
6. 발견된 버그 및 해결 (표 형식)
7. 회고 (Keep/Problem/Try)
8. 프로세스 개선 제안
9. 다음 단계 (즉시 실행 + 다음 PDCA)
10. Changelog (v{x}.{y}.{z} 항목)
11. Version History

### 결과 요약 박스 형식
```
┌──────────────────────────────────────────┐
│  초기 Match Rate: {N}%                   │
│  수정 후 추정 Match Rate: {N}%+          │
├──────────────────────────────────────────┤
│  ✅ 완료 (핵심 Gap 해결):  N건           │
│  ✅ 시각적 개선 (의도적):  N건           │
│  ✅ 추가 기능 (설계 초과): N건           │
│  ❌ 미이행:               0건            │
└──────────────────────────────────────────┘
```

## 기술적 메모 (반복 패턴)

### Tailwind v4 알려진 버그
- `left-1/2 -translate-x-1/2` 조합이 CSS를 생성하지 않는 경우 있음
- 우회: `style={{ left: "50%", transform: "translateX(-50%)" }}` 인라인 스타일 사용

### Electron CSS 호환성
- CSS `conic-gradient`가 Electron 내장 Chromium에서 미지원될 수 있음
- 대안: Canvas API (`ctx.arc`)로 대체 구현

### Supabase SECURITY DEFINER 트리거
- 시스템 알림/이벤트는 RLS 우회 필요 → SECURITY DEFINER 사용
- 방어 코드 항상 추가: NULL 체크, 팀 소속 확인 등
