# ADR-017: Dependency allowlist

- Status: Accepted (revised 2026-10-15 for the Express + Prisma API, ADR-020, and the RTK Query toolchain; rows added 2026-10-15 from TASK-3.4 and TASK-6.5; `expo-crypto` added by CH-43) · Date: 2026-10-14 · Owner: Tech Lead
- Source: lean-architecture rule "every new dependency needs an ADR"

## Decision

Runtime dependencies outside this list (and outside what the Expo SDK 57 template, Next.js 16 template, shadcn CLI and RN Reusables CLI install) need a new row here, approved in code review. Prefer the platform: `fetch`, `Intl`, `crypto.subtle`, `URL`, Web Share API, `next/og`, Expo modules.

| Package | Where | Why (and what it replaces) |
|---|---|---|
| `@supabase/supabase-js`, `@supabase/ssr` | web, mobile (auth and Realtime only), api (Admin API only) | Supabase Auth sessions, Realtime Broadcast (ADR-023) |
| `@reduxjs/toolkit` ^2.13 | `@zivali/api` (dependency) | RTK Query slice and store: cache, retry, hooks for client fetching over the REST API (ADR-020 §Client); replaces TanStack Query |
| `react-redux` ^9.3 | `@zivali/api` (peer + dev); web, mobile (`<Provider>`) | Store provider and hooks |
| Dev: `@rtk-query/codegen-openapi` ^2.2 | `@zivali/api` (task owner: the client package, TASK-3.5; web wiring TASK-3.10, mobile wiring: follow-up of TASK-3.4) | Generates the client (endpoints and hooks) from `apps/api/openapi.json` (`gen:api`) |
| `zod` 4 | validation (all) | Request schemas and DTOs shared by the API and the clients |
| `react-hook-form`, `@hookform/resolvers` | web, mobile | Forms with zod; RN Reusables and shadcn form patterns |
| `next-intl` / `use-intl` | web / mobile | ADR-008 |
| `@formatjs/intl-pluralrules` | mobile (conditional polyfill) | Only if Hermes lacks `sl` plural rules |
| `maplibre-gl` / `@maplibre/maplibre-react-native` | web / mobile | ADR-007. Mobile is pinned exactly to `@maplibre/maplibre-react-native` 11.4.1: Expo SDK 57 `bundledNativeModules.json` has no entry for it; 11.x peers are expo >= 54, react-native >= 0.80 (New Architecture); it adds its Expo config plugin (`app.config.ts`) and needs a new dev build (CH-278) |
| `exifr` | web | EXIF GPS/time read before re-encode (ADR-014) |
| `idb-keyval` | web | IndexedDB drafts (≈ 600 B) |
| `@react-native-firebase/app`, `@react-native-firebase/analytics` | mobile | ADR-009 |
| `expo-image-picker`, `expo-image-manipulator`, `expo-location`, `expo-notifications`, `expo-web-browser`, `expo-secure-store`, `expo-crypto`, `expo-sqlite`, `expo-file-system`, `expo-sharing`, `expo-apple-authentication`, `expo-dev-client`, `react-native-webview`, `expo-network`, `expo-background-task`, `expo-task-manager`, `react-native-svg` | mobile | Expo-native capabilities (offline data layer and geofencing: ADR-019); `react-native-svg` is Expo-pinned (`npx expo install`) and a required peer of `phosphor-react-native` (TASK-8.3) |
| `@react-native-google-signin/google-signin` | mobile | Native Google ID token for `signInWithIdToken` |
| `qrcode` (+ `@types/qrcode`, dev) | web (server) | QR on posters |
| `@next/mdx` | web | Legal and long-form pages as MDX |
| `sonner` / `sonner-native` | web / mobile | Toasts (design system §10.10) |
| `@phosphor-icons/react` / `phosphor-react-native` | web / mobile | Icon set chosen by the design system (§8); replaces the lucide default of shadcn/RNR |
| `@gorhom/bottom-sheet` (with `react-native-reanimated`, `react-native-gesture-handler` from the Expo SDK) | mobile | Bottom sheets (map list sheet, filters); answers the design system's open item |
| `@expo-google-fonts/bricolage-grotesque`, `@expo-google-fonts/atkinson-hyperlegible-next` | mobile | Brand fonts (both packages exist on npm; web uses `next/font/google`) |
| `express` 5, `helmet`, `cors`, `compression`, `express-rate-limit` (store: our Postgres table) | api | HTTP server and standard middleware (ADR-020) |
| `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg` | api | ORM, migrations, TypedSQL (ADR-020) |
| `jose` | api | JWT verification against the Supabase JWKS (C3) |
| `pg-boss` | api (worker) | Jobs and schedules in Postgres (ADR-022) |
| `pino`, `pino-http` (`pino-pretty` dev only) | api | Structured logs with request ids |
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | api | Cloudflare R2 (and MinIO locally) with presigned URLs (ADR-014) |
| `sharp` | api (worker) | Photo re-encoding and variants (ADR-014) |
| `@asteasolutions/zod-to-openapi` | validation, api (client decision, TASK-6.5: the zod schemas in `@zivali/validation` are the single OpenAPI source; the package exports the registry and `registerSchemas()`, the API builds the spec from it) | OpenAPI spec from the zod schemas (`apps/api/openapi.json`) feeding the RTK codegen. Swagger UI at `/docs` is served by `swagger-ui-express` (next row) |
| `swagger-ui-express` (+ `@types/swagger-ui-express`, dev) | api (TASK-3.12) | Swagger UI at `/docs` from the committed `openapi.json`: open in local and staging, admin + aal2 only in production. Serves its own bundled assets (no CDN) under a route-scoped CSP |
| `stripe` | api | ADR-011 |
| `pdfkit` (+ `@types/pdfkit`, dev) | api (worker); web (server route only: the A4 poster PDF, TASK-24.2) | Receipt and fiscal invoice PDFs (klikni uses it; TASK-92) and the poster PDF with embedded fonts (š, č, ž). Replaced `@react-pdf/renderer` for the poster on 2026-10-16: one PDF library across the repo, already in the lockfile, and Next keeps it external (`serverExternalPackages`) |
| `@anthropic-ai/sdk` | api worker (M3) | ADR-012 |
| `@sentry/nextjs`, `@sentry/react-native` | web, mobile (M5, TASK-70) | Error tracking, EU region, PII scrubbing |
| Dev: `vitest`, `@testing-library/*`, `jsdom`, `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`, `linkinator`, `jest-expo`, `secretlint` (with `@secretlint/secretlint-rule-preset-recommend`), `supabase` (CLI), `turbo`, `eslint`, `prettier`, `typescript` | repo | ADR-001, ADR-015 |
| Dev: `@eslint/js`, `typescript-eslint`, `globals` | repo | Root ESLint base config: JS recommended rules, TypeScript parsing and rules, Node globals for scripts (TASK-3.1) |
| Dev: `jest`, `@types/jest`, `react-test-renderer`, `react-dom` 19.2.3 | mobile | `jest-expo` runner and types; `react-test-renderer` is the RNTL 14 peer; `react-dom` pinned to the Expo template version (TASK-3.4) |
| `class-variance-authority` | mobile | Installed by the RN Reusables CLI for component variants (TASK-3.4); web already gets it from shadcn |
| Dev: `tsx`, `tsup`, `supertest` | api | Dev runner, build, HTTP tests (klikni toolchain, ADR-020) |
| Dev: `husky`, `lint-staged` | repo | Pre-commit lint and format (klikni practice) |
| Dev: `eslint-plugin-import-x` | repo | `import-x/order` with klikni's groups (builtin, external, internal; blank line between). Replaces klikni's `eslint-plugin-import`, which does not support ESLint 10; resolver-free for this rule (TASK-3.8) |
| Dev: `eslint-config-prettier` | repo | Last entry of the root ESLint config: turns off rules that conflict with Prettier, including those of the app presets (TASK-3.8) |
| Removed 2026-10-15: `deno` | repo | No Edge Functions any more (ADR-020) |

Prettier runs as its own step (`prettier --check .` in `pnpm verify`, `prettier --write` in lint-staged after `eslint --fix`), not as an ESLint rule. klikni's lint-staged already runs both tools in that order, so its `eslint-plugin-prettier` only repeats Prettier inside ESLint, slower and with noisier reports; the formatting result is the same (decision 2026-10-15, TASK-3.8).

Not used, on purpose: `eslint-plugin-prettier` and `eslint-plugin-import` (above), commitlint (commit format stays `<task-id>: <what>`, ADR-020), Redis, BullMQ, Socket.IO, node-cron, multer, morgan, nodemailer/pug, jsonwebtoken (klikni items replaced, ADR-020), MMKV, WatermelonDB/RxDB, query persisters such as redux-persist (ADR-019), date libraries (use `Intl`), lodash, axios, state managers beyond the RTK Query store (no extra Redux slices without an ADR), CSS-in-JS, UUID packages (`crypto.randomUUID`), HEIC converters, TUS clients, Mapbox/Google SDKs, i18next.

## Consequences

- Reviewers reject unlisted runtime dependencies; adding one is a one-row PR to this ADR.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-43: `expo-crypto` (mobile) for AES-256-GCM encryption of the Supabase session at rest (with `expo-secure-store`) |
| 1.2 | 2026-10-15 | CH-122: `react-native-svg` (mobile, Expo-pinned; peer of `phosphor-react-native`) |
| 1.3 | 2026-10-18 | CH-278: exact pin and requirements for @maplibre/maplibre-react-native 11.4.1 |
