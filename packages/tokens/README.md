# @zivali/tokens

Design tokens for web and mobile, generated from `docs/design/tokens.json` (owned by the design lead). Contract: `docs/tech/contracts/C2-design-tokens.md`, decision: ADR-002. No dependencies; `build.mjs` runs on plain Node 22.

## Outputs (`dist/`, not committed)

| Import                           | File                  | Use                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@zivali/tokens/tokens.css`      | `tokens.css`          | Web. CSS variables as HSL triplets for `:root, .light` and `.dark`, plus `--radius`, `--radius-<component>`, `--font-*`, `--shadow-*`. Translucent tokens (`scrim`, `marker-area`) also get `--<token>-alpha`.                                                                                                                            |
| `@zivali/tokens/web.css`         | `web.css`             | Web, Tailwind 4. `@theme inline` with `--color-<token>`, radii, fonts, shadows and the type scale (`--text-*`). Import after `tokens.css`.                                                                                                                                                                                                |
| `@zivali/tokens/native.css`      | `native.css`          | Mobile `global.css`. Same variables with the NativeWind selectors `:root` and `.dark:root`; `--radius` in px because NativeWind treats `1rem` as 14 px.                                                                                                                                                                                   |
| `@zivali/tokens/tailwind-preset` | `tailwind-preset.cjs` | Mobile `tailwind.config.js` (Tailwind 3.4). shadcn pairs nested (`primary.DEFAULT`, `primary.foreground`), app tokens flat (`bg-status-lost-subtle`), radii, the registered static font names (`font-display`, `font-display-semibold`, `font-sans`, `font-sans-semibold`), font sizes in px, `min-h-touch`/`comfort`/`primary`, shadows. |
| `@zivali/tokens/values`          | `values.ts`           | Resolved values where classes cannot reach: `colors.light` / `colors.dark` (hex; translucent tokens as `#RRGGBBAA`), `space`, `layout`, `size`, `component`, `radius` (px), `motion`, `zIndex`, `breakpoint`, `elevationNative`, `fonts`.                                                                                                 |
| `@zivali/tokens/map-style`       | `map-style.ts`        | `buildMapStyle('light' \| 'dark', { detail? })`: OpenFreeMap "positron" reduced to the calm layer set (design system §9) and coloured with the `map-*` tokens. `detail: true` keeps minor streets. Show the attribution "© OpenMapTiles © OpenStreetMap contributors" on every map.                                                       |

```css
/* apps/web/app/globals.css */
@import 'tailwindcss';
@import '@zivali/tokens/tokens.css';
@import '@zivali/tokens/web.css';
```

```js
// apps/mobile/tailwind.config.js
module.exports = {
  presets: [require('nativewind/preset'), require('@zivali/tokens/tailwind-preset')],
  content: [/* … */],
};
```

## Design lead: changing tokens

1. Edit values in `docs/design/tokens.json`.
2. Run `pnpm --filter @zivali/tokens build` (or `node packages/tokens/build.mjs`). Both apps pick up the new `dist/` on their next `dev` or `build`; no component edits.
3. If the build fails, the message names the problem:
   - `light: foreground on background = 3.84:1, minimum 7:1`: a declared pair in `pairs.list` is below its ratio. Pick another step.
   - `pairs.list[12] … unknown token "x"`: the pair names a token that does not exist.
   - `semantic.dark.ring: missing …` or `scale.type.size.base: expected …`: the file shape changed. New tokens and new values are fine; a new _kind_ of value or section is a `CHANGE docs/tech/contracts/C2-design-tokens.md` request to the tech lead.

`docs/design/build-tokens.mjs` stays as the generator for the static mockups.

## Developers

- `pnpm --filter @zivali/tokens test` runs `node --test`: snapshots of the generated CSS and preset (from the frozen `test/fixtures/tokens.json`, so token edits do not break them), contrast and shape failures, and the map style structure. After an intended generator change: `node --test --test-update-snapshots`.
- `turbo.json` adds `docs/design/tokens.json` to the build inputs so a token edit invalidates the cache.
- `openfreemap-positron.json` is a pinned copy of `https://tiles.openfreemap.org/styles/positron`. To refresh it, download it again, run `pnpm format` and the tests; the build fails if a layer listed in `MAP_LAYERS` (in `build.mjs`) disappears.
