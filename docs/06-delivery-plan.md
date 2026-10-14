---
doc_id: DOC-06
title: Delivery Plan
version: 0.1
status: Draft
date: YYYY-MM-DD
owner: Product Manager
audience: Client, team
approvals:
  - Client | | |
  - Product Manager | | |
---

<!-- Owner: product-manager. The milestone table and estimates are kept in sync with backlog/ (run backlog.mjs --status). -->

# Milestones

| ID | Milestone | Goal | Exit criteria | Depends on | Estimate | Target date |
|---|---|---|---|---|---|---|
| M1 | Discovery & specs | | Brief, PRD, design direction, TDD approved | | | |
| M2 | Foundation | | | M1 | | |
| M3 | Build | | | M2 | | |
| M4 | Hardening & launch | | All gates green, client UAT signed | M3 | | |
| M5 | Handover | | Handover pack accepted | M4 | | |

# Phases

Discovery → Specification → Design → Foundation → Build → Hardening (security, performance, a11y, cross-browser, backup test) → Launch (DNS, redirects, monitoring) → Handover and training.

# Estimates

Ticket sizes: XS = ½ day · S = 1 day · M = 2–3 days · L = 1 week (split anything bigger). The totals per milestone come from the backlog.

# Responsibilities

| Area | Responsible | Approves | Consulted |
|---|---|---|---|
| Scope and requirements | Product Manager | Client | Project Lead |
| Design | Design Lead | Client | Product Manager |
| Architecture | Tech Lead | Project Lead | Product Manager |
| Content and SEO | Content Strategist | Client | Design Lead |
| Release | Tech Lead | Client | QA |

# Risks

| ID | Risk | Impact | Probability | Mitigation | Owner |
|---|---|---|---|---|---|
| R-001 | | | | | |

# Communication

Status report per milestone (generated from the backlog), demo at each milestone, and a decision log in the Project Brief.

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | | Initial draft |
