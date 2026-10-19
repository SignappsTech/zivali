---
id: TASK-28.9
title: >-
  Privacy §12 and company information omit Cloudflare as the proxy in front of
  najdimo.si and the API
status: To Do
assignee:
  - '@content-strategist'
created_date: '2026-10-19 20:32'
labels:
  - bug
  - 'est:XS'
  - web
milestone: m-1
dependencies: []
parent_task_id: TASK-28
priority: low
ordinal: 468200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: open any page of https://najdimo.si: the response header is "server: cloudflare" and Cloudflare injects /cdn-cgi/ scripts (see TASK-28.5); CH-488 set DNS @, www and api to proxied. Then read /en/privacy §12 and §13 (SL /zasebnost) and /en/company-information §3 "Hosting" (SL /podatki-o-podjetju).
Expected: the processor list names Cloudflare as the reverse proxy / CDN in front of the website and the API, with the data it receives (IP address and request data of every visit, TLS termination) and where (global network, transfer basis in §13).
Actual: Cloudflare appears only for R2 (photos, backups, public photo copies) and Turnstile; "Website and server" names Hetzner only, so every visitor's IP passing through Cloudflare is not disclosed. The master docs/content/legal/privacy-policy.md and imprint.md say the same.
Severity: low (factual gap; the lawyer pack TASK-40.6 may word it).

## Packet

Unblocks on: -
Branch: agent/task-28.9-cloudflare-proxy-processor from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Privacy §12 (and §13 if needed) and company information §3, in the masters and the SL and EN MDX, list Cloudflare as reverse proxy/CDN for najdimo.si and the API with the data it receives
<!-- AC:END -->
