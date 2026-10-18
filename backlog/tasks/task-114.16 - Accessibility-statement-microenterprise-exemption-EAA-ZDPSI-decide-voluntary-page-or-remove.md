---
id: TASK-114.16
title: >-
  Accessibility statement: microenterprise exemption (EAA, ZDPSI); decide
  voluntary page or remove
status: Done
assignee:
  - '@content-strategist'
created_date: '2026-10-16 15:40'
updated_date: '2026-10-18 05:16'
labels:
  - legal
  - content
  - 'est:XS'
  - fe
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 361600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: the European Accessibility Act (Directive (EU) 2019/882, Art. 4(5)) and the Slovenian Zakon o dostopnosti do proizvodov in storitev za invalide (ZDPSI, https://pisrs.si/pregledPredpisa?id=ZAKO8537) exempt microenterprises providing services: fewer than 10 employees and annual turnover or balance-sheet total not above EUR 2 million. An operator that qualifies does not legally need the formal accessibility statement or the Act's technical accessibility requirements. Sources the owner cited: op-svab.com/evropski-akt-o-dostopnosti, novisplet.com/zakon-o-dostopnosti-digitalnih-storitev-zdpsi, e-dostopen.si (ZDSMA covers the public sector only).

Current pages: apps/web/content/legal/{sl,en}/accessibility.mdx ("Izjava o dostopnosti"), linked from the footer LEGAL group; master docs/content/legal/accessibility-statement.md; final legal texts TASK-71, lawyer review TASK-91.

Decision for the owner (lead's recommendation first):
1. Recommended: keep our WCAG 2.2 AA work and its quality gates (axe in e2e and the quality kit; it is built and costs little to keep, and pilot users include older people and shelter staff on phones), and replace the formal statement by a short voluntary "Dostopnost" page: what we aim for, known gaps, a contact for reporting barriers; no legal compliance claims.
2. Or remove the page and its footer link.
Either way: the lawyer (TASK-91) confirms that SIGNAPPS d.o.o. qualifies as a microenterprise (headcount, turnover) and that the exemption covers Najdimo (payments may make it an e-commerce service in scope; the microenterprise exemption still applies to services). Record the basis in the master doc so it is revisited if the company grows past the thresholds or Najdimo moves to its own company.

**Owner decision 2026-10-16:** option 1. Keep the accessibility work and its quality gates; no formal ("approved") accessibility statement. The page becomes a short voluntary "Dostopnost" page with our own goals (WCAG 2.2 AA as the target we work to, known gaps, a contact for reporting barriers), no legal compliance claims. A separate lawyer approval is not needed; the general lawyer review (TASK-91) may glance at it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Owner picks option 1 or 2 (2026-10-16: option 1, voluntary goals page, no formal statement, no separate lawyer approval)
- [x] #2 The accessibility page rewritten as a short voluntary page with our goals and a barrier contact, SL and EN (apps/web/content/legal/{sl,en}/accessibility.mdx), master docs/content/legal/accessibility-statement.md updated with the exemption basis
- [ ] #3 The accessibility quality gates stay in CI unless the owner decides otherwise
<!-- AC:END -->
