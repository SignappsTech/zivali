# ADR-024: Chat translation with Claude Haiku through the existing AI adapter

- Status: Accepted (implementation in M4, TASK-118; contract C9 §Messages (translation)) · Date: 2026-10-19 · Owner: Tech Lead
- Source: PRD R-026.7, R-026.9, A-032, P-6, NFR-AI, NFR-PRIV; CH-637

## Context

Premium adds automatic chat translation (SL and EN now, more by config) in both directions: the free or anonymous party reads the Premium user's messages in their own language. The original must arrive first (R-009.1, p95 < 2 s); the translation follows. The provider must not train on our data, and local and CI runs stay offline (P-6). Budget: Premium AI ≤ EUR 0.50 per user per month.

## Decision

- **Provider**: Anthropic `claude-haiku-5-5` through the `@anthropic-ai/sdk` already used for extraction (ADR-012): no new dependency, no new processor (Anthropic is already named in the privacy policy; API data is not used for training). Model `CHAT_TRANSLATE_MODEL` (default `claude-haiku-5-5`), effort low, thinking off, structured output `{ detected_lang, translations: { <lang>: text } }`, one call per message for all target languages it lacks.
- **Async**: a pg-boss job `chat.translate { message_id }` sent in the message's transaction; the worker stores the result and broadcasts `message.translated` (ADR-023). The original's path does not change.
- **Masking**: phone numbers, e-mail addresses, URLs and chip-like numbers are replaced with numbered placeholders before the call and restored after (the `@zivali/validation` contact-data patterns), so contact data never reaches the provider and is never mistranslated.
- **Ledger and caps**: every call is an `ai_calls` row (purpose `translate`, the charged user), so spend sits in the same table as extraction. Caps and budgets in C9 and docs/05 §NFR-AI; over a cap, outage or an unsupported language → the original plus a notice.
- **Mock**: `CHAT_TRANSLATE_PROVIDER=mock` (default locally and in CI) returns `[<lang>] <original>` deterministically; `off` in staging and production unless set to `anthropic`.

## Alternatives

- DeepL API (Free/Pro): better pure translation quality, but a new processor, a new key and a DPA, and its free tier may use texts for training; rejected for the pilot.
- Google Cloud Translation: a new processor and billing account; no gain over Haiku at our volume.
- Translate on the client (on-device models): not available on web, heavy on mobile.

## Consequences

- Moderation and abuse reports always use the original text (C11).
- Cost at pilot volume is cents per user; the per-user cap (300 messages a month) bounds it well under EUR 0.50.
- A quality problem on a language pair is a model or prompt change (config, prompt version), not new code.
