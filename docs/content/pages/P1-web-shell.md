---
source: 03§P1; docs/design/pages/P1-web-shell.md
page: P1 Web shell
stories: TASK-11 (FR-035, FR-036)
copy-for: docs/design/pages/P1-web-shell.md
version: 0.1
status: Draft, native Slovenian review pending
date: 2026-10-14
---

# P1 Web shell: copy

Final SL and EN strings for the header, footer, shared patterns and the two shared catalogues `common` and `errors` (used by web and mobile). Keys follow C16 (`namespace.key`, snake_case, at most 3 levels). Terms: `docs/content/glossary.md`. Sign-in is **Vpis**, never "Prijava" (that is the report).

# 1. Header

| Key | SL | EN | Notes |
|---|---|---|---|
| nav.home_label | Najdimo, na začetno stran | Najdimo, home | Accessible name of the logo link |
| nav.map | Zemljevid | Map | |
| nav.lost | Izgubljene | Lost | Agrees with "živali"; opens the map filtered to lost |
| nav.found | Najdene | Found | Map filtered to found and sighted |
| nav.how_it_works | Kako deluje | How it works | Signed out only |
| nav.my_pets_reports | Moje živali in prijave | My pets and reports | Signed in, replaces "Kako deluje" |
| nav.main_label | Glavni meni | Main menu | `nav` landmark name |
| nav.language_label | Jezik: {current} | Language: {current} | Accessible name of the switcher |
| nav.language_sl | SL | SL | Visible toggle text |
| nav.language_en | EN | EN | |
| nav.language_sl_full | Slovenščina | Slovenščina | Always in its own language (menu sheet) |
| nav.language_en_full | English | English | |
| nav.inbox | Sporočila in obvestila | Messages and notifications | Icon button accessible name |
| nav.account_menu | Moj račun | My account | Avatar button accessible name |
| nav.account_profile | Profil | Profile | |
| nav.account_alerts | Opozorila v bližini | Nearby alerts | |
| nav.account_payments | Plačila | Payments | |
| nav.account_sign_out | Odjava | Sign out | |
| nav.sign_in | Vpis | Sign in | Ghost button |
| nav.report | Prijavi | Report | The one primary button |
| nav.report_menu_title | Kaj želite prijaviti? | What would you like to report? | Popover heading (visually hidden on web if the design omits it) |
| nav.report_lost_title | Izgubljena žival | Lost pet | Choice row |
| nav.report_lost_desc | Pogrešate svojega psa ali mačko. | Your dog or cat is missing. | |
| nav.report_found_title | Najdena žival | Found animal | |
| nav.report_found_desc | Žival je pri vas. Brez računa. | The animal is with you. No account needed. | |
| nav.report_sighted_title | Opažena žival | Sighted animal | |
| nav.report_sighted_desc | Videli ste žival, ki se je morda izgubila. Brez računa. | You saw an animal that may be lost. No account needed. | |
| nav.menu_open | Odpri meni | Open menu | Below `md` |
| nav.menu_close | Zapri meni | Close menu | |

# 2. Footer

| Key | SL | EN | Route |
|---|---|---|---|
| footer.about | O nas | About | `/o-nas` (see CHANGE) |
| footer.safety | Nasveti za varnost | Safety tips | `/varnost` |
| footer.partners | Oglašujte pri nas | Advertise with us | `/oglasevanje` |
| footer.privacy | Zasebnost | Privacy | `/zasebnost` |
| footer.cookies | Piškotki | Cookies | `/piskotki` |
| footer.terms | Pogoji uporabe | Terms of use | `/pogoji-uporabe` |
| footer.imprint | Impresum | Imprint | `/impresum` |
| footer.accessibility | Dostopnost | Accessibility | `/dostopnost` |
| footer.cookie_settings | Nastavitve piškotkov | Cookie settings | opens P17 Customise |
| footer.how_it_works | Kako deluje | How it works | `/kako-deluje` |
| footer.for_shelters | Za zavetišča | For shelters | `/za-zavetisca` |
| footer.faq | Pogosta vprašanja | FAQ | `/pogosta-vprasanja` |
| footer.nav_label | Noga strani | Footer | `nav` landmark name |
| footer.tagline | Spet doma. | Home again. | Next to the logo |
| footer.copyright | © {year} Signapps. Najdimo je delovno ime storitve. | © {year} Signapps. Najdimo is the service's working name. | Drop the second sentence once the name is final (Q-001) |

# 3. Page container and accessibility strings

| Key | SL | EN |
|---|---|---|
| common.skip_to_content | Preskoči na vsebino | Skip to content |
| common.skip_map | Preskoči zemljevid | Skip map |
| common.sidebar_label | Dodatna vsebina | Additional content |
| common.loading | Nalaganje … | Loading … |
| common.loading_page | Stran se nalaga. | The page is loading. |
| common.opens_new_tab | (odpre se v novem zavihku) | (opens in a new tab) |
| common.external_link | Zunanja povezava | External link |
| common.required | obvezno | required |
| common.optional | neobvezno | optional |
| common.unread | neprebrano | unread |
| common.breadcrumb_back | Nazaj na {page} | Back to {page} |
| common.on_this_page | Na tej strani | On this page |

# 4. Shared buttons and words (`common`)

| Key | SL | EN |
|---|---|---|
| common.continue | Nadaljuj | Continue |
| common.next | Naprej | Next |
| common.back | Nazaj | Back |
| common.close | Zapri | Close |
| common.cancel | Prekliči | Cancel |
| common.save | Shrani | Save |
| common.saved | Shranjeno | Saved |
| common.edit | Uredi | Edit |
| common.delete | Izbriši | Delete |
| common.done | Končano | Done |
| common.confirm | Potrdi | Confirm |
| common.skip | Preskoči | Skip |
| common.not_now | Ne zdaj | Not now |
| common.try_again | Poskusi znova | Try again |
| common.send | Pošlji | Send |
| common.share | Deli | Share |
| common.copy_link | Kopiraj povezavo | Copy link |
| common.link_copied | Povezava je kopirana. | Link copied. |
| common.more | Več | More |
| common.show_more | Pokaži več | Show more |
| common.load_more | Naloži več | Load more |
| common.open | Odpri | Open |
| common.open_map | Odpri zemljevid | Open the map |
| common.go_to_map | Na zemljevid | Go to the map |
| common.go_home | Na začetno stran | Go to the home page |
| common.yes | Da | Yes |
| common.no | Ne | No |
| common.or | ali | or |
| common.draft_saved | Osnutek je shranjen. | Draft saved. |
| common.changes_saved | Spremembe so shranjene. | Changes saved. |
| common.discard_title | Zavržem spremembe? | Discard your changes? |
| common.discard_body | Če zdaj odidete, se neshranjene spremembe izgubijo. | If you leave now, unsaved changes will be lost. |
| common.discard_confirm | Zavrzi | Discard |
| common.keep_editing | Nadaljuj z urejanjem | Keep editing |
| common.private_note | Javno prikažemo le približno območje. | We only show an approximate area in public. |
| common.phone_hidden_note | Vaša telefonska številka ostane skrita. | Your phone number stays hidden. |
| common.test_mode | Testni način | Test mode |

`common.discard_title`: the first person "Zavržem" reads as the user asking; keep it, it is the standard Slovenian dialog form ("Shranim spremembe?").

# 5. Shared patterns

## 5.1 Empty state (generic fallback)

| Key | SL | EN |
|---|---|---|
| common.empty_title | Tu še ni ničesar | Nothing here yet |
| common.empty_body | Ko bo kaj novega, se bo pokazalo tukaj. | When there is something new, it will appear here. |

Pages define their own empty states; this pair is only the fallback.

## 5.2 Inline error

| Key | SL | EN |
|---|---|---|
| common.inline_error | Tega trenutno ne moremo naložiti. | We cannot load this right now. |
| common.inline_error_retry | Poskusi znova | Try again |

## 5.3 Error pages

| Key | SL | EN |
|---|---|---|
| errors.page_404_title | Te strani ne najdemo | We cannot find this page |
| errors.page_404_body | Morda je povezava napačna ali je stran premaknjena. Na zemljevidu so vse aktualne prijave. | The link may be wrong or the page has moved. All current reports are on the map. |
| errors.page_404_doc_title | Strani ni mogoče najti | Page not found |
| errors.page_410_title | Ta prijava ni več na voljo | This report is no longer available |
| errors.page_410_body | Prijava je zaključena ali odstranjena. Morda je žival že spet doma. | The report has been closed or removed. The animal may already be home. |
| errors.page_410_doc_title | Prijava ni več na voljo | Report no longer available |
| errors.page_500_title | Nekaj je šlo narobe pri nas | Something went wrong on our side |
| errors.page_500_body | Napako že odpravljamo. Poskusite znova čez nekaj minut. Vaši osnutki so shranjeni na tej napravi. | We are already working on it. Please try again in a few minutes. Your drafts are saved on this device. |
| errors.page_500_doc_title | Napaka | Error |
| errors.offline_title | Ni povezave z internetom | No internet connection |
| errors.offline_body | Ko boste spet povezani, se stran naloži sama. Osnutki ostanejo shranjeni. | When you are back online, the page will reload by itself. Drafts stay saved. |

Buttons on error pages: primary `common.go_to_map`, text button `common.go_home` (404, 410) or `common.try_again` (500, offline).

## 5.4 Toasts (examples used across pages)

| Key | SL | EN |
|---|---|---|
| common.toast_saved | Shranjeno. | Saved. |
| common.toast_link_copied | Povezava je kopirana. | Link copied. |
| common.toast_deleted | Izbrisano. | Deleted. |
| common.toast_error | Tega ni bilo mogoče shraniti. Poskusite znova. | That could not be saved. Please try again. |

## 5.5 Banner area (one notice at a time)

| Key | SL | EN |
|---|---|---|
| common.banner_test_mode | Testna različica. Plačila so preizkusna, s kartic se ne bremeni denar. | Test version. Payments are simulated and no card is charged. |
| common.banner_maintenance | Ob {time} bomo za kratek čas izvajali vzdrževanje. Prijave, oddane prej, so varne. | We will carry out short maintenance at {time}. Reports sent before then are safe. |
| common.banner_dismiss | Skrij obvestilo | Hide notice |

## 5.6 Language fallback notice

| Key | SL | EN |
|---|---|---|
| common.translation_missing | Ta stran še ni prevedena, zato je prikazana v slovenščini. | This page is not translated yet, so it is shown in Slovenian. |

## 5.7 Data source line (GURS boundaries)

| Key | SL | EN |
|---|---|---|
| common.geo_attribution | Vir: Geodetska uprava Republike Slovenije, Register prostorskih enot, stanje {date} (licenca CC BY 4.0). Meje so poenostavljene. | Source: Surveying and Mapping Authority of the Republic of Slovenia, Register of Spatial Units, as of {date} (CC BY 4.0). Boundaries simplified. |

Required by the GURS terms and CC BY 4.0 (`supabase/seed/geo/LICENSE.md`). `{date}` is the data state date of the loaded geodata (now 15. 10. 2026 / 15 October 2026), formatted per locale; "CC BY 4.0" links to the licence. Show it in small muted text wherever boundaries or figures by municipality or region are published: the Partners statistics (P22), SEO location pages, municipality reports (PDF and CSV) and the imprint (chapter 7).

# 6. Errors catalogue (`errors`, one key per C1 code)

Shown in notes and toasts. Pages may override with a more specific message (for example P7 rate limit).

| Key | SL | EN |
|---|---|---|
| errors.VALIDATION | Nekaj podatkov manjka ali ni pravilnih. Preverite označena polja. | Some details are missing or not quite right. Please check the highlighted fields. |
| errors.NOT_FOUND | Tega ne najdemo več. Morda je bilo odstranjeno. | We cannot find this any more. It may have been removed. |
| errors.GONE | Ta prijava je zaključena, zato je ni več mogoče urejati. | This report is closed, so it can no longer be changed. |
| errors.FORBIDDEN | Za to nimate dovoljenja. Če mislite, da je to napaka, se vpišite z drugim računom. | You do not have permission for this. If you think this is a mistake, sign in with another account. |
| errors.UNVERIFIED_EMAIL | Najprej potrdite svoj e-naslov. Povezavo smo vam poslali po e-pošti. | Please confirm your email address first. We have emailed you a link. |
| errors.RATE_LIMITED | V kratkem času je bilo poslanih več zahtev. Poskusite znova čez {minutes, plural, one {# minuto} two {# minuti} few {# minute} other {# minut}}. | Several requests were sent in a short time. Please try again in {minutes, plural, one {# minute} other {# minutes}}. |
| errors.RATE_LIMITED_generic | V kratkem času je bilo poslanih več zahtev. Poskusite znova malo pozneje. | Several requests were sent in a short time. Please try again a little later. |
| errors.CAPTCHA_FAILED | Nismo mogli preveriti, da pošiljate vi in ne program. Poskusite znova. | We could not confirm that this is you and not a bot. Please try again. |
| errors.CONFLICT | Medtem se je nekaj spremenilo. Osvežite stran in poskusite znova. | Something changed in the meantime. Please refresh and try again. |
| errors.DUPLICATE_OPEN_REPORT | Za to žival že imate odprto iskanje. Lahko ga posodobite. | You already have an open search for this animal. You can update it. |
| errors.MIN_AMOUNT | Najmanjši znesek je 2 €. | The minimum amount is €2. |
| errors.LIVE_MODE_FORBIDDEN | Plačila so v tej različici samo preizkusna. | Payments in this version are test payments only. |
| errors.INTERNAL | Nekaj je šlo narobe pri nas. Poskusite znova čez nekaj minut. | Something went wrong on our side. Please try again in a few minutes. |
| errors.NETWORK | Povezava se je prekinila. Preverite internet in poskusite znova. | The connection dropped. Check your internet and try again. |
| errors.UPLOAD_TYPE | Ta datoteka ni fotografija. Izberite sliko JPG, PNG ali HEIC. | This file is not a photo. Please choose a JPG, PNG or HEIC image. |
| errors.UPLOAD_SIZE | Fotografija je prevelika. Izberite drugo ali jo pred nalaganjem zmanjšajte. | The photo is too large. Choose another one or make it smaller first. |

`errors.RATE_LIMITED_generic` is used when `details.retry_after_s` is missing. `minutes` = `ceil(retry_after_s / 60)`.

# 7. Document titles and SEO defaults

| Item | SL | EN |
|---|---|---|
| Title template | `%s · Najdimo` | `%s · Najdimo` |
| Default title (fallback) | Najdimo – izgubljene in najdene živali v Sloveniji | Najdimo – lost and found pets in Slovenia |
| Default meta description | Prijavite izgubljeno ali najdeno žival. Najdimo poveže lastnike in najditelje psov in mačk po vsej Sloveniji, brezplačno in varno. | Report a lost or found pet. Najdimo connects owners and finders of dogs and cats across Slovenia, free and safe. |
| 404 and 410 | noindex, titles from §5.3 | noindex |

Character counts: default title SL 52, EN 41; description SL 129, EN 112. The site-wide Organization structured data lives on the home page (P3).

# 8. Alt text

The shell has no content images. Logo: `alt=""` inside the link, the link carries `nav.home_label`.

# 9. CHANGE requests

- `CHANGE docs/tech/contracts/C15-routes-deeplinks.md§Web routes: add "about" /o-nas, /en/about (footer link "O nas", copy in P3).`
- `CHANGE docs/tech/contracts/C15-routes-deeplinks.md§Web routes: signIn SL slug /prijava-v-racun → /vpis ("Prijava" is the report in this product; glossary §5).`
- `CHANGE docs/design/pages/P1-web-shell.md§Header: the SL label for "Sign in" is "Vpis" (not "Prijava").`
