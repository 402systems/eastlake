# Friend Tracker API

Cloudflare Worker that provides a REST API for tracking friends, hangouts, and friend groups. Backed by Supabase with row-level security.

## Setup

```bash
# Create .dev.vars with Supabase credentials
echo 'SUPABASE_URL=https://sgsbfelkbsoueiickbrk.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_BIXr0dVqTzDWsXnfblaIvg_kp2gHCdZ' > .dev.vars

# Start dev server on localhost:8787
pnpm dev
```

## Auth

All endpoints require a Supabase JWT in the `Authorization: Bearer <token>` header.

Use the helper script to get a token:

```bash
npx tsx scripts/get-token.ts <email> <password>
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/friends` | List all friends |
| `POST` | `/friends` | Create a friend |
| `POST` | `/friends/:id/hangout` | Record a hangout (sets `last_action` to today) |
| `DELETE` | `/friends/:id` | Delete a friend |
| `PUT` | `/friends/:id/groups/:name` | Add friend to a group |
| `DELETE` | `/friends/:id/groups/:name` | Remove friend from a group |
| `DELETE` | `/groups/:name` | Remove a group from all friends |

### Create a friend

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "phone_number": "555-1234", "birthday": "1995-06-15"}' \
  http://localhost:8787/friends
```

Only `name` is required. `phone_number` and `birthday` are optional.

## Testing

Run the full end-to-end test suite (creates a test friend, exercises all endpoints, then cleans up):

```bash
npx tsx scripts/test-api.ts <email> <password>
```

## Deploy

```bash
# Via GitHub Actions
# Go to Actions > Deploy Worker > enter @402systems/app-misc-friend-tracker-api

# Locally
pnpm run deploy
```
