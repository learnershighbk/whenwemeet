# Spec 04 — Availability

상태: **Approved** (2026-10-17, Q1–Q7 제안값으로 확정) · 근거: `docs/prd.md` §3-4, §4 규칙 2·3·5·6, `docs/architecture.md` §3–§7, 원본 PRD F-11~F-17

## 1. 범위
`/e/:id` 페이지의 본체. 로그인한 참가자가 가능 시간을 표시하고, 모든 응답을 히트맵·칸 상세·Best time으로 실시간 조회한다.
- 포함: Grid `select`·`heatmap` 모드, 자동 저장, 히트맵과 범례, 칸 상세(툴팁/패널), Best time, 참가자 목록, 실시간 구독·재연결, `lib/slots` 집계 함수, `api.saveAvailability`, `hooks/useEventRealtime`
- 제외: 참가자 목록의 이름에 마우스를 올리면 그 사람의 칸을 강조하는 기능(원본 F-17, P2). 응답 삭제, 이벤트 수정.

## 2. 화면

```
Weekly team sync                                  (Spec 03 헤더)
Oct 20 – Oct 24 · 10:00 AM – 4:00 PM · Times are in Asia/Seoul (GMT+9)
┌ Reconnecting… ─────────────────────────────────┐   ← 연결 끊김일 때만
┌─ Best time ─────────────────────────────────────────────────────┐
│ Tue, Oct 20 · 2:00–2:30 PM                                      │
│ 5 of 7 people available                                         │
│ Available: Alice, Ben, Chris, Dana, Eli · Not available: Frank, Grace │
└─────────────────────────────────────────────────────────────────┘
┌─ My availability ─────────┐  ┌─ Group availability ── Responses (7) ─┐
│ Signed in as Alice        │  │        Tue    Wed    Thu              │
│ Not you? Sign out         │  │ 10 AM [░░░░] [▓▓▓▓] [    ]            │
│ Tap or drag to mark       │  │       [▒▒▒▒] [████] [////]            │
│ when you're free.         │  │ 11 AM [    ] [▓▓▓▓] [    ]            │
│        Tue    Wed    Thu  │  │  …                                    │
│ 10 AM [    ] [████] [   ] │  │ 0/7 ░▒▓█ 7/7 available                │
│       [████] [████] [///] │  │ ┌ Tue, Oct 20 · 10:30–11:00 AM ─────┐│
│  …                        │  │ │ Available (4): Alice, Ben, …       ││
│ Saved                     │  │ │ Not available (3): Dana, …         ││
└───────────────────────────┘  │ └────────────────────────────────────┘│
                               │ Alice · Ben · Chris · Dana · …        │
                               └───────────────────────────────────────┘
```
- 데스크톱(≥768px): Best time 전체 폭 → 아래 두 열(왼쪽 My, 오른쪽 Group). 로그인 전에는 왼쪽 열에 Spec 03 로그인 폼.
- 모바일: Best time → My → Group 순서로 세로 배치.

## 3. 요구사항

### R1. 집계 함수 (`lib/slots`)
```ts
type Response = { participantId: string; name: string; slots: SlotKey[] }

countBySlot(responses, blocked: Set<SlotKey>): Map<SlotKey, string[]>  // 칸별 가능자 이름(알파벳순). 막힌 칸은 제외
bestSlot(rows, responses, blocked): { key, available: string[], unavailable: string[] } | null
```
- `bestSlot`: 막히지 않은 칸 중 가능 인원 최다 칸 1개. 동점이면 시간순으로 가장 이른 칸(이른 날짜 → 이른 시간; 칸 키 `YYYY-MM-DDTHH:mm` 오름차순). `rows`는 시간 행 순서라 그대로 쓰면 날짜보다 시각이 우선되므로 쓰지 않는다. 모든 칸이 0명이면 `null`.
- 참가자의 `slots`에 막힌 칸이 섞여 있어도(서버가 걸러주지만) 집계에서 무시.
- 이름 정렬: `localeCompare`, 대소문자 무시.

### R2. 내 가능 시간 (Grid `select` 모드)
- 칸 클릭 → 가능 ↔ 불가 토글. 가능한 칸은 그린(`--color-pick`) 채움.
- 드래그 칠하기는 Spec 02 R3과 같은 방식(첫 칸의 바뀐 상태로 칠함, 마우스·터치, Pointer Events).
- 막힌 칸: 회색 사선, 클릭·드래그 모두 무시, `cursor: not-allowed`.
- 안내 문구: `Tap or drag to mark when you're free.`
- 키보드: Space/Enter로 토글.

### R3. 자동 저장
- 변경 즉시 화면 반영(낙관적). 마지막 변경 후 **300ms** 지나면 `api.saveAvailability(participantId, token, slots)` → RPC `save_availability`. 저장 중 새 변경이 오면 완료 후 최신 값으로 다시 저장.
- 상태 문구(My 그리드 아래, `aria-live`): 변경 직후 `Saving…` → 성공 `Saved` → 2초 후 사라짐. 저장 전에는 비움.
- 실패: `Couldn't save. Retrying…` 표시 후 2초 뒤 재시도, 최대 5회. 5회 실패 시 `Couldn't save. Check your connection and try again.` + `Retry` 버튼.
- 오류가 `not_allowed`면 재시도하지 않고 즉시 `lib/session` 저장값 삭제 → 로그인 폼으로 돌아가며 `Please sign in again.` 표시 (Spec 03 R5 이월).
- 내 응답은 실시간 구독으로도 들어오지만, 내 그리드는 **내 로컬 상태를 우선**한다(서버 값으로 되돌리지 않음). Group 그리드는 서버 값을 쓴다.

### R4. 히트맵 (Grid `heatmap` 모드)
- 칸 색 = 가능 인원 / 전체 참가자 수(`total`). 0명이면 흰색, 그 외 5단계:

| 비율 r = count/total | 색 |
|---|---|
| 0 | 흰색 |
| 0 < r ≤ 0.2 | `--color-heat-1` |
| 0.2 < r ≤ 0.4 | `--color-heat-2` |
| 0.4 < r ≤ 0.6 | `--color-heat-3` |
| 0.6 < r ≤ 0.8 | `--color-heat-4` |
| 0.8 < r ≤ 1 | `--color-heat-5` |

- `total` = 응답 행 수(`availability` 행 수, 칸을 하나도 안 고른 사람 포함).
- 막힌 칸: 회색 사선, 상세 없음, 커서 기본.
- 범례(그리드 아래): `0/{total} available` ─ 5단계 색 띠 ─ `{total}/{total} available`. `total`이 0이면 범례 숨김.
- 히트맵 칸은 클릭해도 값이 바뀌지 않는다(읽기 전용).

### R5. 칸 상세
- 데스크톱(`pointer: fine`): 칸에 마우스를 올리면 툴팁. 칸 위에 `slotRangeLabel`, `Available (n): …`, `Not available (n): …`. 화면 밖으로 나가면 위치 보정.
- 터치(`pointer: coarse`) 또는 키보드 포커스: 칸을 탭/포커스하면 Group 그리드 아래 **상세 패널**에 같은 내용 표시. 선택한 칸은 테두리 강조. 패널은 다른 칸을 탭하면 갱신, 그리드 밖을 탭해도 유지.
- 아무도 없을 때(`total = 0`): 상세 없음.
- 이름이 많으면 줄바꿈으로 모두 표시(생략 없음, 최대 100명).

### R6. Best time
- `bestSlot` 결과를 카드로 표시. 제목 `Best time`.
  ```
  Tue, Oct 20 · 2:00–2:30 PM
  5 of 7 people available
  Available: Alice, Ben, Chris, Dana, Eli
  Not available: Frank, Grace
  ```
- `null`이면 `Best time` 제목 아래 `No one has picked a time yet.`
- Best time 칸은 Group 그리드에서 **테두리 강조**(그린 2px)로도 표시.
- 로그인 전에도 보인다.

### R7. 참가자 목록
- Group 영역 제목 옆에 `Responses ({total})`. 아래에 이름을 알파벳순으로 ` · `로 이어 표시. 본인은 **굵게**.

### R8. 실시간 (`hooks/useEventRealtime`)
- 진입 시 RPC `list_availability(event_id)`로 전체 조회 → 이후 비공개 Realtime 채널 `event:{id}`의 broadcast(INSERT/UPDATE/DELETE, DB 트리거가 발행)로 반영. *(2026-10-17 변경: 보안 리뷰로 `postgres_changes` → broadcast)*
- 변경마다 `countBySlot`·`bestSlot` 재계산 → Group 그리드, 상세, Best time, `Responses (n)` 갱신. 목표 지연 2초 이내.
- 채널 상태가 `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED`가 되면 상단에 `Reconnecting…` 띠 표시. 다시 `SUBSCRIBED`가 되면 전체를 다시 조회하고 띠 제거.
- 로그인 여부와 무관하게 동작(로그인 전 Group 그리드·Best time 조회).
- 페이지를 떠나면 구독 해제.

## 4. 수용 기준 (AC)

| # | 기준 | 확인 방법 |
|---|---|---|
| AC1 | `bestSlot`: 최다 인원 칸 1개, 동점이면 가장 이른 날짜·시간, 막힌 칸 제외, 전부 0명이면 null | 단위 테스트 |
| AC2 | `countBySlot`: 칸별 이름이 알파벳순, 막힌 칸은 빈 결과 | 단위 테스트 |
| AC3 | 내 그리드에서 칸 클릭·드래그 → 그린으로 바뀌고 `Saving…` → `Saved`, availability.slots에 반영 | 수동 (Supabase 확인) |
| AC4 | 막힌 칸은 내 그리드에서 클릭되지 않음 | 수동 |
| AC5 | 브라우저 2개에서 다른 이름으로 로그인 후 한쪽이 칸을 고르면 다른 쪽 히트맵·Best time·`Responses (n)`이 2초 이내 갱신 | 수동 |
| AC6 | 히트맵 색이 인원 비율에 따라 5단계로 달라지고 범례와 일치 | 수동 |
| AC7 | Group 칸에 마우스를 올리면(모바일은 탭) 가능자·불참자 이름이 보임 | 수동 |
| AC8 | Best time 카드에 칸·인원·이름이 맞게 표시되고, 응답이 없으면 `No one has picked a time yet.` | 수동 |
| AC9 | localStorage의 token을 바꾼 뒤 칸을 고르면 로그인 폼으로 돌아가고 `Please sign in again.` 표시 | 수동 |
| AC10 | 네트워크를 끊으면 `Reconnecting…`, 다시 연결하면 띠가 사라지고 최신 상태 표시 | 수동 (DevTools Offline) |
| AC11 | 로그인 전에도 Group 그리드·Best time이 보임 | 수동 |
| AC12 | 375px 폭에서 Best time → My → Group 순서, 페이지 가로 스크롤 없음 | 수동 |

## 5. 구현 메모

### 파일
- `lib/slots.ts`: `Response`, `countBySlot`, `bestSlot`, `heatLevel(count, total): 0–5`
- `tests/slots.test.ts`: AC1, AC2, `heatLevel` 경계값
- `lib/api.ts`: `listAvailability(eventId): Response[]`, `saveAvailability(participantId, token, slots)` (오류 코드 `not_allowed` 구분)
- `hooks/useEventRealtime.ts`: `{ responses, status: 'loading' | 'live' | 'reconnecting' }`
- `components/Grid.tsx`: `select`·`heatmap` 모드 추가
- `components/BestTime.tsx`, `components/SlotDetail.tsx`(툴팁·패널 공용 내용), `components/HeatLegend.tsx`
- `pages/EventPage.tsx`: 레이아웃 조립, 자동 저장 상태 머신

### Grid props 확장안
현재 `Grid`는 `paint` ref로 드래그 상태(첫 칸의 바뀐 상태 `on` + 작업 중 Set)를 들고 `onBlockedChange`를 호출한다. 이 칠하기 로직을 모드와 무관하게 재사용한다.

```ts
type Common = { dates: DateKey[]; rows: SlotRow[]; slotMinutes: SlotMinutes; blocked: Set<SlotKey> }

type Props =
  | (Common & { mode: 'block';  onBlockedChange: (next: Set<SlotKey>) => void })
  | (Common & { mode: 'select'; selected: Set<SlotKey>; onSelectedChange: (next: Set<SlotKey>) => void })
  | (Common & {
      mode: 'heatmap'
      counts: Map<SlotKey, string[]>   // countBySlot 결과
      total: number
      highlight?: SlotKey              // Best time 칸 (그린 테두리)
      activeCell?: SlotKey | null      // 탭/포커스로 고른 칸 (상세 패널용)
      onCellHover?: (key: SlotKey | null, rect: DOMRect | null) => void
      onCellTap?: (key: SlotKey) => void
    })
```
- 칠하기 대상 Set과 콜백을 모드별로 고른다: `block` → `blocked/onBlockedChange`, `select` → `selected/onSelectedChange`. `select`에서는 `blocked`에 든 칸을 `apply()`와 `onPointerDown`에서 건너뛴다.
- `heatmap`은 `paint`를 쓰지 않는다. 칸은 `<button>`을 유지(키보드 포커스 → 상세 패널)하되 `aria-pressed` 대신 `aria-describedby`로 상세 연결. 셀 배경은 `heatLevel`에 따라 `bg-heat-{n}` 클래스.
- 셀 `aria-label`: `select`는 `…, available` / `…, not available`, `heatmap`은 `…, 4 of 7 available`.

### 자동 저장 상태 머신 (`EventPage`)
`idle → dirty(300ms 타이머) → saving → saved(2s) → idle`, 실패 시 `retrying(2s, n<5) → saving`, `n=5`면 `failed`(Retry 버튼). `saving` 중 변경이 오면 `dirty` 플래그를 세우고 완료 후 바로 다음 저장.

### 기타
- 툴팁은 `position: fixed` + 셀 `getBoundingClientRect()`로 배치, `pointer: fine`에서만 렌더. 터치 기기는 `matchMedia('(pointer: coarse)')`.
- 실시간 구독에는 `supabase.channel(`event:${id}`)`. 구독 전 초기 조회와 구독 사이 누락을 막기 위해 `SUBSCRIBED` 콜백에서 한 번 더 조회.
- 내 응답 저장 요청 중 들어오는 내 행의 Realtime UPDATE는 Group 집계에만 반영하고 내 `selected`는 덮어쓰지 않는다 (R3).

## 6. 확인 필요

| # | 항목 | 제안 |
|---|---|---|
| Q1 | 히트맵에서 **내 칸** 구분 표시 | 하지 않음. 내 그리드가 바로 옆에 있어 중복. (대안: 내가 고른 칸에 작은 점 표시) |
| Q2 | 칸을 하나도 안 고른 참가자가 `total`에 포함되는지 | 포함 (로그인만 해도 `Responses`에 집계, 모든 칸에서 Not available). 원본 F-12와 일치 |
| Q3 | 히트맵 단계 기준 | 비율 5등분 (R4 표). 대안: 인원 수 절대값 기준 — 참가자가 적을 때 색 차이가 더 뚜렷함 |
| Q4 | 터치 기기에서 툴팁 | 툴팁 대신 그리드 아래 상세 패널(R5). 터치는 hover가 없고 손가락이 툴팁을 가림 |
| Q5 | Best time 동점 처리 | PRD 규칙대로 가장 이른 칸 1개만 표시. 동점 칸 수를 `(3 other times tie)`처럼 덧붙일지는 미정 → 제안: 덧붙이지 않음 |
| Q6 | 저장 재시도 횟수·간격 | 2초 간격 5회 후 수동 Retry. PRD는 "자동 재시도"만 명시 |
| Q7 | Best time 칸을 Group 그리드에 테두리로 강조(R6) | PRD에 없는 추가 표시. 카드와 그리드를 연결해 주므로 넣는 것을 제안 |
