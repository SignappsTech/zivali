---
source: 03§P14; docs/design/pages/P14-reunited.md
page: P14 Reunited and report lifecycle
stories: TASK-26 (FR-012)
copy-for: docs/design/pages/P14-reunited.md
version: 0.1
status: Draft, native Slovenian review pending
date: 2026-10-15
---

# P14 Reunited and lifecycle: copy

Namespace `lifecycle`. The warmest moment in the product: short, quiet joy, gratitude, no confetti words. The thank-you contribution (P15) comes after the joy, is optional and is never mentioned in the heading or the first sentence. Names are inserted in the nominative only.

# 1. Which report helped (shown only with several confirmed matches)

| Key | SL | EN |
|---|---|---|
| lifecycle.which_title | Katera prijava je bila prava? | Which report was the right one? |
| lifecycle.which_none | Nobena, žival je doma po drugi poti | None, my pet came home another way |
| lifecycle.which_continue | Nadaljuj | Continue |

Candidate rows: photo, `browse.status_*`, area and time (P4).

# 2. Confirm

| Key | SL | EN |
|---|---|---|
| lifecycle.confirm_title_named | Je {name} res spet doma? | Is {name} really home again? |
| lifecycle.confirm_title | Je žival res spet doma? | Is your pet really home again? |
| lifecycle.confirm_body | Iskanje bomo zaključili, opozorila pa ustavili. Prijava bo pokazala, da je žival doma. | We will close the search and stop the alerts. The report will show that your pet is home. |
| lifecycle.confirm_yes | Da, spet je doma | Yes, home again |
| lifecycle.confirm_no | Še ne | Not yet |
| lifecycle.confirming | Shranjujemo … | Saving … |

# 3. Reunited screen

| Key | SL | EN |
|---|---|---|
| lifecycle.home_title_named | {name} je spet doma | {name} is home again |
| lifecycle.home_title | Žival je spet doma | Your pet is home again |
| lifecycle.home_body | Veselimo se z vami. Hvala vsem, ki ste pomagali. | We are so glad. Thank you to everyone who helped. |
| lifecycle.story_label | Delite svojo zgodbo | Share your story |
| lifecycle.story_help | Če dovolite, lahko zgodbo in fotografijo po pregledu objavimo med zgodbami o vrnitvah domov. Soglasje lahko kadar koli prekličete v profilu. | If you allow it, we may publish your story and photo among our home-again stories after review. You can withdraw your consent at any time in your profile. |
| lifecycle.story_on_toast | Hvala. Zgodbo bomo pregledali, preden jo objavimo. | Thank you. We will review your story before publishing it. |
| lifecycle.done | Končano | Done |
| lifecycle.share_news | Delite veselo novico | Share the good news |
| lifecycle.share_text_named | {name} je spet doma. Hvala vsem, ki ste delili in pomagali. | {name} is home again. Thank you to everyone who shared and helped. |
| lifecycle.share_text | Žival je spet doma. Hvala vsem, ki ste delili in pomagali. | This pet is home again. Thank you to everyone who shared and helped. |
| lifecycle.poster_home | Prenesi plakat »Spet doma« | Download the "Home again" poster |

The support block (P15 `support.tip_*`) and one ad (P21) sit between the story switch and "Končano". `lifecycle.poster_home` is for later (hidden until the poster variant exists). The success-stories page itself is M5 (TASK-73).

Finder's side of a reunion (shorter, no tip, no ad):

| Key | SL | EN |
|---|---|---|
| lifecycle.finder_home_title | Žival je spet doma | The animal is home again |
| lifecycle.finder_home_body | Tudi zaradi vas. Hvala, ker ste pomagali. | Thanks in part to you. Thank you for helping. |

# 4. Close without reunion

| Key | SL | EN |
|---|---|---|
| lifecycle.close_title | Zaključite iskanje? | Close the search? |
| lifecycle.close_body | Opozorila in opomniki se ustavijo. Iskanje lahko v 7 dneh ponovno odprete. | Alerts and reminders will stop. You can reopen the search within 7 days. |
| lifecycle.close_reason_label | Razlog | Reason |
| lifecycle.close_reason_home | Žival je doma po drugi poti | My pet came home another way |
| lifecycle.close_reason_stopped | Ne iščem več | I am no longer searching |
| lifecycle.close_reason_mistake | Prijava je bila pomota | Posted by mistake |
| lifecycle.close_reason_other | Drugo | Other |
| lifecycle.close_note_label | Opomba (neobvezno) | Note (optional) |
| lifecycle.close_confirm | Zaključi iskanje | Close search |
| lifecycle.close_keep | Pusti odprto | Keep open |
| lifecycle.closed_toast | Iskanje je zaključeno. | Search closed. |
| lifecycle.reopen | Ponovno odpri | Reopen |
| lifecycle.reopened_toast | Iskanje je spet odprto. | Search reopened. |
| lifecycle.already_closed | Iskanje je že zaključeno. | This search is already closed. |

Close-reason mapping (C4 `closeReason`): home → `found_elsewhere`, stopped → `gave_up`, mistake → `removed`, other → `other`.

# 5. Reminders and expiry on the detail page

| Key | SL | EN |
|---|---|---|
| lifecycle.reminder_title | Še iščete? | Still searching? |
| lifecycle.reminder_body | {days, plural, one {Iskanje je odprto # dan.} two {Iskanje je odprto # dneva.} few {Iskanje je odprto # dni.} other {Iskanje je odprto # dni.}} Če je žival doma, nam sporočite, da obvestimo vse, ki pomagajo. | {days, plural, one {Your search has been open for # day.} other {Your search has been open for # days.}} If your pet is home, let us know so we can tell everyone who is helping. |
| lifecycle.reminder_keep | Nadaljuj iskanje | Keep searching |
| lifecycle.reminder_home | Žival je spet doma | Pet is home again |
| lifecycle.reminder_close | Zaključi iskanje | Close search |
| lifecycle.expired_lost | Iskanje smo zaključili, ker ga 90 dni niste posodobili. Če žival še iščete, ga lahko takoj znova odprete. | We closed the search because it was not updated for 90 days. If you are still searching, you can reopen it straight away. |
| lifecycle.expired_lost_action | Nadaljuj iskanje | Keep searching |

Found or sighted reports at 30 days: P7 `report_found.expiry_note`, `report_found.extend`. Emails and push for reminders: `docs/content/notifications-and-emails.md`.

# 6. Finder marks the animal as home (manage page)

| Key | SL | EN |
|---|---|---|
| lifecycle.finder_confirm_title | Je žival spet doma? | Is the animal home again? |
| lifecycle.finder_confirm_body | Prijavo bomo zaključili in obvestili osebo, ki žival išče. | We will close your report and let the person searching know. |
| lifecycle.finder_confirm_yes | Da, žival je doma | Yes, it is home |
| lifecycle.finder_confirm_no | Še ne | Not yet |
| lifecycle.finder_thanks_title | Hvala, ker ste pomagali | Thank you for helping |
| lifecycle.finder_thanks_body | Žival je spet doma tudi zaradi vas. | This animal is home again thanks in part to you. |
| lifecycle.finder_thanks_account | Ustvari račun in obdrži svoje prijave | Create an account to keep your reports |

Disagreement note for the owner: `report.owner_disagree` (P9).

# 7. States

| State | Copy |
|---|---|
| Saving | `lifecycle.confirming` |
| Network error | `errors.NETWORK` (P1) |
| Already closed | `lifecycle.already_closed` |
| Reopened | `lifecycle.reopened_toast` |

# 8. SEO and alt text

SEO: N/A (signed-in and manage pages, `noindex`). Document title "Spet doma · Najdimo" / "Home again · Najdimo".

| Image | SL | EN |
|---|---|---|
| Pet photo on the reunited screen | {name} (or `browse.row_title_*` without a name) | {name} |
| `assets/reunited-celebration.png` | decorative, `alt=""` | |
| Candidate photos in "which one" | P9 §11 rule | |
