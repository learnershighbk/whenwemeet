# Design — WhenWeMeet

v1.0 · 2026-10-17 · 구현: `src/index.css`(토큰·공통 클래스), `src/components/PageHeader.tsx`

## 1. 방향
B2B 이벤트 관리 도구(Cvent류)의 **구조와 밀도**를 참고한 "엔터프라이즈 네이비". 진한 네이비 헤더가 톤을 잡고, 기업용 블루가 행동(버튼·링크·선택)을 표시하고, 그린은 **"가능한 시간"이라는 의미에만** 쓴다. 타사의 로고·이름·고유 아이콘·정확한 브랜드 색은 쓰지 않는다.

원칙 (prd.md §6와 일치)
- 단순·직관·가독성. 한 화면에 한 가지 일.
- 색은 의미가 있을 때만: 블루 = 행동·선택, 그린 = 가능, 회색 = 비활성·막힘. 그 외는 무채색.
- 그라데이션·이모지·장식용 아이콘 없음. 둥글기는 6px로 통일(인터랙티브 작은 요소만 4px).
- 모바일 우선 반응형. 페이지 가로 스크롤은 그리드 안에서만.

## 2. 색상 토큰 (`@theme`)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-nav` | `#14213D` | 상단 헤더 바 배경 |
| `--color-nav-fg` | `#FFFFFF` | 헤더 텍스트 |
| `--color-nav-muted` | `#A9B4C7` | 헤더 보조 메뉴 |
| `--color-page` | `#F2F4F7` | 페이지 배경 |
| `--color-band` | `#FFFFFF` | 페이지 헤더 밴드 배경 (아래 `line` 경계) |
| `--color-card` | `#FFFFFF` | 카드·입력·그리드 칸 |
| `--color-ink` | `#14181F` | 본문 텍스트 |
| `--color-muted` | `#4B5563` | 보조 텍스트 |
| `--color-faint` | `#7B8593` | 라벨·플레이스홀더·비활성 |
| `--color-line` | `#D3D9E0` | 테두리 |
| `--color-line-soft` | `#E4E8ED` | 구분선·호버 채움 |
| `--color-brand` | `#1F5AA6` | 주 행동색: 버튼, 링크, 캘린더 선택일, 토글, 포커스 링 |
| `--color-brand-strong` | `#174A8A` | 버튼 호버 |
| `--color-brand-soft` | `#E8F0FA` | 선택 배경 틴트, 요약 지표 배경 |
| `--color-blocked` | `#D5DBE2` | 막힌 칸 (+ 사선 패턴) |
| `--color-pick` | `#166B40` | **가능한 시간**: 내 선택 칸, Best time 칸 테두리, 인원 배지 글자 |
| `--color-pick-soft` | `#DCEDE3` | 인원 배지 배경 |
| `--color-heat-1..5` | `#D9EBE1 → #166B40` | 히트맵 5단계 (0명은 `card`) |

규칙: 블루와 그린이 한 화면에 함께 있어도, **그린은 "가능"을 뜻하는 자리에만** 나타난다. 그린 버튼·그린 링크는 없다.

## 3. 타이포그래피
- 폰트: 시스템 스택 (`ui-sans-serif, system-ui, Segoe UI, Roboto, …`). 외부 폰트 로딩 없음.
- 위계
  - 페이지 제목: `text-2xl sm:text-3xl font-semibold tracking-tight`
  - 카드 제목: `text-base font-semibold`
  - **아이브로(섹션 라벨)**: `text-xs font-semibold uppercase tracking-wider text-faint` — 예: `DATES`, `TIMES`, `BEST TIME`
  - 본문: `text-base`, 보조: `text-sm text-muted`, 메타: `text-xs text-faint`
- 숫자 지표(요약 스트립): `text-lg font-semibold tabular-nums`

## 4. 레이아웃
```
┌ 헤더 바 (nav, 56px) ─────────────────────────────┐  ▪ WhenWeMeet          About · New event
├ 페이지 헤더 밴드 (band) ─────────────────────────┤  제목 / 메타 / [요약 스트립]
│ 콘텐츠 (page 배경, max-w 6xl, 좌우 16px)         │  카드…
└ 푸터 (한 줄, faint) ──────────────────────────────┘
```
- **헤더 바**: 네이비. 왼쪽 워드마크(작은 블루 사각 + `WhenWeMeet`), 오른쪽 메뉴.
- **페이지 헤더 밴드**: 모든 페이지 공통(`PageHeader`). 제목 + 한 줄 메타. 이벤트 페이지는 그 아래 **요약 스트립**(지표 칩 3개).
- **콘텐츠 폭**: 생성 `max-w-5xl`(2열), 이벤트 `max-w-6xl`, About `max-w-3xl`.
- **생성 화면 2열(≥1024px)**: 왼쪽 입력 폼, 오른쪽 `Event summary` 패널(sticky) — 회의명·선택 일수·시간대·타임존을 실시간 요약. 모바일은 요약을 폼 위에 접은 한 줄로.
- **이벤트 화면**: 밴드(제목·날짜·시간·타임존) → 요약 스트립(`Responses`, `Best time`, `Available`) → Best time 카드 → 2열(≥768px) My | Group.
- 간격: 카드 사이 24px, 카드 안 16/24px, 섹션 아이브로 아래 12px.

## 5. 컴포넌트
| 클래스 / 컴포넌트 | 규격 |
|---|---|
| `.card` | `rounded-md border border-line bg-card shadow-card` |
| `.card-head` | 카드 상단 줄: `flex items-center justify-between border-b border-line-soft px-4 py-3 sm:px-6` — 제목 + 보조 액션 |
| `.eyebrow` | 섹션 라벨 (3장) |
| `.btn-primary` | `rounded-md bg-brand text-white hover:bg-brand-strong`, 높이 44–48px, 비활성 `bg-line text-faint` |
| `.btn-secondary` | `rounded-md border border-line bg-card hover:bg-line-soft` |
| `.btn-link` | 블루 텍스트 링크, 밑줄 없음, 호버 밑줄 |
| `.field` | `rounded-md border border-line bg-card`, 포커스 `border-brand ring-2 ring-brand/15` |
| `.stat` | 요약 지표 칩: `rounded-md bg-brand-soft px-3 py-2` — 위 라벨(아이브로), 아래 값 |
| `PageHeader` | `title`, `meta?`, `children?`(스트립) |
| Grid 칸 | 흰 배경 + `line` 테두리, 정시 실선·그 외 점선. 막힘 = `blocked` + 사선. 내 선택 = `pick`. 히트맵 = `heat-n`. Best time = `pick` 2px 테두리. 포커스/탭 = `brand` 2px 테두리 |
| Grid 폭 | 시간 라벨 열 44px + 날짜 열. 날짜 열은 **가용 폭을 균등 분배**(최대 120px). 모든 날짜가 최소 폭(모바일 40px / 데스크톱 48px)으로도 들어가지 않을 때만 그리드가 커지며 가로 스크롤. 데스크톱 2열 카드(약 490px)에서 9일, 375px 카드에서 6일까지 스크롤 없음 |
| Calendar | 선택일 = `brand` 배경 흰 글자, 오늘 = 밑줄, 지난 날 = `faint` |
| 토글/세그먼트 | 켜짐 = `brand` |
| 확인 창 | 카드 규격, 버튼은 primary/secondary |
| 상태 문구 | `text-sm text-muted`; 오류는 `text-ink` (빨강 없음 — 색이 아니라 문장으로 알림) |

## 6. 하지 않는 것
- 그라데이션, 유리 효과, 큰 둥글기(≥12px), 장식 아이콘·이모지
- 그린을 버튼·링크·배경 강조에 쓰기
- 카드 안에 카드 중첩 (최대 1단계)
- 애니메이션은 색 전환(`transition-colors`)만

## 7. 변경 이력
| 날짜 | 내용 |
|---|---|
| 2026-10-17 | v0: 순백 모노톤 + 밝은 그린 (초기 구현) |
| 2026-10-17 | v0.5: 연한 회색 배경 + 흰 카드, 깊은 그린 |
| 2026-10-17 | **v1.0: 엔터프라이즈 네이비.** 네이비 헤더, 블루 행동색, 그린은 가능 시간 전용, 둥글기 6px, 페이지 헤더 밴드·요약 스트립·2열 생성 화면 |
