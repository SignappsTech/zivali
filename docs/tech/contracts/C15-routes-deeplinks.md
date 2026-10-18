source: docs/04-technical-design.md§Repository structure, ADR-008; FR-035, FR-037, FR-011, FR-007 R-007.4, FR-030 R-030.4

# C15 Routes, deep links, page slots and server endpoints

SL slugs are proposals; the content strategist may change them through a `CHANGE` request (one table update, next-intl `pathnames`).

## Web routes (next-intl `pathnames`; SL unprefixed, EN under `/en`)

| Key | SL path | EN path | Group | Guard | Ads |
|---|---|---|---|---|---|
| home | `/` | `/en` | public | - | sidebar |
| map (non-localised filter `?type=lost\|found\|sighted`; `found` = found + sighted per content P1; `sighted` = sighted only, so the menu row has its own URL; CH-149) | `/zemljevid` | `/en/map` | public | - | feed (list), sidebar |
| reportLost | `/prijava/izgubljena-zival` | `/en/report/lost` | public | submit needs account (C3 draft hand-off) | **none** |
| reportFound (the sighted entry goes here with `?type=sighted`; TASK-12.2 uses `/report/found?type=sighted`) | `/prijava/najdena-zival` | `/en/report/found` | public | - | **none** |
| report | `/r/[code]` | `/en/r/[code]` | public | - | detail, sidebar |
| reportMatches | `/r/[code]/ujemanja` | `/en/r/[code]/matches` | app | manager | none |
| reportReunited | `/r/[code]/spet-doma` | `/en/r/[code]/reunited` | app | manager | reunited |
| manage | `/m` (token in `#fragment`) | `/en/m` | public | anonymous sign-in | none |
| myPets | `/moje-zivali` | `/en/my-pets` | app | signed in | none |
| myReports | `/moje-prijave` | `/en/my-reports` | app | signed in or manager | none |
| inbox (messages + notifications views, design P12/P13) | `/nabiralnik` (`?pogled=obvestila`) | `/en/inbox` (`?view=notifications`) | app | signed in or manager | **none** |
| conversation | `/nabiralnik/[id]` | `/en/inbox/[id]` | app | participant | **none** |
| account | `/racun` (+ `/opozorila`, `/obvestila`, `/placila`, `/varnost`) | `/en/account` (+ `/alerts`, `/notifications`, `/payments`, `/security`) | app | signed in | none |
| signIn / signUp / reset | `/vpis`, `/registracija`, `/pozabljeno-geslo` | `/en/sign-in`, `/en/sign-up`, `/en/reset-password` | public | - | **none** |
| authCallback (route handler `app/[locale]/auth/callback/route.ts`, in the next-intl `pathnames`) | `/auth/callback` | `/en/auth/callback` | public | - | none |
| paymentsReturn | `/placila/zakljucek` | `/en/payments/return` | app | signed in | **none** |
| partners | `/oglasevanje` | `/en/advertise` | public | - | none |
| about | `/o-nas` | `/en/about` | public | - | sidebar |
| howItWorks, safety, faq, forShelters | `/kako-deluje`, `/varnost`, `/pogosta-vprasanja`, `/za-zavetisca` | `/en/how-it-works`, `/en/safety`, `/en/faq`, `/en/for-shelters` | public | - | sidebar |
| shelters (FR-044, TASK-90) | `/zavetisca`, `/zavetisca/[slug]` | `/en/shelters`, `/en/shelters/[slug]` | public | - | sidebar |
| guides (TASK-72) | `/nasveti/[slug]` (e.g. `/nasveti/cipiranje-mack`) | `/en/guides/[slug]` | public | - | sidebar |
| SEO hubs (TASK-72, M5; folder param is the internal EN `[location]`, the SL pathname stays localised) | `/izgubljene-zivali/[location]`, `/izgubljeni-psi/[location]`, `/izgubljene-macke/[location]`, `/najdene-zivali/[location]`, `/najdeni-psi/[location]`, `/najdene-macke/[location]` | `/en/lost-pets/[location]`, `/en/lost-dogs/[location]`, `/en/lost-cats/[location]`, `/en/found-pets/[location]`, `/en/found-dogs/[location]`, `/en/found-cats/[location]` | public | - | sidebar |
| privacy, cookies, terms, imprint, accessibility | `/zasebnost`, `/piskotki`, `/pogoji-uporabe`, `/impresum`, `/dostopnost` | `/en/privacy`, `/en/cookies`, `/en/terms`, `/en/imprint`, `/en/accessibility` | public | - | none |
| admin | `/admin/*` | `/en/admin/*` | admin | moderator/admin + aal2 | none |
| admin, as built (TASK-34.3, CH-222) | `/admin`, `/admin/revizijska-sled`, `/admin/zavetisca`; sections not built yet open `/admin/[section]` | `/en/admin`, `/en/admin/audit-log`, `/en/admin/shelters`; `/en/admin/[section]` | admin | admin only for unlisted admin paths | none |
| portal (M3) | `/portal/*` | `/en/portal/*` | portal | org member | none |

Admin sections not built yet (ads, house-ads, moderation, abuse-reports, verification, organisations, users, enquiries, vet-partners, settings) open `/admin/[section]` with the EN slug in both locales until their task adds its page and SL slug (`components/admin/nav.ts`).

Auth query parameters (TASK-9.3, CH-185): `signIn` and `signUp` take `?next=` (same-site paths only) and `?email=`; `signIn` also `?link=expired`, `?error=cancelled|failed`, `?confirmed=1` (verified view). Supabase Auth redirects (confirmation and reset links, Google OAuth PKCE) land on `/auth/callback`, which exchanges the code server-side and then goes to `/reset-password` (recovery), `/sign-in?confirmed=1` (verified view) or `next`. `/reset-password` renders the new-password form only for a session whose amr has `recovery` (< 1 h, checked on the server; a `token_hash` session has amr `otp`, C3). Guards send `next` (proxy header `x-next-path`).

Route groups: `app/[locale]/(public)`, `(app)`, `(admin)`, `(portal)`; guards in each group `layout.tsx` (server) mirror RLS for UX only.

**Protected flows** (no ad slot may render; Playwright route test): reportLost, reportFound, manage, inbox, conversation, signIn, signUp, reset, paymentsReturn, `/dev/checkout`.

## Server endpoints (web, no locale prefix)

| Path | Purpose |
|---|---|
| `/r/[code]/opengraph-image` | OG image (next/og): photo + type label, no location (FR-011 R-011.3) |
| `/r/[code]/poster.pdf?lang=sl\|en` | A4 poster PDF (TASK-24) |
| (moved) ad clicks | served by the API: `GET <API_URL>/v1/ads/:id/click` (C14) |
| `/api/health` | `{ ok, version, env }` |
| `/auth/callback` (and `/en/auth/callback`) | Supabase Auth code exchange, see Auth query parameters above (CH-185) |
| `/captcha` | Turnstile host page for the mobile WebView (posts token via `postMessage`) |
| `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json` | universal / app links (TASK-12) |
| `/dev/kit`, `/dev/checkout` | dev only (`APP_ENV !== 'production'`) |

`apps/web/proxy.ts` (Next 16 successor of middleware.ts: CSP nonce, session refresh, next-intl) must exclude `/api`, `/captcha`, `/dev/*`, `/.well-known/*`, `/r/*/opengraph-image`, `/r/*/poster.pdf` and static files from its matcher; the task that adds `/captcha` or `/dev/*` extends the matcher in the same commit.
| `/sitemap.xml`, `/robots.txt` | M5 (TASK-72); until then robots disallow staging |

Hub index rules (TASK-72): national, the 12 regional and the 12 city hubs are indexable; other locations only with at least 3 open listings, otherwise `noindex`. `/r/[code]` stays the listing URL.

Detail page SEO: open, visible reports are indexable with `Article`-like JSON-LD (no exact location); closed > 30 days, hidden or removed → `410` page with `noindex` (FR-007 AC#3).

## Report detail slots (web and mobile, named components)

`<ReportSlot name="contact" | "share" | "poster" | "report-abuse" | "owner-actions" | "ad" | "matches-link" | "sighting" />`. The detail page (TASK-18) renders the layout and empty slots; feature tasks fill their slot component in their own file (`components/report/slots/<name>.tsx`). The `ad` slot sits below the primary actions.

## Mobile (Expo Router)

`app/(tabs)/index` (map + list), `(tabs)/report` (choose lost/found), `(tabs)/inbox` (notifications + messages), `(tabs)/profile`; stacks: `r/[code]`, `r/[code]/matches`, `r/[code]/reunited`, `m` (manage link), `report/lost`, `report/found` (the sighted flow is `report/found?type=sighted`), `pets/*`, `inbox/[id]` (conversation), `settings/*` (language, notifications, alerts, consent, payments, account), `auth/*`, `payments/return`.

## Deep links

- The landing screens `app/r/[code]` and `payments/return` do not exist yet; they arrive with TASK-18 and the payments task, and until then `+native-intent` falls back to the home tab (CH-157).
- Scheme `zivali://` (dev and fallback), universal links for `https://<APP_HOST>/r/*`, `/en/r/*`, `/m`, `/en/m`, `/payments/*`. Android `assetlinks.json` (package `si.signapps.zivali`, SHA-256 of the EAS keystore), iOS AASA (team id from Q-007). Without the app, links open the web page.
- Poster QR and share links use `https://<APP_HOST>/r/<code>` (short and canonical, FR-011).

## Example

`https://zivali.example/r/Hk3vT9qP` → web detail (SL) · same link on a phone with the app → `app/r/[code]` with `code = Hk3vT9qP`.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-101: SEO hub folder param `[lokacija]` renamed `[location]` (internal EN) |
| 1.2 | 2026-10-15 | CH-144: sighted route is /report/found?type=sighted |
| 1.3 | 2026-10-18 | CH-149: map ?type=lost\|found\|sighted, sighted entry via reportFound; CH-157: mobile deep-link screens pending; CH-185: /auth/callback and auth query parameters |
| 1.4 | 2026-10-18 | CH-222: admin routes as built |
