# WhenWeMeet

Find the time that works for the most people. An organizer picks candidate days and hours, shares one link, and participants mark when they're free — no sign-up. Everyone sees a live heatmap and the best time.

**Live:** https://whenwemeet-beta.vercel.app

## How it works

1. **Plan a meeting** — name the event, pick days (one by one or a date range), set hours and time zone.
2. **Fine-tune** — switch between 30‑ and 15‑minute slots and block times you don't need, then *Finalize Event* to get a share link. Finalized events can't be changed.
3. **Join** — participants open the link, enter a name (password optional), and tap or drag the slots they can make.
4. **See the result** — a green heatmap of everyone's availability, who can / can't make each slot, and a *Best time* card — all updating live.

## Tech

React 19 · TypeScript · Vite · Tailwind CSS 4 · Supabase (Postgres, RLS, RPC, Realtime) · Vercel. No custom backend — all writes go through three Postgres functions. See [`docs/tech_stack.md`](docs/tech_stack.md) and [`docs/architecture.md`](docs/architecture.md).

## Run locally

```bash
npm install
cp .env.example .env        # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev                 # http://localhost:5173
```

Database: create a Supabase project and run `supabase/migrations/001_init.sql` in the SQL Editor once.

```bash
npm test                    # Vitest (lib/dates, lib/slots)
npm run build               # type-check + production build
```

## Deploy

The app is a static SPA. On Vercel: link the repo, add the two `VITE_SUPABASE_*` environment variables, deploy. `vercel.json` rewrites every path to `index.html` so `/e/:id` links work on refresh.

## Project docs (Korean)

| Doc | What it is |
|---|---|
| [`docs/prd.md`](docs/prd.md) | Purpose, users, scope, core rules |
| [`docs/architecture.md`](docs/architecture.md) | Modules, slot model, schema, RLS/RPC, data flow |
| [`docs/design.md`](docs/design.md) | Design tokens, typography, layout and component rules |
| [`specs/`](specs/) | One folder per feature: `spec.md` (requirements + acceptance criteria) and `tasks.md` |
| [`CLAUDE.md`](CLAUDE.md) | Spec-driven workflow rules used to build this |

Built with spec-driven development: each feature's spec was approved before implementation, and every acceptance criterion is checked off in its `tasks.md`.
