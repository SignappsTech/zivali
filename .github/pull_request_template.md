## Ticket

TASK-… : <title> (requirement: FR-…)

## Summary

What changed and why, in 2–4 bullets.

## Screenshots

| Mobile (390 px) | Desktop (1440 px) |
| --------------- | ----------------- |
|                 |                   |

## How to verify

Commands or URL, and the steps to check.

## Definition of Done

Full list: `docs/tech/frontend.md` / `docs/tech/backend.md` §Definition of Done.

- [ ] Acceptance criteria met; matches the contract and the design and content slices
- [ ] Tests added or updated and passing
- [ ] `pnpm verify` passes (format, lint, secretlint, audit, typecheck, unit, API tests, build, e2e smoke); `pnpm images` if a Dockerfile or dependencies changed
- [ ] Web pages touched: `pnpm quality` green (axe 0 violations, Lighthouse perf ≥ 90 / a11y ≥ 95 / SEO ≥ 95, links, visual reviewed)
- [ ] No ad slot in protected flows; no analytics request or `_ga` cookie before consent
- [ ] Security reviewed (validation, escaping, secrets, headers); errors handled; no PII in logs or analytics
- [ ] No new dependency outside ADR-017; no unrelated changes; docs updated
