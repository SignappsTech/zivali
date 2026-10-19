---
id: TASK-90.8
title: 'Staging Lighthouse after deploy: mobile LCP <= 2.5 s'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 15:08'
labels:
  - tech
  - performance
  - 'est:S'
dependencies: []
references:
  - docs/05-quality-security-plan.md§Quality gates
  - lighthouserc.json
  - .github/workflows/deploy.yml
parent_task_id: TASK-90
priority: medium
ordinal: 426200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Lead decision (TASK-90.7, CH-399): the 2.5 s mobile LCP target is asserted on staging (HTTP/2 behind Cloudflare), not in the lab, where Lantern over local HTTP/1.1 has a ~2.7 s floor. The lab keeps a 3.3 s regression budget (lighthouserc.json).

## Packet

Unblocks on: - (deploy.yml staging job exists, TASK-5.1)
Scope: a step or job after the staging deploy in .github/workflows/deploy.yml, and lighthouserc.staging.json; no app code.
Review: lead
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 After a successful staging deploy, Lighthouse CI (mobile preset, 2 runs) runs against the public pages of lighthouserc.json on the staging host
- [ ] #2 lighthouserc.staging.json asserts LCP <= 2500 ms and otherwise the lab budgets; a failure fails the deploy workflow run (the deploy itself is not rolled back) and the report is uploaded as an artifact
- [ ] #3 docs/05 §Quality gates and TASK-90.7 notes point to the first staging result
<!-- AC:END -->
