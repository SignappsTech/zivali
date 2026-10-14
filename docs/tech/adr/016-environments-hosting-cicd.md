# ADR-016: Local, staging, production; credential-gated deploys; `pnpm verify` until a Git remote exists

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Source: NFR-AVAIL, NFR-DEVX, TASK-4, TASK-5, R-001, Q-002, Q-007

## Decision

- **Environments**: local (Docker Supabase + Next dev + Expo dev client), staging (Vercel project for `apps/web` + Supabase project `najdimo`, ref `omtpppzrugibquukhnyl`, eu-central-1 + EAS `preview`), production (Vercel production + a second Supabase project in eu-central-1 created before public launch + EAS `production`, no store submission). Supabase, Vercel, Expo and Stripe test credentials arrived on 2026-10-15; staging deploys are live, production stays credential-gated until its project exists.
- **CI** in GitHub Actions (`.github/workflows/ci.yml`, `deploy-staging.yml`). The repository is `git@github.com:pbozic/zivali.git` (SSH; no `GITHUB_*` tokens needed locally). **`pnpm verify`** runs the same gates locally and every implementer runs it before reporting done; hosted CI needs the deploy secrets added as GitHub Actions secrets.
- **Credential gating**: `scripts/deploy.mjs <staging|production> [--dry-run]` checks required variables first. Missing variables print `NEEDS-INPUT: <names>` and the script runs the dry-run path (build all, `supabase db reset` from zero, `supabase db lint`, `deno check` on functions, `expo export`) and exits 0. With credentials: `supabase link` → `db push` → `functions deploy` → `secrets set` → `vercel build --prod=false` → `vercel deploy --prebuilt` → smoke `/api/health` and `functions/v1/health`.
- **Migrations** are forward-only files with a written rollback note in the header (`-- rollback: …`); destructive changes use expand → migrate → contract across two releases.
- **Production deploys** are tagged releases (`vX.Y.Z`) with manual approval in the workflow.

## Consequences

- The gate still protects production and any machine without `.env.local`; on the team machine staging deploys run for real. Hosted CI needs GitHub Actions secrets (Supabase, Vercel, Expo) before deploy-staging.yml can run there.
- EAS Android preview builds work now (`EXPO_TOKEN` is set); iOS waits for Q-007.
