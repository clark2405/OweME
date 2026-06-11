# OweMe — mobile app

The Expo (React Native) mobile app — the main OweMe product. See the
[repo README](../README.md) for the full picture and the
[`PROJECT.md`](../PROJECT.md) spec for product scope.

## Run it

```bash
npm install
npx expo run:ios            # native dev build + Metro
npx expo run:ios --device   # on a plugged-in iPhone
```

> Use the **dev build** above, not Expo Go — this app relies on native modules
> Expo Go can't load. Details + device setup are in the [repo README](../README.md#running-the-mobile-app).

Type-check before committing: `npx tsc --noEmit`.

## Layout (`src/`)

- `app/` — Expo Router routes (`(tabs)/`, `add`, `loans`, `onboarding`,
  `loan/[id]`, `borrower/[id]`).
- `components/` — shared animated UI primitives.
- `lib/` — design tokens (`theme`, `motion`), types, formatters, and the data
  layer (`store.ts`, currently an in-memory mock to be swapped for Supabase).
- `hooks/` — custom hooks.

Styling is React Native `StyleSheet` (no NativeWind). Design language: the
warm/playful OFF+BRAND craft in `.claude/skills/offbrand-design/`.
