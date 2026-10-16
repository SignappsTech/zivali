---
id: TASK-114.14
title: 'Notification and alert settings: free choice, nothing selected means none'
status: To Do
assignee:
  - '@frontend-dev'
  - '@backend-dev'
created_date: '2026-10-16 15:20'
labels:
  - fe
  - be
  - 'est:S'
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 361400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: in the notification settings we force at least one option to stay selected. It should be free: any option can be switched off, and with everything off the user simply does not get those notifications. (Unlike the map filters, TASK-114.13, where nothing selected means all: here nothing selected means none.)

Where it is forced:
1. Nearby alerts (apps/web/components/alerts/alert-settings.tsx ~320): the last selected species is disabled (`disabled={on && current.species.length === 1}`), and the API refuses it too: packages/validation notifications.schema.ts `AlertSubscriptionInput.species: z.array(Species).min(1).max(2)`.
2. "Kako me obvestimo" (apps/web/components/notifications/notification-settings.tsx ~39-40, ~149-160): in-app is locked on for matches and messages (`locked: true`, a P13 decision). The owner's rule overrides it.

Fix:
- Alerts: allow an empty species list (min 0) in the schema and the UI; the fan-out sends nothing for an empty subscription (check alerts.fanout and its SQL treat [] as no match, not as all); show the state plainly ("Ne prejemate opozoril za živali v bližini"). Consider mapping "nothing selected" to the existing `paused` instead if that is simpler and reads the same.
- Notification channels: drop the in-app lock for matches and messages. Chats still appear under Sporočila regardless (only the notification row goes). Because matches are how an owner learns their pet may have been found, show a short note when every channel for matches is off ("Ujemanj vam ne bomo sporočili; vidite jih le na strani prijave"). Update the P13 page slice and docs/design note (design-lead CHANGE) for the dropped lock.
- Mobile app settings: same rules (follow-up task if they differ).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every species in the nearby-alert settings can be switched off; with none, the API accepts it and no nearby alert is sent (fan-out test)
- [ ] #2 Every channel for every notification type can be switched off, including in-app for matches and messages; with all off for a type, no notification of that type is created or sent (test), and the matches warning note shows
- [ ] #3 SL and EN copy for the empty states and the note; unit, route and e2e tests updated; mobile checked
<!-- AC:END -->
