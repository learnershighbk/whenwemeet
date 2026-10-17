# PRD — WhenWeMeet

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.9 (Draft — 확인 필요 항목 10장 참고) |
| 작성일 | 2026-10-17 |
| 상태 | 검토 중 |
| 관련 문서 | `tech_stack.md` (기술 스택은 이 문서에서 다루지 않음) |

---

## 1. 개요

### 1.1 목적
회의 담당자가 후보 날짜·시간대를 등록하고 공유 링크를 보내면, 참가자들이 각자 가능한 시간을 표시한다. 서비스는 모든 응답을 실시간으로 모아 **가장 많은 사람이 참석 가능한 시간**을 보여준다.

### 1.2 목표
- 담당자가 1분 안에 이벤트를 만들고 링크를 공유할 수 있다.
- 참가자가 회원가입 없이 이름만 입력하고 바로 응답할 수 있다.
- 누가 언제 가능한지 한눈에 볼 수 있다 (히트맵 + Best time).

### 1.3 비목표 (Out of scope)
- 회원가입, 이메일/소셜 로그인
- 캘린더 연동 (Google Calendar 등), 알림 메일·푸시
- Finalize 이후 이벤트 수정 (날짜·시간·회색 처리 변경 불가)
- 최종 회의 시간 확정·발송 기능, 회의실 예약
- 다국어 지원 (UI는 영어만)

---

## 2. 사용자

| 사용자 | 설명 | 주요 행동 |
|---|---|---|
| Organizer (회의 담당자) | 회의 일정을 조율하는 사람 | 이벤트 생성 → 그리드 편집 → Finalize → URL 공유 |
| Participant (참가자) | 회의에 초대된 사람 (Organizer 본인도 참가 가능) | URL 접속 → 이름(+선택 비밀번호) 입력 → 가능 시간 클릭 → 결과 확인 |

사용 환경: 데스크톱 웹 브라우저, 모바일 웹 브라우저 (반응형).

---

## 3. 사용자 흐름

```
[Organizer]
 Home (Create Event 폼)
   ├─ 회의명 입력
   ├─ 날짜 선택 (개별 클릭 / 기간 선택)
   ├─ 시간대 선택 (From / To, Time zone)
   └─ [Create Event]
        ↓
 Edit Grid 화면 (아직 저장 전)
   ├─ 슬롯 단위 선택 (30 min / 15 min)
   ├─ 불필요한 칸 클릭 → 회색(blocked)
   ├─ [Back] → 이전 화면으로 (입력값 유지)
   └─ [Finalize Event]
        ↓
 Share 화면
   ├─ 고유 URL 표시 + [Copy link]
   └─ [Open event page]

[Participant]
 고유 URL 접속 → Sign in (Name, Password optional)
   ↓
 Event 화면
   ├─ My availability 그리드 (클릭해서 표시)
   ├─ Group availability 그리드 (히트맵, 실시간)
   └─ Best time 패널 (실시간)
```

---

## 4. 기능 요구사항

### 4.1 Create Event (Organizer)

#### F-1. 회의명 입력
- 필수 입력. 앞뒤 공백 제거 후 1~100자.
- Placeholder: `e.g. Weekly team sync`
- 비어 있으면 Create Event 버튼 비활성화.

#### F-2. 날짜 지정
- 월별 캘린더를 표시한다. 이전/다음 달 이동 가능.
- **기본 모드 — Pick dates:** 날짜를 하나씩 클릭해 선택/해제 (토글). 연속되지 않은 날짜도 선택 가능.
- **기간 모드 — Date range:** 토글 스위치로 전환. 시작 날짜와 마지막 날짜를 클릭하면 그 사이 모든 날짜가 선택된다. 시작일보다 앞선 날짜를 두 번째로 클릭하면 두 날짜를 바꿔서 처리한다.
- 모드를 바꾸면 선택한 날짜를 초기화한다.
- 오늘 이전 날짜는 선택할 수 없다 (흐리게 표시).
- 최소 1일, 최대 31일 선택 가능. 초과 시 `You can pick up to 31 days.` 안내.
- 선택된 날짜 수를 표시: `5 days selected`

#### F-3. 시간대 지정
- **From / To 드롭다운**: 하루를 1시간 간격 25개 시점(12:00 AM, 1:00 AM, … 11:00 PM, 12:00 AM)으로 표시한다. 마지막 12:00 AM은 다음 날 자정(24:00)을 의미한다.
  - From 선택지: 12:00 AM ~ 11:00 PM (24개)
  - To 선택지: 1:00 AM ~ 12:00 AM(자정) (24개)
  - 기본값: From `10:00 AM`, To `4:00 PM`
  - To는 From보다 뒤여야 한다. From을 To 이후로 바꾸면 To를 From + 1시간으로 자동 조정.
- 선택한 시간대는 모든 날짜에 동일하게 적용된다.
- 표시 형식: 12시간제 (`10:00 AM`).

#### F-4. 타임존
- 기본값: 브라우저(시스템) 타임존 자동 감지.
- 드롭다운에서 변경 가능. 대륙 기준으로 그룹화한 IANA 타임존 목록을 사용한다.
  - 표시 예: `Asia / Seoul (GMT+9)`, `America / New York (GMT-4)`
  - 그룹: Africa, America, Antarctica, Asia, Atlantic, Australia, Europe, Indian, Pacific
  - 입력해서 찾는 검색 기능을 제공한다 (목록이 길기 때문).
- 이벤트는 선택한 타임존으로 저장되며, 이후 모든 화면의 시간은 이 타임존 기준으로 표시한다.

#### F-5. Create Event 버튼
- 회의명, 날짜 1개 이상, 유효한 시간대가 있어야 활성화.
- 클릭 시 Edit Grid 화면으로 이동해 그리드를 생성한다. **이 시점에는 아직 저장하지 않는다** (Finalize 때 저장).

### 4.2 Edit Grid / Finalize Event (Organizer)

#### F-6. 그리드 구조 (모든 그리드 공통)
- **가로축(열)**: 선택한 날짜. 상단 헤더에 날짜와 요일을 짧게 표시 — `Mon` / `Oct 20`
- **세로축(행)**: 시간. 시작 시간이 맨 위, 종료 시간이 맨 아래. 정시마다 왼쪽에 시간 라벨(`10 AM`), 30분/15분 칸은 라벨 없이 얇은 구분선.
- 날짜가 많아 화면보다 넓으면 그리드만 가로 스크롤. 시간 라벨 열은 고정.
- 마지막 행은 종료 시간 직전 칸이다 (예: To 4:00 PM, 30분 단위 → 마지막 칸은 3:30–4:00 PM).

#### F-7. 슬롯 단위 선택
- 토글: `30 min` (기본) / `15 min`
- 선택한 단위가 참가자가 클릭하는 칸의 크기가 된다.
- 단위를 바꾸면 회색 처리한 칸이 초기화된다. 회색 칸이 있을 때는 먼저 확인 메시지를 띄운다: `Changing the slot size will clear blocked times. Continue?`

#### F-8. 불필요한 시간대 회색 처리 (Block)
- 칸을 클릭하면 회색(blocked) ↔ 일반으로 토글.
- 클릭 후 드래그하면 여러 칸을 한 번에 같은 상태로 바꾼다 (첫 칸의 결과 상태를 따라감). 모바일은 터치 드래그 지원.
- 회색 칸은 이후 참가자 화면에서 클릭되지 않으며 히트맵·Best time 계산에서 제외된다.
- 모든 칸을 회색 처리하면 Finalize 불가: `Leave at least one open time slot.`
- 안내 문구: `Tap or drag to block times you don't need.`

#### F-9. Finalize Event
- 클릭 시 이벤트를 저장하고 고유 ID를 발급한다.
- **Finalize 후에는 수정할 수 없다.** 클릭 전 확인: `Once finalized, the event can't be changed. Finalize now?`
- Share 화면으로 이동:
  - 고유 URL 표시 (예: `https://<domain>/e/k7Fq2xP9`). ID는 추측하기 어려운 무작위 문자열 (8자 이상).
  - `Copy link` 버튼 → 클립보드 복사 후 `Link copied!` 표시 (2초).
  - `Open event page` 버튼 → 참가자 화면으로 이동.
  - 안내: `Send this link to your participants.`

### 4.3 Participant — Sign in

#### F-10. 간편 로그인
- 이벤트 URL 접속 시 이벤트 정보(회의명, 날짜 범위, 타임존)와 로그인 폼을 보여준다.
- 입력: `Your name` (필수), `Password (optional)`
- 안내: `No sign-up needed. Add a password only if you want to keep others from editing your times.`
- 이름 규칙: 앞뒤 공백 제거, 1~30자. 같은 이벤트 안에서 **대소문자 구분 없이** 같은 이름이면 같은 사람으로 본다.
- 동작 규칙:

| 상황 | 결과 |
|---|---|
| 새 이름 + 비밀번호 없음 | 새 참가자 생성, 비밀번호 없는 상태 |
| 새 이름 + 비밀번호 입력 | 새 참가자 생성, 비밀번호 설정 |
| 기존 이름 (비밀번호 없는 참가자) | 같은 사람으로 간주하고 바로 로그인 → 기존 응답 수정 가능. 이때 입력한 비밀번호는 무시 |
| 기존 이름 (비밀번호 있는 참가자) + 맞는 비밀번호 | 로그인 |
| 기존 이름 (비밀번호 있는 참가자) + 틀리거나 빈 비밀번호 | 거부: `Wrong password for this name.` |

- 비밀번호는 평문으로 저장하지 않는다 (해시 저장).
- 같은 브라우저에서 다시 접속하면 로그인 상태 유지 (이벤트별). `Not you? Sign out` 링크 제공.
- 로그인 전에도 Group availability 그리드와 Best time은 볼 수 있다 (My availability 영역 자리에 로그인 폼 표시).

### 4.4 Participant — Event 화면

#### F-11. 두 개의 그리드
- **My availability**: 본인의 가능 시간을 표시하는 그리드.
- **Group availability**: 본인을 포함한 모든 참가자 응답을 히트맵으로 보여주는 그리드.
- 데스크톱: 좌우 배치 (왼쪽 My, 오른쪽 Group). 모바일: 위아래 배치 (위 My, 아래 Group).
- 두 그리드는 같은 행·열 구조(F-6)를 가진다.

#### F-12. 내 가능 시간 표시
- 칸 클릭 → 가능(Available) ↔ 불가 토글. 가능한 칸은 그린색으로 채움.
- 드래그로 여러 칸 한 번에 선택/해제 (F-8과 같은 방식). 모바일 터치 드래그 지원.
- 회색(blocked) 칸은 클릭 불가, 커서 변화 없음.
- **저장 버튼 없음.** 변경 즉시 자동 저장. 저장 상태 표시: `Saving…` → `Saved`. 실패 시 `Couldn't save. Retrying…` 후 자동 재시도.
- 아무 칸도 선택하지 않은 참가자도 참가자 목록에 포함된다 (모든 칸에서 불참으로 계산).

#### F-13. 히트맵 (Group availability)
- 각 칸의 색 진하기 = 그 칸에 가능한 인원 수 / 전체 참가자 수.
  - 0명: 흰색, 최대(전원 가능): 가장 진한 그린. 그 사이는 단계별 그린 (예: 5단계).
- 그리드 아래 범례: `0/7 available` ··· `7/7 available` 색 막대.
- 회색 칸은 회색 + 사선 패턴으로 표시, 툴팁 없음.

#### F-14. 칸 상세 (Hover / Tap)
- 데스크톱: Group 그리드 칸에 마우스를 올리면 툴팁 표시.
- 모바일: 칸을 탭하면 그리드 아래 상세 패널에 표시.
- 내용 예:
  ```
  Mon, Oct 20 · 2:00–2:30 PM
  Available (3): Alice, Ben, Chris
  Not available (2): Dana, Eli
  ```
- 이름 정렬: 알파벳순.

#### F-15. Best time 패널
- 가능 인원이 가장 많은 **칸 1개**를 표시한다 (칸 = 이벤트의 슬롯 단위 30분 또는 15분).
- 동점이면 **가장 이른 날짜·시간**의 칸을 선택한다.
- 회색 칸은 제외한다.
- 표시 예:
  ```
  Best time
  Mon, Oct 20 · 2:00–2:30 PM
  5 of 7 people available
  Available: Alice, Ben, Chris, Dana, Eli
  Not available: Frank, Grace
  ```
- 참가자가 없거나 가능 인원이 모두 0명이면: `No one has picked a time yet.`
- 배치: 데스크톱은 그리드 위, 모바일은 화면 상단 (그리드보다 먼저 보이게).

#### F-16. 실시간 반영
- 다른 참가자가 응답을 바꾸면 새로고침 없이 Group 그리드, 히트맵, 칸 상세, Best time, 참가자 수가 갱신된다.
- 목표 지연: 변경 후 **2초 이내** 다른 사용자 화면에 반영.
- 연결이 끊기면 상단에 `Reconnecting…` 표시, 재연결 시 최신 상태를 다시 불러온다.

#### F-17. 참가자 목록
- Group 그리드 옆(모바일은 아래)에 응답한 사람 목록과 인원 수 표시: `Responses (7)`
- 목록의 이름에 마우스를 올리면(모바일 탭) Group 그리드에서 그 사람의 가능 칸을 강조한다. *(선택 기능 — P2)*

---

## 5. 화면 목록

| ID | 화면 | URL (예시) | 사용자 |
|---|---|---|---|
| S-1 | Create Event | `/` | Organizer |
| S-2 | Edit Grid | `/` (S-1과 같은 페이지의 다음 단계) | Organizer |
| S-3 | Share | `/e/{id}/share` 또는 S-2의 다음 단계 | Organizer |
| S-4 | Event (Sign in + 두 그리드 + Best time) | `/e/{id}` | Participant |
| S-5 | Not found | — | 모두 | 

S-5 문구: `This event doesn't exist. Check the link and try again.`

---

## 6. 디자인 요구사항

### 6.1 원칙
- 단순하고 직관적, 가독성 우선. 한 화면에 한 가지 일만.
- 흰색 배경의 모노톤. 강조색은 **히트맵·선택 상태용 그린 하나만** 사용.

### 6.2 색상
| 용도 | 색 (가이드) |
|---|---|
| 배경 | `#FFFFFF` |
| 기본 텍스트 | `#111111` |
| 보조 텍스트 | `#6B6B6B` |
| 테두리/구분선 | `#E5E5E5` |
| 기본 버튼 | 검정 배경 + 흰 글자 |
| Blocked 칸 | `#D9D9D9` + 사선 패턴 |
| 내 선택 칸 | 그린 (예: `#22A559`) |
| 히트맵 | 흰색 → 진한 그린 5단계 (예: `#E8F5EC` → `#166E3B`) |

### 6.3 반응형
- 기준점: 모바일 < 768px ≤ 데스크톱.
- 모바일에서 버튼·입력 등 터치 영역은 높이 44px 이상 (그리드 칸은 아래 기준 적용).
- 그리드 칸 최소 크기: 데스크톱 폭 48px, 모바일 폭 40px. 날짜가 많으면 가로 스크롤.
- 가로 스크롤은 그리드 영역 안에서만 발생 (페이지 전체 가로 스크롤 없음).

### 6.4 UI 문구
- 쉽고 일상적인 영어. 짧은 문장, 전문 용어 사용 금지.
- 주요 문구 목록은 부록 A 참고.

---

## 7. 개념 데이터

기술 구현과 무관한 개념 수준의 정의. (실제 스키마는 `tech_stack.md`에서 정의)

| 개체 | 주요 속성 |
|---|---|
| Event | id, title, dates[], startHour(0–23), endHour(1–24), timezone, slotMinutes(15/30), blockedSlots[], createdAt |
| Participant | id, eventId, name, passwordHash(선택), createdAt |
| Availability | participantId, slots[] (가능한 칸 목록) |

- 칸(slot) 식별: `날짜 + 시작 시각` (예: `2026-10-20T14:00`, 이벤트 타임존 기준).

---

## 8. 비기능 요구사항

| 구분 | 요구사항 |
|---|---|
| 성능 | 첫 화면 로딩 3초 이내 (일반 4G 기준). 칸 클릭 반응은 즉시(낙관적 업데이트). |
| 실시간 | 변경 후 2초 이내 다른 사용자 화면 반영 (F-16). |
| 규모 | 이벤트당 참가자 최대 100명, 최대 31일 × 24시간 × 15분 단위 (2,976칸)에서 정상 동작. |
| 브라우저 | Chrome, Safari, Edge, Firefox 최신 2개 버전. iOS Safari, Android Chrome. |
| 보안 | 이벤트 ID는 추측 불가한 무작위 값. 비밀번호 해시 저장. 이름 등 입력값은 화면 출력 시 이스케이프 처리. |
| 접근성 | 텍스트 대비 WCAG AA. 그리드 색 외에 툴팁/상세 패널로 인원 수 확인 가능. |

---

## 9. 수용 기준 (Acceptance Criteria)

1. 회의명·날짜·시간대를 입력하고 Create Event를 누르면, 선택한 날짜가 열로, 시작~종료 시간이 위→아래 행으로 된 그리드가 보인다.
2. 기본 시간대는 10:00 AM – 4:00 PM, 기본 슬롯 단위는 30분이다.
3. Date range 모드에서 두 날짜를 클릭하면 그 사이 모든 날짜가 선택된다.
4. 타임존 기본값이 브라우저 타임존과 같고, 드롭다운에서 바꿀 수 있다.
5. 15 min으로 바꾸면 그리드 칸이 15분 단위로 바뀐다.
6. Edit Grid에서 회색 처리한 칸은 참가자 화면에서 클릭되지 않고, 히트맵·Best time 계산에서 빠진다.
7. Finalize 후 고유 URL이 표시되고, Copy link로 복사된다. 이후 이벤트는 수정할 수 없다.
8. 이름만으로 로그인할 수 있고, 같은 이름(비밀번호 없음)으로 다시 들어오면 기존 응답이 보인다.
9. 비밀번호를 설정한 이름은 틀린 비밀번호로 로그인할 수 없다.
10. 브라우저 2개로 서로 다른 참가자가 칸을 클릭하면, 상대 화면의 히트맵과 Best time이 2초 이내에 바뀐다.
11. Group 그리드 칸에 마우스를 올리면(모바일은 탭) 가능자·불참자 이름이 보인다.
12. Best time은 가능 인원이 가장 많은 칸 1개이며, 동점이면 가장 이른 칸이다.
13. 모바일(375px 폭)에서 페이지 가로 스크롤 없이 모든 기능을 쓸 수 있다.

---

## 10. 가정 및 확인 필요 사항

아래는 원본 요구사항에 명시되지 않아 **임의로 정한 기본값**이다. 확인 후 수정한다.

| # | 항목 | 현재 가정 |
|---|---|---|
| A-1 | 참가자 화면 시간 표시 | 이벤트 타임존 기준으로만 표시하고 상단에 `Times are in Asia/Seoul (GMT+9)` 라벨 표시. 참가자별 타임존 변환은 하지 않음. |
| A-2 | 선택 가능 날짜 | 오늘 이전 날짜 선택 불가, 최대 31일. |
| A-3 | 슬롯 단위 변경 시 | 회색 처리가 초기화됨 (확인 메시지 후). |
| A-4 | 저장 시점 | Create Event 단계에서는 저장하지 않고 Finalize 시점에 저장. Finalize 전에 페이지를 닫으면 입력 내용은 사라짐. |
| A-5 | 이름 비교 | 앞뒤 공백 제거, 대소문자 구분 없음 (`alice` = `Alice`). |
| A-6 | 로그인 유지 | 같은 브라우저에서 이벤트별로 로그인 유지. |
| A-7 | 데이터 보관 | 이벤트 삭제 기능 없음. 보관 기간 제한 없음 (추후 정책 결정). |
| A-8 | 응답 삭제 | 참가자가 자기 응답을 통째로 삭제하는 기능 없음 (모든 칸 해제만 가능). |
| A-9 | 자정 종료 | To `12:00 AM`은 같은 날 24:00까지를 의미 (다음 날로 넘어가는 이벤트 없음). |

---

## 부록 A. UI 문구 (English copy)

| 위치 | 문구 |
|---|---|
| S-1 제목 | `Plan a meeting` |
| 회의명 라벨 | `Event name` |
| 날짜 영역 | `Which days?` / 토글 `Date range` |
| 시간 영역 | `What times?` / `From` / `To` / `Time zone` |
| 버튼 | `Create Event` |
| S-2 제목 | `Fine-tune your times` |
| 슬롯 토글 | `30 min` / `15 min` |
| S-2 안내 | `Tap or drag to block times you don't need.` |
| 버튼 | `Back` / `Finalize Event` |
| Finalize 확인 | `Once finalized, the event can't be changed. Finalize now?` |
| S-3 제목 | `Your event is ready!` |
| S-3 안내 | `Send this link to your participants.` |
| 버튼 | `Copy link` → `Link copied!` / `Open event page` |
| Sign in | `Who are you?` / `Your name` / `Password (optional)` / `Continue` |
| Sign in 안내 | `No sign-up needed. Add a password only if you want to keep others from editing your times.` |
| 로그인 오류 | `Wrong password for this name.` |
| 그리드 제목 | `My availability` / `Group availability` |
| My 안내 | `Tap or drag to mark when you're free.` |
| 저장 상태 | `Saving…` / `Saved` / `Couldn't save. Retrying…` |
| Best time | `Best time` / `{n} of {total} people available` / `Available` / `Not available` |
| 응답 없음 | `No one has picked a time yet.` |
| 참가자 목록 | `Responses ({n})` |
| 로그아웃 | `Not you? Sign out` |
| 연결 | `Reconnecting…` |
| 404 | `This event doesn't exist. Check the link and try again.` |
