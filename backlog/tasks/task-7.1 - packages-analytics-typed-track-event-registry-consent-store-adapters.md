---
id: TASK-7.1
title: 'packages/analytics: typed track(), event registry, consent store, adapters'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
labels:
  - fe
  - 'est:M'
  - no-design
milestone: m-0
dependencies:
  - TASK-3.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12-analytics-consent.md
  - docs/tech/adr/009-analytics-and-consent.md
parent_task_id: TASK-7
priority: high
ordinal: 131000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GA4 drives product decisions and the sponsor pitch; one typed track() with the exact parameter names configured on property 559038055 keeps web and mobile consistent and free of personal data.

## Packet

Unblocks on: Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README merged (TASK-3.1)
Design: none (no UI of its own)
Contracts: C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-7.1-analytics-pkg
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 @zivali/analytics exports track(), setUserRole(), trackScreen() and the consent API (getConsent, setConsent, subscribeConsent, needsConsentPrompt, CONSENT_VERSION) exactly as in C12.
- [ ] #2 A typed registry holds the 16 taxonomy events with allowlisted parameters using the exact GA4 names (municipality, region, species, report_type, ad_slot, ad_id, match_source, value, currency …); a non-allowlisted event or parameter throws in development and tests and is dropped in production.
- [ ] #3 Unit tests prove that names, emails, chip-like numbers, coordinates and free text are rejected and that track() is a no-op without consent.
- [ ] #4 Adapters ga4 (web), firebase (mobile, injected) and mock (default, records events, no network) are selected by environment.
- [ ] #5 The package README contains the GA4 property checklist (custom dimensions, user property, key events, 14-month retention, Google signals off, data sharing off) and DebugView steps for web and Android.
<!-- AC:END -->
