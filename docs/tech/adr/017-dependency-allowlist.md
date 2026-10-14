# ADR-017: Dependency allowlist

- Status: Accepted (revised 2026-10-15 for the Express + Prisma API, ADR-020) · Date: 2026-10-14 · Owner: Tech Lead
- Source: lean-architecture rule "every new dependency needs an ADR"

## Decision

Runtime dependencies outside this list (and outside what the Expo SDK 57 template, Next.js 16 template, shadcn CLI and RN Reusables CLI install) need a new row here, approved in code review. Prefer the platform: `fetch`, `Intl`, `crypto.subtle`, `URL`, Web Share API, `next/og`, Expo modules.

| Package | Where | Why (and what it replaces) |
|---|---|---|
| `@supabase/supabase-js`, `@supabase/ssr` | web, mobile (auth and Realtime only), api (Admin API only) | Supabase Auth sessions, Realtime Broadcast (ADR-023) |
| `@tanstack/react-query` | web (client components), mobile | Cache, retry, offline for client fetching over the REST API |
| `zod` 4 | validation (all) | Request schemas and DTOs shared by the API and the clients |
| `react-hook-form`, `@hookform/resolvers` | web, mobile | Forms with zod; RN Reusables and shadcn form patterns |
| `next-intl` / `use-intl` | web / mobile | ADR-008 |
| `@formatjs/intl-pluralrules` | mobile (conditional polyfill) | Only if Hermes lacks `sl` plural rules |
| `maplibre-gl` / `@maplibre/maplibre-react-native` | web / mobile | ADR-007 |
| `exifr` | web | EXIF GPS/time read before re-encode (ADR-014) |
| `idb-keyval` | web | IndexedDB drafts (≈ 600 B) |
| `@react-native-firebase/app`, `@react-native-firebase/analytics` | mobile | ADR-009 |
| `expo-image-picker`, `expo-image-manipulator`, `expo-location`, `expo-notifications`, `expo-web-browser`, `expo-secure-store`, `expo-sqlite`, `expo-file-system`, `expo-sharing`, `expo-apple-authentication`, `expo-dev-client`, `react-native-webview`, `expo-network`, `expo-background-task`, `expo-task-manager` | mobile | Expo-native capabilities (offline data layer and geofencing: ADR-019) |
| `@react-native-google-signin/google-signin` | mobile | Native Google ID token for `signInWithIdToken` |
| `@react-pdf/renderer` | web (server route only) | A4 poster PDF with embedded fonts (š, č, ž) |
| `qrcode` | web (server) | QR on posters |
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
| `@asteasolutions/zod-to-openapi` | api | OpenAPI from the zod schemas (docs outside production) |
| `stripe` | api | ADR-011 |
| `pdfkit` | api (worker) | Receipt and fiscal invoice PDFs (klikni uses it; TASK-92) |
| `@anthropic-ai/sdk` | api worker (M3) | ADR-012 |
| `@sentry/nextjs`, `@sentry/react-native` | web, mobile (M5, TASK-70) | Error tracking, EU region, PII scrubbing |
| Dev: `vitest`, `@testing-library/*`, `jsdom`, `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`, `linkinator`, `jest-expo`, `secretlint`, `supabase` (CLI), `turbo`, `eslint`, `prettier`, `typescript` | repo | ADR-001, ADR-015 |
| Dev: `@eslint/js`, `typescript-eslint`, `globals` | repo | Root ESLint base config: JS recommended rules, TypeScript parsing and rules, Node globals for scripts (TASK-3.1) |
| Dev: `tsx`, `tsup`, `supertest` | api | Dev runner, build, HTTP tests (klikni toolchain, ADR-020) |
| Dev: `husky`, `lint-staged` | repo | Pre-commit lint and format (klikni practice) |
| Removed 2026-10-15: `deno` | repo | No Edge Functions any more (ADR-020) |

Not used, on purpose: Redis, BullMQ, Socket.IO, node-cron, multer, morgan, nodemailer/pug, jsonwebtoken (klikni items replaced, ADR-020), MMKV, WatermelonDB/RxDB, TanStack query persisters (ADR-019), date libraries (use `Intl`), lodash, axios, state managers (React state + TanStack Query), CSS-in-JS, Redux, UUID packages (`crypto.randomUUID`), HEIC converters, TUS clients, Mapbox/Google SDKs, i18next.

## Consequences

- Reviewers reject unlisted runtime dependencies; adding one is a one-row PR to this ADR.
