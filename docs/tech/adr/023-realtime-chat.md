# ADR-023: Live chat and inbox updates with Supabase Realtime Broadcast on private channels

- Status: Accepted · Date: 2026-10-15 · Owner: Tech Lead
- Source: FR-009 (p95 < 2 s), FR-010, brief v1.0 (optional Realtime), ADR-021

## Context

Messages are written through the Express API. Clients need live delivery on web and mobile (React Native). Options: Supabase Realtime, Socket.io from Express, or Server-Sent Events from Express.

| Option | Web | React Native | Server cost | Notes |
|---|---|---|---|---|
| Supabase Realtime **Broadcast**, private channels | supabase-js (already used for Auth) | supabase-js works in RN | none on our VPS; Free tier: 200 concurrent clients, 2M messages/month | authorisation by RLS on `realtime.messages`; app tables stay unexposed |
| Supabase Realtime Postgres Changes | yes | yes | none | needs grants and RLS select policies on `app.messages`, conflicts with ADR-021 |
| Socket.io from Express | client library | client library | sticky connections on the VPS, Caddy websocket config | two new dependencies, own reconnection and auth handling |
| SSE from Express | native EventSource | needs a polyfill library | long-lived connections on the VPS | one-way only, mobile background handling is manual |

## Decision

- **Supabase Realtime Broadcast with private channels.** Topics: `conversation:<id>` (new messages, read receipts) and `user:<id>` (inbox badge, notification created).
- The API persists the message, then broadcasts in the same transaction with `select realtime.send(payload, event, topic, true)` (Prisma `$executeRaw`). Payload: `{ id, conversation_id, sender_alias_key, kind, body, has_link, created_at }`; nothing else.
- Authorisation: RLS policy on `realtime.messages` for `authenticated` (anonymous finders are authenticated users too) allowing `select` (receive) when `app.can_join_topic(auth.uid(), realtime.topic())` returns true. That `security definer` function checks conversation membership or `user:<own id>`. Clients cannot send on these topics (no insert policy); writes always go through the API.
- Clients: `supabase.channel(topic, { config: { private: true } }).on('broadcast', …).subscribe()`, re-fetch `GET /v1/conversations/:id/messages?after=<last id>` on (re)subscribe, so a missed broadcast never loses a message. Push notifications cover offline recipients (C10).

## Consequences

- No websocket server on our VPS; Realtime limits of the Free tier are enough for the pilot; upgrade with Supabase Pro.
- The one RLS policy and the membership function are covered by the security tests (ADR-021) and a two-client integration test (p95 < 2 s locally).
