---
source: 03§P2; docs/design/pages/P2-mobile-shell.md
page: P2 Mobile shell
stories: TASK-12 (FR-037)
copy-for: docs/design/pages/P2-mobile-shell.md
version: 0.2
status: Draft, native Slovenian review pending
date: 2026-10-15
---

# P2 Mobile shell: copy

Strings for the native frame. Shared buttons (`common`) and the `errors` catalogue are defined once in `docs/content/pages/P1-web-shell.md` §4 and §6 and used by both apps. Report menu rows reuse `nav.report_*` from P1 §1.

# 1. Bottom navigation

| Key | SL | EN | Notes |
|---|---|---|---|
| nav.tab_map | Zemljevid | Map | |
| nav.tab_inbox | Sporočila | Inbox | Holds conversations and notifications (not "Opozorila": alerts live in Profile and inside the inbox) |
| nav.tab_report | Prijavi | Report | Announced as a button: `nav.tab_report_a11y` |
| nav.tab_report_a11y | Prijavi žival | Report an animal | Accessible name |
| nav.tab_profile | Profil | Profile | |

Labels fit 13 px at 360 px width: the longest is "Zemljevid" (9 characters).

# 2. Report sheet

| Key | SL | EN |
|---|---|---|
| nav.report_menu_title | Kaj želite prijaviti? | What would you like to report? |
| nav.report_lost_title | Izgubljena žival | Lost pet |
| nav.report_lost_desc | Pogrešate svojega psa ali mačko. | Your dog or cat is missing. |
| nav.report_found_title | Najdena žival | Found animal |
| nav.report_found_desc | Žival je pri vas. Brez računa. | The animal is with you. No account needed. |
| nav.report_sighted_title | Opažena žival | Sighted animal |
| nav.report_sighted_desc | Videli ste žival, ki se je morda izgubila. Brez računa. | You saw an animal that may be lost. No account needed. |
| nav.sheet_close | Zapri | Close |

# 3. Permission primers

Each primer: h2, two sentences, primary, text button. The fallback note appears where the permission was needed.

| Key | SL | EN |
|---|---|---|
| permissions.camera_title | Fotografija pomaga, da žival prepoznajo | A photo helps people recognise the animal |
| permissions.camera_body | Kamero uporabimo samo, ko fotografirate žival. Fotografijo lahko izberete tudi iz galerije. | We only use the camera when you take a photo of the animal. You can also choose a photo from your gallery. |
| permissions.camera_allow | Dovoli kamero | Allow camera |
| permissions.camera_denied | Kamera ni dovoljena. Fotografijo izberite iz galerije ali jo dodajte pozneje. | Camera access is off. Choose a photo from your gallery or add one later. |
| permissions.location_title | Kje se je to zgodilo? | Where did it happen? |
| permissions.location_body | Vašo lokacijo uporabimo, da hitreje označite kraj. Javno prikažemo le približno območje. | We use your location to mark the place faster. We only show an approximate area in public. |
| permissions.location_allow | Dovoli lokacijo | Allow location |
| permissions.location_denied | Lokacija ni dovoljena. Kraj poiščite ali ga označite na zemljevidu. | Location access is off. Search for the place or mark it on the map. |
| permissions.notifications_title | Naj vas obvestimo, ko bo kaj novega? | Shall we tell you when something happens? |
| permissions.notifications_body | Obvestimo vas o možnem ujemanju, novih sporočilih in izgubljenih živalih v bližini. Kaj prejemate, izberete v nastavitvah. | We let you know about possible matches, new messages and lost animals nearby. You choose what you get in settings. |
| permissions.notifications_allow | Dovoli obvestila | Allow notifications |
| permissions.notifications_denied | Obvestila na telefonu so izklopljena. Vse boste našli med sporočili in v e-pošti. | Phone notifications are off. You will find everything in your inbox and email. |
| permissions.open_settings | Odpri nastavitve telefona | Open phone settings |
| permissions.not_now | Ne zdaj | Not now |

# 4. Signed-out tabs

| Key | SL | EN |
|---|---|---|
| inbox.signed_out_title | Tu bodo vaša sporočila | Your messages will appear here |
| inbox.signed_out_body | Ko se vpišete, tu vidite možna ujemanja, pogovore in opozorila o živalih v bližini. Najdeno ali opaženo žival lahko prijavite tudi brez računa. | Once you sign in, you will see possible matches, conversations and alerts about animals nearby. You can report a found or sighted animal without an account. |
| inbox.signed_out_sign_in | Vpis | Sign in |
| inbox.signed_out_create | Ustvari račun | Create account |
| profile.signed_out_title | Vpišite se | Sign in |
| profile.signed_out_body | Z računom shranite profile svojih živali, prejemate opozorila in se pogovarjate z ljudmi, ki so žival videli. | With an account you can save your pets' profiles, get alerts and talk to people who have seen your pet. |
| profile.signed_out_sign_in | Vpis | Sign in |
| profile.signed_out_create | Ustvari račun | Create account |
| profile.row_language | Jezik | Language |
| profile.row_cookie_settings | Nastavitve piškotkov | Cookie settings |
| profile.row_help | Pomoč in nasveti za varnost | Help and safety tips |

# 5. Deep-link landing

| Key | SL | EN |
|---|---|---|
| deeplink.loading | Odpiramo prijavo … | Opening the report … |
| deeplink.invalid_title | Te povezave ne moremo odpreti | We cannot open this link |
| deeplink.invalid_body | Povezava je morda nepopolna. Aktualne prijave so na zemljevidu. | The link may be incomplete. Current reports are on the map. |
| deeplink.invalid_action | Odpri zemljevid | Open the map |

Removed or closed reports (410) and invalid links in the app:

| Screen | Title | Body | Action |
|---|---|---|---|
| Report gone (410) | `errors.page_410_title` "Ta prijava ni več na voljo" / "This report is no longer available" | `errors.page_410_body` (P1 §5.3) | one primary: `common.open_map` "Odpri zemljevid" / "Open the map" |
| Invalid link | `deeplink.invalid_title` | `deeplink.invalid_body` | one primary: `deeplink.invalid_action` "Odpri zemljevid" / "Open the map" |
| Not found (404) | `errors.page_404_title` | `errors.page_404_body` | one primary: `common.open_map` |

In the app the map is home, so these screens have no "Na začetno stran" button and no second action. We use "Odpri zemljevid" rather than "Nazaj na zemljevid": after a deep link there is no previous screen to go back to. The system back gesture and the top-bar back button still work.

# 6. Shared mobile patterns

| Key | SL | EN |
|---|---|---|
| common.offline_banner | Brez povezave. Osnutek je shranjen. | Offline. Your draft is saved. |
| common.back_online | Spet ste povezani. | You are back online. |
| common.pull_to_refresh | Povlecite za osvežitev | Pull to refresh |
| common.refreshing | Osvežujemo … | Refreshing … |
| common.sheet_handle | Povleci ali tapni za razširitev | Drag or tap to expand |

`common.sheet_handle` is the accessible name of the sheet grabber button; "tapni" is acceptable here because it is a touch-only control.

# 7. App store and system strings

| Key | SL | EN |
|---|---|---|
| app.name | Najdimo | Najdimo |
| app.ios_camera_usage | Kamero uporabimo, ko fotografirate žival za prijavo ali profil. | We use the camera when you photograph an animal for a report or profile. |
| app.ios_photos_usage | Dostop do fotografij potrebujemo, da izberete sliko živali. | We need access to your photos so you can choose a picture of the animal. |
| app.ios_location_usage | Lokacijo uporabimo, da označite, kje je bila žival videna. Javno prikažemo le približno območje. | We use your location to mark where the animal was seen. We only show an approximate area in public. |

These are the `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` and `NSLocationWhenInUseUsageDescription` strings (localised `InfoPlist.strings`).

# 8. SEO

N/A: native screens are not indexed. Universal links open web pages that carry their own meta (P9).

# 9. Alt text

No content images in the shell. Icons are decorative (`accessible={false}`) next to labels; the report tab uses `nav.tab_report_a11y`.
