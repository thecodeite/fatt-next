# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**fatt-next** (FreeAgent Time Tracker) is a Next.js 14 app that wraps the FreeAgent API to provide a better time-tracking UI with a calendar month view, working day validation, and task management.

## Commands

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build
pnpm lint         # ESLint (next/core-web-vitals)
```

No test suite is configured.

## Environment Variables

Create `.env.development.local`:
```
OAUTH_ID=<FreeAgent app OAuth ID>
OAUTH_SECRET=<FreeAgent app OAuth secret>
```

`VERCEL_PROJECT_PRODUCTION_URL` is set automatically by Vercel; locally it falls back to `localhost:3000`.

## Architecture

### Auth Flow
1. User visits `/` → clicks login → redirected to FreeAgent OAuth
2. FreeAgent redirects to `/api/callback` → server exchanges code for tokens → stores as `httpOnly` cookies (`access_token`, `refresh_token`)
3. `src/middleware.ts` intercepts every request: if `access_token` cookie is missing but `refresh_token` exists, it refreshes the token pair and forwards `x-access-token` as a request header
4. Server components call `getAccessToken()` in `freeagent.ts`, which reads `x-access-token` from the forwarded headers

### FreeAgent API Client (`src/freeagent.ts`)
All API communication goes through helper functions here:
- `freeagentGet<T>(path)` — single GET, path can be a full URL (strips to `/v2/...`)
- `freeagentGetAll<T>(path, query?)` — paginates via `Link` response headers, max 10 pages
- `freeagentPost`, `freeagentPut`, `freeagentDelete` — standard mutations
- TypeScript interfaces for all FreeAgent resource types are defined here (`FreeagentTimeslip`, `FreeagentTask`, `FreeagentProject`, `FreeagentContact`, `FreeagentNote`)

### User Settings (`src/fatt-settings.ts`)
App settings (`FattSettings`) are persisted as a JSON blob inside a FreeAgent Note. The URL of that note is stored in a `noteUrl` cookie set at login. `getFattSettings()` / `saveFattSettings()` read and write it.

`FattSettings` shape:
```ts
{ tasks?: Record<string, { short?: string; iconName?: string }> }
```

### Month View (`src/app/app/month/[month]/`)
The main feature. `page.tsx` is a server component that:
1. Computes calendar grid bounds (expanding to full weeks, Mon–Sun)
2. Fetches timeslips for the visible date range
3. Fetches active tasks + individually fetches any tasks referenced by timeslips that are no longer active
4. Passes everything to `<ClientPage>` (client component) for interactive rendering

### Routing
- `/` — login/home
- `/app/month` — redirects to current month
- `/app/month/[month]` — calendar view (`YYYY-MM` format)
- `/app/tasks` — task management
- `/app/contact` — contact management
- `/api/callback` — OAuth callback
- `/api/fa/[...path]` — proxies FreeAgent API (for client-side calls)
- `/api/cookies` — cookie management

### Path Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### Styling
CSS Modules + SCSS. Global atoms in `src/app/atoms.css`. Material Design Icons loaded from CDN via `src/app/global-icon.css`.
