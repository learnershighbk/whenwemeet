# Tasks 01 — Create Event

Spec: `spec.md` (Approved)

## 구현
- [x] T1. `src/lib/dates.ts` — 날짜 키, 범위 펼치기, 31일 제한 토글/범위, 시간 선택지·라벨, To 자동 조정, 타임존 목록·라벨·검색 (R2–R5)
- [x] T2. `tests/dates.test.ts` — AC3, AC6, AC7 및 타임존 라벨/검색 단위 테스트
- [x] T3. `src/components/Calendar.tsx` — 월 이동, 지난 날짜 비활성, 두 모드, 선택 개수, 31일 안내 (R2, R3)
- [x] T4. `src/components/TimezoneSelect.tsx` — 대륙별 그룹, 검색, 키보드 선택 (R5)
- [x] T5. `src/pages/CreatePage.tsx` — form 단계 폼, 검증, `EventDraft` 생성, `form ↔ edit` 단계 상태 유지. edit 단계는 Spec 02 전까지 임시 화면 + Back (R1, R4, R6)
- [x] T6. 375px / 데스크톱 레이아웃 정리 (AC11)

## 확인
- [x] V1. `npm test` 통과
- [x] V2. `npm run build` 통과
- [x] V3. 수동 확인: AC1, AC2, AC4, AC5, AC8, AC9, AC10, AC11 (사용자 확인, 2026-10-17)
