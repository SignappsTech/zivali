source: docs/04-technical-design.md§Data model (ads), ADR-003; FR-029, FR-030, FR-031, FR-032, A-016

# C14 Ads, partner stats and leads

## Slots

`ad_slot` enum: `feed` (list/feed, every `ads.feed_every_n` = 8 cards, never first, never adjacent), `detail` (lost/found detail below primary actions), `reunited` (reunited screen), `sidebar` (web ≥ lg). There is no slot for report-lost, report-found, sign-in, chat or payment screens; requesting any other value returns `VALIDATION` (FR-029 AC#2).

## Tables

```sql
ads(id, title text (≤ 60), body text (≤ 140), cta text (≤ 24), link_url text check (link_url ~ '^https://'),
    image_path text, image_alt text not null check (char_length(image_alt) between 5 and 140),
    locales text[] default '{sl,en}', slots ad_slot[] not null, region_ids smallint[] null, municipality_ids smallint[] null,
    species species[] null, starts_at timestamptz, ends_at timestamptz, status text ('draft'|'active'|'paused'|'ended'),
    is_house boolean default false, house_kind text null ('supporter'|'partner'|'adopt'), exclusive boolean default false,
    weight int default 1, deleted_at, created_by, created_at, updated_at)
ad_stats_daily(day date, ad_id uuid, slot ad_slot, region_id smallint default 0, impressions int default 0, clicks int default 0,
               primary key (day, ad_id, slot, region_id))
leads(id, company, contact_name, email, phone null, region_interest text null, message text (≤ 2000), consent_at timestamptz not null,
      status text default 'new', created_at)
```
RLS: `ads` and `ad_stats_daily` writable only by admins (aal2) and security definer functions; public reads only through `get_ad`; `leads` admin-only.

## Serving (owned by TASK-35)

```ts
get_ad(p_slot ad_slot, p_ctx { region_id?: number; municipality_id?: number; species?: 'dog'|'cat'; locale: 'sl'|'en' })
  → { id, title, body, cta, image_url, image_alt, click_url /* APP_URL/a/<id>?s=<slot>&r=<region_id> */, is_house, label: 'Oglas'|'Ad' }
```
Matching: `status = 'active'`, now within dates, slot in `slots`, locale in `locales`, region/municipality null or containing the context, species null or containing it. Several matches → weighted random. None → a house ad for the locale (`supporter`, `partner`, `adopt`, rotated). Ads with `exclusive` cannot overlap in dates for the same slot and region (constraint trigger).

```ts
record_ad_event(p_ad_id, p_slot, p_kind 'impression'|'click', p_region_id?) → void
// security definer upsert into ad_stats_daily (day in Europe/Ljubljana); no user ids, no cookies; light abuse guard: 300 events/min per IP hash
```
Click: web route `GET /a/[id]?s=<slot>&r=<region>` (TASK-35.2) calls `record_ad_event(click)` and `302` to the stored `link_url` (no user-supplied target). Links carry `rel="sponsored noopener"` and `target="_blank"`. Impression = client calls `record_ad_event(impression)` once when the ad first renders (rendered count, A-016).

Client hook (`@zivali/api/ads`): `useAd(slot, ctx): { ad, loading, error }` (errors collapse the slot silently).

## Admin (owned by TASK-37)

```ts
admin_upsert_ad(ad: AdInput) → { id }            // validation: alt required, https link, image 1200×628 (feed/detail/reunited) or 300×600 (sidebar) ±2 %, no exclusive overlap; audited
admin_set_ad_status(id, status) / admin_delete_ad(id) (soft)   // audited
admin_ad_stats(id, from, to) → { day, slot, region_slug, impressions, clicks, ctr }[]   // CSV export client-side
```

## Partner stats and leads (owned by TASK-38)

```ts
get_partner_stats() → { generated_at, pilot: boolean,
  totals: { users: CountValue, active_reports: CountValue, reunions_90d: CountValue },
  by_region: { region_slug, users: CountValue, active_reports: CountValue, reunions_90d: CountValue }[] }
type CountValue = number | '<5'          // any value 1–4 is returned as '<5'; 0 stays 0
```
Materialised view refreshed hourly by `refresh_partner_stats`; optional GA Data API enrichment only behind `partners.ga_enrichment` flag (off).

Edge Function `submit-lead` (POST, no auth): body `{ company, contact_name, email, phone?, region_interest?, message, consent: true, captcha_token, locale }` → captcha adapter verify → `check_rate_limit('lead:ip', 3, '1 hour')` → insert → email to `LEADS_NOTIFY_EMAIL` via email adapter → `201 { id }`. Errors: `VALIDATION`, `CAPTCHA_FAILED`, `RATE_LIMITED`.

## Example

```json
// rpc/get_ad { "p_slot": "detail", "p_ctx": { "region_id": 8, "species": "dog", "locale": "sl" } }
{ "id": "ad7…", "title": "Dežurni veterinar 24/7", "body": "…", "cta": "Pokliči", "image_url": "https://…/ad-images/ad7/1.webp",
  "image_alt": "Veterinarka pregleduje psa", "click_url": "https://…/a/ad7…?s=detail&r=8", "is_house": false, "label": "Oglas" }
```
