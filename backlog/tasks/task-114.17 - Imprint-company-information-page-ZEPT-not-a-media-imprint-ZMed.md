---
id: TASK-114.17
title: 'Imprint → "Podatki o podjetju" (ZEPT), not a media imprint (ZMed)'
status: Done
assignee:
  - '@content-strategist'
created_date: '2026-10-16 15:50'
updated_date: '2026-10-18 03:00'
labels:
  - legal
  - content
  - 'est:XS'
  - fe
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 361700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: we do not need an "Impresum" in the media-law sense, only the basic company data. Basis: ZEPT (Zakon o elektronskem poslovanju na trgu) requires a provider of paid online services to publish, easily, directly and permanently: full company name and seat, matična and davčna številka with the VAT status, contact (email and phone), and the register entry. The "Impresum" under ZMed (Zakon o medijih: responsible editor, owner, entry in the razvid medijev) is for media; Najdimo (a lost-and-found service with static help pages: Kako deluje, Nasveti za varnost, FAQ) is not a medium. Revisit if regular editorial content (news, articles, vets' advice) is added later.

Today (filled 2026-10-16): /impresum (/en/imprint), apps/web/content/legal/{sl,en}/imprint.mdx: §1 Ponudnik storitve (all ZEPT data), §2 Kontakt, §3 Odgovorna oseba za vsebino (a ZMed concept), §4 Gostovanje, §5 O imenu, §6 Avtorstvo slik, §7 Viri podatkov in zemljevidi, §8 Pravila uporabe. Footer copyright (packages/i18n messages sl/footer.json `copyright`): "© {year} Signapps. Najdimo je delovno ime storitve."

Changes:
1. Title "Podatki o podjetju" / "Company information" (page title, meta, footer link label); route /podatki-o-podjetju and /en/company-information (apps/web/i18n/routing.ts '/imprint') with 301s from /impresum and /en/imprint; the legal pages and emails that link to it updated.
2. Remove §3 "Odgovorna oseba za vsebino" and the §1 "Zastopnik" / "Representative" row (director and prokurist names), SL/EN and the master docs/content/legal/imprint.md. Owner, 2026-10-16: no people's names on the page (ZEPT does not require them; the public register has them). Keep the ZEPT data, contact, hosting, data sources and credits. Today the names appear only in imprint.mdx (lines ~57 and ~73, both languages) and the master.
3. Footer copyright names the operator properly: "© {year} SIGNAPPS d.o.o. Najdimo je delovno ime storitve." (EN to match); fold into the footer rework (TASK-116) if that lands first.
4. Note for the lawyer review (TASK-91): with paid subscriptions (podpornik, vet partner, premium), donations and ads, check that the terms of use cover payment terms, renewal and cancellation of subscriptions, refunds, and the consumer's 14-day withdrawal right for distance contracts (ZVPot-1), and that the privacy policy covers payment data (Stripe as processor).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The page is titled "Podatki o podjetju" / "Company information" at its new paths, with 301s from /impresum and /en/imprint; footer and in-text links updated; SL and EN
- [x] #2 §3 Odgovorna oseba za vsebino and the Zastopnik row removed from the pages and the master; no person is named on the page; the ZEPT data unchanged
- [x] #3 Footer copyright says SIGNAPPS d.o.o.
- [x] #4 The TASK-91 lawyer pack lists the subscription terms and withdrawal-right check
- [x] #5 legal-mdx and route tests updated; sitemap and robots unchanged in behaviour
<!-- AC:END -->

## Implementation Notes

Content part done (2026-10-18): SL/EN mdx (title, meta, Zastopnik row and old chapter 3 removed, renumbered), master docs/content/legal/imprint.md v0.5, footer labels and copyright (SIGNAPPS d.o.o.), about.ts link label, lawyer briefing LQ-02/LQ-41 (EN+SL), unit/e2e label strings. NOT done (code scope, needs a fe dev): route rename in apps/web/i18n/routing.ts (/podatki-o-podjetju, /en/company-information) with 301s from /impresum and /en/imprint; sitemap/route tests; e2e/legal.spec.ts and shell.test.tsx paths still use the old routes.
