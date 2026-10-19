---
id: TASK-54.1
title: 'Wireframe: Premium plan page, yearly first (approval gate)'
status: In Progress
assignee:
  - '@design-lead'
created_date: '2026-10-19 14:33'
updated_date: '2026-10-19 18:47'
labels:
  - design
  - wireframe
  - 'est:S'
dependencies: []
references:
  - docs/02-product-requirements.md
  - docs/03-design-specification.md
  - docs/design/system.md
  - docs/design/wireframes/P24-premium-plan.html
parent_task_id: TASK-54
priority: medium
ordinal: 420200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wireframe of the Premium plan page (TASK-54, FR-026 R-026.1), web 1440 and mobile 390, in docs/design/wireframes/ (file name per the design lead's page id): yearly plan first and marked best value (EUR 29.99, EUR 2.50 per month, 37 % less than monthly), monthly plan (EUR 3.99) beside it with its own equal button, no pre-selection, no struck-through price; the free-forever list before the Premium perks (unlimited pets, AI extras incl. the sightings heatmap, report statistics, chat translation, one-tap lost mode, 1 free Boost per year, ad-free); VAT, renewal, cancel any time and test-mode notes at each button; active state with plan and renewal date; the mobile note that checkout opens on the web. Real labels from FR-026 until the content slice exists.

**Gate (owner rule 2026-10-16):** a wireframe confirmed by a person (the owner, or someone they name) comes first. Low-fidelity (layout, sections, order, content blocks; grey boxes, real labels) or a mock from our real components, whichever is less or equal work; HTML in docs/design/wireframes/. Record the approval in this task's notes (who, date, version approved). No mockup or implementation task for the plan page starts before it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The plan page wireframe (desktop and mobile) is in docs/design/wireframes/ and linked from this task, with the data each block needs (prices from config, entitlement state)
- [ ] #2 A person approved it; their name, the date and the approved version are in this task's notes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
v1 wireframe for the owner (2026-10-19): docs/design/wireframes/P24-premium-plan.html (page id P24, as proposed in CH-646). Web only, Desktop 1200 and Mobile 390 (owner 2026-10-19; the description's 1440 is superseded). Slovenian copy: proposals from the FR-026 labels, no keys yet; the P24 copy slice (CH-639, not yet on main) replaces them.

Frames: F1 plan page, free user (free, signed out, opening checkout, checkout unavailable); F2 back from Stripe Checkout (confirming, confirmed, late, cancelled); F3 Premium user (yearly, monthly, cancelled to period end, payment failed, ended); F4 Settings > Naročnina (section, cancel dialog, after cancelling). The data each block needs is the table in the wireframe: prices from the price config (C13, CH-635), derived per-month and saving computed from it, entitlement and subscription state from TASK-52.

Open questions Q1 to Q7 at the top of the file: order of lists and plans; both plan buttons primary; monthly free Boost (OQ-004); own cancel button vs Stripe portal (R-020.3); plan switch at period end; withdrawal consent in Stripe Checkout (lawyer); ended state without a win-back offer.

APPROVAL: pending. No person has approved this wireframe yet. Record who, the date and the version approved here when they do.
<!-- SECTION:NOTES:END -->
