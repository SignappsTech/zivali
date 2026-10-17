---
id: TASK-114.8
title: >-
  Lost report: the reward note reads like a general note; make its copy
  reward-specific
status: To Do
assignee:
  - '@content-strategist'
created_date: '2026-10-16 14:25'
updated_date: '2026-10-17 09:24'
labels:
  - bug
  - content
  - 'est:XS'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 360800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: in the lost report, "Opomba" appears only after "Ponujam nagrado za vrnitev" is checked, next to the reward, but its text sounds like a general field ("anything that can help find the animal"), which does not feel like something that only exists with a reward. Check and fix.

Checked (lead): the placement is intended. The field is `reward_note` (packages/validation reports.schema.ts; 80 characters, stored with the reward as reward.note, lost reports only, no contact data). The copy is what misleads:
- report_lost.reward_note_label "Opomba (neobvezno)" / "Note (optional)": does not say it belongs to the reward;
- report_lost.reward_note_placeholder "Na primer: tudi za podatek, ki pomaga pri iskanju" / "For example: also for information that helps the search": meant as "the reward also applies to useful information", read as "write anything that helps".
The general field already exists: "Opis okoliščin (neobvezno)" (circumstances, 1000 characters) on the "Kaj se je zgodilo?" step.

Fix (copy only unless the owner wants a layout change): make label and placeholder reward-specific, e.g. "Pogoji nagrade (neobvezno)" or "Opomba k nagradi (neobvezno)", placeholder "Na primer: nagrada velja tudi za podatek, ki pripelje do živali" (EN to match). The review step's row and the report page's reward line should use the same wording. Optionally point "anything else that helps" at the circumstances field's help text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The reward note's label and placeholder say they belong to the reward, SL and EN (packages/i18n messages + the P6 content slice), web and mobile
- [ ] #2 Review step and report detail use the same wording for the reward note
- [ ] #3 Unit tests that assert the old strings updated
<!-- AC:END -->
