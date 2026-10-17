---
id: TASK-116
title: 'Footer rework: a standard footer with vertical link columns'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-16 14:00'
updated_date: '2026-10-17 09:24'
labels:
  - design
  - pilot
  - story
dependencies: []
priority: medium
ordinal: 362000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: a more standard footer, links in vertical columns instead of horizontal rows. Today (apps/web/components/shell/footer.tsx) the INFO links (Kako deluje, Varnost, Pogosta vprašanja, Za zavetišča, Zavetišča, Oglaševanje/partners, O nas) and the LEGAL links (Zasebnost, Piškotki, Nastavitve piškotkov, Pogoji uporabe, Impresum, Dostopnost) wrap in horizontal rows (flex-wrap), next to the language switch; the report flows use a short FLOW variant.

Likely shape (for the wireframe): logo and one line about Najdimo, then columns with headings (e.g. Najdimo / Pomoč / Za partnerje / Pravno), the language switch and the operator line (SIGNAPPS d.o.o., contact) at the bottom; on mobile the columns stack or sit two by two. The FLOW variant stays minimal.

**Gate (owner rule 2026-10-16):** a wireframe confirmed by a person (the owner, or someone they name) comes first. It may be a low-fidelity wireframe (layout, sections, order, content blocks; grey boxes, real labels) or a mock built from our real components (design system, ui kit), whichever is less or equal work; HTML in docs/design/wireframes/. Record the approval in the wireframe task's notes (who, date, the version approved). No mockup or implementation task starts before it. A component mock that was approved also serves as the mockup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Wireframe (or component mock) approved by a person (TASK-116.1) before any code
- [ ] #2 The new footer ships on every public and app page, SL and EN, desktop and mobile; the language switch and cookie settings keep working; the flow variant unchanged unless the approved design says otherwise
<!-- AC:END -->
