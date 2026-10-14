# ADR-015: Vitest, pgTAP, Playwright (+ axe, Lighthouse CI), jest-expo, Maestro

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Source: NFR-QUAL, NFR-A11Y, NFR-PERF, TASK-4, TASK-39

## Decision

| Layer | Tool | Where |
|---|---|---|
| Unit (packages, web logic, Edge Function pure logic) | Vitest 5 | `packages/*/src/**/*.test.ts`, `apps/web/**/*.test.ts(x)`, `supabase/functions/**/*.test.ts` (pure modules only) |
| Web components | Vitest + Testing Library (jsdom) | `apps/web` |
| Database (RLS matrix, RPCs, triggers, constraints) | pgTAP via `supabase test db` | `supabase/tests/*.sql` |
| Edge Functions (integration) | Vitest calling the local functions endpoint | `supabase/functions/**/integration.test.ts` |
| Web end-to-end + accessibility + visual | Playwright 1.6x + `@axe-core/playwright` | `apps/web/e2e/` (smoke, flows), `tests/quality/` (quality kit) |
| Performance, SEO | Lighthouse CI (`@lhci/cli`), mobile preset | `lighthouserc.json` |
| Mobile components | jest-expo + `@testing-library/react-native` | `apps/mobile/**/*.test.tsx` |
| Mobile smoke on a dev build | Maestro flows (CLI, not an npm dependency) | `apps/mobile/e2e/*.yaml` |
| Secrets | secretlint | repo |
| Dependencies | `pnpm audit --audit-level high` | repo |

- Jest only where Expo requires it (jest-expo preset); everything else uses Vitest.
- All tests run offline against the local stack with mock adapters (P-6).

## Consequences

- Two JS test runners (Vitest and Jest) because React Native tooling is Jest-based; each app owns its config.
- Maestro needs an Android emulator or device; on Windows this is Android Studio's emulator.
