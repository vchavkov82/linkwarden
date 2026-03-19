# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Linkwarden is a self-hosted, open-source collaborative bookmark manager. It saves links with archived copies (screenshot, PDF, readable HTML, monolith) and provides reading/annotation features. Built as a Yarn 4 monorepo.

## Common Commands

```bash
# Install dependencies
yarn install

# Development (web + worker concurrently)
yarn concurrently:dev

# Web app only
yarn web:dev          # dev server at http://localhost:3000
yarn web:build        # production build
yarn web:start        # start production build

# Worker only
yarn worker:dev
yarn worker:start

# Database (Prisma)
yarn prisma:generate  # regenerate Prisma client after schema changes
yarn prisma:dev       # create migration from schema changes
yarn prisma:deploy    # apply pending migrations
yarn prisma:studio    # open Prisma Studio GUI

# Formatting
yarn format

# E2E tests (Playwright, from apps/web)
cd apps/web && npx playwright test
cd apps/web && npx playwright test e2e/dashboard/links.spec.ts  # single test file
cd apps/web && npx playwright test --project="chromium dashboard"  # specific project
```

## Architecture

### Monorepo Structure

**Apps:**
- `apps/web` — Next.js 14 web app (Pages Router, not App Router)
- `apps/worker` — Background job processor (link archival, search indexing, RSS polling)
- `apps/mobile` — Expo/React Native mobile app

**Shared Packages:**
- `packages/prisma` — Prisma schema, migrations, and client singleton
- `packages/lib` — Shared utilities and helpers
- `packages/router` — React Query hooks shared between web and mobile
- `packages/types` — Shared TypeScript type definitions
- `packages/filesystem` — S3/object storage abstraction (AWS SDK)

### Tech Stack

- **Frontend:** Next.js 14 (Pages Router), React 18, Tailwind CSS + DaisyUI, Zustand (client state), TanStack React Query v5
- **Backend:** Next.js API routes at `/pages/api/v1/`, NextAuth.js 4 (credentials + 40+ OAuth providers)
- **Database:** PostgreSQL via Prisma 6
- **Search:** Meilisearch for full-text search indexing
- **Storage:** S3-compatible object storage for archived files
- **Worker:** Playwright for browser automation (screenshots/PDFs), Vercel AI SDK for AI tagging, RSS Parser

### API Pattern

API routes live in `apps/web/pages/api/v1/`. Each route delegates to controller functions in `apps/web/lib/api/controllers/`. Auth is handled via `verifyUser()` which validates session or bearer token:

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await verifyUser({ req, res });
  if (!user) return;
  // switch on req.method for GET/POST/PUT/DELETE
}
```

### Worker Architecture

`apps/worker/index.ts` spawns `worker.ts` with auto-restart. Five workers run concurrently:
1. **linkProcessing** — Archives links (PDF, screenshot, readable, monolith) using Playwright
2. **linkIndexing** — Syncs links to Meilisearch
3. **rssPolling** — Fetches RSS feeds on interval
4. **trialEndEmailWorker** — Sends trial expiration emails
5. **migrationWorker** — Handles data migrations

### Data Flow for Shared Code

The `packages/router` package provides React Query hooks used by both `apps/web` and `apps/mobile`, ensuring consistent API interaction across platforms.

### i18n

Uses next-i18next with 14 locales. Translation files are in `apps/web/public/locales/`. Use `useTranslation()` hook in components.

## Environment Setup

Copy `.env.sample` to `.env` at the repo root. Key required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Random secret for NextAuth
- `NEXTAUTH_URL` — Base URL (default `http://localhost:3000/api/v1/auth`)

## Database

Schema at `packages/prisma/schema.prisma`. Core models: User, Collection, Link, Tag, Highlight, AccessToken, RssSubscription. After schema changes, run `yarn prisma:dev` to generate a migration, then `yarn prisma:generate`.

## Testing

E2E tests use Playwright in `apps/web/e2e/`. Two test projects: "chromium dashboard" (authenticated) and "chromium public". Auth state is stored in `playwright/.auth/user.json` via setup files in `apps/web/e2e/global/`.
