# 📦 402 Frontend Monorepo

This repository is a high-performance monorepo powered by `pnpm` workspaces and Turborepo. We use a team-based directory structure to organize our frontend applications.

Prerequisites:

- `nodejs` -> v24.12 or higher. This may work with something lower but its not been tested
- `pnpm` -> `corepack enable pnpm`

## Getting Started

1. `pnpm install`
2. Start an app in dev mode: `pnpm dev --filter @402systems/app-games-dobble`
3. Install a new package: `pnpm install <pkg> --filter @402systems/app-games-dobble`
4. Install a workspace wide package: `pnpm i -wD <pkg>`. WARN: You should almost never need to do this, unless you are installing a build tool
5. Run all preflight checks `pnpm checkall`

## Scripts

### Create New Project

1. `pnpm gen:package`

### Running scripts

- Use `--filter` to scope `pnpm` to your package.
- Lint: `pnpm <cmd> --filter @402systems/app-core-design`

### UI Framework

- All UI components are in the libs/core/ui package. The package must be referenced as `@402systems/core-ui/*`
  in UI code. If you use the generated templates, the compiler will be aware of this.
- UI primitives are made using ShadCN. Add new primitives via `pnpm dlx shadcn@latest add <name>`.
- See <https://ui.shadcn.com/docs/components> for all components

### Linting

- `pnpm lint` to lint the entire repo. Use `--filter <pkg>` to scope down
- `pnpm lint:fix` to lint and autofix the entire repo. Use `--filter <pkg>` to scope down

### Formatting

- `pnpm format:check`
- `pnpm format:fix`

### Lint + Formatting

- `pnpm fixall` to autofix linting and formatting issues
- `pnpm checkall` to check all formatting is correct

## Deployment

### Overview

402systems works on an app granular biphase deployment strategy. Each app can have a staging, and a production variant deployed at once.
Apps are all deployed to `web.402systems.com` and accessed via `[staging.]web.402systems.com/<category>-<app_name>`.
R2 KV Workers read the requested path at edge distribution centers and decide which artifacts to vend out

### Artifact Storage

Build artifacts from `app/**/*` projects are emitted to an `out` directory within each app.
These static assets must be stored in Cloudflare R2 within a `staging` and `production` prefix.
For example,

```
build-artifacts
- staging
   - games-dobble
      - index.html (from commit #10)
- production
   - games-dobble
      - index.html (from commit #7)
```

### Deployment Workflows

| Workflow              | What it deploys                     | When to run                       |
| --------------------- | ----------------------------------- | --------------------------------- |
| **Manual Deploy**     | App content (e.g., `core/home`)     | When you update application code  |
| **Deploy Dispatcher** | Routing logic (`router-dispatcher`) | When you update routing/URL logic |

### How to deploy

1. Head to the **Actions** tab in GitHub.
2. **For Apps**: Select `Manual Deploy`, enters the path (e.g., `core/home`), select environment, and run.
3. **For Routing**: Select `Deploy Dispatcher` and run.
