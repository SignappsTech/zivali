---
id: TASK-114.20
title: 'Cookie settings: link the "politika piškotkov" mention to the cookies page'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 16:10'
updated_date: '2026-10-18 04:52'
labels:
  - fe
  - content
  - 'est:XS'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 362000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: the cookie popup says you can read more on the Piškotki page; that mention should be a link.

Code: packages/i18n/messages/{sl,en}/consent.json `necessary_body` ends "Trajanje je navedeno v politiki piškotkov." as plain text; the banner's separate "Politika piškotkov" link (`policy_link`, apps/web/components/consent/consent-banner.tsx ~140, `policyHref`) is elsewhere in the dialog. Make the mention itself a link to /piskotki (/en/cookies) with next-intl rich text (`t.rich`, a `<link>` tag in the message), in SL and EN; same for any other consent text that refers to the policy (body_web, analytics_body_web). The mobile app's consent screen: same text, link to the web page (follow-up if it differs). Opening the policy must not count as a consent choice; the banner stays open (or reopens) on return.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every consent text that mentions the cookie policy links to /piskotki (/en/cookies); SL and EN; keyboard reachable inside the dialog
- [ ] #2 Following the link records no choice, and the banner is still there to answer afterwards
- [ ] #3 consent-banner tests updated; i18n check passes for both catalogues
<!-- AC:END -->

## Packet

Branch: agent/TASK-114.20-task
