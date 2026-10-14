---
doc_id: DOC-02
title: Product Requirements
version: 0.1
status: Draft
date: YYYY-MM-DD
owner: Product Manager
audience: Client, team
approvals:
  - Client | | |
  - Product Manager | | |
---

<!-- Owner: product-manager. IDs are stable (FR-001, NFR-PERF…); never renumber. "N/A — reason" where not applicable. -->

# Summary

What the product does, in five lines.

# Users and needs

| User | Needs | Key tasks |
|---|---|---|

# Functional requirements

## FR-001: [Feature name]

- **Priority:** Must / Should / Could · **Milestone:** M1
- **User story:** As a [user], I want [capability] so that [benefit].
- **Requirements**
  - R-001.1
- **Acceptance criteria**
  - [ ] Given …, when …, then …
- **Edge cases**
  - …

# Non-functional requirements

| ID | Area | Requirement | Target / measure |
|---|---|---|---|
| NFR-PERF | Performance | Lighthouse performance; LCP; page weight | ≥ 90 · < 2.5 s · < 1 MB |
| NFR-A11Y | Accessibility | WCAG 2.2 AA, keyboard, screen reader | axe: 0 violations |
| NFR-SEO | SEO | Titles/meta, structured data, sitemap, 301s from old URLs | Lighthouse SEO ≥ 95 |
| NFR-SEC | Security | See Quality & Security Plan | |
| NFR-BROWSER | Browsers | Latest 2 of Chrome, Edge, Firefox, Safari; iOS/Android | |
| NFR-I18N | Language | Content language(s); translation readiness | |
| NFR-AVAIL | Availability | Uptime target | |

# Content, SEO and legal requirements

- **Content:** final copy per page (no placeholders), tone of voice, alt text for every image.
- **SEO:** keyword focus per page, meta title/description, structured data (Organization, LocalBusiness…), XML sitemap, robots, **301 redirect map** from the old site (see `discovery/redirects.csv`).
- **Legal (EU):** cookie consent (GDPR/ePrivacy, no non-essential cookies before consent), privacy policy, cookie policy, company legal details (imprint), **accessibility statement** (European Accessibility Act). Drafts are marked *requires client/legal review*.

# Scope

| | Features |
|---|---|
| **MVP** | |
| **Version 1** | |
| **Future** | |
| **Out of scope** | |

# User flows

    Visitor → Home → Service page → Contact form → Confirmation

# Assumptions

- A-001:

# Glossary

| Term | Meaning |
|---|---|

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | | Initial draft |
