# Tasks 02 — Finalize Event

Spec: `spec.md` (Approved)

## 구현
- [x] T1. `src/lib/slots.ts` — `buildSlots`, 시간 라벨(`10 AM`), 날짜 헤더, `slotRangeLabel` (R1)
- [x] T2. `tests/slots.test.ts` — AC1, 라벨 형식, `endHour = 24` 마지막 칸
- [x] T3. `src/lib/api.ts` — `createEvent(draft, slotMinutes, blocked)` → id, 오류 시 throw (R6)
- [x] T4. `src/components/Grid.tsx` — 공통 구조, sticky 시간 열, 그리드만 가로 스크롤, `block` 모드 클릭·드래그(Pointer Events)·키보드 (R2, R3)
- [x] T5. `src/components/ConfirmDialog.tsx` — 페이지 안 확인 창 (Esc·바깥 클릭 = Cancel, 포커스 이동)
- [x] T6. `src/pages/CreatePage.tsx` — edit 단계 (슬롯 토글 + 초기화 확인, Back, Finalize 비활성/확인/진행/오류) (R4–R6)
- [x] T7. `src/pages/CreatePage.tsx` — share 단계 (링크, Copy link + 대체 안내, Open event page) (R7)

## 확인
- [x] V1. `npm test` 통과
- [x] V2. `npm run build` 통과
- [x] V3. 수동 확인 (데스크톱): AC2–AC8 (사용자 확인, 2026-10-17)
- [x] V4. 모바일 확인: AC3 터치 드래그, AC9 가로 스크롤 (사용자 확인, 2026-10-17, 배포본)
