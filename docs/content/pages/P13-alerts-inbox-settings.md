---
source: 03§P13; docs/design/pages/P13-alerts-inbox-settings.md
page: P13 Notifications, nearby alerts and account settings
stories: TASK-22, TASK-23, TASK-9 (FR-010, FR-001, FR-036)
copy-for: docs/design/pages/P13-alerts-inbox-settings.md
version: 0.4
status: Draft, native Slovenian review pending
date: 2026-10-18
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
| alerts.radius_number_label | Polmer v kilometrih | Radius in kilometres |
| alerts.radius_premium | Večji polmer in več območij omogoča Premium Zaščita. | Premium Protect allows a larger radius and more areas. |
| alerts.species_label | Za katere živali | Which animals |
| alerts.species_dogs | Psi | Dogs |
| alerts.species_cats | Mačke | Cats |
| alerts.species_none | Ne prejemate opozoril za živali v bližini. | You are not getting alerts about pets nearby. |
| alerts.cap_label | Največ opozoril na dan | Maximum alerts per day |
| alerts.cap_value | {n} | {n} |
| alerts.cap_decrease | Manj | Fewer |
| alerts.cap_increase | Več | More |
| alerts.pause_label | Začasno ustavi opozorila | Pause alerts |
| alerts.pause_help | Nastavitve ostanejo shranjene. | Your settings stay saved. |

`alerts.radius_premium` appears from M4 only. `alerts.radius_number_label` is the accessible name of the radius number field that sits beside the slider on web (CH-418).

`alerts.species_none` shows under the animal pills when none is chosen: every animal can be switched off, and none chosen means no nearby alerts (CH-501, TASK-114.14).

## 2a. Nearby reminders on the phone (mobile, CH-241, CH-248, CH-355, TASK-87.1, TASK-87.2)

A second block under the alerts: local reminders the phone raises itself when the person is near where a lost animal was last seen (`notifications.nearby_local`, in `notifications-and-emails.md` §2.5a). Separate from the server alerts above: pausing alerts does not stop them. Draft, needs native review; the page-level wording follows the primer in §2b.

| Key | SL | EN |
|---|---|---|
| alerts.reminders_title | Opomniki v bližini | Nearby reminders |
| alerts.reminders_separate | Telefon sam opazi, ko ste blizu kraja, kjer se je izgubila žival. To je ločeno od opozoril zgoraj: premor opozoril teh opomnikov ne ustavi. | Your phone notices on its own when you are near where an animal went missing. This is separate from the alerts above: pausing alerts does not stop these reminders. |
| alerts.reminders_label | Opozori me, ko sem blizu izgubljene živali | Alert me when I am near a lost animal |
| alerts.reminders_help | Lokalna opozorila na telefonu: največ {cap} na dan, ne v tihem času. Vaša lokacija ostane v telefonu. | Local alerts on the phone: at most {cap} a day, never in quiet hours. Your location stays on the phone. |
| alerts.reminders_quiet_value | od {from} do {to} | {from} to {to} |
| alerts.reminders_quiet_change | Spremeni tihi čas | Change quiet hours |
| alerts.reminders_lost | Opomnike smo izklopili, ker telefon ne dovoli več lokacije »vedno«. Ko jo dovolite v nastavitvah telefona, jih znova vklopite tukaj. | We turned the reminders off because your phone no longer allows location Always. Allow it in your phone settings, then switch them back on here. |
| alerts.reminders_no_location | Lokacije telefona ta hip ne moremo določiti. Poskusite znova čez trenutek. | We cannot find the location of your phone right now. Please try again in a moment. |
| alerts.reminders_signed_out_note | Niste prijavljeni, zato lahko opomnike le izklopite. | You are signed out, so you can only turn these reminders off. |

The reminders' notifications-off note reuses `alerts.push_denied` (§5), not `permissions.notifications_denied`, because that one promises the inbox and email, which local reminders never use. It keeps this wording unless a sentence of its own is wanted (CH-414).

`{cap}` is the daily cap (3 by default). `alerts.reminders_quiet_change` is the accessible name of the "Spremeni" link beside the quiet-hours value. `alerts.reminders_lost` shows when the reminders were switched off because the Always permission was revoked.

## 2b. Always-location primer and denied note (mobile, CH-241, CH-248, CH-355)

Shown before the system prompt when the person turns the reminders on. Buttons: primary `permissions.location_always_allow`, secondary `common.not_now`. The bullets say what is watched and what is not stored. Draft; it must match the iOS purpose string and the Play background-location declaration (TASK-75).

| Key | SL | EN |
|---|---|---|
| permissions.location_always_title | Dovolite lokacijo vedno? | Allow location always? |
| permissions.location_always_body | Da vas telefon opozori, ko ste blizu izgubljene živali, mora lokacijo poznati tudi, ko aplikacija ni odprta. | To alert you when you are near a lost animal, your phone needs your location even when the app is closed. |
| permissions.location_always_watched | <b>Spremljamo:</b> le območja izgubljenih živali v vaši bližini, ki so že shranjena v telefonu. | <b>What we watch:</b> only the areas of lost animals near you, already saved on your phone. |
| permissions.location_always_private | <b>Ničesar ne pošljemo:</b> vaš položaj in vaše poti ostanejo v telefonu. Ujemanje poteka v telefonu. | <b>Nothing is uploaded:</b> your position and your routes stay on the phone, where the matching happens. |
| permissions.location_always_off | <b>Izklop:</b> kadar koli, tukaj v Opozorilih v bližini. | <b>Turning it off:</b> at any time, here in Nearby alerts. |
| permissions.location_always_allow | Dovoli vedno | Allow always |
| permissions.location_always_denied | Za ta opozorila potrebujemo dovoljenje za lokacijo »vedno«. Vklopite ga v nastavitvah telefona. | These alerts need location access set to Always. Turn it on in your phone settings. |

The denied note (`location_always_denied`) is followed by the button `alerts.push_open_settings` ("Odpri nastavitve telefona" / "Open phone settings"). `<b>` is rendered with `t.rich`.

The inbox on mobile has two segments in the Sporočila tab: "Sporočila" (`chat.inbox_title`, P12) and "Obvestila" (`notifications.title`, §1). No new keys.

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

No channel is locked in the app: there is no lock note and no warning when every channel of a row is off (`alerts.locked_note` removed, CH-501).

# 4. Quiet hours

| Key | SL | EN |
|---|---|---|
| alerts.quiet_title | Tihi čas | Quiet hours |
| alerts.quiet_from | Od | From |
| alerts.quiet_to | Do | To |
| alerts.quiet_help | V tihem času vas ne motimo. Izjema sta ujemanje številke čipa in nova sporočila. | We will not disturb you during quiet hours, except for a chip-number match and new messages. |
| alerts.quiet_off | Brez tihega časa | No quiet hours |
| alerts.quiet_reminders_note | Tudi opomniki v bližini so v tihem času utišani. | Nearby reminders are silent in quiet hours too. |
| alerts.quiet_invalid | Vpišite uro, na primer 22:00. | Enter a time, for example 22:00. |

`alerts.quiet_reminders_note` is the extra line under `quiet_help`: the exception for a chip-number match and new messages does not apply to the on-phone reminders (CH-248). `alerts.quiet_invalid` is the error under a quiet-hours field on mobile that is not a time in HH:MM; draft, needs native review (CH-283).

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
| profile.sign_out_title | Se želite odjaviti? | Sign out? |
| profile.sign_out_body | Prijave, ki ste jih oddali s te naprave, boste še vedno lahko urejali z nje. | Reports you made on this device stay manageable from it. |
| profile.sign_out_remove_links | Odstrani tudi povezave za urejanje prijav s te naprave | Also remove the links for managing reports from this device |
| profile.sign_out_confirm | Odjava | Sign out |
| profile.sign_out_cancel | Prekliči | Cancel |
| profile.saved | Shranjeno. | Saved. |
| profile.offline_queued | Brez povezave. Spremembe shranimo, ko boste spet povezani. | Offline. We will save your changes when you are back online. |

`profile.row_export` and `profile.row_delete` appear in M3 (FR-034).

## 7a. Offline data (mobile Settings, CH-318, TASK-85.3)

A Settings row on the Profile, signed in and signed out (the Map tab caches either way). Draft, needs native review.

| Key | SL | EN |
|---|---|---|
| profile.row_offline | Podatki brez povezave | Offline data |
| profile.offline_body | Prijave v bližini in njihove fotografije shranimo v telefon, da jih vidite tudi brez povezave. | We keep reports near you and their photos on this phone, so you can see them offline too. |
| profile.offline_size | Zasedeno | Space used |
| profile.offline_size_value | {size} MB | {size} MB |
| profile.offline_updated | Zadnja posodobitev | Last updated |
| profile.offline_updated_never | Še ni bilo posodobitve | Not updated yet |
| profile.offline_mobile_photos | Za fotografije brez povezave uporabi mobilne podatke | Use mobile data for offline photos |
| profile.offline_mobile_photos_help | Ko je izklopljeno, fotografije prenesemo samo prek omrežja Wi-Fi. | When this is off, we download photos over Wi-Fi only. |
| profile.offline_clear | Počisti podatke brez povezave | Clear offline data |
| profile.offline_clear_title | Želite počistiti podatke brez povezave? | Clear offline data? |
| profile.offline_clear_body | S telefona izbrišemo shranjene prijave v bližini in njihove fotografije. Prijave, ki čakajo na pošiljanje, ostanejo. | We delete the saved reports near you and their photos from this phone. Reports waiting to be sent stay. |
| profile.offline_clear_confirm | Počisti | Clear |
| profile.offline_cleared | Podatki brez povezave so počiščeni. | Offline data cleared. |

CH-318 expected the clear dialog to say that drafts go too; the catalogue body says reports waiting to be sent stay, and says nothing of drafts. The wording above follows the catalogue; the developers confirm which data the Clear action really removes before the copy is final.

# 8. SEO and alt text

SEO: N/A (signed in, `noindex`). Document titles: "Obvestila · Najdimo", "Opozorila v bližini · Najdimo", "Moj račun · Najdimo" (EN "Notifications", "Nearby alerts", "My account").

Alt text: avatar `alt=""` next to the name; nearby-alert row pet photo per P9 §11; empty illustration decorative; opt-in map `alerts.optin_map_alt`.

# Change log

| Date | Change |
|---|---|
| 2026-10-18 | CH-501 (TASK-114.14): added `alerts.species_none` (§2); removed `alerts.locked_note` (§3). SL/EN reviewed, unchanged. |
| 2026-10-18 | v0.3. CH-241/CH-248/CH-355: section 2a nearby reminders, 2b Always-location primer, quiet-hours reminder line. CH-283: `alerts.quiet_invalid`. CH-318: section 7a offline data. |
| 2026-10-18 | v0.4. CH-414: reminders reuse `alerts.push_denied` (§2a). CH-418: `alerts.radius_number_label` (§2). CH-518 (= CH-501): already applied in v0.3. |
