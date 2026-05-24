# Friend Tracker (Mobile)

Expo app for tracking friends and hangouts. Pairs with the [Friend Tracker API](../../api/misc/friend-tracker-api/README.md).

## Setup

Create a `.env` file in this directory (gitignored, you'll need to recreate it on each new clone):

```
EXPO_PUBLIC_SUPABASE_URL=https://sgsbfelkbsoueiickbrk.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_BIXr0dVqTzDWsXnfblaIvg_kp2gHCdZ
```

## Running on your phone

```bash
# From the repo root
pnpm install

cd apps/mobile/misc/friend-tracker
pnpm start
```

Scan the QR code with the Expo Go app. Your device must be on the same Wi-Fi network as your machine, or use tunnel mode:

```bash
pnpm start -- --tunnel
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Start the Metro dev server |
| `pnpm ios` | Start and open in iOS simulator |
| `pnpm android` | Start and open in Android emulator |
| `pnpm build:ios` | EAS production build for iOS |
| `pnpm build:android` | EAS production build for Android |
