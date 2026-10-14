source: docs/04-technical-design.md§Repository structure, ADR-008; FR-035, FR-037, FR-011, FR-007 R-007.4, FR-030 R-030.4

# C15 Routes, deep links, page slots and server endpoints

SL slugs are proposals; the content strategist may change them through a `CHANGE` request (one table update, next-intl `pathnames`).

## Web routes (next-intl `pathnames`; SL unprefixed, EN under `/en`)

| Key | SL path | EN path | Group | Guard | Ads |
|---|---|---|---|---|---|
| home | `/` | `/en` | public | - | sidebar |
| map | `/zemljevid` | `/en/map` | public | - | feed (list), sidebar |
| reportLost | `/prijava/izgubljen` | `/en/report/lost` | public | submit needs account (C3 draft hand-off) | **none** |
| reportFound | `/prijava/najden` | `/en/report/found` | public | - | **none** |
| report | `/r/[code]` | `/en/r/[code]` | public | - | detail, sidebar |
| reportMatches | `/r/[code]/ujemanja` | `/en/r/[code]/matches` | app | manager | none |
| reportReunited | `/r/[code]/ponovno-skupaj` | `/en/r/[code]/reunited` | app | manager | reunited |
| manage | `/m` (token in `#fragment`) | `/en/m` | public | anonymous sign-in | none |
| myPets | `/moji-ljubljenci` | `/en/my-pets` | app | signed in | none |
| myReports | `/moje-prijave` | `/en/my-reports` | app | signed in or manager | none |
| inbox (messages + notifications views, design P12/P13) | `/nabiralnik` (`?pogled=obvestila`) | `/en/inbox` (`?view=notifications`) | app | signed in or manager | **none** |
| conversation | `/nabiralnik/[id]` | `/en/inbox/[id]` | app | participant | **none** |
| account | `/racun` (+ `/opozorila`, `/obvestila`, `/placila`, `/varnost`) | `/en/account` (+ `/alerts`, `/notifications`, `/payments`, `/security`) | app | signed in | none |
| signIn / signUp / reset | `/prijava-v-racun`, `/registracija`, `/pozabljeno-geslo` | `/en/sign-in`, `/en/sign-up`, `/en/reset-password` | public | - | **none** |
| paymentsReturn | `/placila/zakljucek` | `/en/payments/return` | app | signed in | **none** |
| partners | `/oglasevanje` | `/en/advertise` | public | - | none |
| howItWorks, safety, faq, forShelters | `/kako-deluje`, `/varnost`, `/pogosta-vprasanja`, `/za-zavetisca` | `/en/how-it-works`, `/en/safety`, `/en/faq`, `/en/for-shelters` | public | - | sidebar |
| privacy, cookies, terms, imprint, accessibility | `/zasebnost`, `/piskotki`, `/pogoji-uporabe`, `/impresum`, `/dostopnost` | `/en/privacy`, `/en/cookies`, `/en/terms`, `/en/imprint`, `/en/accessibility` | public | - | none |
| admin | `/admin/*` | `/en/admin/*` | admin | moderator/admin + aal2 | none |
| portal (M3) | `/portal/*` | `/en/portal/*` | portal | org member | none |

Route groups: `app/[locale]/(public)`, `(app)`, `(admin)`, `(portal)`; guards in each group `layout.tsx` (server) mirror RLS for UX only.

**Protected flows** (no ad slot may render; Playwright route test): reportLost, reportFound, manage, inbox, conversation, signIn, signUp, reset, paymentsReturn, `/dev/checkout`.

## Server endpoints (web, no locale prefix)

| Path | Purpose |
|---|---|
| `/r/[code]/opengraph-image` | OG image (next/og): photo + type label, no location (FR-011 R-011.3) |
| `/r/[code]/poster.pdf?lang=sl\|en` | A4 poster PDF (TASK-24) |
| `/a/[id]` | ad click counter + 302 (C14) |
| `/api/health` | `{ ok, version, env }` |
| `/captcha` | Turnstile host page for the mobile WebView (posts token via `postMessage`) |
| `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json` | universal / app links (TASK-12) |
| `/dev/kit`, `/dev/checkout` | dev only (`APP_ENV !== 'production'`) |
| `/sitemap.xml`, `/robots.txt` | M5 (TASK-72); until then robots disallow staging |

Detail page SEO: open, visible reports are indexable with `Article`-like JSON-LD (no exact location); closed > 30 days, hidden or removed → `410` page with `noindex` (FR-007 AC#3).

## Report detail slots (web and mobile, named components)

`<ReportSlot name="contact" | "share" | "poster" | "report-abuse" | "owner-actions" | "ad" | "matches-link" | "sighting" />`. The detail page (TASK-18) renders the layout and empty slots; feature tasks fill their slot component in their own file (`components/report/slots/<name>.tsx`). The `ad` slot sits below the primary actions.

## Mobile (Expo Router)

`app/(tabs)/index` (map + list), `(tabs)/report` (choose lost/found), `(tabs)/inbox` (notifications + messages), `(tabs)/profile`; stacks: `r/[code]`, `r/[code]/matches`, `r/[code]/reunited`, `m` (manage link), `report/lost`, `report/found`, `pets/*`, `inbox/[id]` (conversation), `settings/*` (language, notifications, alerts, consent, payments, account), `auth/*`, `payments/return`.

## Deep links

- Scheme `zivali://` (dev and fallback), universal links for `https://<APP_HOST>/r/*`, `/en/r/*`, `/m`, `/en/m`, `/payments/*`. Android `assetlinks.json` (package `si.signapps.zivali`, SHA-256 of the EAS keystore), iOS AASA (team id from Q-007). Without the app, links open the web page.
- Poster QR and share links use `https://<APP_HOST>/r/<code>` (short and canonical, FR-011).

## Example

`https://zivali.example/r/Hk3vT9qP` → web detail (SL) · same link on a phone with the app → `app/r/[code]` with `code = Hk3vT9qP`.
