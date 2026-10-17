# Tech Stack — WhenWeMeet

> 원칙: 현재 기능(prd.md)을 만족하는 **가장 단순한** 구성. 직접 운영하는 백엔드 서버 없음.

| 영역 | 선택 | 이유 |
|---|---|---|
| Frontend | React + TypeScript + Vite (SPA) | 설정이 가장 적고 바이브코딩 자료가 많음 |
| Styling | Tailwind CSS | 모노톤·반응형을 클래스만으로 빠르게 구성 |
| DB + 실시간 | Supabase (Postgres + Realtime) | DB·실시간 구독·API를 한 서비스로 해결, 무료 플랜 |
| 비밀번호 확인 | Supabase Postgres 함수(RPC) + `pgcrypto` | 해시 비교를 DB 안에서 처리, 해시가 클라이언트에 노출되지 않음 |
| 날짜/타임존 | `date-fns`, `Intl` API | 타임존 변환이 없어 날짜 계산만 필요. 타임존 목록·GMT 오프셋은 `Intl`로 얻음 |
| 라우팅 | `react-router` | `/`, `/e/:id` 두 경로만 필요 |
| 배포 | Vercel (정적 SPA) | https://whenwemeet-beta.vercel.app · 환경 변수 `VITE_SUPABASE_*` 2개 |
| 테스트 | Vitest | Vite와 설정 공유, `lib/dates`·`lib/slots` 단위 테스트 |

설치 버전 (2026-10-17): React 19, Vite 8, TypeScript 7, Tailwind 4, Vitest 5, react-router 7, supabase-js 2, date-fns 4.

데이터 스키마·권한·데이터 흐름은 `architecture.md` 참고.
