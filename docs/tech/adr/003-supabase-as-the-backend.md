# ADR-003: Supabase is the API (RLS + RPC + Edge Functions); no separate API server

- Status: **Superseded by ADR-020** (2026-10-15, brief v1.0: Express + Prisma API; Supabase for Postgres and Auth only) · Date: 2026-10-14 · Owner: Tech Lead
- Source: brief §Constraints, NFR-SEC, NFR-DEVX

## Context

Web and mobile need the same backend behaviour. The client fixed Supabase (Postgres, PostGIS, pgvector, Auth, Storage, Realtime, Edge Functions) in the EU. A lean budget favours fewer moving parts.

## Decision

- **Both apps talk to Supabase directly** with `supabase-js` and the user's JWT. Postgres **Row Level Security on every table** is the authorisation layer.
- **Reads**: simple owner-scoped tables through PostgREST; anything public or cross-user through `security definer` SQL functions (RPC) that return whitelisted columns (for example `get_public_report`, `search_reports`). Public clients never select base tables that hold exact locations, chip numbers or contact data.
- **Writes**: simple owner-owned rows (pets, preferences) through PostgREST with RLS; multi-step domain operations through RPC functions (`create_report`, `transition_report`, `confirm_match`, `send_message`, `report_abuse`, …) with validation, rate limits and audit inside one transaction.
- **Edge Functions (Deno)** only where a secret or an external call is needed: `worker` (async jobs, ADR-004), `payments-checkout`, `stripe-webhook`, `submit-lead`, and later AI and imports. Shared pure logic (zod schemas, chip normalisation, matching score) lives in `packages/validation` and is imported by Edge Functions through `supabase/functions/deno.json` import map.
- **Next.js route handlers** only for web-specific concerns: Open Graph images, poster PDF, ad click redirect, `.well-known` files, health. No business logic duplicated in Next.
- **Realtime**: Postgres Changes on `messages` and `notifications` with RLS for the pilot scale (5k MAU). Upgrade path: Broadcast from Database with private channels if connection or change volume grows.
- **Client data fetching**: web server components read with the cookie session (`@supabase/ssr`); client components and the whole mobile app use RTK Query over `@zivali/api` (ADR-020 §Client: cache, retry, generated hooks).

## Alternatives

- A Node/Next API layer in front of Supabase: duplicates auth, adds hosting and latency; mobile would depend on Vercel uptime.
- GraphQL (pg_graphql): no gain over PostgREST + RPC for this domain; weaker typing in our generator flow.

## Consequences

- Authorisation bugs are RLS bugs: every table gets pgTAP tests in the RLS matrix (05 §Testing), and a test fails when a table has no RLS (TASK-6).
- Domain logic in SQL needs SQL skills and pgTAP tests; complex scoring stays in TypeScript inside the worker.
- `supabase gen types` produces `packages/types/src/database.ts` from migrations; it is regenerated, never hand-merged.
