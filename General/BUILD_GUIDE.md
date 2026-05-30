# Racing Pit — Build Guide

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 15 (App Router) | SSR for SEO, API routes, easy deploy |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent UI |
| Backend/API | Next.js API routes + tRPC | Type-safe end-to-end |
| Database | PostgreSQL + Prisma | Relational (horses ↔ races ↔ jockeys), migrations |
| Auth | NextAuth.js v5 | User accounts, OAuth + email |
| Scraping | Node.js cron jobs + Playwright/Cheerio | Pull data from German racing sites |
| Hosting | Vercel (app) + Supabase (DB) | Free tier, easy scaling |
| Job Queue | Inngest or BullMQ | Scheduled scraping jobs |

## Phase 1 — Project Scaffold (Day 1)

### 1.1 Init the app

```bash
npx create-next-app@latest racing-pit \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd racing-pit
```

### 1.2 Install core deps

```bash
# DB + ORM
npm install prisma @prisma/client
npx prisma init

# Auth
npm install next-auth@beta @auth/prisma-adapter

# API layer
npm install @trpc/server @trpc/client @trpc/next @trpc/react-query @tanstack/react-query zod

# UI
npx shadcn@latest init
```

### 1.3 Set up Supabase

1. Create project at supabase.com
2. Copy `DATABASE_URL` into `.env`
3. Run `npx prisma db push` to sync schema

## Phase 2 — Database Schema (Day 1–2)

Prisma models in dependency order:

```
User          → favorites, bets, notes
Trainer       → horses
Jockey        → race entries
Horse         → race entries, trainer
Race          → race entries, racecourse
RaceEntry     → horse + jockey + race + result
Favorite      → user + (horse | jockey | trainer)
Note          → user + (horse | jockey | trainer)
Bet           → user + race entry + odds + result
```

Key relations:
- `RaceEntry` is the pivot table linking a horse + jockey + race
- `Bet` references a `RaceEntry` (the specific horse in a specific race)
- `Favorite` uses a polymorphic pattern (nullable FK per entity type)

## Phase 3 — Auth + User Accounts (Day 2–3)

- Configure NextAuth with Prisma adapter
- Providers: Google OAuth + Email magic link (Resend)
- Middleware to protect `/dashboard/*` routes
- User profile page (settings, stats overview)

## Phase 4 — Data Scraping Pipeline (Day 3–5)

German horse racing data sources:
- **galopp.org** — race results, horse/trainer/jockey data
- **rennliste.de** — upcoming races
- **trabrennbahn.de** — trotting races (if needed)

### 4.1 Scraper structure

```
src/
  scrapers/
    horses.ts       # horse profiles
    races.ts        # upcoming + past races
    results.ts      # race results → updates RaceEntry
    trainers.ts
    jockeys.ts
```

### 4.2 Scheduling

- Use Inngest (free tier) for cron jobs
- Schedule: results sync every hour, upcoming races daily at 06:00

## Phase 5 — Core UI (Week 2)

Pages in priority order:

1. `/` — landing / race calendar
2. `/races/[id]` — race detail + entry list
3. `/horses/[id]` — horse profile + form history
4. `/jockeys/[id]` and `/trainers/[id]`
5. `/dashboard` — personal hub (favorites, bets)
6. `/dashboard/bets` — bet tracker + stats
7. `/search` — global search across all entities

## Phase 6 — Favorites, Notes & Bets (Week 2–3)

**Favorites:** toggle button on every horse/jockey/trainer card → optimistic UI update via tRPC mutation

**Notes:** markdown text area stored per entity per user

**Bets:**
- Log: entity, race, odds at time of bet, stake, result
- Stats computed server-side: ROI, win rate, P&L per horse/jockey/trainer
- Charts: Recharts for P&L over time, win rate breakdown

## Phase 7 — Polish & Deploy (Week 3–4)

- Vercel for the Next.js app (connect GitHub repo, auto-deploys)
- Supabase for Postgres (already set up)
- Resend for transactional email
- Environment variables via Vercel dashboard
- Rate limiting on scraper endpoints (Upstash Redis)
- Error monitoring (Sentry free tier)

## Recommended Build Order

| Week | Focus |
|------|-------|
| 1 | Schema → Auth → seed data with mock scraper |
| 2 | Real scraper → race/horse/jockey UI pages |
| 3 | Favorites + notes + bet logging |
| 4 | Bet stats/charts → deploy → monitoring |
