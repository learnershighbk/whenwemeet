# Tasks 05 — Finalize (spec 없음, 작업 목록만)

기능 Spec 01~04 완료 후 마무리 작업. 2026-10-17 승인.

- [x] F1. Vercel 배포 — 프로젝트 연결, 환경 변수(Production·Preview), 프로덕션 배포 → https://whenwemeet-beta.vercel.app
- [x] F2. `README.md` — 소개, 사용 흐름, 로컬 실행·배포 방법, 문서 안내
- [x] F3. 문서 정리 — `tech_stack.md` Draft 해제 + 배포 주소, `architecture.md` 변경 이력(`subscribeAvailability` 헬퍼, 배포), `CLAUDE.md` 명령어에 배포 추가
- [x] F4. 전체 코드 리뷰 1회 — 9건 발견, 2026-10-17 보고 후 승인받아 모두 수정: #1 읽기 RPC+비공개 채널(002), #2 live일 때만 내 응답 초기화, #3/#9 slot 키 서버 검증, #4 `Intl.supportedValuesOf` 폴백, #5 로그아웃 후 저장 결과 무시, #6 재조회 중 변경 재적용, #7 `md:` 2열, #8 클릭/포커스 분리
- [x] F7. `002_security.sql` DB 적용(사용자, 2026-10-17) → 스모크 테스트 통과(직접 읽기 차단, RPC, 키 검증, 비공개 broadcast 수신) → 재배포
- [ ] F5. (보류) GitHub ↔ Vercel 자동 배포 연결 — 사용자 결정 대기
- [x] F6. Spec 02 V4 모바일 확인 (사용자 확인, 2026-10-17)
