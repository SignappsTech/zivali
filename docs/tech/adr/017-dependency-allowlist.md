# ADR-017: Dependency allowlist

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Source: lean-architecture rule "every new dependency needs an ADR"

## Decision

Runtime dependencies outside this list (and outside what the Expo SDK 57 template, Next.js 16 template, shadcn CLI and RN Reusables CLI install) need a new row here, approved in code review. Prefer the platform: `fetch`, `Intl`, `crypto.subtle`, `URL`, Web Share API, `next/og`, Expo modules.

| Package | Where | Why (and what it replaces) |
|---|---|---|
| `@supabase/supabase-js`, `@supabase/ssr` | web, mobile, api, functions | Supabase client; SSR cookie session |
| `@tanstack/react-query` | web (client components), mobile | Cache, retry, offline for client fetching (ADR-003) |
| `zod` 4 | validation (all) | Contracts shared by clients and Edge Functions |
| `react-hook-form`, `@hookform/resolvers` | web, mobile | Forms with zod; RN Reusables and shadcn form patterns |
| `next-intl` / `use-intl` | web / mobile | ADR-008 |
| `@formatjs/intl-pluralrules` | mobile (conditional polyfill) | Only if Hermes lacks `sl` plural rules |
| `maplibre-gl` / `@maplibre/maplibre-react-native` | web / mobile | ADR-007 |
| `exifr` | web | EXIF GPS/time read before re-encode (ADR-014) |
| `idb-keyval` | web | IndexedDB drafts (≈ 600 B) |
| `@react-native-firebase/app`, `@react-native-firebase/analytics` | mobile | ADR-009 |
| `expo-image-picker`, `expo-image-manipulator`, `expo-location`, `expo-notifications`, `expo-web-browser`, `expo-secure-store`, `expo-sqlite`, `expo-file-system`, `expo-sharing`, `expo-apple-authentication`, `expo-dev-client`, `react-native-webview` | mobile | Expo-native capabilities |
| `@react-native-google-signin/google-signin` | mobile | Native Google ID token for `signInWithIdToken` |
| `@react-pdf/renderer` | web (server route only) | A4 poster PDF with embedded fonts (š, č, ž) |
| `qrcode` | web (server) | QR on posters |
| `@next/mdx` | web | Legal and long-form pages as MDX |
| `sonner` / `sonner-native` | web / mobile | Toasts (design system §10.10) |
| `@phosphor-icons/react` / `phosphor-react-native` | web / mobile | Icon set chosen by the design system (§8); replaces the lucide default of shadcn/RNR |
| `@gorhom/bottom-sheet` (with `react-native-reanimated`, `react-native-gesture-handler` from the Expo SDK) | mobile | Bottom sheets (map list sheet, filters); answers the design system's open item |
| `@expo-google-fonts/bricolage-grotesque`, `@expo-google-fonts/atkinson-hyperlegible-next` | mobile | Brand fonts (both packages exist on npm; web uses `next/font/google`) |
| `stripe` | functions | ADR-011 |
| `@anthropic-ai/sdk` | functions (M3) | ADR-012 |
| `@sentry/nextjs`, `@sentry/react-native` | web, mobile (M5, TASK-70) | Error tracking, EU region, PII scrubbing |
| Dev: `vitest`, `@testing-library/*`, `jsdom`, `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`, `linkinator`, `jest-expo`, `secretlint`, `supabase` (CLI), `turbo`, `eslint`, `prettier`, `typescript` | repo | ADR-001, ADR-015 |

Not used, on purpose: date libraries (use `Intl`), lodash, axios, state managers (React state + TanStack Query), CSS-in-JS, Redux, UUID packages (`crypto.randomUUID`), HEIC converters, TUS clients, Mapbox/Google SDKs, i18next.

## Consequences

- Reviewers reject unlisted runtime dependencies; adding one is a one-row PR to this ADR.
