# Spec 03 — Join Event

상태: **Approved** (2026-10-17) · 근거: `docs/prd.md` §3-3, §4-4, 원본 PRD F-10

## 1. 범위
`/e/:id` 페이지의 뼈대와 간편 로그인.
- 포함: 이벤트 불러오기, 없는 이벤트 화면, 페이지 헤더, 로그인 폼, 로그인 유지/로그아웃, `api.getEvent` / `api.joinEvent`
- 제외: 내 그리드·히트맵·Best time·실시간 (Spec 04). 이번 Spec에서는 그 자리를 비워 둔다.

## 2. 화면

```
Weekly team sync
Oct 20 – Oct 24 · 10:00 AM – 4:00 PM
Times are in Asia/Seoul (GMT+9)

┌─ 로그인 전 ──────────────────────┐   ┌─ 로그인 후 ─────────────────────┐
│ Who are you?                     │   │ Signed in as Alice              │
│ Your name  [               ]     │   │ Not you? Sign out               │
│ Password (optional) [      ]     │   │                                 │
│ No sign-up needed. Add a         │   │ (My availability — Spec 04)     │
│ password only if you want to     │   └─────────────────────────────────┘
│ keep others from editing.        │
│ [ Continue ]                     │
└──────────────────────────────────┘
(Group availability / Best time — Spec 04)
```
- 데스크톱: 왼쪽 열 = 로그인/내 영역, 오른쪽 열 = 그룹 영역 (Spec 04에서 채움).
- 모바일: 위아래 배치.

## 3. 요구사항

### R1. 이벤트 불러오기
- 진입 시 `api.getEvent(id)`로 이벤트 조회. 조회 중에는 `Loading…`.
- 없으면 `This event doesn't exist. Check the link and try again.` + `Plan a new meeting` 링크(`/`).
- 네트워크 오류면 `Couldn't load the event.` + `Try again` 버튼.

### R2. 헤더
- 회의명 (h1).
- 날짜 요약: 연속된 날짜면 `Oct 20 – Oct 24`, 아니면 날짜 수 `5 days`, 1일이면 `Tue, Oct 20`. 뒤에 시간대 `· 10:00 AM – 4:00 PM`.
- 타임존 안내: `Times are in Asia/Seoul (GMT+9)` (`timezoneLabel` 형식 사용).

### R3. 로그인 폼
- 제목 `Who are you?`, 입력 `Your name`(필수, 최대 30자), `Password (optional)`(type=password).
- 안내: `No sign-up needed. Add a password only if you want to keep others from editing your times.`
- `Continue`: 이름(trim)이 비어 있으면 비활성. 처리 중 `Joining…`, 중복 클릭 방지. Enter로 제출.
- `api.joinEvent(eventId, name, password)` → RPC `join_event`.
- 오류 문구:

| RPC 오류 | 문구 |
|---|---|
| `wrong_password` | `Wrong password for this name.` |
| `invalid_name` | `Please enter a name (up to 30 characters).` |
| `event_full` | `This event already has 100 people.` |
| 그 외 | `Something went wrong. Please try again.` |

- 오류가 나도 입력값은 유지. `wrong_password`면 비밀번호 칸만 비우고 포커스.

### R4. 같은 이름 규칙 (DB에서 처리, 화면은 결과만 반영)
- 이름 비교는 앞뒤 공백 제거 + 대소문자 무시.
- 비밀번호 없는 기존 이름 → 같은 사람으로 로그인 (입력한 비밀번호는 무시).
- 비밀번호 있는 기존 이름 → 맞는 비밀번호가 있어야 로그인.
- 표시 이름은 **처음 등록한 철자**를 유지한다 (`Alice`로 등록 후 `alice`로 들어와도 `Alice`).
- 비밀번호는 처음 등록할 때만 정할 수 있다 (나중에 추가·변경 불가).

### R5. 로그인 유지 / 로그아웃
- 성공 시 `localStorage['wwm:{eventId}'] = { participantId, token, name }` 저장. 저장소 접근 실패 시 이번 방문 동안만 로그인 유지.
- 같은 브라우저로 다시 오면 저장된 값으로 바로 로그인 상태 표시.
- 로그인 상태 영역: `Signed in as {name}` + `Not you? Sign out` 링크. Sign out → 저장값 삭제, 로그인 폼으로.
- 저장된 token이 서버에서 거부되면(Spec 04 저장 시점) 자동 로그아웃하고 `Please sign in again.` 표시 — 처리는 Spec 04.

## 4. 수용 기준 (AC)

| # | 기준 | 확인 방법 |
|---|---|---|
| AC1 | 없는 id로 접속하면 안내 문구와 `/` 링크가 보임 | 수동 |
| AC2 | 헤더에 회의명, 날짜 요약, 시간대, 타임존 안내가 보임 (연속·비연속·1일 모두) | 단위 테스트(날짜 요약) + 수동 |
| AC3 | 새 이름으로 Continue → `Signed in as {name}` 표시, availability 테이블에 행 생성 | 수동 (Supabase 확인) |
| AC4 | 새로고침해도 로그인 상태 유지, Sign out 후 로그인 폼 표시 | 수동 |
| AC5 | 비밀번호 없이 만든 이름을 대소문자만 바꿔 다시 입력 → 같은 사람으로 로그인, 표시 이름은 원래 철자 | 수동 |
| AC6 | 비밀번호를 설정한 이름에 틀린 비밀번호 → `Wrong password for this name.`, 맞는 비밀번호 → 로그인 | 수동 |
| AC7 | 이름이 비어 있으면 Continue 비활성 | 수동 |

## 5. 구현 메모
- 파일: `lib/api.ts`(`getEvent`, `joinEvent`, 오류 코드 변환), `lib/session.ts`(localStorage 읽기·쓰기, try/catch), `components/SignInForm.tsx`, `pages/EventPage.tsx`.
- 날짜 요약 함수 `summarizeDates(dates)`는 `lib/dates.ts`에 추가하고 테스트.
- `lib/session.ts`는 architecture.md 모듈 표에 추가됨 (2026-10-17).
- `Event` 타입(DB 행 → camelCase)은 `lib/api.ts`에 정의.
