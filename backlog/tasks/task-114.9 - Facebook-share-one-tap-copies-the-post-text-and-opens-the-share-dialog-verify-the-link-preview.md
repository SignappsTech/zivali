---
id: TASK-114.9
title: >-
  Facebook share: one tap copies the post text and opens the share dialog;
  verify the link preview
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 14:35'
updated_date: '2026-10-18 04:42'
labels:
  - fe
  - share
  - 'est:S'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 360900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: for Facebook sharing, generate a link that prefills the user's post.

Constraint: Facebook does not let a site prefill the post text (Platform Policy: no prefilled user message; the share dialog's `quote` parameter is unreliable/deprecated since 2022). A share link carries only the URL. What we control:
1. The link preview: /r/[code] already has a per-report Open Graph image (apps/web/app/r/[code]/opengraph-image) and title ("Izgubljen pes Rex, Ljubljana"). Verify on the live site with Facebook's Sharing Debugger that facebookexternalhit gets the page and the image through Cloudflare (bot rules, the noindex header does not matter to it) and that the card shows the photo, title and description.
2. The text: the share menu's Facebook row (components/report/share-menu.tsx, sharer.php?u=) opens Facebook with the URL only, while the "Facebook kit" already builds a ready-made post text (copy) and the square image. Make the Facebook row do both in one tap: copy the kit's post text to the clipboard, open the share dialog (new tab, or the app on mobile), and show a toast "Besedilo objave je kopirano. Prilepite ga v objavo." Same in the lost-report confirmation's share options (lost-done.tsx) and the mobile app's share (follow-up there if it differs).
3. Optional (owner): mention sharing into local lost-pet groups in the kit copy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Facebook's Sharing Debugger shows the report card (photo, title, description) for a live najdimo.si/r/<code>; any Cloudflare rule blocking facebookexternalhit fixed
- [ ] #2 The Facebook share action copies the post text and opens the share dialog in one tap, with the paste hint; SL and EN; clipboard failure falls back to showing the text to copy
- [ ] #3 Unit and e2e tests updated (share menu, poster-share spec); the share_* analytics event still fires once
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC#1 link preview, for the lead's live check (no external call made from the branch). /r/<code> (EN /en/r/<code>) emits: og:type article, og:site_name Najdimo, og:locale sl_SI | en_GB, og:url = canonical, og:title = seo.og ("Izgubljen pes Rex, Ljubljana"), og:description = seo.description, og:image = <NEXT_PUBLIC_APP_URL>/r/<code>/opengraph-image (?lang=en on EN), 1200x630, og:image:alt, twitter:card summary_large_image (metadataBase = NEXT_PUBLIC_APP_URL). The image route is outside the proxy matcher and answers image/png, cache-control public, max-age=3600 (404 for unknown codes). X-Robots-Tag noindex (SEARCH_INDEXING off) does not stop facebookexternalhit. Live: Sharing Debugger on https://najdimo.si/r/<code> ("Scrape Again"), then Cloudflare Security > Events filtered on user agent facebookexternalhit (Meta ASN 32934); it is a verified bot, so only a custom WAF or bot rule would block it.

AC#2: web share menu (slot B and lost-done share the ShareMenu) and the mobile P18 screen's Facebook row; no mobile follow-up needed.

Item 3 (optional groups mention): copy unchanged; the owner's kit (with "Skupine, kamor lahko objavite") now opens behind the sharer.
<!-- SECTION:NOTES:END -->

## Packet

Branch: agent/TASK-114.9-facebook-share
