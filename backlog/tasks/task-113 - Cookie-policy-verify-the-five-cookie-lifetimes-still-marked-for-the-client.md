---
id: TASK-113
title: 'Cookie policy: verify the five cookie lifetimes still marked for the client'
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-16 12:50'
updated_date: '2026-10-18 05:13'
labels:
  - legal
  - content
  - 'est:XS'
  - bug
dependencies: []
parent_task_id: TASK-28
priority: high
ordinal: 358000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The cookie policy on the live pilot (najdimo.si/piskotki and /en/cookies) still shows five visible markers, in SL and EN (apps/web/content/legal/{sl,en}/cookies.mdx; master docs/content/legal/cookie-policy.md): the auth session cookie ("up to 400 days or until sign-out [verify the actual duration]"), a session-length cookie ("[verify, probably until the end of the session]"), the Turnstile entry (line ~135), a cookie kept "until sign-out [verify]" and the Google Analytics retention ("14 months [verify]"). The operator data were filled 2026-10-16 (legal-company-data merge); these are technical facts, not company data, so the team can verify them from the code and the hosted settings.

Sources: @supabase/ssr cookie options in apps/web (maxAge), the consent cookie (apps/web consent code), Cloudflare Turnstile's documented cookies, the GA4 property 559038055 data retention setting (Admin > Data retention; the service account in .secrets/ can read it).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each of the five lifetimes is checked against the code or the hosted setting and written without a marker, in SL and EN and in the master
- [x] #2 No `[naročnik:` or `[client:` marker is left on the cookie page; anything that needs the lawyer goes to TASK-91 instead
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch: agent/task-113-cookie-lifetimes. Five durations verified from code + GA4 retention (lead, 2026-10-18); zz_consent row corrected to 400 days (choice 12 months). Turnstile: we store nothing; Cloudflare frame storage left to TASK-91 via cookie-policy.md note 3. CHANGE added for privacy.mdx zz_consent wording.
<!-- SECTION:NOTES:END -->
