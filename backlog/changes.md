# CHANGE inbox

Agents append requested changes to documents they don't own. The lead sends each owner's open rows in ONE batched cheap run (`changes.mjs list`).

| id | owner | target | change | from | status |
|---|---|---|---|---|---|
| CH-1 | tech-lead | docs/tech/frontend.md§Repo map | Next 16: middleware.ts is now proxy.ts (CSP nonce + Supabase session + next-intl) | TASK-3.3 | open |
| CH-2 | tech-lead | docs/tech/frontend.md§Env | Add web APP_VERSION (default dev, used by /api/health) to the env table and .env.example | TASK-3.3 | open |
| CH-3 | tech-lead | docs/tech/contracts/C15-routes-deeplinks.md§Web routes | Exclude /captcha and /dev/* from the proxy matcher when those tasks add them | TASK-3.3 | open |
| CH-4 | tech-lead | backlog TASK-10.1 / error-pages task | Follow-ups from 3.3 review: lib/env.ts must not default NEXT_PUBLIC_API_URL to localhost outside APP_ENV=local; add app/[locale]/[...rest]/page.tsx calling notFound() so 404s get the CSP nonce; playwright should start the standalone server; e2e: anchor script-src regex + assert nonce differs per request | TASK-3.3 | open |
| CH-5 | tech-lead | docs/tech/contracts/C1-platform-conventions.md§HTTP | Name the request id response header: @zivali/api (TASK-3.5) reads x-request-id into ApiError.requestId for the generic error message; TASK-3.7 should set it on every response (also on errors). | - | open |
| CH-6 | tech-lead | docs/tech/adr/020-api-architecture.md§Client | Client decision 2026-10-15: klikni-style API toolchain. OpenAPI generated from zod via @asteasolutions/zod-to-openapi (registry in the validation package), Swagger UI at /docs (local/staging; prod admin-only or off), RTK Query + @rtk-query/codegen-openapi generated client in packages/api with our createApiClient as baseQuery. Replaces TanStack Query everywhere. | client | open |
| CH-7 | tech-lead | docs/tech/frontend.md§Data fetching | TanStack Query → RTK Query (Redux store Provider in web and mobile; generated hooks from packages/api); update the env/repo map; Next transpilePackages for @zivali/api | client | open |
| CH-8 | tech-lead | docs/tech/adr/017-dependency-allowlist.md§Decision | Add @reduxjs/toolkit, react-redux, @rtk-query/codegen-openapi (dev), @asteasolutions/zod-to-openapi, swagger-ui-express (or equivalent) | client | open |
| CH-9 | tech-lead | backlog (web) | Follow-up task: apps/web swap the TanStack QueryClientProvider (from TASK-3.3) for the Redux store Provider + generated RTK Query api; check FE task packets that mention TanStack | client | open |
