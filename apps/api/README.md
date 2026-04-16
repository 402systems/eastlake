# API Layer

Cloudflare Workers organized as:

```
apps/api/
  core/api-gateway       — owns api.402systems.com, routes to all workers
  core/db-demo-api       — db demo worker
  misc/friend-tracker-api — friend tracker worker
```

All traffic goes through `api-gateway`. Individual workers are not called directly in production.

## Deploying

### Via GitHub Actions (after merging to main)

1. GitHub → Actions → **Deploy Worker** → Run workflow
2. Enter the package name and run

| Worker | Package name |
|--------|-------------|
| api-gateway | `@402systems/app-core-api-gateway` |
| friend-tracker-api | `@402systems/app-misc-friend-tracker-api` |

Always redeploy `api-gateway` if you add a new worker or change routing.

### Via CLI (for branches not yet merged)

```bash
# Login once
npx wrangler login

# Deploy a worker
cd apps/api/misc/friend-tracker-api
npx wrangler deploy src/index.ts

cd apps/api/core/api-gateway
npx wrangler deploy src/index.ts
```

## Adding a new worker

1. Create the worker under `apps/api/<category>/<name>/`
2. Add it as a service binding in `api-gateway/wrangler.jsonc`
3. Add a route for it in `api-gateway/src/index.ts`
4. Deploy both the new worker and api-gateway

## Secrets

Secrets are set once per worker on Cloudflare and persist across deploys.

```bash
cd apps/api/misc/friend-tracker-api
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
```

Values are in `apps/api/misc/friend-tracker-api/.dev.vars`.

## Testing

Get a JWT and hit the API:

```bash
cd apps/api/misc/friend-tracker-api
TOKEN=$(npx tsx scripts/get-token.ts you@example.com yourpassword)

# List friends
curl -H "Authorization: Bearer $TOKEN" https://api.402systems.com/friend-tracker/friends

# Create a friend
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}' \
  https://api.402systems.com/friend-tracker/friends
```

The token expires after ~1 hour. Re-run `get-token.ts` to refresh it.
