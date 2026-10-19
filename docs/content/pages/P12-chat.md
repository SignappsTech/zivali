---
source: 03§P12; docs/design/pages/P12-chat.md
page: P12 Chat
stories: TASK-21 (FR-009)
copy-for: docs/design/pages/P12-chat.md
version: 0.2
status: Draft, native Slovenian review pending
date: 2026-10-19
---

# P12 Chat: copy

Namespace `chat`. Safety is visible but never scary. No ads, no payment prompts. Aliases are gender-neutral descriptions of the role (resolves glossary §11 point 1); a user's display name replaces the alias when set.

# 1. Inbox views

| Key | SL | EN |
|---|---|---|
| chat.inbox_title | Sporočila | Inbox |
| chat.view_conversations | Pogovori | Conversations |
| chat.view_notifications | Obvestila | Notifications |

# 2. Conversation list

| Key | SL | EN | Notes |
|---|---|---|---|
| chat.row_title_named | {name} | {name} | Pet name |
| chat.row_title_fallback | {type, select, lost {Izgubljena žival} found {Najdena žival} other {Opažena žival}} | {type, select, lost {Lost pet} found {Found animal} other {Sighted animal}} | No name |
| chat.row_status_confirmed | Ujemanje potrjeno | Match confirmed | Status word |
| chat.row_status_closed | Prijava zaključena | Report closed | |
| chat.row_status_home | Spet doma | Home again | |
| chat.row_unread_a11y | {title}, neprebrano | {title}, unread | |
| chat.empty_title | Pogovorov še ni | No conversations yet | |
| chat.empty_body | Pogovor se začne, ko potrdite ujemanje ali nekomu pišete pri prijavi. | A conversation starts when you confirm a match or message someone about a report. | |

# 3. Aliases

| Key | SL | EN | Role (C9) |
|---|---|---|---|
| chat.alias_owner | Oseba, ki išče žival | Person searching | owner |
| chat.alias_finder | Oseba, ki je žival našla | Person who found it | finder (found report) |
| chat.alias_sighter | Oseba, ki je žival videla | Person who saw it | finder (sighted report) |
| chat.alias_contact | Oseba, ki vam piše | Person messaging you | contact |
| chat.alias_you | Vi | You | own messages |
| chat.alias_shelter | {organisation} | {organisation} | organisation member (M3) |

# 4. Thread

| Key | SL | EN |
|---|---|---|
| chat.menu | Možnosti pogovora | Conversation options |
| chat.menu_open_report | Odpri prijavo | Open report |
| chat.menu_report | Prijavi zlorabo | Report abuse |
| chat.menu_block | Blokiraj | Block |
| chat.safety_banner | Nikoli ne pošiljajte denarja vnaprej. | Never send money in advance. |
| chat.safety_banner_link | Nasveti | Tips |
| chat.link_caution | Pri povezavah bodite previdni. | Be careful with links. |
| chat.day_today | Danes | Today |
| chat.day_yesterday | Včeraj | Yesterday |
| chat.bubble_a11y | {author}, {time}: {text} | {author}, {time}: {text} |
| chat.sending | Pošiljanje … | Sending … |
| chat.sent | Poslano | Sent |
| chat.failed | Ni poslano. | Not sent. |
| chat.retry | Poskusi znova | Try again |
| chat.loading_older | Nalagamo starejša sporočila … | Loading older messages … |
| chat.composer_label | Sporočilo | Message |
| chat.composer_placeholder | Napišite sporočilo … | Write a message … |
| chat.send | Pošlji | Send |
| chat.counter | {n, plural, one {Še # znak} two {Še # znaka} few {Še # znaki} other {Še # znakov}} | {n, plural, one {# character left} other {# characters left}} |
| chat.empty_thread | Dogovorite se za prevzem na javnem kraju. Telefonske številke ni treba deliti. | Agree on a handover in a public place. You do not need to share your phone number. |

The counter shows only in the last 100 characters of 2000. Messages with a link show `chat.link_caution` under the bubble; the link stays plain text.

# 4a. Automatic translation (Premium, TASK-118)

PRD R-026.7. Chat stays free and is never slower; translation is the Premium extra, SL ⇄ EN. The original arrives first, the translation follows. Privacy: privacy policy chapter 8 (†, legal review, LQ-72).

| Key | SL | EN |
|---|---|---|
| chat.translated | Samodejno prevedeno | Auto-translated |
| chat.show_original | Pokaži izvirnik | Show original |
| chat.show_translation | Pokaži prevod | Show translation |
| chat.translation_notice † | Sporočila v tem pogovoru samodejno prevaja storitev umetne inteligence. Prevod se lahko moti, izvirnik pa je en dotik stran. | Messages in this conversation are machine-translated by an AI service. A translation can be wrong; the original is one tap away. |
| chat.menu_translate | Samodejni prevod | Automatic translation |
| chat.menu_translate_help | Sporočila med slovenščino in angleščino prevaja za oba v pogovoru. | Translates messages between Slovenian and English for both of you. |
| chat.translation_unsupported | Tega jezika še ne prevajamo. | This language is not supported yet. |
| chat.translation_cap | Ta mesec je doseženo največje število prevodov. Sporočila so prikazana v izvirniku. | This month's translation limit has been reached. Messages show in the original. |
| chat.translation_failed | Prevod ta trenutek ni na voljo. Sporočilo je prikazano v izvirniku. | The translation is not available right now. The message shows in the original. |
| chat.translate | Prevedi | Translate |
| chat.translate_sheet_title | Samodejni prevod je del Premium Zaščite | Automatic translation is part of Premium Protect |
| chat.translate_sheet_body | S Premium Zaščito se sporočila med slovenščino in angleščino prevajajo samodejno, za obe osebi v pogovoru. Pogovor je brezplačen za vse. Besedilo lahko tudi kopirate in ga prevedete z orodjem v svoji napravi. | With Premium Protect, messages between Slovenian and English are translated automatically, for both people in the chat. Chat is free for everyone. You can also copy the text and translate it with a tool on your device. |
| chat.translate_sheet_more | Več o Premium Zaščiti | About Premium Protect |
| chat.translate_sheet_anon | Besedilo lahko kopirate in ga prevedete z orodjem v svoji napravi. | You can copy the text and translate it with a tool on your device. |

- A translated bubble shows the translation with `translated` and the text button `show_original` under it; after a tap, the original with `show_translation`. The bubble's accessible text adds `translated` after the time.
- `translation_notice` is a quiet line at the top of the thread for both people, under the safety banner, whenever translation is on in that chat (also for the free or anonymous person). It is never dismissed while translation is on.
- `menu_translate` is a switch in `chat.menu`, only for the Premium participant, on by default; `menu_translate_help` is its description. Switching off stops new translations at once.
- `translation_unsupported` (a message in a language other than SL or EN), `translation_cap` and `translation_failed` show once under the affected bubble in small muted text; the message stays in the original.
- Without a Premium participant: `translate` is a quiet text button only under a message detected in another language than the reader's. For a signed-in free user it opens a sheet with `translate_sheet_title`, `translate_sheet_body`, `translate_sheet_more` (to P24) and `common.close`; for an anonymous finder the sheet shows only `translate_sheet_anon` and `common.close` (they cannot subscribe without an account). No pop-up, nothing automatic; copying text keeps working.
- The safety banner, `link_caution`, report and block act on the original (R-026.7).

# 5. System messages

| Key | SL | EN |
|---|---|---|
| chat.system_confirmed | Ujemanje je potrjeno. Pogovor je odprt. | Match confirmed. The conversation is open. |
| chat.system_contact | Pogovor se je začel pri prijavi. | This conversation started from a report. |
| chat.system_closed | Prijava je zaključena. | The report has been closed. |
| chat.system_home | Žival je spet doma. Hvala za pomoč. | The animal is home again. Thank you for helping. |
| chat.system_reopened | Prijava je ponovno odprta. | The report has been reopened. |

# 6. States

| Key | SL | EN |
|---|---|---|
| chat.anon_session | To je vaša zasebna seja. Pogovor odprete s svojo zasebno povezavo. | This is your private session. You open this conversation with your private link. |
| chat.read_only | Pogovor je zaprt, ker je prijava zaključena. Sporočila lahko še berete. | This conversation is closed because the report is closed. You can still read the messages. |
| chat.blocked_by_you | To osebo ste blokirali. | You have blocked this person. |
| chat.blocked_you | Tej osebi ne morete več pisati. | You can no longer message this person. |
| chat.offline | Brez povezave. Sporočila pošljemo, ko boste spet povezani. | Offline. We will send your messages when you are back online. |
| chat.queued | Čaka na pošiljanje | Waiting to send |
| chat.new_message_announce | Novo sporočilo od: {author} | New message from {author} |
| chat.unverified | Za pogovor najprej potrdite svoj e-naslov. | Please confirm your email address before messaging. |
| chat.block_title | Blokirate to osebo? | Block this person? |
| chat.block_body | Ne bo vam mogla več pisati. Pogovor ostane shranjen. | They will not be able to message you. The conversation stays saved. |
| chat.block_confirm | Blokiraj | Block |
| chat.blocked_toast | Oseba je blokirana. | Person blocked. |

Reported message: `abuse.message_folded` (P10).

# 7. SEO and alt text

SEO: N/A (private, `noindex`). Document title "Sporočila · Najdimo" / "Inbox · Najdimo".

| Image | SL | EN |
|---|---|---|
| Row and header pet photo | `alt=""` (the name is next to it) | |
| Empty illustration `assets/empty-inbox.png` | decorative, `alt=""` | |

# 8. CHANGE requests

- `CHANGE docs/tech/contracts/C9-chat.md§RPCs (Aliases): replace "Lastnik/Owner", "Najditelj/Finder" with the neutral i18n keys chat.alias_owner, chat.alias_finder, chat.alias_sighter, chat.alias_contact (P12 content slice).`

# Change log

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-10-19 | CH-640: §4a automatic translation (Premium, TASK-118): label, show original, notice for both people (†), menu switch, unsupported language, cap and failure lines, Translate action and the Premium sheet. Not in the catalogue yet. |
