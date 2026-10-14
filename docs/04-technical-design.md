---
doc_id: DOC-04
title: Technical Design
version: 0.1
status: Draft
date: YYYY-MM-DD
owner: Tech Lead
audience: Team, client IT
approvals:
  - Tech Lead | | |
---

<!-- Owner: tech-lead. Master tech doc. Implementers read only docs/tech/frontend.md, backend.md and contracts/C*.md slices. "N/A — reason" for anything that does not apply (e.g. no auth on a brochure site). -->

# Architecture overview

Diagram and a short explanation of the main parts and how they connect.

# Technology stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Frontend | | | |
| Backend / CMS | | | |
| Database | | | |
| Hosting | | | |
| Email / forms | | | |
| Analytics (consent-gated) | | | |

# Repository structure

    /            ← where everything lives, one line per folder

Module boundaries and ownership.

# Data model

| Entity | Fields | Constraints / indexes | Sensitive? |
|---|---|---|---|

Deletion and retention strategy.

# Interfaces and contracts

| ID | Contract | Type | Slice |
|---|---|---|---|
| C1 | | API / data / hook | docs/tech/contracts/C1-….md |

API standards: base path, format, error structure (no stack traces to clients), pagination, idempotency.

# Authentication and authorization

Methods, sessions, roles and permissions, or `N/A — reason`.

# Environments and infrastructure

| Env | URL | Purpose | Deploy |
|---|---|---|---|
| Local | | development | |
| Staging | | client preview, QA | auto on merge to main |
| Production | | live | tagged release |

Configuration through env vars, never committed. Database, cache, queue, storage, CDN: or `N/A`.

# CI/CD

PR pipeline: install → lint → typecheck → unit → integration → build → quality gates (Lighthouse, axe, HTML validation, links, visual) → security checks.
Deploy pipeline: merge → build → staging → smoke tests → (approval) → production → health checks. Rollback procedure.

# Observability

Logs (format, retention, no secrets/PII), metrics, uptime monitoring, alerts that someone acts on.

# Backup and disaster recovery

Frequency, retention, restore procedure, restore test. RPO / RTO.

# External integrations

| Integration | Purpose | Auth | Limits | Failure behavior | Data stored |
|---|---|---|---|---|---|

# Architecture decisions

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | | Accepted |

Full records: `docs/tech/adr/NNN-*.md` (context, decision, alternatives, consequences).

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | | Initial draft |
