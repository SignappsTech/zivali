---
source: 03§P14; docs/design/pages/P14-reunited.md
page: P14 Reunited and report lifecycle
stories: TASK-26 (FR-012)
copy-for: docs/design/pages/P14-reunited.md
version: 0.2
status: Draft, native Slovenian review pending
date: 2026-10-18
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
| lifecycle.close_body | Opozorila in opomniki se ustavijo. Iskanje lahko v {days, plural, one {# dnevu} two {# dneh} few {# dneh} other {# dneh}} ponovno odprete. | Alerts and reminders will stop. You can reopen the search within {days, plural, one {# day} other {# days}}. |
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

The reopen window is configurable (default 7 days): `{days}` in `lifecycle.close_body` and in P9 `report.owner_disagree` comes from the setting, never a hard-coded 7 (CH-268).

Close-reason mapping (C4 `closeReason`, owner): home → `found_elsewhere`, stopped → `gave_up`, mistake → `other`, other → `other`. The API rejects `removed` for a manager close (manager reasons are `found_elsewhere`, `gave_up`, `returned_to_owner`, `other`), so "Prijava je bila pomota" is sent as `other`; the optional note carries the detail (CH-343).

Finder (manage page): the Close button sends the fixed reason `other`; the slice defines no reason choice for the finder. Whether a choice is wanted is a design decision and is not made here (CH-330 not applied).

Closed conversations (CH-267), read-only after a reunion or a close, on the owner detail and the finder manage page:

| Key | SL | EN |
|---|---|---|
| lifecycle.chat_closed_home | Pogovor je zaprt, ker je žival doma | This conversation is closed because the pet is home |

When the report is closed without a reunion, P12 `chat.read_only` is used instead.

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

Finder-side lines (CH-268, TASK-26.2), draft, needs native review:

| Key | SL | EN |
|---|---|---|
| lifecycle.finder_contact_removed | Vaši kontaktni podatki so odstranjeni. | Your contact details have been removed. |
| lifecycle.reopen_over | Iskanje je zaključeno in ga ni več mogoče znova odpreti. | The search is closed and can no longer be reopened. |
| lifecycle.reopen_over_action | Ustvari novo prijavo | Create a new report |

`finder_contact_removed` shows when an anonymous report was reunited: the finder contact is dropped at that point. `reopen_over` replaces the `lifecycle.reopen` button once the reopen window has passed; `reopen_over_action` links to a new report.

Disagreement note for the owner: `report.owner_disagree` (P9).

# 7. States

| State | Copy |
|---|---|
| Saving | `lifecycle.confirming` |
| Network error | `errors.NETWORK` (P1) |
| Already closed | `lifecycle.already_closed` |
| Reopened | `lifecycle.reopened_toast` |

# 8. CHANGE requests

- `CHANGE docs/tech/contracts/C15-routes-deeplinks.md§Web routes: reportReunited SL /r/[code]/ponovno-skupaj → /r/[code]/spet-doma (one term everywhere: "Spet doma", glossary §2).`

# 9. SEO and alt text

SEO: N/A (signed-in and manage pages, `noindex`). Document title "Spet doma · Najdimo" / "Home again · Najdimo".

| Image | SL | EN |
|---|---|---|
| Pet photo on the reunited screen | {name} (or `browse.row_title_*` without a name) | {name} |
| `assets/reunited-celebration.png` | decorative, `alt=""` | |
| Candidate photos in "which one" | P9 §11 rule | |

# Change log

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-10-18 | CH-267: `lifecycle.chat_closed_home`. CH-268: finder-side lines, configurable reopen window (`close_body`). CH-343: close-reason mapping mistake to `other`. CH-330 not applied. |
