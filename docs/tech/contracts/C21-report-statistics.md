source: docs/02-product-requirements.md R-026.6, A-031, A-016, P-7, NFR-PRIV; TASK-117; C4, C10, C13 §Prices and entitlements

# C21 Report statistics (Premium, M4, TASK-117)

Per report and day: listing views, shares by channel and alerts sent by channel. Counted in our database only (never GA), aggregate, cookieless. Counting starts for every report when this ships; reading is Premium for owners and free for organisation members.

## Model (Prisma `prisma/schemas/stats.prisma`, schema `app`, RLS deny-all)

```sql
create type report_stat_metric as enum ('view','share','alert');
report_stats_daily(report_id uuid → reports on delete cascade, day date,   -- day in Europe/Ljubljana
                   metric report_stat_metric, channel text, boosted boolean default false, count int default 0,
                   primary key (report_id, day, metric, channel, boosted))
-- channel: view 'web' | 'app'; share 'whatsapp' | 'facebook' | 'copy_link' | 'native' | 'poster'; alert 'push' | 'email' | 'in_app'
```
No user id, IP, device id, cookie or user agent is stored. Retention follows the report (cascade with the report row; the report retention rules apply, NFR-PRIV). Data inventory: category aggregate, not personal. Export (FR-034) unchanged.

## Counting

- **Views and shares** (immediate): `POST /v1/reports/:code/events` increments one counter with `insert … on conflict do update set count = count + 1`. Clients send a view once per page view of a public listing (web `/r/[code]` after hydration, app report screen on focus), and a share when the user picks a channel (poster: on download). Nothing is stored on the device to dedupe.
- **Not counted** (answer `204` all the same, so the caller learns nothing): a caller who manages the report (`report_managers`), a member of the report's organisation, staff (moderator, admin), a known bot (user agent matched against a short regex list in `domains/stats/bots.ts`; no new dependency), a report that is not public. Rate limit `stats.events` 60/min per hashed IP (in memory, the express-rate-limit store; never persisted).
- **Alerts** (at most 1 h behind): hourly job `stats.alerts_rollup` recomputes the `alert` rows of the last 2 days from the notification log (C10 `nearby_lost` deliveries per channel; in-app = inbox rows), replacing counts, so it is idempotent. `boosted` = the delivery fell inside a Boost period of the report. On-device proximity alerts (FR-043, C10 §Local proximity alerts) never reach the server and are not counted; the view says so.

## REST

| Method and path | Guards | Request | Response | Errors |
|---|---|---|---|---|
| `POST /v1/reports/:code/events` | optionalAuth; rate limit `stats.events` | `{ kind: 'view', channel: 'web' \| 'app' } \| { kind: 'share', channel: 'whatsapp' \| 'facebook' \| 'copy_link' \| 'native' \| 'poster' }` | `204` (counted or not) | `VALIDATION`, `RATE_LIMITED` (unknown code: `204`, no lookup leak) |
| `GET /v1/reports/:code/stats` | auth; the report's creator with `hasEntitlement(user, 'premium')`, or a member of the report's organisation (no entitlement check, P-7) | - | `ReportStats` | `UPGRADE_REQUIRED` (creator without Premium), `FORBIDDEN`, `NOT_FOUND` |

```ts
type Counts = { web?: number; app?: number; whatsapp?: number; facebook?: number; copy_link?: number;
                native?: number; poster?: number; push?: number; email?: number; in_app?: number };
type ReportStats = {
  from: string; to: string;                       // ISO dates: report created_at day … today (or the end day)
  updated_at: string;                             // last alerts rollup
  totals: { views: Counts; shares: Counts; alerts: Counts; boost_alerts: Counts };
  days: { day: string; views: Counts; shares: Counts; alerts: Counts; boost_alerts: Counts }[];   // days with any count
};
```
Any report type, open or closed. Premium lapsing locks the read (`UPGRADE_REQUIRED`); counting goes on and the history is there again on resubscribing. Clients show a table alternative to every chart.

## Example

```json
{ "from": "2026-10-19", "to": "2026-10-21", "updated_at": "2026-10-21T09:00:00Z",
  "totals": { "views": { "web": 212, "app": 40 }, "shares": { "whatsapp": 9, "poster": 2 },
              "alerts": { "push": 118, "email": 21, "in_app": 140 }, "boost_alerts": { "push": 60 } },
  "days": [ { "day": "2026-10-19", "views": { "web": 150, "app": 22 }, "shares": { "whatsapp": 7 },
              "alerts": { "push": 80, "in_app": 95 }, "boost_alerts": {} } ] }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-19 | CH-636: first version (TASK-117; implementation after the TASK-117.1 wireframe approval) |
