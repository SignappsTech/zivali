# Web fonts (design system §4)

Three static woff2 subsets, self-hosted with `next/font/local` in `app/[locale]/layout.tsx` (TASK-90.6). Mobile keeps
the `@expo-google-fonts` packages.

| File                                   | Face                                                 | Source (Google Fonts static instance)                               |
| -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| `bricolage-grotesque-700.woff2`        | Bricolage Grotesque Bold 1.001, default optical size | `@expo-google-fonts/bricolage-grotesque` 0.4.1, `700Bold`           |
| `atkinson-hyperlegible-next-400.woff2` | Atkinson Hyperlegible Next Regular 2.001             | `@expo-google-fonts/atkinson-hyperlegible-next` 0.4.1, `400Regular` |
| `atkinson-hyperlegible-next-700.woff2` | Atkinson Hyperlegible Next Bold 2.001                | `@expo-google-fonts/atkinson-hyperlegible-next` 0.4.1, `700Bold`    |

Licence: SIL Open Font License 1.1 (`OFL-*.txt`). Neither font declares a Reserved Font Name, so the subsets (Modified
Versions under the OFL) keep their family names.

Rebuild with fonttools 4.60.1 and brotli 1.1.0, one call per file:

    pyftsubset <source>.ttf --flavor=woff2 --output-file=<file>.woff2 \
      --unicodes=U+0020-007E,U+00A0-00FF,U+0100-017F,U+2013-2014,U+2018-201E,U+2022,U+2026,U+20AC,U+2192,U+2212 \
      --layout-features=kern,liga,tnum,zero

The sources have no `liga` or `zero` feature (Atkinson's default zero is already slashed), so only `kern` and `tnum`
remain. Atkinson has no U+2192 (→). Total 47,312 bytes (21,732 + 12,452 + 13,128).
