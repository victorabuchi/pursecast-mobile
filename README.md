# Pursecast Mobile

The Expo/React Native app for Pursecast, porting the same features and content
as the web app (`../pursecast`, a Next.js + Prisma/Postgres app) to a native
mobile experience. Screens, copy, and business logic are ported 1:1 from the
web app; nothing here is redesigned or invented.

## Stack

- [Expo](https://expo.dev) + [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing, same mental model as the web app's Next.js App Router)
- TypeScript, React Native, `react-native-svg` for the mark and charts
- `expo-secure-store` for the session token

## Status

Ported from the web app, with its copy, colours and logic: sign in and sign up with email, Google or
Apple; the app frame (top bar, bell, search, calculator, note,
account menu, tab bar); Forecast (Money Weather), Spending (activity, bills and
income, owed, budgets, the pause note), Worth-It (with voice notes), Forks, Plan
ahead (calendar, set aside, when money lands, want to buy), Statements, Banks,
Setup (first run and edit) and Settings (profile, password, notifications,
appearance, export, delete account).

Differences from the web app:

- The floating note edits text and checklists; the web's rich editor (text styles,
  pictures, tables, markup) is not ported. A note with those opens read-only.
- Notifications use Expo push tokens (the server sends to them as well as to
  browsers); they need the EAS project id, set by `eas init`.
- Links to the web's landing, privacy and terms pages open in the browser.

`lib/money/*`, `lib/statements/*` (types, analysis, tabular), `lib/icons.ts`,
`lib/photo-url.ts`, `lib/drafts.ts`, `lib/notes/plain.ts`, `lib/chart.ts` and
`lib/icon-paths.ts` are verbatim copies of their web counterparts, so re-copy
them when the web versions change.

## Backend: server actions vs. the mobile API

The web app's own pages run on Next.js server actions behind a same-origin,
cookie session (`pursecast_session`), which can't be called from outside
Next.js. The web app therefore also exposes a small `/api/mobile/*` surface
(`src/app/api/mobile/*` and `src/lib/mobile/redirect.ts` in `../pursecast`)
that uses a bearer token instead of the cookie:

| Route | What it does |
| --- | --- |
| `POST /api/mobile/apple`, `/exchange` | Native Sign in with Apple (the identity token is checked against Apple's keys) and the swap of a Google/Apple browser sign-in's code for a token (PKCE) |
| `POST /api/mobile/login`, `/signup` | The login page's password sign-in and sign-up, answering with a token |
| `GET /api/mobile/me` | Who is signed in and whether first-time setup is done |
| `GET /api/mobile/money?days=` | The same `loadMoney()` the web pages are built from, as JSON (`409 {setup:true}` until a balance is set) |
| `GET /api/mobile/page/<name>` | One screen's data: the money load plus that page's extra queries (forecast, spending, worth-it, forks, plan) |
| `GET /api/mobile/shell`, `/settings`, `/setup`, `/banks`, `/statements` | The frame's bell and palette, and the data of the screens that do not need a balance yet |
| `POST/DELETE /api/mobile/push` | Registers this phone's Expo push token |
| `POST /api/mobile/action/<name>` | Runs one of the web's own server actions by name (`{form}` becomes its FormData, `{args}` for plain arguments), answering with the toast or error the web would redirect with |

`readSession()` in `src/lib/auth/session.ts` accepts `Authorization: Bearer
<token>` as well as the cookie, so the existing `/api/statements` upload works
from the app too.

## Running

```bash
npm install
npm run ios      # or: npm run android / npm run web
```

Point `EXPO_PUBLIC_API_URL` at the web app's dev server. `http://localhost:3000`
only works from the iOS simulator (it shares the host's network); a physical
device needs your machine's LAN IP, and the Android emulator needs
`http://10.0.2.2:3000`.

## Releasing

`eas.json` follows the other apps: `production` builds an iOS archive and an
Android `.aab` against `https://pursecast.com`; `preview` builds an
internal APK.

```bash
eas init                                  # first time: creates the EAS project id in app.json
eas build --platform all --profile production
eas submit --platform ios
eas submit --platform android
```

Bundle id / package: `com.pursecast.app` (change in `app.json` before the first
build if you want another).
