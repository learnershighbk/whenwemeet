# Architecture — WhenWeMeet

브라우저 SPA + Supabase(DB·실시간). 직접 운영하는 서버 없음.

```
┌──────────── Browser (React SPA) ────────────┐        ┌──────── Supabase ────────┐
│ pages ─▶ components ─▶ lib/slots (순수 계산)  │        │ Postgres                 │
│   │                                          │  RPC   │  events                  │
│   └────▶ lib/api ───────────────────────────────────▶ │  participants (비공개)    │
│   ┌────  hooks/useEventRealtime ◀──────────────────── │  availability (공개)      │
│   ▼                                Realtime  │        │ Realtime: availability   │
└──────────────────────────────────────────────┘        └──────────────────────────┘
```

## 1. 라우트
| 경로 | 페이지 | 내용 |
|---|---|---|
| `/` | `CreatePage` | 3단계 상태: `form` → `edit` → `share` (한 페이지 안에서 전환) |
| `/e/:id` | `EventPage` | 로그인 폼 / 내 그리드 + 히트맵 + Best time |

## 2. 모듈 책임
| 모듈 | 책임 | 의존 |
|---|---|---|
| `pages/*` | 화면 상태 관리, 컴포넌트 조합 | components, lib, hooks |
| `components/Grid` | 날짜×시간 그리드 렌더링, 클릭·드래그. `mode`: `block` \| `select` \| `heatmap` | lib/slots |
| `components/*` (기타) | Calendar, TimezoneSelect, SignInForm, BestTime — 화면 조각 | — |
| `lib/dates` | 이벤트 입력용 날짜·시간 계산: 날짜 범위 펼치기, 31일 제한, 시간 선택지·라벨, 타임존 목록 | 없음 (순수 함수) |
| `lib/slots` | 칸 목록 생성, 칸별 인원 집계, Best time 계산, 시간 포맷 | lib/dates |
| `lib/api` | Supabase 호출 (이벤트 생성·조회, 로그인, 응답 저장), DB 행 → 앱 타입 변환 | lib/supabase |
| `lib/session` | 참가자 로그인 정보(participantId, token, name)를 localStorage에 이벤트별로 저장·읽기·삭제. 저장소 접근 실패는 무시 | 없음 |
| `hooks/useEventRealtime` | 이벤트의 응답 목록 최초 로드 + 실시간 구독 | lib/api |

## 3. 칸(slot) 모델
- 모든 시간은 **이벤트 타임존의 벽시계 시각**으로 다룬다. 타임존 변환이 없으므로 타임존 값은 표시용 라벨이다.
- 칸 키: `"YYYY-MM-DDTHH:mm"` (예: `2026-10-20T14:30`). 칸 시작 시각 기준.
- 칸 목록 = `dates × [startHour*60, endHour*60)`를 `slotMinutes` 간격으로 자른 것. 최대 31 × 96 = 2,976칸.
- `blockedSlots`, 각 참가자의 `slots`는 모두 칸 키 배열.

```ts
// lib/slots.ts 주요 함수
buildSlots(event): Slot[][]                         // [시간행][날짜열]
countBySlot(responses, blocked): Map<key, string[]> // 칸별 가능자 이름
bestSlot(event, responses): { key, available, unavailable } | null  // 최다 인원, 동점 시 가장 이른 칸
```

## 4. 데이터 스키마
```sql
events (
  id            text primary key,      -- 무작위 10자
  title         text not null,
  dates         date[] not null,
  start_hour    int  not null,         -- 0–23
  end_hour      int  not null,         -- 1–24
  timezone      text not null,         -- IANA, 표시용
  slot_minutes  int  not null,         -- 15 | 30
  blocked_slots text[] not null default '{}',
  created_at    timestamptz default now()
)

participants (                         -- 비공개: 클라이언트에서 직접 조회 불가
  id            uuid primary key,
  event_id      text references events,
  name_key      text not null,         -- lower(trim(name))
  password_hash text,                  -- 없으면 null
  token         text not null,         -- 응답 저장 권한 확인용 비밀값
  unique (event_id, name_key)
)

availability (                         -- 공개: 히트맵·실시간 구독 대상
  participant_id uuid primary key references participants,
  event_id      text references events,
  name          text not null,         -- 표시용 이름
  slots         text[] not null default '{}',
  updated_at    timestamptz default now()
)
```

## 5. 권한 (RLS + RPC)
| 테이블 | 클라이언트 직접 접근 | 쓰기 경로 |
|---|---|---|
| events | select | RPC `create_event(...)` → id 반환 |
| participants | 없음 | RPC `join_event(event_id, name, password)` |
| availability | select (실시간 구독 포함) | RPC `save_availability(participant_id, token, slots)` |

- `join_event`: 이름 없으면 participant + 빈 availability 생성. 있으면 비밀번호 확인(`pgcrypto` 해시). 성공 시 `{participant_id, token}` 반환, 실패 시 `wrong_password` 오류.
- `save_availability`: token이 맞을 때만 저장, blocked 칸은 서버에서 제거.
- Finalize 후 수정 불가 = events에 update/delete 경로를 만들지 않음.

## 6. 주요 데이터 흐름
| 흐름 | 순서 |
|---|---|
| 이벤트 생성 | form·edit 단계는 React 상태로만 유지 → Finalize 클릭 → `create_event` → share 단계에 `/e/{id}` 표시 |
| 로그인 | SignInForm → `join_event` → `{participant_id, token}`을 localStorage(`wwm:{eventId}`)에 저장 → 재방문 시 자동 로그인 |
| 응답 저장 | 칸 클릭 → 화면 즉시 반영 → 300ms 디바운스 → `save_availability` → `Saved` 표시. 실패 시 재시도 |
| 실시간 | EventPage 진입 → availability 전체 로드 → `event_id` 필터로 변경 구독 → 응답 목록 갱신 → `countBySlot` / `bestSlot` 재계산 → 그리드·Best time 재렌더 |
| 재연결 | 구독 끊김 → `Reconnecting…` → 재연결 시 전체 다시 로드 |

## 7. 테스트 전략
- `lib/dates`, `lib/slots`: Vitest 단위 테스트 (날짜 범위·제한, 칸 생성, 집계, Best time 동점, blocked 제외).

## 변경 이력
| 날짜 | 내용 |
|---|---|
| 2026-10-17 | v1.0 확정 |
| 2026-10-17 | `lib/dates` 모듈 추가 (Spec 01). 날짜 입력 계산을 `lib/slots`에서 분리 |
| 2026-10-17 | `lib/session` 모듈 추가 (Spec 03). 로그인 유지 저장소 접근을 한곳에 모음 |
- RPC: `supabase/migrations`의 SQL을 로컬/개발 프로젝트에 적용 후 수동 확인.
- 화면: spec의 AC별 수동 확인 절차를 `tasks.md`에 기록 (데스크톱 + 375px 모바일, 브라우저 2개로 실시간 확인).
