# @zivali/i18n

Slovenian (source, default) and English message catalogues for web, mobile and the API worker, plus `Intl` format helpers. Contract: `docs/tech/contracts/C16-i18n.md`, decision: ADR-008. `build.mjs` and `check.mjs` run on plain Node 22 with no dependencies.

## Catalogues

`messages/<locale>/<namespace>.json`, one namespace per feature (list in C16). The file name is the namespace; the file holds its keys:

```json
// messages/sl/browse.json
{ "results": "{count, plural, one {# prijava} two {# prijavi} few {# prijave} other {# prijav}}" }
```

- Add or change keys only in your feature's namespace, in **both** locales in the same commit. Copy comes from the content slice (`docs/content/`).
- Keys `snake_case`, at most 3 levels. ICU MessageFormat for plurals and selects; rich text as `<b>…</b>`.
- SL plurals need `one`, `two`, `few`, `other` (1, 2, 3–4, 5+; 101, 102, 103 …); EN plurals `one`, `other`. Put the verb inside the message ("2 živali sta spet doma").
- Seeded here: `common`, `nav`, `footer`, `errors` (one key per C1 error code, plus page errors), from `docs/content/pages/P1-web-shell.md`.

## Commands

| Command                            | What                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @zivali/i18n build` | Merges the namespaces into `dist/sl.json` and `dist/en.json` (`{ "<namespace>": { … } }`, not committed). |
| `pnpm --filter @zivali/i18n check` | Fails on problems (below). Also runs first in `test`, so `pnpm verify` and CI run it.                     |
| `pnpm --filter @zivali/i18n test`  | The check, then the unit tests (check fixtures, format helpers, plurals through `use-intl`).              |

`check` messages and what to do:

- `en: auth.title: missing (present in sl)`: add the key to the other locale.
- `alerts.body: placeholders differ: sl {count, place}, en {count}`: both locales must use the same `{arguments}` and `<tags>`.
- `sl: browse.results: plural {count} needs one, two, few, other (missing two, few)`: add the missing forms.
- `en: common.save: empty string`: write the text (if the content slice has none, a clear draft plus a CHANGE request for the content strategist).
- `sl: x.y: unclosed "{"`, `unknown type "…"`, `… has no "other"`: ICU syntax error in that message.

## Use

```ts
// Web (next-intl) and mobile (use-intl): same API, same catalogues (TASK-10.2, TASK-10.3).
const t = useTranslations('browse');
t('results', { count: 2 }); // "2 prijavi"
```

Server text (emails, push) is rendered by the API worker (Node, ADR-020 amending ADR-008) with `use-intl/core` and the merged catalogue in the recipient's `profiles.locale`:

```ts
import { createTranslator } from 'use-intl/core';

import en from '@zivali/i18n/dist/en.json' with { type: 'json' };
import sl from '@zivali/i18n/dist/sl.json' with { type: 'json' };
import { timeZone, type Locale } from '@zivali/i18n/format';

const catalogues = { sl, en };

export function translator(locale: Locale, namespace: 'email' | 'notifications' | 'errors') {
	return createTranslator({ locale, messages: catalogues[locale], namespace, timeZone });
}

translator('sl', 'errors')('RATE_LIMITED', { minutes: 2 }); // "… Poskusite znova čez 2 minuti."
```

An Edge Function (Deno) that needs text does the same with `import { createTranslator } from 'npm:use-intl@4/core'` and a JSON import of the built `dist/<locale>.json`.

## Format helpers (`@zivali/i18n/format`)

All `Intl`, time zone `Europe/Ljubljana` (exported as `timeZone`), EN formatted as `en-GB` (British-leaning English, voice guide). `Locale` is `'sl' | 'en'`.

| Helper                                                             | SL                                          | EN                                       |
| ------------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------- |
| `formatDate(d, locale, 'short' \| 'long' \| 'time')`               | `15. 10. 2026`, `15. oktober 2026`, `14:30` | `15/10/2026`, `15 October 2026`, `14:30` |
| `formatRelative(d, locale, now?)`                                  | `pred 5 minutami`, `včeraj`, `zdaj`         | `5 minutes ago`, `yesterday`, `now`      |
| `formatEur(cents, locale)`                                         | `5,00 €`                                    | `€5.00`                                  |
| `formatDistanceBand('lt1' \| '1to3' \| '3to10' \| 'gt10', locale)` | `manj kot 1 km`, `1–3 km`, `več kot 10 km`  | `under 1 km`, `1–3 km`, `over 10 km`     |
| `formatCount(n, locale)`                                           | `12.345`                                    | `12,345`                                 |

Counted nouns ("2 prijavi") are ICU plural messages in the catalogue, not helpers. `src/format.ts` is erasable TypeScript, so Node runs it directly; the web app may need `transpilePackages: ['@zivali/i18n']`.
