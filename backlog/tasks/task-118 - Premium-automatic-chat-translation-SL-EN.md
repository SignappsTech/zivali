---
id: TASK-118
title: 'Premium: automatic chat translation (SL/EN)'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 14:35'
labels:
  - story
  - 'req:FR-026'
  - 'req:NFR-AI'
milestone: m-3
dependencies:
  - TASK-52
  - TASK-21
  - TASK-40
priority: medium
ordinal: 423200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
An owner and a finder who do not share a language still understand each other: for chats with a Premium participant, messages are machine-translated SL/EN both ways (owner 2026-10-19). Chat itself stays free and is never slower; translation is the Premium extra.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a Premium owner and an anonymous finder writing in English, when the finder sends a message, then the original arrives within the normal chat time (p95 under 2 s) and the Slovenian translation follows with an auto-translated label and a show-original action; when the owner replies in Slovenian, the finder sees English at no cost.
- [ ] #2 Given a chat with translation on, when either party opens it, then a notice says messages are machine-translated by an AI service, and the safety banner, link caution, report, block and moderation act on the original.
- [ ] #3 Given a message with a phone number, email, URL or chip-like number, when translated, then the provider receives placeholders and the translation shows the values unchanged.
- [ ] #4 Given the monthly translation cap (300 messages, 2 000 characters each), an unsupported language or an AI outage, when a message arrives, then it shows in the original with a short notice and chat works unchanged.
- [ ] #5 Given a chat without a Premium participant, when a message in another language arrives, then a quiet Translate action is shown that opens a sheet explaining Premium for a free user; no pop-up, and copying text still works.
- [ ] #6 Given a Premium user switches translation off in the chat menu, when new messages arrive, then none is sent to the provider.
- [ ] #7 Given any message, when translated, then it is translated once per target language and cached; local runs and CI use the mock provider.
<!-- AC:END -->

## Packet

Unblocks on: hasEntitlement (TASK-52); chat message model and realtime delivery (TASK-21, C9); AI service with caps and the mock provider (TASK-40, C19)

Translation contract (message fields, masking, cache, caps R-026.9): CHANGE to the tech lead (C9). The chat UI parts (label, show original, notice, menu switch, Premium sheet) extend the P12 chat slice; not a layout rework, so no wireframe gate. Labels and notice: CHANGE to the content strategist.
