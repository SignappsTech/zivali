---
id: TASK-76.2
title: >-
  Deploy: mount the FURS certificate directory read-only into api and worker
  (CH-292)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 21:34'
labels:
  - tech
  - 'est:XS'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C13-payments.md§Fiscal invoices
parent_task_id: TASK-76
priority: medium
ordinal: 491200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up of TASK-92.1 (CH-292 item 2): FISCAL_PROVIDER=furs needs the PEM files in the containers; deploy/README.md §10 step 5 still says 'compose change pending'. Items 1, 3 and 4 of CH-292 are done (fiscal.resubmit job TASK-92.3, launch checklist row, install).

## Packet
Unblocks on: -
Branch: agent/task-76.2-furs-cert-mount
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 deploy/docker-compose.yml mounts `/opt/zivali/<env>/furs` read-only at one fixed container path in api and worker; scripts/deploy.mjs (or remote.sh) creates the host directory (mode 700) when missing, so an environment with the mock fiscal provider still starts
- [ ] #2 deploy/README.md §10 step 5 names the container paths for FURS_CERT_PATH, FURS_KEY_PATH and FURS_CA_PATH and drops 'compose change pending'
- [ ] #3 `docker compose -f deploy/docker-compose.yml config` passes (no containers started)
<!-- AC:END -->
