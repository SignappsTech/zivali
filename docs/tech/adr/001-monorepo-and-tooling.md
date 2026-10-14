# ADR-001: pnpm + Turborepo monorepo, one TypeScript toolchain

- Status: Accepted (revised 2026-10-15: `apps/api` instead of Edge Functions, ADR-020; klikni formatting, TASK-3.8) · Date: 2026-10-14 · Owner: Tech Lead
- Source: brief §Constraints (Technical), NFR-DEVX

## Context

Web (Next.js) and mobile (Expo) share types, validation, API calls, i18n, analytics and design tokens. The client fixed pnpm + Turborepo. Windows 11 is a primary dev machine.

## Decision

- **pnpm 11 workspaces + Turborepo 2.** Layout: `apps/{api,web,mobile}`, `packages/{tokens,types,validation,api,i18n,analytics}`, `supabase/` (local stack config) at the root. Package scope `@zivali/*`; apps are unscoped (`api`, `web`, `mobile`) because `@zivali/api` is the REST client package.
- **Packages export TypeScript source** (`"exports": { "./*": "./src/*.ts" }`), no build step except `tokens` (generated CSS) and `i18n` (merged catalogues). Next (`transpilePackages`) and Metro compile them. Subpath exports per domain (`@zivali/api/reports`) instead of barrel files, so parallel tasks never edit the same index file.
- **One TypeScript version** across the workspace, the one pinned by the Expo SDK 57 template; `strict: true`; root `tsconfig.base.json`.
- **ESLint 10 flat config** at the root as the shared base; `apps/web` and `apps/mobile` each add their own `eslint.config.mjs` that spreads it and adds the Next or Expo preset (ESLint 10 uses the config nearest to each file, so the two app tasks never edit the same file). **Prettier** for formatting, klikni settings (tabs, width 4, print width 120, single quotes, trailing commas es5); husky + lint-staged run `eslint --fix` and `prettier --write` on staged files. No Biome (Expo and Next presets are ESLint-native).
- Node 22 LTS (`.nvmrc`), `packageManager` field pins pnpm. Hoisted linker (Expo/Metro needs a flat `node_modules`): `nodeLinker: hoisted` in `pnpm-workspace.yaml`, which is where pnpm 11 reads it, mirrored as `node-linker=hoisted` in `.npmrc` for other tools. Packages with install scripts are allowed one by one under `allowBuilds` in `pnpm-workspace.yaml`.
- Turbo tasks: `build`, `dev`, `dev:worker`, `lint`, `typecheck`, `test`, plus root scripts for the database (`db:*`: Supabase lifecycle, Prisma through `apps/api`), `jobs:drain` and `verify` (all gates locally).

## Alternatives

- Nx: more features, more config; Turborepo is the client's choice and enough.
- Separate repos: would duplicate contracts and double the coordination.
- Shared UI component package: not possible to share DOM and React Native components meaningfully; we share tokens and component *names/props* instead (ADR-002).

## Consequences

- One `pnpm install` for everything; Turbo caches lint/type/test per package.
- Hoisted linker trades strict isolation for Metro compatibility; dependency hygiene is enforced by ADR-017 and `pnpm audit`.
- `apps/api` imports shared pure-TS code from `packages/validation` like the apps do (no Deno, no import map; ADR-003 superseded by ADR-020).
