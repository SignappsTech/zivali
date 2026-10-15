# CHANGE inbox

Agents append requested changes to documents they don't own. The lead sends each owner's open rows in ONE batched cheap run (`changes.mjs list`).

| id | owner | target | change | from | status |
|---|---|---|---|---|---|
| CH-1 | tech-lead | docs/tech/frontend.md§Repo map | Next 16: middleware.ts is now proxy.ts (CSP nonce + Supabase session + next-intl) | TASK-3.3 | open |
| CH-2 | tech-lead | docs/tech/frontend.md§Env | Add web APP_VERSION (default dev, used by /api/health) to the env table and .env.example | TASK-3.3 | open |
| CH-3 | tech-lead | docs/tech/contracts/C15-routes-deeplinks.md§Web routes | Exclude /captcha and /dev/* from the proxy matcher when those tasks add them | TASK-3.3 | open |
| CH-4 | tech-lead | backlog TASK-10.1 / error-pages task | Follow-ups from 3.3 review: lib/env.ts must not default NEXT_PUBLIC_API_URL to localhost outside APP_ENV=local; add app/[locale]/[...rest]/page.tsx calling notFound() so 404s get the CSP nonce; playwright should start the standalone server; e2e: anchor script-src regex + assert nonce differs per request | TASK-3.3 | open |
