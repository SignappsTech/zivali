---
id: TASK-38.5
title: 'P22: both Region selects share the accessible name ''Region'''
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 08:57'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-38
priority: low
ordinal: 353000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: open /en/advertise, list comboboxes. Expected: names distinguish the audience filter from the enquiry field. Actual: partners.region_label and partners.form_region are both 'Region' / 'Regija' (packages/i18n/messages/*/partners.json), so two comboboxes read the same out of context. Severity: minor (a11y, TASK-38.3 AC#1). Copy-only fix.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The audience region switch and the enquiry region field have distinct accessible names (e.g. 'Show numbers for region' vs 'Region of interest') in SL and EN
<!-- AC:END -->
