# Tasks 03 — Join Event

Spec: `spec.md` (Approved)

## 구현
- [x] T1. `src/lib/dates.ts` — `summarizeDates(dates)`: 연속 `Oct 20 – Oct 24` / 비연속 `5 days` / 1일 `Tue, Oct 20` (R2) + `tests/dates.test.ts` 추가
- [x] T2. `src/lib/api.ts` — `Event` 타입, `getEvent(id)` (없으면 null), `joinEvent(eventId, name, password)` → `{participantId, token}`, RPC 오류 메시지 → 코드 변환 `JoinError` (R1, R3)
- [x] T3. `src/lib/session.ts` — `loadSession(eventId)` / `saveSession` / `clearSession`, try/catch (R5)
- [x] T4. `src/components/SignInForm.tsx` — 폼, 검증, 진행 상태, 오류 문구 4종, wrong_password 시 비밀번호 칸 비우고 포커스 (R3)
- [x] T5. `src/pages/EventPage.tsx` — 로딩/없음/오류 화면, 헤더, 2열 레이아웃(모바일 1열), 로그인 전·후 전환, Sign out (R1, R2, R5). 그룹 영역은 자리만 둠

## 확인
- [x] V1. `npm test` 통과
- [x] V2. `npm run build` 통과
- [x] V3. 수동 확인: AC1–AC7 (사용자 확인, 2026-10-17; DB 규칙은 RPC 스모크 테스트로도 검증)
