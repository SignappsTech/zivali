source: docs/04-technical-design.md (v0.4) §Architecture, §Technology stack, §Repository structure; docs/05-quality-security-plan.md (v0.4) §Quality gates, §Definition of Done

# Frontend slice (apps/web, apps/mobile, packages/{tokens,api,i18n,analytics})

Read this, your task packet, the contract(s) it references, the design page slice and the content page slice. Visual rules live in `docs/design/system.md`; never open the masters (`docs/0*.md`). If the packet is not enough, report `needs-input`.

## Stack (pinned in the lockfile)

| | Web (`apps/web`) | Mobile (`apps/mobile`) |
|---|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript strict | Expo SDK 57, Expo Router, React Native 0.86.3 as pinned by the SDK 57 template (New Architecture), development builds (`expo-dev-client`) |
| UI | shadcn/ui (Radix) + Tailwind 4, themed by `@zivali/tokens/{tokens,web}.css` | React Native Reusables + NativeWind 4.2 / Tailwind 3.4, `@zivali/tokens/native.css` + `tailwind-preset` |
| Icons, toasts, sheets | `@phosphor-icons/react`, `sonner`, shadcn `sheet` | `phosphor-react-native`, `sonner-native`, `@gorhom/bottom-sheet` |
| Data | server components with `@supabase/ssr`; client components with TanStack Query over `@zivali/api` | TanStack Query over `@zivali/api`, `supabase-js` session in `expo-sqlite` localStorage |
| Forms | react-hook-form + zod (`@zivali/validation`) | same |
| i18n | next-intl (SL unprefixed, EN `/en`) | use-intl with the same catalogues |
| Maps | `maplibre-gl` (dynamic import, client only) | `@maplibre/maplibre-react-native` (dev build) |
| Analytics | `@zivali/analytics` (`ga4` adapter after consent) | `@zivali/analytics` (`firebase` adapter after consent) |
| Tests | Vitest + Testing Library (jsdom); Playwright + axe (`apps/web/e2e`) | jest-expo + Testing Library RN; Maestro flows (`apps/mobile/e2e`) |

Only dependencies listed in `docs/tech/adr/017-dependency-allowlist.md` (or installed by the Next/Expo/shadcn/RNR templates) may be added. Need another one: report `needs-input` with the reason.

## Repo map (your side)

    apps/web/
      app/[locale]/(public)/…      public pages (home, map, report flows, /r/[code], partners, info, legal)
      app/[locale]/(app)/…         signed-in areas (my pets, my reports, inbox, account)
      app/[locale]/(admin)/admin/… admin console (aal2)
      app/r/[code]/opengraph-image.tsx, app/r/[code]/poster.pdf/route.ts, app/a/[id]/route.ts, app/api/health/route.ts
      app/captcha/page.tsx, app/dev/{kit,checkout}/page.tsx (dev only), public/.well-known/*
      components/ui/               shadcn components, edited to the design system (§10)
      components/<feature>/        feature components; components/report/slots/<slot>.tsx (C15)
      lib/supabase/{server,client,middleware}.ts, lib/env.ts (zod-validated env), lib/query.ts
      content/legal/{sl,en}/*.mdx  legal pages
      e2e/                         Playwright specs (smoke + flows)
      middleware.ts                next-intl + Supabase session refresh
    apps/mobile/
      app/_layout.tsx, app/(tabs)/{index,report,inbox,profile}.tsx, app/r/[code]/…, app/m.tsx,
      app/report/{lost,found}/…, app/pets/…, app/inbox/[id].tsx, app/settings/…, app/auth/…, app/payments/return.tsx
      components/ui/               RN Reusables components, edited to the design system
      components/<feature>/, lib/{supabase,env,query,net}.ts, e2e/*.yaml (Maestro)
      lib/db/ (expo-sqlite store + local migrations), lib/data/reports.ts (only path for report lists: network or offline cache),
      lib/offline/{sync,outbox,geofence,wipe}.ts (C17)
      app.config.ts (bundle id si.signapps.zivali, scheme zivali), eas.json, firebase.json
    packages/tokens/   build.mjs → dist/ (C2)                packages/api/  src/<domain>.ts (C3–C14), geocode.ts
    packages/i18n/     messages/{sl,en}/<ns>.json (C16)      packages/analytics/ src/ (C12)
    packages/types/src/domain/*  (read-only for you)       packages/validation/src/* (read-only for you)

## Ownership and shared files

- **Root layouts and providers** are owned in this order, each later task depends on the earlier: web `app/[locale]/layout.tsx`, `providers.tsx`, `middleware.ts`: scaffold → i18n web → tokens/theme binding → web shell → auth web / analytics web / consent web. Mobile `app/_layout.tsx`: scaffold → i18n mobile → tokens/theme binding → mobile shell → analytics mobile / auth mobile / consent mobile. Touch them only if your task is in that chain.
- **i18n**: add keys only in your feature's namespace files (`packages/i18n/messages/{sl,en}/<ns>.json`); both locales in the same commit. Copy comes from the content slice; if missing, use a clear SL+EN draft and list the keys in your report (`CHANGE docs/content/...` request).
- **`@zivali/api`**: one file per domain (`src/reports.ts`, `src/chat.ts`, …), exported by subpath (`@zivali/api/reports`); no barrel edits. You write the client functions against the contract; the backend task implements the RPC. Until it is merged, tests mock the Supabase client and pages may use fixtures from the contract example (`src/__fixtures__/<domain>.ts`). Never wait for the backend.
- **Report detail slots**: fill your slot in `components/report/slots/<name>.tsx`; do not edit the detail page layout unless your task owns it.
- Generated files (`packages/tokens/dist`, `packages/i18n/dist`, `packages/types/src/database.ts`) are never edited by hand.

## Standards

- TypeScript strict, no `any` without a comment; ESLint + Prettier clean.
- Components use semantic tokens only (no hex, no primitives); cards flat (no border, no shadow); status = icon + word + colour; one `h1` per page; targets ≥ 44 px; visible labels above fields; errors as text + icon tied with `aria-describedby`; reduced motion honoured (design system §12).
- Same component names and props on web and mobile (`Button`, `Input`, `FormField`, `StatusLabel`, `MapView`, `LocationPicker`, `ReportSlot`, `AdSlot`, …).
- Web: server components by default; `"use client"` only where needed; MapLibre, PDF and heavy code via dynamic import; images with explicit width/height; no layout shift (reserved sizes for photos and ad slots).
- Mobile: safe areas, OS font scaling up to 200 % (`maxFontSizeMultiplier` 2), permission primer before every OS prompt (camera, location, notifications) with a working fallback on denial.
- Privacy: never render or log exact coordinates, chip numbers, emails or phone numbers of other users; `track()` only with registered params (C12); no PII in `console` output.
- Device storage (mobile): only the C17 tables (own drafts and outbox, public report cache) and secure-store tokens; never persist chat, matches, notifications or other private queries (no TanStack persister); screens read report lists only through `lib/data/reports.ts`; sign-out calls `wipeLocalData()`.
- Accessibility first: every map has a list alternative; every icon-only button has an accessible name; dialogs and sheets trap and restore focus.
- No ad component in protected flows (C15): report-lost, report-found, manage, inbox and conversations, sign-in/up/reset, payments return.

## Error handling

- `@zivali/api` throws `ApiError { code, message, details }` (codes in C1). Map `code` to `t('errors.<code>')`; show inline for forms, toast for background actions, an error state component for pages.
- Network errors: TanStack Query retries 2× (not for 4xx); forms keep user input; drafts persist (C4 §Drafts).
- Unknown errors: generic localised message + `request id` if available; never raw messages or stack traces.
- Next: `error.tsx` per route group, `not-found.tsx`, and the 410 "no longer available" page for `GONE`.

## Environment variables (names only; values in `.env.local`, never committed)

| Web | Mobile | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase (local values printed by `supabase status`; staging = project `najdimo`, new-style publishable key) |
| `NEXT_PUBLIC_APP_URL`, `APP_ENV` (`local`/`staging`/`production`) | `EXPO_PUBLIC_APP_URL`, `EXPO_PUBLIC_APP_ENV` | links, guards for dev pages |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` (`mock`/`ga4`), `NEXT_PUBLIC_GA_MEASUREMENT_ID`; server-only `GA_PROPERTY_ID`, `GA_SERVICE_ACCOUNT_KEY_FILE` (GA Data API for partner stats behind a flag, admin scripts; the key file stays in `.secrets/`) | `EXPO_PUBLIC_ANALYTICS_PROVIDER` (`mock`/`firebase`) | C12 |
| `NEXT_PUBLIC_GEOCODER` (`maptiler`/`photon`/`mock`), `NEXT_PUBLIC_MAPTILER_KEY` (value of the team's `MAPTILER_API_KEY`, a public domain-restricted key) | `EXPO_PUBLIC_GEOCODER`, `EXPO_PUBLIC_MAPTILER_KEY` | C6 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (empty = captcha off) | uses web `/captcha` page | C7 |
| `SUPABASE_SECRET_KEY` (server routes only: ad click, OG; never `NEXT_PUBLIC_`) | - | never exposed to the browser |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (value of the team's `STRIPE_PUBLISHABLE_KEY`, pk_test only; optional, Checkout is server-created) | - | payments (C13) |
| - | `GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICE_INFO_PLIST` (EAS file secrets; locally from `.secrets/`) | Firebase config |
| - | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | native Google sign-in (credential-gated) |

`lib/env.ts` validates with zod at startup and fails fast with the variable name.

## Commands

| Command | What |
|---|---|
| `pnpm bootstrap` | install, `supabase start`, `db reset` (migrations + seed), seed photos, build tokens and i18n |
| `pnpm dev` | web on :3000 (+ packages in watch) ; `pnpm --filter mobile start` for the Expo dev server |
| `pnpm --filter web test` / `pnpm --filter mobile test` | Vitest / jest-expo |
| `pnpm --filter web e2e` | Playwright against the local stack (starts the web app) |
| `pnpm --filter @zivali/i18n check` | key parity and SL plurals |
| `pnpm --filter @zivali/tokens build` | tokens + contrast lint |
| `pnpm quality` | quality kit: axe + console errors + visual + Lighthouse CI + links |
| `pnpm verify` | everything CI runs (required before reporting done) |
| `pnpm db:drain` | run queued jobs once (matching, notifications) when testing flows |
| `eas build --profile development --platform android` | Android dev client (cloud; `EXPO_TOKEN` set). iOS waits for the Apple account |

Local fixture accounts (password `zivali-local-only`): `owner@zivali.test`, `owner2@zivali.test`, `finder@zivali.test`, `shelter@zivali.test`, `mod@zivali.test`, `admin@zivali.test`. Emails land in the local mail catcher at http://localhost:54324.

Windows notes: Docker Desktop must run for Supabase; use Git Bash or PowerShell; Android emulator from Android Studio for Maestro; set `git config core.autocrlf false` (repo uses LF).

## Git

Branch `agent/<task-id>-<slug>` from `main`; commits `<task-id>: <what>`; never merge; report with screenshots (mobile 390 px and desktop 1440 px for web UI; Android screenshots for mobile UI).

## Definition of Done and gate checklist

- [ ] Acceptance criteria met and demonstrated (screenshots / test output)
- [ ] Matches the design page slice and `docs/design/system.md` (tokens only, states: default, focus, disabled, error, loading, empty)
- [ ] Copy from the content slice, SL and EN complete; `@zivali/i18n check` passes
- [ ] Tests added or updated: unit/component for logic and states; Playwright for new web routes; jest-expo for new mobile screens
- [ ] `pnpm verify` passes (lint, typecheck, unit, i18n, tokens, build, e2e smoke)
- [ ] Gates for touched web pages: Lighthouse perf ≥ 90 (map ≥ 80), a11y ≥ 95, SEO ≥ 95 (public pages), LCP < 2.5 s, CLS < 0.1, initial JS < 250 KB gz (map excluded); axe 0 violations; 0 broken links
- [ ] No ad slot in protected flows; no analytics request or `_ga` cookie before consent
- [ ] Keyboard and screen reader checked on the new UI; touch targets ≥ 44 px; works at 320 px width and 200 % text
- [ ] No PII in logs or analytics; no secrets in code; no new dependency outside ADR-017
- [ ] Mobile: nothing private written to device storage beyond C17; offline and error states explicit; no background location without opt-in
- [ ] No unrelated changes; README or package README updated if behaviour or commands changed
