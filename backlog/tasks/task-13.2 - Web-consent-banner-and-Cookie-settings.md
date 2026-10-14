---
id: TASK-13.2
title: Web consent banner and Cookie settings
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
labels:
  - fe
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-11.2
  - TASK-7.2
  - TASK-13.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P17-consent.md
  - docs/tech/contracts/C12-analytics-consent.md
parent_task_id: TASK-13
priority: high
ordinal: 145000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
EU law requires opt-in before analytics, with Accept and Reject at equal weight and an easy way back (FR-039).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); GA4 on web with basic Consent Mode v2 merged (TASK-7.2); Design: Consent banner and preferences (P17) approved (TASK-13.1)
Design: P17 docs/design/pages/P17-consent.md (mockup docs/design/mockups/P17-consent.html; TASK-13.1)
Copy: docs/content/pages/P17-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-13.2-consent-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On a first visit a banner in the page language offers Accept all, Reject all and Customise with equal visual weight and nothing pre-selected, per P17.
- [ ] #2 Rejecting or ignoring keeps Consent Mode denied and uses only strictly necessary storage (Playwright: no Google request, no _ga cookie).
- [ ] #3 Accepting stores choice, version and timestamp in zz_consent, applies to the analytics adapter at once and persists across sessions.
- [ ] #4 Cookie settings in the footer reopens the choice; withdrawal stops analytics at once and clears cookies.
- [ ] #5 The banner is labelled, focus-managed and passes axe; a CONSENT_VERSION bump or an age over 12 months shows it again.
<!-- AC:END -->
