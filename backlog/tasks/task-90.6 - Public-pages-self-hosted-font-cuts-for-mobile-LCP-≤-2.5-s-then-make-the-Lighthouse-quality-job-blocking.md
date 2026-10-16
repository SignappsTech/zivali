---
id: TASK-90.6
title: >-
  Public pages: self-hosted font cuts for mobile LCP ≤ 2.5 s, then make the
  Lighthouse quality job blocking
status: In Progress
assignee:
  - '@tech-lead'
created_date: '2026-10-16 00:45'
updated_date: '2026-10-16 01:49'
labels:
  - bug
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-90.5
parent_task_id: TASK-90
priority: high
ordinal: 332000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Carries TASK-90.5 AC#1 and AC#3. After TASK-90.5 (Redux off the public critical path, WebP hero, JS 192 → 165 KB), mobile Lighthouse LCP is still 3.4-3.9 s: Lighthouse's simulation counts all 159 KB of web fonts.

Design decision (design-lead, docs/03 v0.5 and docs/design/system.md §4 v0.14, branch worktree-agent-aedffd222264e0533 until merged): three self-hosted woff2 files via next/font/local, no variable axes: Bricolage Grotesque 700 only (default optical size), Atkinson Hyperlegible Next 400 and 700 (500/600 fold to 400/700). pyftsubset per file to Basic Latin + Latin-1 + Latin Extended-A (U+0100-017F, covers č š ž đ ć) plus typographic punctuation, features kern, liga, tnum, zero. Preload all three, display swap, adjustFontFallback Arial. Target about 50 KB total. Check the OFL licence terms for subsetting and keep the licence files with the fonts. Mobile (expo-font) is unchanged.

CI: Lighthouse can't launch Chrome on the GitHub runner (Ubuntu AppArmor restricts unprivileged user namespaces: 'No usable sandbox'). The fix needs the user's approval (sysctl on the runner, or --no-sandbox in CI only): see the lead's question. Don't commit either until approved.

From the TASK-90.5 review: page-level providers for auth, report_found, lifecycle and shelters messages (about 8.7 KB, used on 3 pages); an ESLint no-restricted-imports rule so public pages can't import @zivali/api hooks statically.

## Packet

Design: docs/03-design-specification.md §Typography; docs/design/system.md §4
Review: tech-lead code review (full mode)
Branch: agent/task-90.6-fonts-lcp
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Fonts are self-hosted per the design decision; first-load font bytes ≤ 60 KB (report the measured sizes).
- [ ] #2 Mobile Lighthouse on /, /en, /kako-deluje, /o-nas, /pogosta-vprasanja, /varnost, /za-zavetisca, /zavetisca and a shelter page: LCP ≤ 2.5 s and performance ≥ 0.9 (best of 2), with CLS ≤ 0.1.
- [ ] #3 The CI quality job runs Lighthouse (sandbox fix as approved by the user) and continue-on-error is removed, so the job blocks.
- [x] #4 Public pages can't statically import @zivali/api hooks (ESLint rule), and the 3 pages' extra message namespaces load at page level.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fonts: next/font/local, three pyftsubset woff2 files in apps/web/app/fonts (Bricolage 700 21,732 B; Atkinson 400 12,452 B, 700 13,128 B; 47,312 B in all, before 160,604 B in four variable files), OFL files and a README with sources and command; no Reserved Font Names. Sources have no liga/zero features (Atkinson's zero is slashed by default). Mobile Lighthouse, best of 2 (pnpm quality), before -> after, perf / LCP: / 0.82 3.95 -> 0.92 3.21 s; /en 0.87 3.84 -> 0.92 3.21; /kako-deluje 0.85 3.61 -> 0.92 2.87; /varnost 0.87 3.57 -> 0.93 2.84; /pogosta-vprasanja 0.86 3.58 -> 0.91 2.89; /za-zavetisca 0.87 3.57 -> 0.90 2.92; /o-nas 0.85 3.68 -> 0.91 2.90; /zavetisca 0.85 3.75 -> 0.90 3.03; shelter page 0.86 3.59 -> 0.91 2.89. CLS 0 everywhere. AC#2 LCP part not met: the scripts (164 KB) now dominate Lantern's LCP graph (CHANGE row lighthouserc.json, docs/05). AC#4: PageMessages for auth (sign-in, sign-up, reset-password, /m), report_found and lifecycle (/m), shelters (/zavetisca); root CLIENT_NAMESPACES common, consent, errors, nav; ESLint no-restricted-imports for use* from @zivali/api/* with eslint.config.test.ts.
<!-- SECTION:NOTES:END -->
