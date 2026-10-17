# Spec 02 — Finalize Event

상태: **Approved** (2026-10-17) · 근거: `docs/prd.md` §3-2, §4-1~2, 원본 PRD F-6~F-9

## 1. 범위
`/` 페이지의 2·3단계. Spec 01의 `EventDraft`를 받아 그리드를 보여주고(`edit`), 불필요한 칸을 막은 뒤 Finalize하면 이벤트를 저장하고 공유 링크를 보여준다(`share`).
- 포함: 공통 `Grid` 컴포넌트(이번엔 `block` 모드만), `lib/slots` 칸 생성, `lib/api.createEvent`, edit·share 화면
- 제외: `select`·`heatmap` 모드 (Spec 04)

## 2. 화면

```
edit                                         share
Fine-tune your times                         Your event is ready!
Weekly team sync · Times in Asia/Seoul       Send this link to your participants.
Slot size  [30 min | 15 min]                 ┌──────────────────────────────┐
Tap or drag to block times you don't need.   │ https://…/e/k7Fq2xP9a3       │
        Mon    Tue    Wed                    └──────────────────────────────┘
        Oct 20 Oct 21 Oct 22                 [ Copy link ]  [ Open event page ]
10 AM  [    ] [    ] [    ]
       [    ] [////] [    ]
11 AM  [    ] [////] [    ]
 …
[ Back ]               [ Finalize Event ]
```

## 3. 요구사항

### R1. 칸 모델 (`lib/slots`)
- 칸 키: `YYYY-MM-DDTHH:mm` (이벤트 타임존 기준 시각, `architecture.md` §3).
- `buildSlots({dates, startHour, endHour, slotMinutes})` → 행(시간) × 열(날짜) 2차원 배열.
  - 행 수 = `(endHour - startHour) × 60 / slotMinutes`. 예: 10–16시, 30분 → 12행.
  - `endHour = 24`의 마지막 칸은 `23:30`(30분) 또는 `23:45`(15분).
- 칸 라벨 함수: `slotRangeLabel(key, slotMinutes)` → `Mon, Oct 20 · 2:00–2:30 PM` (Spec 04에서도 사용).

### R2. Grid 구조 (`components/Grid`, 공통)
- 열 = 날짜. 헤더 2줄: 요일 약자(`Mon`) / 월·일(`Oct 20`).
- 행 = 시간, 위에서 아래로 시작→종료. 정시 행의 왼쪽에 시간 라벨(`10 AM`, `12 PM`). 정시 아닌 행은 라벨 없이 얇은 점선 구분선, 정시 경계는 실선.
- 칸 크기: 폭 최소 48px(데스크톱) / 40px(모바일), 높이 30분 단위 24px · 15분 단위 16px.
- 날짜가 많아 폭을 넘으면 **그리드 영역만** 가로 스크롤. 시간 라벨 열은 고정(sticky).
- 날짜가 적으면 열이 남는 폭을 나눠 쓴다 (최대 폭 약 120px).

### R3. Block 모드 상호작용
- 칸을 누르면 일반 ↔ 막힘(blocked) 토글.
- 누른 채 드래그하면 지나가는 칸을 **첫 칸의 바뀐 상태**로 칠한다. 마우스·터치 모두 지원 (Pointer Events).
- 터치에서 칸 위 드래그는 칠하기로 처리한다(페이지 스크롤 안 함). 그리드 가로 스크롤은 헤더 줄·시간 라벨 열을 밀어서 한다.
- 막힌 칸 표시: `#D9D9D9` + 사선 패턴. 일반 칸: 흰색 + 테두리.
- 키보드: 칸에 포커스 후 Space/Enter로 토글 (드래그는 없음).

### R4. 슬롯 단위
- 세그먼트 토글 `30 min`(기본) / `15 min`.
- 막힌 칸이 있을 때 단위를 바꾸면 페이지 안 확인 창: `Changing the slot size will clear blocked times.` [`Cancel`] [`Change`]. `Change`면 막힌 칸을 비우고 단위 변경.
- 막힌 칸이 없으면 바로 변경.

### R5. Back
- `Back` → form 단계로 (Spec 01 입력값 유지). 슬롯 단위와 막힌 칸은 버린다.

### R6. Finalize Event
- 모든 칸이 막혀 있으면 버튼 비활성 + `Leave at least one open time slot.` 표시.
- 클릭 → 페이지 안 확인 창: `Once finalized, the event can't be changed.` [`Cancel`] [`Finalize`].
- `Finalize` → `api.createEvent()` 호출 (RPC `create_event`). 진행 중 버튼에 `Creating…`, 중복 클릭 방지.
- 성공 → share 단계. 실패 → 확인 창 닫고 `Couldn't create the event. Please try again.` 표시, edit 상태 유지.

### R7. Share
- 제목 `Your event is ready!`, 안내 `Send this link to your participants.`
- 링크 `{origin}/e/{id}`를 읽기 전용 입력창에 표시 (탭하면 전체 선택).
- `Copy link` → 클립보드 복사, 버튼 문구 2초간 `Link copied!`. 클립보드 API 실패 시 입력창을 선택 상태로 두고 `Press Ctrl+C to copy.` 표시.
- `Open event page` → `/e/{id}`로 이동.
- share 단계는 새로고침하면 사라진다 (링크는 이미 저장됨). 새로고침 시 빈 form으로 시작.

## 4. 수용 기준 (AC)

| # | 기준 | 확인 방법 |
|---|---|---|
| AC1 | 10 AM–4 PM, 30분 → 12행, 15분 → 24행. To 12 AM이면 마지막 칸 11:30 PM | 단위 테스트 |
| AC2 | 헤더에 `Mon` / `Oct 20` 형식, 첫 행이 시작 시간, 마지막 행이 종료 직전 칸 | 수동 |
| AC3 | 칸 클릭 시 막힘 ↔ 일반 토글, 드래그로 여러 칸을 같은 상태로 칠함 (마우스·터치) | 수동 |
| AC4 | 막힌 칸이 있을 때 15 min으로 바꾸면 확인 창 → Change 시 막힌 칸이 비워지고 24행 | 수동 |
| AC5 | 모든 칸을 막으면 Finalize 비활성 + 안내 문구 | 수동 |
| AC6 | Finalize → 확인 → events 테이블에 1행 저장 (제목·날짜·시간·타임존·단위·막힌 칸 일치) | 수동 (Supabase 확인) |
| AC7 | share 화면에 `/e/{id}` 링크, Copy link 시 복사되고 `Link copied!` 표시 | 수동 |
| AC8 | Back → form 값 유지 | 수동 |
| AC9 | 날짜 14개를 375px 폭에서 보면 그리드만 가로 스크롤, 페이지 가로 스크롤 없음 | 수동 |

## 5. 구현 메모
- 파일: `lib/slots.ts`(R1), `lib/api.ts`(`createEvent`), `components/Grid.tsx`, `components/ConfirmDialog.tsx`(작은 페이지 안 확인 창), `pages/CreatePage.tsx`(edit·share 단계).
- `Grid` props 초안: `{ rows, mode, blocked: Set<string>, onBlockedChange }` — Spec 04에서 `select`/`heatmap`용 props 추가.
- 브라우저 기본 `confirm()`은 쓰지 않는다 (디자인 일관성, 모바일 표시 차이).
