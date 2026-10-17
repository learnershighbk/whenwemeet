# Tasks 04 — Availability

Spec: `spec.md` (Approved, Q1–Q7 제안값)

## 구현 — 데이터 계층 (병렬 에이전트)
- [x] T1. `src/lib/slots.ts` — `Response`, `countBySlot`, `bestSlot`, `heatLevel` (R1, R4)
- [x] T2. `tests/slots.test.ts` — AC1, AC2, `heatLevel` 경계값
- [x] T3. `src/lib/api.ts` — `listAvailability(eventId)`, `saveAvailability(participantId, token, slots)` + `SaveError('not_allowed' | 'unknown')` (R3, R8)
- [x] T4. `src/hooks/useEventRealtime.ts` — 초기 조회 + Realtime 구독(`event_id` 필터), `SUBSCRIBED` 시 재조회, 상태 `loading | live | reconnecting`, 언마운트 시 해제 (R8)

## 구현 — UI (메인 세션)
- [x] T5. `src/components/Grid.tsx` — `select`·`heatmap` 모드 (discriminated union props), select는 막힌 칸 건너뜀, heatmap은 `bg-heat-{n}` + highlight/activeCell/hover/tap (R2, R4, R5)
- [x] T6. `src/components/HeatLegend.tsx`, `src/components/SlotDetail.tsx`(툴팁·패널 공용), `src/components/BestTime.tsx` (R4–R6)
- [x] T7. `src/pages/EventPage.tsx` — 레이아웃(Best time → My | Group), 자동 저장 상태 머신(300ms 디바운스, 2s×5 재시도, `not_allowed` → 로그아웃 + `Please sign in again.`), `Reconnecting…` 띠, `Responses (n)` 목록 (R3, R6–R8)

## 확인
- [x] V1. `npm test` 통과
- [x] V2. `npm run build` 통과
- [x] V3. 수동 확인: AC3–AC12 (사용자 확인, 2026-10-17)
