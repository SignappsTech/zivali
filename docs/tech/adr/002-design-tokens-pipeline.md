# ADR-002: One token source, generated per platform

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead (pipeline), Design Lead (token values)
- Source: brief §Constraints (UI library), TASK-1, TASK-8, NFR-A11Y

## Context

shadcn/ui (web) and React Native Reusables on NativeWind (mobile) must be driven by one token package that the design team edits. The design lead keeps tokens in `docs/design/tokens.json` (primitives, semantic light/dark, elevation, shape, scales incl. component sizes, declared contrast pairs; direction A "Lagoon" chosen 2026-10-14: one theme with light and dark, no runtime variants) with a reference generator `docs/design/build-tokens.mjs` for mockups. Current versions: shadcn CLI 4 targets Tailwind 4; NativeWind 4.2 (latest stable) needs Tailwind 3.4; NativeWind 5 is still a release candidate.

## Decision

- **Source of truth stays `docs/design/tokens.json`** (owned by the design lead). The tech side never edits values.
- **`packages/tokens`** (owned by tech) ports the reference generator into `packages/tokens/build.mjs` (Node, zero dependencies) and generates into `packages/tokens/dist/`:
  - `tokens.css`: CSS variables as HSL triplets (`--primary: 190 65% 23%`) for `:root` (light) and `.dark`; radius, fonts, shadows.
  - `web.css`: Tailwind 4 `@theme inline` block mapping `--color-<name>: hsl(var(--<name>))`, radii, fonts, shadows, type scale (web imports `tokens.css` + `web.css`).
  - `native.css`: the same variables with NativeWind selectors (`:root` and `.dark:root`).
  - `tailwind-preset.cjs`: Tailwind 3.4 preset (`hsl(var(--x) / <alpha-value>)`, shadcn pairs nested as `primary.DEFAULT` / `primary.foreground`, app tokens flat) for NativeWind, per `docs/design/system.md` §13.
  - `values.ts`: resolved hex values per mode, plus spacing, size, component sizes, motion, z-index and React Native elevation, for non-className consumers (navigation theme, status bar, PDF poster).
  - `map-style.ts`: `buildMapStyle(mode)` applies the `map-*` tokens to the OpenFreeMap "positron" style (layer table in `docs/design/system.md` §9); used by the web and mobile MapView.
- **Contrast lint is part of the build**: a declared pair below its minimum fails `pnpm --filter @zivali/tokens build`, so CI fails.
- **Platform split on Tailwind major**: web uses Tailwind 4 + current shadcn; mobile uses NativeWind 4.2 + Tailwind 3.4. CSS variables are the shared contract; each platform's Tailwind mapping is generated glue. Move mobile to Tailwind 4 when NativeWind 5 (or the RN Reusables Uniwind template) is stable; the generator only drops `tailwind-preset.cjs`.
- **Placeholder**: the pipeline builds from whatever `tokens.json` is on `main` (v0.2.0, Lagoon, at the time of writing) and validates its shape first. A format change in `tokens.json` is a `CHANGE` request to the tech lead (contract C2).

## Alternatives

- Tailwind 3.4 on both platforms with the old shadcn 2.3 CLI: one preset, but pins web to an unmaintained CLI path.
- Style Dictionary: a dependency for what is ~200 lines of code that already exists.
- Hand-copied variables per app: drifts immediately.

## Consequences

- A token change reaches both apps with no component edits (TASK-8 AC#4).
- Two Tailwind majors in one repo: each app pins its own `tailwindcss`; no shared Tailwind config at the root.
