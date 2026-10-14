# ADR-010: In-app inbox + Expo Push + Brevo email, all behind adapters

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Source: FR-010, FR-001 R-001.4, FR-020 R-020.4, NFR-LAT, NFR-PRIV, P-6

## Decision

- **Inbox first**: every notification is a row in `notifications` (Realtime to the client). Delivery channels are side effects of the `notify` job (ADR-004).
- **Push**: Expo Push Service over HTTPS (no SDK). Tokens in `push_tokens`; `DeviceNotRegistered` receipts delete the token. Real delivery needs FCM credentials in EAS (Android) and APNs (iOS, Q-007); the `mock` adapter records sends locally.
- **Email (transactional)**: **Brevo** HTTP API (EU company and data centres, free tier 300/day) through an `email` adapter (`brevo | mock`). The `mock` adapter writes to `email_outbox` with status `mocked`; tests assert on that table. Supabase Edge Functions block outbound SMTP ports, so HTTP API it is.
- **Auth emails** (verification, reset, magic links) are sent by Supabase Auth: locally to the bundled mail catcher (Inbucket/Mailpit UI at `localhost:54324`), in cloud through Brevo SMTP as Supabase custom SMTP. Templates are localised with Go-template conditionals on `user_metadata.locale`.
- Preferences per type and channel, quiet hours in `Europe/Ljubljana` (not for chip match or chat), dedupe keys and per-report push limits are enforced in the `notify` handler (contract C10).

## Alternatives

- Resend / Postmark: good APIs, US processors; Brevo keeps mail data in the EU.
- Firebase Cloud Messaging directly: needs per-platform handling; Expo Push wraps both.

## Consequences

- Credentials needed for real delivery: Brevo API key and SMTP credentials, FCM server key / APNs key in EAS (listed in TDD §Environments).
- Email content lives in `packages/i18n` (namespace `email`), so the content strategist edits copy, not code.
