---
source: 03§P10; docs/design/pages/P10-report-abuse.md
page: P10 Report abuse
stories: TASK-25 (FR-018)
copy-for: docs/design/pages/P10-report-abuse.md
version: 0.1
status: Draft, native Slovenian review pending
date: 2026-10-15
---

# P10 Report abuse: copy

Namespace `abuse`. Calm and quick, never accusatory: we ask what is wrong, not who is guilty. "Prijava" here would collide with the animal report, so the action is "Prijavi zlorabo" and the sheet asks "Kaj je narobe?".

# 1. Entry points

| Key | SL | EN |
|---|---|---|
| abuse.entry | Prijavi zlorabo | Report abuse |
| abuse.entry_block | Prijavi in blokiraj | Report and block |

# 2. Sheet or dialog

| Key | SL | EN |
|---|---|---|
| abuse.title | Kaj je narobe? | What is wrong? |
| abuse.target_report | Glede objave: {title} | About: {title} |
| abuse.target_message | Glede tega sporočila | About this message |
| abuse.target_profile | Glede tega profila | About this profile |
| abuse.reason_label | Razlog | Reason |
| abuse.reason_scam | Prevara ali zahteva po denarju | Scam or asking for money |
| abuse.reason_fake | Lažna prijava | Fake report |
| abuse.reason_spam | Neželena vsebina | Spam |
| abuse.reason_image | Neprimerna fotografija | Inappropriate photo |
| abuse.reason_other | Drugo | Other |
| abuse.note_label | Kaj ste opazili? (neobvezno) | What did you notice? (optional) |
| abuse.note_counter | {n, plural, one {Še # znak} two {Še # znaka} few {Še # znaki} other {Še # znakov}} | {n, plural, one {# character left} other {# characters left}} |
| abuse.block_label | Blokiraj tudi to osebo | Also block this person |
| abuse.block_help | Ne bo vam mogla več pisati. | They will not be able to message you any more. |
| abuse.send | Pošlji | Send |
| abuse.send_disabled_help | Najprej izberite razlog. | Choose a reason first. |
| abuse.cancel | Prekliči | Cancel |
| abuse.privacy | Prijavo pregleda naša ekipa. Druga oseba ne izve, kdo jo je prijavil. | Our team reviews every report. The other person is not told who reported them. |

`{title}` is the report's h1 (name or the row title from P4). The counter appears only in the last 50 characters of 500.

# 3. Confirmation

| Key | SL | EN |
|---|---|---|
| abuse.done_title | Hvala | Thank you |
| abuse.done_body | Prijavo bomo pregledali čim prej. Če bo treba ukrepati, bomo to storili brez vašega imena. | We will review it as soon as we can. If action is needed, we will take it without mentioning you. |
| abuse.done_blocked | Oseba je blokirana. | This person is blocked. |
| abuse.done_close | Končano | Done |
| abuse.message_folded | To sporočilo ste prijavili. | You reported this message. |
| abuse.message_show | Pokaži | Show |

# 4. States

| Key | SL | EN |
|---|---|---|
| abuse.rate_limited | Ta trenutek ne morete poslati nove prijave zlorabe. Poskusite znova pozneje. | You cannot send another report right now. Please try again later. |
| abuse.already | To ste že prijavili. Hvala. | You have already reported this. Thank you. |
| abuse.error | Prijave ni bilo mogoče poslati. Vaša izbira je shranjena, poskusite znova. | The report could not be sent. Your choice is saved; please try again. |

Owner notice when a listing is hidden after reports: `report.owner_hidden` and `report.owner_hidden_contact` (P9); the inbox notification is `report_hidden` in `docs/content/notifications-and-emails.md`.

# 5. SEO and alt text

N/A: an overlay on other screens; no images.
