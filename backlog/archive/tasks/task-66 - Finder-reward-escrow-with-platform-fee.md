---
id: TASK-66
title: Finder reward escrow with platform fee
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:FR-023'
milestone: m-3
dependencies:
  - TASK-32
  - TASK-21
  - TASK-26
  - TASK-34
priority: medium
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scammers demand money first; holding an optional reward in-app and paying the finder after the owner confirms removes that scam and earns a small platform fee.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an owner in a confirmed chat, when they offer a reward (EUR 10-500) and fund it in Stripe (test), then the funds are held and the finder sees reward secured in the chat without any payment details exchanged.
- [ ] #2 Given the owner confirms the reunion and releases the reward, when processed, then the finder is paid through Stripe Connect Express (test) minus the platform fee (default 5 percent, configurable, shown before funding) and both receive receipts.
- [ ] #3 Given no reunion within 30 days or a dispute, when raised, then funds return to the owner after admin review and the decision is audit-logged.
- [ ] #4 Given a finder without an account, when a reward is due, then they sign up or claim their report and onboard with Stripe to receive it.
- [ ] #5 Given the operating model, when specified, then it uses Stripe Connect so Stripe holds the funds (no own wallet) and is flagged for legal review under payment services rules.
- [ ] #6 Given test mode, when running, then no live funds move.
<!-- AC:END -->

## Packet

Unblocks on: payments ledger and provider interface (TASK-32); chat entry point (TASK-21); reunited status (TASK-26); admin layout for disputes (TASK-34)
