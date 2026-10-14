---
doc_id: DOC-05
title: Quality and Security Plan
version: 0.1
status: Draft
date: YYYY-MM-DD
owner: Tech Lead
audience: Team, client on request
approvals:
  - Tech Lead | | |
---

<!-- Owner: tech-lead (QA contributes test results). The DoD and gates are copied into docs/tech/frontend.md and backend.md for implementers. -->

# Quality gates (automated, on every PR)

| Gate | Tool | Threshold | Blocks merge |
|---|---|---|---|
| Lint / format | | 0 errors | Yes |
| Typecheck | | 0 errors | Yes |
| Unit / integration tests | | all pass | Yes |
| Performance | Lighthouse CI | perf ≥ 90, LCP < 2.5 s, CLS < 0.1, page < 1 MB | Yes |
| Accessibility | axe (Playwright) + Lighthouse | 0 violations, a11y ≥ 95 | Yes |
| SEO | Lighthouse | ≥ 95 | Yes |
| HTML validity | html-validate | 0 errors | Yes |
| Links | linkinator | 0 broken | Yes |
| Visual | Playwright screenshots vs approved mockups | ≤ agreed diff | Review |
| Security | dependency audit + security review | no high/critical | Yes |

# Testing strategy

- **Unit:** business logic, validation, utilities.
- **Integration:** endpoints, forms, CMS integration, external services.
- **End-to-end:** critical flows (navigation, contact form, consent).
- **Manual QA:** per story against acceptance criteria; mobile, keyboard, screen reader spot-checks.
- **Cross-browser:** matrix from NFR-BROWSER.

# Security

- **Threats in scope:** XSS, CSRF, injection, SSRF, path traversal, open redirects, insecure uploads, spam/abuse on forms.
- **Input:** validate all external input; escape output; parameterized queries.
- **Secrets:** env or secret manager only; never committed or logged; rotatable.
- **Headers:** CSP, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors.
- **Rate limiting / anti-spam:** forms and auth endpoints.
- **Dependencies:** pinned, audited, minimal (each needs an ADR).
- **Review:** security review before each release.

# Privacy and compliance

GDPR: data inventory, lawful basis, retention, consent before non-essential cookies, data-processing agreements with processors. Accessibility statement (EAA). Cookie policy.

# Definition of Done

- [ ] Acceptance criteria met
- [ ] Follows architecture and conventions
- [ ] Tests added or updated, and passing
- [ ] Lint, typecheck and build pass
- [ ] Quality gates pass (performance, a11y, SEO, HTML, links)
- [ ] Security implications reviewed; error cases handled
- [ ] No unrelated changes; docs updated where needed
- [ ] PR has description, screenshots (UI) and ticket link
- [ ] No known critical or high issues

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | | Initial draft |
