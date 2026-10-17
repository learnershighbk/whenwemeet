# CLAUDE.md — WhenWeMeet

회의 일정 조율 웹 서비스. 담당자가 후보 시간을 만들고 링크를 공유하면, 참가자가 가능 시간을 표시하고 모두가 실시간 히트맵과 Best time을 본다.

## 문서 위치
| 문서 | 역할 |
|---|---|
| `docs/prd.md` | 무엇을·왜 (목적, 범위, 핵심 규칙) |
| `docs/architecture.md` | 어떻게 (모듈 구조, 데이터 흐름, 스키마) |
| `docs/tech_stack.md` | 기술 스택 |
| `specs/NN-feature/spec.md` | 기능 요구사항 + 수용 기준 (AC) |
| `specs/NN-feature/tasks.md` | 구현 작업 체크리스트 |
| `docs/archive/prd-v0.9-full.md` | 상세 원본 PRD. spec 작성 시 참고용, 직접 수정하지 않음 |

## 개발 절차 (spec-driven)
1. `spec.md` 작성 → **사용자 승인**
2. `tasks.md` 작성 → 작업 단위로 구현
3. AC마다 테스트 또는 수동 확인 방법을 남기고, 완료한 task는 `[x]` 처리
4. 기능 하나가 끝나면 사용자 확인 후 다음 기능으로

- 승인되지 않은 spec의 기능은 구현하지 않는다.
- 구현 중 spec과 다르게 해야 하면 먼저 spec을 고치고 사용자에게 알린다.
- 기능 순서: 01-create-event → 02-finalize-event → 03-join-event → 04-availability

## 코드 규칙
- React + TypeScript + Vite, Tailwind, Supabase (자세한 내용은 `docs/tech_stack.md`)
- 계산 로직(칸 생성, 집계, Best time)은 `src/lib/slots.ts`의 순수 함수로만 작성하고 Vitest로 테스트
- Supabase 호출은 `src/lib/api.ts`에만 둔다. 컴포넌트에서 직접 호출하지 않음
- 그리드는 `src/components/Grid.tsx` 하나를 mode(`block` | `select` | `heatmap`)로 재사용
- UI 문구는 쉽고 일상적인 영어. 색은 흰 배경 모노톤 + 그린 강조색 하나

## 명령어
| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 + 빌드 |
| `npm test` | Vitest 실행 |

- 환경 변수: `.env.example`을 `.env`로 복사 후 Supabase URL/anon key 입력
- DB: `supabase/migrations/*.sql`을 Supabase SQL Editor에서 순서대로 실행

## 기타
- `session_log.md`는 hook이 사용자 입력을 자동 기록한다. 직접 편집하지 않는다 (hook이 못 잡는 질문 답변만 추가).
