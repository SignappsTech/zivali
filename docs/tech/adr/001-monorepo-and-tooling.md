# ADR-001: pnpm + Turborepo monorepo, one TypeScript toolchain

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Source: brief §Constraints (Technical), NFR-DEVX

## Context

Web (Next.js) and mobile (Expo) share types, validation, API calls, i18n, analytics and design tokens. The client fixed pnpm + Turborepo. Windows 11 is a primary dev machine.

## Decision

- **pnpm 11 workspaces + Turborepo 2.** Layout: `apps/web`, `apps/mobile`, `packages/{tokens,types,validation,api,i18n,analytics}`, `supabase/` (DB, Edge Functions, tests) at the root. Package scope `@zivali/*`.
- **Packages export TypeScript source** (`"exports": { "./*": "./src/*.ts" }`), no build step except `tokens` (generated CSS) and `i18n` (merged catalogues). Next (`transpilePackages`) and Metro compile them. Subpath exports per domain (`@zivali/api/reports`) instead of barrel files, so parallel tasks never edit the same index file.
- **One TypeScript version** across the workspace, the one pinned by the Expo SDK 57 template; `strict: true`; root `tsconfig.base.json`.
- **ESLint 10 flat config** at the root (Next + Expo presets), **Prettier** for formatting. No Biome (Expo and Next presets are ESLint-native).
- Node 22 LTS (`.nvmrc`), `packageManager` field pins pnpm. `node-linker=hoisted` in `.npmrc` (Expo/Metro needs a flat `node_modules`).
- Turbo tasks: `build`, `dev`, `lint`, `typecheck`, `test`, plus root scripts for Supabase (`db:*`) and `verify` (all gates locally).

## Alternatives

- Nx: more features, more config; Turborepo is the client's choice and enough.
- Separate repos: would duplicate contracts and double the coordination.
- Shared UI component package: not possible to share DOM and React Native components meaningfully; we share tokens and component *names/props* instead (ADR-002).

## Consequences

- One `pnpm install` for everything; Turbo caches lint/type/test per package.
- Hoisted linker trades strict isolation for Metro compatibility; dependency hygiene is enforced by ADR-017 and `pnpm audit`.
- Edge Functions (Deno) import shared pure-TS code from `packages/validation` through an import map (ADR-003).
