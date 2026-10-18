---
id: TASK-114.15
title: '"Kako vas obvestimo": a collapsible section, not a separate page'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 15:30'
updated_date: '2026-10-18 19:35'
labels:
  - fe
  - design
  - ux
  - 'est:S'
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 361500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: "Kako vas obvestimo" should not be a new page, or if it is, there must be an easy way back to the main page; the owner prefers it collapsible.

Today: Račun → Opozorila (/racun/opozorila, /en/account/alerts: apps/web/app/[locale]/(app)/account/alerts/page.tsx with components/alerts/alert-settings.tsx) ends with a link row "Kako vas obvestimo" (alert-settings.tsx ~345, "Channels and quiet hours live on the notification settings page (TASK-22.4)") to a separate page /racun/obvestila (/en/account/notifications: components/notifications/notification-settings.tsx, channels per type and quiet hours) with no way back.

Wanted (owner's choice): the channel and quiet-hours settings as a collapsible section on the alerts page (closed by default, or open when arriving from a link that targets it), saving as today. Keep /racun/obvestila as a redirect to the alerts page with the section open (old links, emails' "manage notifications" links). If anything must stay a separate page, it gets a clear back link to Opozorila.

**Wireframe rule (owner, 2026-10-16):** this changes a page's layout, so a quick mock from our real components, confirmed by the owner, comes before the build; record who and when in this task's notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Component mock of the alerts page with the collapsible section approved by the owner (notes: who, date)
- [ ] #2 Channels and quiet hours are a collapsible section on /racun/opozorila (disclosure button with aria-expanded, keyboard and screen reader friendly), saving as before; SL and EN
- [ ] #3 /racun/obvestila and /en/account/notifications redirect to the alerts page with the section open; email "manage notifications" links still land there
- [ ] #4 Unit and e2e tests updated; the mobile app's settings checked for the same dead end (follow-up if different)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
docs/design/wireframes/M-alerts-notifications.html: v1 ready for owner review (2026-10-18). Not approved yet.

Review sheet for the owner (private claude.ai page, v1 2026-10-18): https://claude.ai/artifact/MTTBPrLTPgEJM8r6QfZQ45. Awaiting owner approval.

MOCK APPROVED: Primož Božič (owner), 2026-10-18, wireframe v1 (docs/design/wireframes/M-alerts-notifications.html). Owner: "alerts confirmed": a collapsible section on the alerts page, closed by default, grey summary line under the closed title, /racun/obvestila redirects to the alerts page with the section open. Implementation not started: owner said not to build yet (2026-10-18).
<!-- SECTION:NOTES:END -->
