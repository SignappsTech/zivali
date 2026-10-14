---
source: 03§P13; docs/design/pages/P13-alerts-inbox-settings.md
page: P13 Notifications, nearby alerts and account settings
stories: TASK-22, TASK-23, TASK-9 (FR-010, FR-001, FR-036)
copy-for: docs/design/pages/P13-alerts-inbox-settings.md
version: 0.1
status: Draft, native Slovenian review pending
date: 2026-10-15
---

# P13 Notifications, alerts and settings: copy

Namespaces `notifications` (inbox view), `alerts`, `profile`. The title and body of each notification row are the in-app strings in `docs/content/notifications-and-emails.md`; this slice covers the screens around them.

# 1. Notifications view

| Key | SL | EN |
|---|---|---|
| notifications.title | Obvestila | Notifications |
| notifications.mark_all | Označi vse kot prebrano | Mark all as read |
| notifications.group_today | Danes | Today |
| notifications.group_week | Ta teden | This week |
| notifications.group_earlier | Prej | Earlier |
| notifications.row_unread_a11y | {title}, neprebrano | {title}, unread |
| notifications.reminder_keep | Nadaljuj iskanje | Keep searching |
| notifications.reminder_close | Zaključi iskanje | Close search |
| notifications.empty_title | Obvestil še ni | No notifications yet |
| notifications.empty_body | Tu bodo možna ujemanja, sporočila in opozorila o izgubljenih živalih v bližini. | Possible matches, messages and alerts about lost pets nearby will appear here. |
| notifications.empty_action | Nastavi opozorila | Set up alerts |

# 2. Alert settings

| Key | SL | EN |
|---|---|---|
| alerts.title | Opozorila v bližini | Nearby alerts |
| alerts.master_label | Opozorila o izgubljenih živalih v bližini | Alerts about lost pets nearby |
| alerts.master_help | Obvestimo vas, ko se v vašem območju izgubi pes ali mačka. | We let you know when a dog or cat goes missing in your area. |
| alerts.area_label | Domače območje | Home area |
| alerts.area_value | {place}, {radius} km | {place}, {radius} km |
| alerts.area_change | Spremeni | Change |
| alerts.area_none | Območje še ni izbrano | No area chosen yet |
| alerts.radius_label | Polmer | Radius |
| alerts.radius_value | {km} km | {km} km |
| alerts.radius_premium | Večji polmer in več območij omogoča Premium Zaščita. | Premium Protect allows a larger radius and more areas. |
| alerts.species_label | Za katere živali | Which animals |
| alerts.species_dogs | Psi | Dogs |
| alerts.species_cats | Mačke | Cats |
| alerts.cap_label | Največ opozoril na dan | Maximum alerts per day |
| alerts.cap_value | {n} | {n} |
| alerts.cap_decrease | Manj | Fewer |
| alerts.cap_increase | Več | More |
| alerts.pause_label | Začasno ustavi opozorila | Pause alerts |
| alerts.pause_help | Nastavitve ostanejo shranjene. | Your settings stay saved. |

`alerts.radius_premium` appears from M4 only.

# 3. How to tell me

| Key | SL | EN |
|---|---|---|
| alerts.channels_title | Kako vas obvestimo | How we tell you |
| alerts.type_matches | Možna ujemanja | Possible matches |
| alerts.type_messages | Sporočila | Messages |
| alerts.type_nearby | Opozorila v bližini | Nearby alerts |
| alerts.type_reminders | Opomniki | Reminders |
| alerts.channel_push | Na telefonu | On the phone |
| alerts.channel_email | Po e-pošti | By email |
| alerts.channel_inapp | V aplikaciji | In the app |
| alerts.channel_switch_a11y | {type}: {channel} | {type}: {channel} |
| alerts.locked_note | Možnih ujemanj in sporočil v aplikaciji ni mogoče izklopiti, da ne zamudite česa pomembnega. | Possible matches and messages in the app cannot be turned off, so you never miss anything important. |

# 4. Quiet hours

| Key | SL | EN |
|---|---|---|
| alerts.quiet_title | Tihi čas | Quiet hours |
| alerts.quiet_from | Od | From |
| alerts.quiet_to | Do | To |
| alerts.quiet_help | V tihem času vas ne motimo. Izjema sta ujemanje številke čipa in nova sporočila. | We will not disturb you during quiet hours, except for a chip-number match and new messages. |
| alerts.quiet_off | Brez tihega časa | No quiet hours |

# 5. Permission state

| Key | SL | EN |
|---|---|---|
| alerts.push_denied | Obvestila na telefonu so izklopljena v nastavitvah telefona. | Notifications are turned off in your phone settings. |
| alerts.push_open_settings | Odpri nastavitve telefona | Open phone settings |
| alerts.email_unverified | Za obvestila po e-pošti potrdite svoj e-naslov. | Confirm your email address to get email notifications. |
| alerts.email_resend | Pošlji znova | Resend |
| alerts.email_sent | Povezavo smo poslali. Preverite e-pošto. | We have sent the link. Please check your email. |

# 6. Opt-in sheet

| Key | SL | EN |
|---|---|---|
| alerts.optin_title | Vklopite opozorila v bližini? | Turn on alerts near you? |
| alerts.optin_body | Ko se v {radius} km od vas izgubi pes ali mačka, vas obvestimo. {cap, plural, one {Največ # opozorilo na dan.} two {Največ # opozorili na dan.} few {Največ # opozorila na dan.} other {Največ # opozoril na dan.}} | When a dog or cat goes missing within {radius} km of you, we will let you know. {cap, plural, one {At most # alert a day.} other {At most # alerts a day.}} |
| alerts.optin_on | Vklopi | Turn on |
| alerts.optin_later | Ne zdaj | Not now |
| alerts.optin_done | Opozorila so vklopljena. Spremenite jih lahko v profilu. | Alerts are on. You can change them in your profile. |
| alerts.optin_map_alt | Območje opozoril okoli kraja {place}, polmer {radius} km | Alert area around {place}, radius {radius} km |

# 7. Account and profile

| Key | SL | EN |
|---|---|---|
| profile.title | Profil | Profile |
| profile.web_title | Moj račun | My account |
| profile.nav_account | Račun | Account |
| profile.nav_alerts | Opozorila | Alerts |
| profile.nav_pets | Živali | Pets |
| profile.nav_reports | Prijave | Reports |
| profile.nav_payments | Plačila | Payments |
| profile.email_verified | Potrjen | Verified |
| profile.email_unverified | Ni potrjen | Not verified |
| profile.email_send_link | Pošlji povezavo | Send link |
| profile.apple_relay | e-naslov skriva Apple | hidden by Apple |
| profile.name_label | Prikazno ime | Display name |
| profile.name_help | To ime vidijo ljudje, s katerimi se pogovarjate. Lahko je tudi vzdevek. | People you talk to see this name. A nickname is fine. |
| profile.row_language | Jezik | Language |
| profile.row_appearance | Videz | Appearance |
| profile.appearance_system | Kot v napravi | Same as device |
| profile.appearance_light | Svetlo | Light |
| profile.appearance_dark | Temno | Dark |
| profile.row_home_area | Domače območje | Home area |
| profile.row_phone | Telefon (neobvezno) | Phone (optional) |
| profile.phone_help | Številke nikoli ne prikažemo javno. Pokažemo jo le v potrjenem pogovoru, če to izberete pri prijavi. | We never show your number publicly. We only show it in a confirmed conversation, if you choose that when reporting. |
| profile.phone_invalid | Vpišite telefonsko številko, na primer 041 123 456. | Enter a phone number, for example 041 123 456. |
| profile.row_pets | Moje živali | My pets |
| profile.row_reports | Moje prijave | My reports |
| profile.row_payments | Plačila | Payments |
| profile.row_alerts | Opozorila v bližini | Nearby alerts |
| profile.row_cookie_settings | Nastavitve piškotkov | Cookie settings |
| profile.row_help | Pomoč in nasveti za varnost | Help and safety tips |
| profile.row_export | Izvozi moje podatke | Export my data |
| profile.row_delete | Izbriši račun | Delete account |
| profile.sign_out | Odjava | Sign out |
| profile.saved | Shranjeno. | Saved. |
| profile.offline_queued | Brez povezave. Spremembe shranimo, ko boste spet povezani. | Offline. We will save your changes when you are back online. |

`profile.row_export` and `profile.row_delete` appear in M3 (FR-034).

# 8. SEO and alt text

SEO: N/A (signed in, `noindex`). Document titles: "Obvestila · Najdimo", "Opozorila v bližini · Najdimo", "Moj račun · Najdimo" (EN "Notifications", "Nearby alerts", "My account").

Alt text: avatar `alt=""` next to the name; nearby-alert row pet photo per P9 §11; empty illustration decorative; opt-in map `alerts.optin_map_alt`.
