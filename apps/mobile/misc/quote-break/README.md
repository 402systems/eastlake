# Quote Break (Mobile)

Expo app for motivational quotes: enter your own quotes, and get one sent to
you as a notification after you've spent a set amount of time on your phone.
No login, no backend — everything lives on-device.

## How the reminder works

A phone can't ask another OS "how long has this user been on their phone" —
there's no such API for regular apps. This app instead tracks **screen-on
time** as a close, practical proxy for "on your phone": an Android foreground
service listens for the screen turning on/off, accumulates the on-time, and
fires a local notification with a random quote once it crosses your threshold
(default 15 minutes), then starts counting again from zero.

This is implemented as a small local native module (`modules/quote-break`)
using the [Expo Modules API](https://docs.expo.dev/modules/module-api/):

- `ScreenTimeService.kt` — a foreground service that registers a
  `BroadcastReceiver` for `ACTION_SCREEN_ON`/`ACTION_SCREEN_OFF`, keeps a
  running total in `SharedPreferences`, and posts the notification.
- `BootCompletedReceiver.kt` — restarts the service after a reboot if
  monitoring was left on.
- `QuoteBreakModule.kt` — the JS-facing API (`startMonitoring`,
  `stopMonitoring`, `setQuotes`, `setThresholdMinutes`, `isMonitoring`).

**This only works on Android.** iOS gives third-party apps no access to real
device usage data at all (Apple's Screen Time / `DeviceActivity` APIs are
locked to parental-control use cases under a restricted entitlement), so
there's no iOS equivalent to build here.

**This requires a custom dev/production build, not Expo Go.** Local native
modules aren't part of the Expo Go binary. In Expo Go the app still works for
entering/managing quotes, but the reminder toggle will show a message that
screen-time tracking isn't available.

## Setup

```bash
# From the repo root
pnpm install

cd apps/mobile/misc/quote-break
pnpm prebuild        # generates ./android from the app.json config + modules/
```

Then either build with EAS or run locally with Android Studio / the Android
SDK installed:

```bash
pnpm build:android   # EAS build (produces an installable APK)
# or, with a local Android SDK set up:
npx expo run:android
```

Every time you change native code under `modules/quote-break/android`, rerun
`pnpm prebuild` (or a fresh `expo run:android`) — native changes aren't
picked up by Fast Refresh.

### After installing on your phone

1. Open the app and add a couple of quotes.
2. Turn on "Screen Time Reminders" — this asks for notification permission,
   then starts the background service.
3. Some Android phones (Samsung, Xiaomi, etc.) aggressively kill background
   services to save battery. If reminders stop firing after a while, check
   Settings → Apps → Quote Break → Battery and disable battery optimization
   for the app.

## Scripts

| Command              | Description                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm start`         | Start the Metro dev server                                                               |
| `pnpm android`       | Start and open in a connected Android device/emulator (Expo Go — no screen-time feature) |
| `pnpm prebuild`      | Regenerate the native `android/` project                                                 |
| `pnpm build:android` | EAS build for Android (installable APK)                                                  |
