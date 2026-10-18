source: docs/04-technical-design.md§Data model (ads), ADR-003; FR-029, FR-030, FR-031, FR-032, A-016

# C14 Ads, partner stats and leads

## Slots

`ad_slot` enum: `feed` (list/feed, every `ads.feed_every_n` = 8 cards, never first, never adjacent), `detail` (lost/found detail below primary actions), `reunited` (reunited screen), `sidebar` (web ≥ lg). There is no slot for report-lost, report-found, sign-in, chat or payment screens; requesting any other value returns `VALIDATION` (FR-029 AC#2).

## Models (columns)

```sql
ads(id, title text (≤ 60), body text (≤ 120), cta text (≤ 24, may be empty: the public AdView then shows t(learn_more), CH-467), link_url text check (link_url ~ '^https://'),
    image_path text, image_alt text not null check (char_length(image_alt) between 5 and 140),
    locales text[] default '{sl,en}', slots ad_slot[] not null, region_ids smallint[] null, municipality_ids smallint[] null,
    species species[] null, starts_at timestamptz, ends_at timestamptz, status text ('draft'|'active'|'paused'|'ended'),
    is_house boolean default false, house_kind text null ('supporter'|'partner'|'adopt'), exclusive boolean default false,
    weight int default 1, deleted_at, created_by, created_at, updated_at)
ad_stats_daily(day date, ad_id uuid, slot ad_slot, region_id smallint default 0, impressions int default 0, clicks int default 0,
               primary key (day, ad_id, slot, region_id))
leads(id, company, contact_name, email, phone null, region_interest text null, interest text not null default 'unsure' check (interest in ('ad','vet_partner','unsure')), message text (≤ 2000), consent_at timestamptz not null,
      status text default 'new', created_at)
```
Access only through the API (RLS deny-all); models in `prisma/schemas/ads.prisma`.

**Content rule (TASK-35, TASK-37):** no ad may sell, give away or rehome animals; the API rejects such ads on save, checking title, body and cta only, not link_url or image_alt (category blocklist plus keyword list in `app_config` `ads.blocked_terms`, SL and EN) There is no `blocked` flag on ads (CH-204): serving re-checks the category blocklist (`BLOCKED_CATEGORIES` in `domains/ads/ads.domain.ts`: sale, giveaway, rehoming) and `app_config` `ads.blocked_terms` (JSON string[], SL and EN, migration default) on every serve, whole words ignoring case and diacritics, so a term added later also stops older ads. The save-time check is `AdsDomain.assertAdWritable(input, ctx)` (admin + aal2, content, exclusive overlap), called on create, edit and activation (TASK-37.2).

## Serving (owned by TASK-35.1)

| Method and path | Guards | Request | Response |
|---|---|---|---|
| `GET /v1/ads/slot/:slot` | optionalAuth; `Cache-Control: private, max-age=60` | `?region_id&municipality_id&species&locale` | `Ad | null` |
| `POST /v1/ads/:id/impressions` | none; rate limit 300/min per IP | `{ slot, region_id? }` | `204` (aggregate upsert into `ad_stats_daily`, day in Europe/Ljubljana, no user ids, no cookies) |
| `GET /v1/ads/:id/click` (TASK-35.2) | none; rate limit 300/min per IP | `?s=<slot>&r=<region_id>` | `302` to the stored `link_url` after counting the click; unknown id → 404; never a user-supplied target |

`Ad = { id, title, body, cta /* '' allowed; the client falls back to t(learn_more) */, image_url /* string | null: seeded house ads and ads before their image upload have no image_path; render no image when null (CH-203) */, image_alt, click_url /* API_URL/v1/ads/<id>/click?s=<slot>&r=<region_id> */, is_house, label: 'Oglas'|'Ad' }`. Unknown slots (including any report-flow slot) → `VALIDATION`.

Ad-free users: when the caller has an active Premium entitlement (M4) the response is `null` (no sponsor ad and no house ad) and the slot collapses; until entitlements exist nobody is ad-free; Podpornik supporters are not ad-free.

Matching: `status = 'active'` (lowercase literal; the DB enum `AD_SLOT` is uppercase while the API values are lowercase), now within dates, slot in `slots`, locale in `locales`, region or municipality null or containing the context, species null or containing it. Several matches → weighted random. None → a house ad for the locale (`supporter`, `partner`, `adopt`, rotated). Exclusive ads cannot overlap in dates for the same slot and region (service check only: an exclusion constraint cannot be built on arrays). Links carry `rel="sponsored noopener"` and `target="_blank"`. Impression = the client posts once when the ad first renders (rendered count, A-016).

Implemented details (CH-205): targeting is per field (`region_ids`, `municipality_ids`, `species` each NULL/empty or containing the context, AND-ed); `region_id` is derived from `municipality_id` when absent (also used in the `click_url` `r`, 0 when unknown); an exclusive match owns the slot; house ads are the fallback only; the response carries `Vary: Accept-Language`. Impressions: an unknown region id is stored as 0; `NOT_FOUND` for an unknown or deleted ad or a slot the ad does not run in.

Client hook (`@zivali/api/ads`): `useAd(slot, ctx): { ad, loading, error }` (errors collapse the slot silently).

## Vet Partner placement (M4)

A verified Vet Partner clinic (organisation kind `vet` with an active Vet Partner entitlement) gets a featured "nearest vet" unit in the `detail` slot (optionally `feed`) for its region, labelled Oglas/Ad like every paid placement, and the one-line mention in `nearby_lost` emails (C10). Built on the same `ads` serving path (no new slot); designed in P21. There are no tag-scan placements (QR tags out of scope).

## Admin (owned by TASK-37.2)

| Method and path | Guards | Request | Response |
|---|---|---|---|
| `GET /v1/admin/ads` | admin, aal2 | `?status&cursor` | `{ items: AdminAd[], next_cursor }` |
| `POST /v1/admin/ads`, `PUT /v1/admin/ads/:id` | admin, aal2 | `AdInput` | `AdminAd` (validation: alt 5–140, https link, image 4:3 at least 1200×900 px JPG or PNG under 500 KB, title ≤ 60, body ≤ 120, cta ≤ 24 or empty, no animal sale or rehoming, no exclusive overlap; audited) |
| `POST /v1/admin/ads/:id/image` | admin, aal2 | `{ sha256, width, height, bytes, content_type }` | `AdImageUploadResponse = { upload: { url, method: 'PUT', headers, expires_at } }`: presigned PUT to the media bucket `ads/<id>/…` (C5 pattern) |
| `POST /v1/admin/ads/:id/status` | admin, aal2 | `{ status }` | `AdminAd` (audited) |
| `DELETE /v1/admin/ads/:id` | admin, aal2 | - | `204` (soft delete, audited) |
| `GET /v1/admin/ads/:id/stats` | admin, aal2 | `?from&to` | `{ items: { day, slot, region_slug, impressions, clicks, ctr }[] }` (CSV export client-side) |

## Partner stats and leads (owned by TASK-38.2)

| Method and path | Guards | Request | Response |
|---|---|---|---|
| `GET /v1/partners/stats` | none; `Cache-Control: public, max-age=3600` | - | `PartnerStats` |
| `POST /v1/leads` | none; captcha adapter; rate limit 3/hour per IP | `{ company, contact_name, email, phone?, region_interest?, interest: 'ad' | 'vet_partner' | 'unsure', message, consent: true, captcha_token, locale }` | `201 { id }` (stored; email to `LEADS_NOTIFY_EMAIL` via the email adapter) |
| `GET /v1/admin/leads` | admin, aal2 | `?cursor` | `{ items, next_cursor }` |

```ts
type PartnerStats = { generated_at, pilot: boolean,
  totals: { users: CountValue, active_reports: CountValue, reunions_90d: CountValue },
  by_region: { region_slug, users: CountValue, active_reports: CountValue, reunions_90d: CountValue }[] }
type CountValue = number | '<5'          // any value 1–4 is returned as '<5'; 0 stays 0
```
Computed by the `partners.stats` job (hourly) into `partner_stats_snapshot(id uuid, generated_at timestamptz default now(), data jsonb)` (`data` = `PartnerStats`; the newest row is served); optional GA Data API enrichment only behind `partners.ga_enrichment` (off). Errors: `VALIDATION`, `CAPTCHA_FAILED`, `RATE_LIMITED`.

## Example

```json
// GET /v1/ads/slot/detail?region_id=8&species=dog&locale=sl
{ "id": "ad7…", "title": "Dežurni veterinar 24/7", "body": "…", "cta": "Pokliči", "image_url": "https://…/ad-images/ad7/1.webp",
  "image_alt": "Veterinarka pregleduje psa", "click_url": "https://api.…/v1/ads/ad7…/click?s=detail&r=8", "is_house": false, "label": "Oglas" }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-137: status literal 'active', AD_SLOT case note, partner_stats_snapshot columns, slot exclusivity is a service check only |
| 1.2 | 2026-10-18 | CH-203: Ad.image_url nullable; CH-204: no blocked flag, serve-time blocklist re-check, assertAdWritable; CH-205: targeting, region derivation, exclusive, Vary, impression details |
| 1.3 | 2026-10-19 | CH-467: AdInput.cta may be empty; AdView falls back to t(learn_more) |
