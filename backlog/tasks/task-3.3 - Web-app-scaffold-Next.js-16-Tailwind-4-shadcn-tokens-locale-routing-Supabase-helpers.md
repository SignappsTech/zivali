---
id: TASK-3.3
title: >-
  Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing,
  Supabase helpers
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:11'
updated_date: '2026-10-15 00:14'
labels:
  - tech
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-1.1
  - TASK-3.8
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C2-design-tokens.md
  - docs/tech/contracts/C15-routes-deeplinks.md
  - docs/tech/contracts/C16-i18n.md
parent_task_id: TASK-3
priority: high
ordinal: 114000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
All web stories need one Next.js app with the token theme, locale routing, Supabase session helpers and test runners in place.

## Packet

Unblocks on: Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README merged (TASK-3.1); Tokens pipeline: packages/tokens generated from docs/design/tokens.json merged (TASK-1.1); Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for apps/api merged (TASK-3.8)
Contracts: C2, C15, C16 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-3.3-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/web (Next.js 16 App Router, React 19, TypeScript strict) runs with `pnpm dev` and builds with `pnpm --filter web build`.
- [ ] #2 Tailwind 4 and shadcn are initialised (components.json with cssVariables); globals.css imports @zivali/tokens tokens.css and web.css; Bricolage Grotesque and Atkinson Hyperlegible Next load through next/font and map to --font-display and --font-sans; light and dark follow the OS.
- [ ] #3 next-intl routing skeleton: app/[locale] with SL unprefixed and EN under /en, middleware and a placeholder message file; a sample page renders in both languages.
- [ ] #4 lib/supabase server, browser and middleware helpers (@supabase/ssr), lib/env.ts (zod, fails fast naming the variable), providers.tsx with TanStack Query, and /api/health exist.
- [ ] #5 Vitest with Testing Library runs one component test; Playwright (apps/web/e2e) runs one smoke test against the local server.
- [ ] #6 Baseline security headers (HSTS, nosniff, Referrer-Policy, frame-ancestors none, Permissions-Policy) and a nonce-based CSP scaffold are configured.
<!-- AC:END -->
