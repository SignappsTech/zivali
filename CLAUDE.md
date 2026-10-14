# Izgubljene živali

Lost pet finder (dogs and cats, Slovenia). Web and mobile. Brief: `docs/01-project-brief.md`.

## Dev team
- Mode: full
- Control: auto
- Tracker: local (Backlog.md)
- Review: local
- Base branch: main
- Auto-merge: approved (merge once review passes, report after)
- Stack: pnpm + Turborepo monorepo; apps/web Next.js (App Router) + shadcn/ui; apps/mobile Expo Router + React Native Reusables (NativeWind); shared packages (tokens, types, api, validation); Supabase (Postgres/PostGIS/pgvector, Auth, Storage, Realtime, Edge Functions); Vercel; EAS
- Run/preview: -
- Docs artifact: https://claude.ai/artifact/2jhatCqvPbqHhEHVsLexbW

## Accounts and services
- Stripe: all app resources (products, prices, webhooks, customers) live in the **"Najdimo sandbox"** account (`acct_1UQa5wAbrzQytqtO`), reached ONLY via `STRIPE_SECRET_KEY` in `.env.local`. The claude.ai Stripe connector points to a different account (the owner's personal one), so use it for docs/planner/search only, never for writes.
- Supabase: project `najdimo` (ref `omtpppzrugibquukhnyl`, eu-central-1). The other project in the org ("pbozic's Project") is unrelated: don't touch it.
- GA4: property `559038055`, web stream `G-PKY4SCX3RL`; admin via the service account in `.secrets/`.
