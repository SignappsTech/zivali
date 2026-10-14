---
id: TASK-1
title: 'Design system: brand direction and design tokens'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:01'
labels:
  - story
  - 'req:NFR-A11Y'
milestone: m-0
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
No identity exists yet; every screen on web and mobile needs one token set (colour, type, spacing, radius, elevation) that both shadcn/ui and React Native Reusables consume, tuned for panicked users in sunlight.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the working name, when the design team presents it, then 2-3 name, logo and palette directions are proposed for client approval (Q-001) and the working name stays until one is approved.
- [ ] #2 Given the approved direction, when tokens are defined, then docs/03 lists colour, typography, spacing, radius and elevation tokens as CSS variables plus a Tailwind preset consumed by web and mobile.
- [ ] #3 Given every text and background token pair, when contrast is checked, then body text is at least 4.5:1, primary action text at least 7:1 (outdoor use) and focus indicators at least 3:1.
- [ ] #4 Given the Slovenian and English UI, when the type scale is applied, then diacritics (š, č, ž) render correctly and no style relies on colour alone to convey meaning.
<!-- AC:END -->
