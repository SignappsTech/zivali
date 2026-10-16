---
id: TASK-37.6
title: >-
  Admin ad form: button text labelled optional with a default, but required for
  two languages
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 12:10'
updated_date: '2026-10-16 10:46'
labels:
  - bug
  - 'est:XS'
milestone: m-1
dependencies: []
parent_task_id: TASK-37
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AC: TASK-37 #1 (cta rule: required for multi-locale ads, default for single-locale).

Steps: open /admin/oglasi/nov (both languages preselected), fill everything except the button text, press Shrani.
Expected: the field is not marked optional and does not promise a default while two languages are chosen (or the help says it is required for two languages).
Actual: label "Besedilo gumba (neobvezno)" / "Button text (optional)" and help "Privzeto: Več o tem" / "Default: Learn more" (ads_cta_label, ads_cta_help) always show; the save is then refused with "To polje je obvezno." The default path is the misleading one.
Severity: low.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With two languages the button text label and help say it is required; with one language they say optional with the default (SL and EN)
<!-- AC:END -->
