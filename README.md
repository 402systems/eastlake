# eastlake Monorepo

Unified monorepo for web apps, mobile apps, API workers, and shared libraries.

## Structure

```
eastlake/
  apps/
    web/           Next.js apps (deployed to web.402systems.com)
      core/        home, design, db-demo, db-demo-supabase
      games/       dobble
      misc/        bingo, personal-tracker
    api/           Cloudflare Workers
      core/        api-gateway, db-demo-api
      misc/        friend-tracker-api
    mobile/        Expo / React Native apps
      misc/        friend-tracker
  libs/core/       Shared libraries
    eslint/        ESLint config
    prettier/      Prettier config (ESM + tailwind plugin)
    tsconfig/      Base tsconfig + expo.json + worker.json
    supabase-auth/ Auth client & hooks (./web/* and ./native/*)
    ui/            UI components (./components/* for web, ./native/* for RN)
    router-dispatcher/  CF Worker that routes web.402systems.com requests
```

## Prerequisites

- Node.js v24.12+
- pnpm: `corepack enable pnpm`

## Getting Started

```bash
pnpm install
```

### Dev mode

```bash
# Web app
pnpm dev --filter @eastlake/app-core-home

# API worker (starts wrangler dev on localhost:8787)
pnpm dev --filter @eastlake/app-misc-friend-tracker-api

# Mobile app (starts Expo)
pnpm dev --filter @eastlake/app-misc-friend-tracker
```

### Install a package

```bash
# To a specific app/lib
pnpm install <pkg> --filter @eastlake/app-games-dobble

# Workspace-wide dev dependency (rarely needed)
pnpm i -wD <pkg>
```

### Create a new project

```bash
pnpm gen:package
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm lint:fix` | Lint and autofix |
| `pnpm format:check` | Check formatting |
| `pnpm format:fix` | Fix formatting |
| `pnpm checkall` | Lint + format check |
| `pnpm fixall` | Lint fix + format fix |

Use `--filter <package>` to scope any command to a single package.

## UI Framework

- Web components live in `libs/core/ui/src/components/` — import as `@eastlake/core-ui/components/ui/<name>`
- Native components live in `libs/core/ui/src/native/components/` — import as `@eastlake/lib-core-ui/native/components/<name>`
- Add new web primitives via `pnpm dlx shadcn@latest add <name>`
- See https://ui.shadcn.com/docs/components for all components

## Supabase Auth

The `supabase-auth` lib has platform-specific subpath exports:

```ts
// Web (Next.js)
import { createClient } from '@eastlake/lib-core-supabase-auth/web/client';
import { useAuth } from '@eastlake/lib-core-supabase-auth/web/hooks/useAuth';
import { AuthButtons } from '@eastlake/lib-core-supabase-auth/web/components';

// Native (Expo / React Native)
import { createClient } from '@eastlake/lib-core-supabase-auth/native/client';
import { useAuth } from '@eastlake/lib-core-supabase-auth/native/hooks/useAuth';

// Shared types
import type { UseAuthReturn } from '@eastlake/lib-core-supabase-auth/types';
```

## Deployment

### Web Apps

Web apps are deployed as static exports to Cloudflare R2, served via `[staging.]web.402systems.com/<category>/<app>`.

1. Go to **Actions** > **Manual Deploy**
2. Enter the app path (e.g., `web/core/home`) or `all` to deploy everything
3. Select environment (`staging` or `production`)
4. Run the workflow

### API Workers (Cloudflare Workers)

Workers are deployed directly to Cloudflare via wrangler.

1. Go to **Actions** > **Deploy Worker**
2. Enter the package name (e.g., `@eastlake/app-misc-friend-tracker-api`)
3. Run the workflow

To deploy locally: `pnpm run deploy --filter @eastlake/app-misc-friend-tracker-api`

### Router Dispatcher

The dispatcher routes requests on `web.402systems.com` to the correct app artifacts in R2.

1. Go to **Actions** > **Deploy Dispatcher**
2. Run the workflow

### CI

The **Build and Lint** workflow runs on every push/PR to `main`. It runs `pnpm lint` and `pnpm build` across all packages.
