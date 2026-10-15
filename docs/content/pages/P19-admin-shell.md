---
source: 03§P19; docs/design/pages/P19-admin-shell.md
page: P19 Admin console shell
stories: TASK-34 (FR-019), TASK-89 (FR-044, shelter directory)
copy-for: docs/design/pages/P19-admin-shell.md
version: 0.2
status: Draft, native Slovenian review pending
date: 2026-10-15
---

# P19 Admin shell: copy

Namespace `admin`. Users are the client's staff and moderators: short, factual labels, still calm. Every mutation is logged; toasts say so.

# 1. Sidebar

| Key | SL | EN | Milestone |
|---|---|---|---|
| admin.group_overview | Pregled | Overview | |
| admin.nav_dashboard | Nadzorna plošča | Dashboard | M2 |
| admin.group_content | Vsebina | Content | |
| admin.nav_ads | Oglasi | Ads | M2 |
| admin.nav_house_ads | Lastni oglasi | House ads | M2 |
| admin.group_safety | Varnost | Safety | |
| admin.nav_moderation | Moderacija | Moderation queue | M4 |
| admin.nav_abuse | Prijave zlorab | Abuse reports | M4 |
| admin.group_orgs | Organizacije | Organisations | |
| admin.nav_verification | Preverjanje | Verification | M3 |
| admin.nav_organisations | Organizacije | Organisations | M3 |
| admin.nav_directory | Imenik zavetišč | Shelter directory | M3 (TASK-89) |
| admin.group_people | Ljudje | People | |
| admin.nav_users | Uporabniki | Users | M4 |
| admin.group_business | Posel | Business | |
| admin.nav_enquiries | Povpraševanja | Enquiries | M2 |
| admin.nav_vet_partners | Veterinarski partnerji | Vet Partners | later |
| admin.group_system | Sistem | System | |
| admin.nav_audit | Revizijska sled | Audit log | M2 |
| admin.nav_settings | Nastavitve | Settings | M2 |
| admin.coming_badge | Kmalu | Soon | Items not built yet |
| admin.coming_body | Ta del konzole še pripravljamo. | This part of the console is not ready yet. | |
| admin.sidebar_collapse | Skrči meni | Collapse menu | |
| admin.sidebar_expand | Razširi meni | Expand menu | |

The "Orders" item from the design slice is dropped (QR tags are out of scope, brief v0.7); see CHANGE below.

# 2. Top bar

| Key | SL | EN |
|---|---|---|
| admin.breadcrumb_root | Konzola | Console |
| admin.env_local | Lokalno | Local |
| admin.env_staging | Testno okolje | Staging |
| admin.env_production | Produkcija | Production |
| admin.role_admin | Skrbnik | Admin |
| admin.role_moderator | Moderator | Moderator |
| admin.account_menu | Moj račun | My account |
| admin.sign_out | Odjava | Sign out |

# 3. Shared table pattern

| Key | SL | EN |
|---|---|---|
| admin.search | Iskanje | Search |
| admin.filters | Filtri | Filters |
| admin.filters_clear | Počisti filtre | Clear filters |
| admin.load_more | Naloži več | Load more |
| admin.selected | {count, plural, one {Izbrana # vrstica} two {Izbrani # vrstici} few {Izbrane # vrstice} other {Izbranih # vrstic}} | {count, plural, one {# row selected} other {# rows selected}} |
| admin.select_all | Izberi vse | Select all |
| admin.row_actions | Dejanja | Actions |
| admin.sort_by | Razvrsti po: {column} | Sort by {column} |
| admin.drawer_close | Zapri podrobnosti | Close details |
| admin.empty | Ni zadetkov. | Nothing found. |
| admin.error | Podatkov ni bilo mogoče naložiti. | The data could not be loaded. |
| admin.retry | Poskusi znova | Try again |
| admin.saved_logged | Shranjeno in zabeleženo. | Saved and logged. |
| admin.destructive_title | {action}: {target}? | {action}: {target}? |
| admin.destructive_body | Dejanje bo zabeleženo v revizijski sledi. | This action will be recorded in the audit log. |
| admin.audit_note_label | Opomba za revizijsko sled (neobvezno) | Note for the audit log (optional) |
| admin.audit_note_required_label | Opomba za revizijsko sled | Note for the audit log |
| admin.audit_note_required_help | Za izbris je obvezna opomba za revizijsko sled. | A note for the audit log is required to delete. |
| admin.confirm | Potrdi | Confirm |
| admin.cancel | Prekliči | Cancel |

# 4. Access screens

| Key | SL | EN |
|---|---|---|
| admin.mfa_title | Vnesite kodo za preverjanje | Enter your verification code |
| admin.mfa_body | Odprite aplikacijo za preverjanje in vnesite 6-mestno kodo. | Open your authenticator app and enter the 6-digit code. |
| admin.mfa_label | 6-mestna koda | 6-digit code |
| admin.mfa_backup | Uporabi rezervno kodo | Use a backup code |
| admin.mfa_submit | Potrdi | Confirm |
| admin.mfa_wrong | Koda ni pravilna ali je potekla. Poskusite z novo kodo. | The code is wrong or has expired. Please try a new one. |
| admin.enrol_title | Nastavite dvostopenjsko preverjanje | Set up two-step verification |
| admin.enrol_body | Za dostop do konzole potrebujete aplikacijo za preverjanje, na primer Google Authenticator, Microsoft Authenticator ali 1Password. Skenirajte kodo QR ali vnesite ključ. | To use the console you need an authenticator app, for example Google Authenticator, Microsoft Authenticator or 1Password. Scan the QR code or enter the key. |
| admin.enrol_key | Ključ za ročni vnos | Key for manual entry |
| admin.enrol_code | Koda iz aplikacije | Code from the app |
| admin.enrol_submit | Potrdi in nadaljuj | Confirm and continue |
| admin.enrol_qr_alt | Koda QR za aplikacijo za preverjanje | QR code for your authenticator app |
| admin.denied_title | Dostop ni mogoč | Access not possible |
| admin.denied_body | Za to stran nimate dovoljenja. | You do not have permission for this page. |
| admin.denied_back | Nazaj v aplikacijo | Back to the app |
| admin.timeout_title | Znova se vpišite | Please sign in again |
| admin.timeout_body | Seja je potekla. Stran ostane odprta, neshranjene spremembe pa se ohranijo. | Your session has expired. The page stays open and unsaved changes are kept. |
| admin.timeout_signin | Vpiši se | Sign in |
| admin.last_admin | Zadnjega skrbnika ni mogoče odstraniti. Najprej dodajte drugega skrbnika. | The last admin cannot be removed. Add another admin first. |
| admin.read_only_banner | Vzdrževanje: konzola je trenutno samo za branje. | Maintenance: the console is read-only right now. |

# 5. Dashboard (placeholder)

| Key | SL | EN |
|---|---|---|
| admin.dash_title | Nadzorna plošča | Dashboard |
| admin.dash_open_reports | Odprte prijave | Open reports |
| admin.dash_active_ads | Aktivni oglasi | Active ads |
| admin.dash_new_enquiries | Nova povpraševanja | New enquiries |
| admin.dash_under_review | Prijave v pregledu | Reports under review |
| admin.dash_open | Odpri | Open |
| admin.dash_recent | Zadnje spremembe | Recent changes |

# 6. Audit log

| Key | SL | EN |
|---|---|---|
| admin.audit_title | Revizijska sled | Audit log |
| admin.audit_time | Čas | Time |
| admin.audit_actor | Kdo | Who |
| admin.audit_action | Dejanje | Action |
| admin.audit_target | Cilj | Target |
| admin.audit_change | Sprememba | Change |
| admin.audit_export | Izvozi CSV | Export CSV |

# 7. Enquiries (leads from P22)

| Key | SL | EN |
|---|---|---|
| admin.leads_title | Povpraševanja | Enquiries |
| admin.leads_received | Prejeto | Received |
| admin.leads_company | Podjetje | Company |
| admin.leads_contact | Kontakt | Contact |
| admin.leads_email | E-naslov | Email |
| admin.leads_phone | Telefon | Phone |
| admin.leads_region | Regija | Region |
| admin.leads_type | Zanimanje | Interest |
| admin.leads_type_ad | Oglas | Ad |
| admin.leads_type_vet | Veterinarski partner | Vet Partner |
| admin.leads_type_unsure | Neopredeljeno | Undecided |
| admin.leads_status | Stanje | Status |
| admin.leads_new | Novo | New |
| admin.leads_in_progress | V obdelavi | In progress |
| admin.leads_closed | Zaključeno | Closed |
| admin.leads_consent | Soglasje za stik: {date} | Consent to contact: {date} |

# 8. Shelter directory (`/admin/zavetisca`, TASK-89)

Namespace `admin.directory`. Every save is live at once on the public shelter pages (P3 T5, T6) and in the P6, P7 and P9 call rows; the screen says so. Reuses the shared table pattern (§3).

| Key | SL | EN |
|---|---|---|
| admin.directory.title | Imenik zavetišč | Shelter directory |
| admin.directory.live_note | Spremembe so na javnih straneh in v aplikaciji vidne takoj po shranjevanju. | Changes go live on the public pages and in the app as soon as you save. |
| admin.directory.import | Uvozi CSV | Import CSV |
| admin.directory.add | Dodaj zavetišče | Add shelter |
| admin.directory.reminder | Letno preverjanje: {count, plural, one {**#** vnos ni bil preverjen} two {**#** vnosa nista bila preverjena} few {**#** vnosi niso bili preverjeni} other {**#** vnosov ni bilo preverjenih}} več kot 12 mesecev. | Yearly check: {count, plural, one {**#** entry has} other {**#** entries have}} not been checked for more than 12 months. |
| admin.directory.reminder_show | Pokaži | Show |
| admin.directory.tab_shelters | Zavetišča | Shelters |
| admin.directory.tab_municipalities | Občine | Municipalities |
| admin.directory.col_name | Ime | Name |
| admin.directory.col_municipalities | Občine | Municipalities |
| admin.directory.col_phone | Telefon | Phone |
| admin.directory.col_checked | Nazadnje preverjeno | Last checked |
| admin.directory.col_source | Vir | Source |
| admin.directory.stale | zastarelo | out of date |
| admin.directory.search_shelters | Išči zavetišče | Search shelters |
| admin.directory.filter_stale | Starejše od 12 mesecev | Older than 12 months |
| admin.directory.action_edit | Uredi | Edit |
| admin.directory.action_history | Zgodovina | History |
| admin.directory.action_delete | Izbriši | Delete |
| admin.directory.col_municipality | Občina | Municipality |
| admin.directory.col_shelter | Pristojno zavetišče | Responsible shelter |
| admin.directory.col_status | Stanje | Status |
| admin.directory.status_confirmed | Potrjeno | Confirmed |
| admin.directory.status_unconfirmed | Ni potrjeno | Not confirmed |
| admin.directory.search_municipalities | Išči občino | Search municipalities |
| admin.directory.filter_shelter_all | Vsa zavetišča | All shelters |
| admin.directory.filter_no_shelter | Brez zavetišča | No shelter |
| admin.directory.edit_title | Uredi zavetišče | Edit shelter |
| admin.directory.new_title | Novo zavetišče | New shelter |
| admin.directory.field_name | Ime | Name |
| admin.directory.field_street | Ulica in hišna številka | Street and number |
| admin.directory.field_postcode | Poštna številka | Postcode |
| admin.directory.field_place | Kraj | Town |
| admin.directory.field_phone | Telefon | Phone |
| admin.directory.field_phone_help | Na primer 01 234 56 78 ali +386 1 234 56 78. | For example 01 234 56 78 or +386 1 234 56 78. |
| admin.directory.field_website | Spletna stran | Website |
| admin.directory.field_email | E-naslov | Email |
| admin.directory.hours_title | Delovni čas | Opening hours |
| admin.directory.hours_days | Dnevi | Days |
| admin.directory.hours_from | Od | From |
| admin.directory.hours_to | Do | To |
| admin.directory.hours_closed | Zaprto | Closed |
| admin.directory.hours_remove | Odstrani vrstico | Remove row |
| admin.directory.hours_add | Dodaj vrstico | Add row |
| admin.directory.served_title | Občine, za katere je pristojno | Municipalities served |
| admin.directory.served_add | Dodaj občino | Add municipality |
| admin.directory.served_remove | Odstrani {municipality} | Remove {municipality} |
| admin.directory.field_source | Vir | Source |
| admin.directory.field_source_help | Od kod so podatki, na primer »spletna stran zavetišča« ali »klic v zavetišče«. | Where the details come from, for example "shelter website" or "call to the shelter". |
| admin.directory.field_checked | Preverjeno dne | Checked on |
| admin.directory.save | Shrani | Save |
| admin.directory.saved | Shranjeno, zabeleženo. Že vidno v aplikaciji. | Saved and logged. Already live in the app. |
| admin.directory.error_name | Vpišite ime zavetišča. | Enter the shelter's name. |
| admin.directory.error_phone | Telefonska številka ni veljavna. Vpišite jo na primer kot 01 234 56 78. | This phone number is not valid. Enter it like 01 234 56 78. |
| admin.directory.error_source | Vpišite vir podatkov. | Enter where the details come from. |
| admin.directory.error_hours | Ura »do« mora biti za uro »od«. | The closing time must be after the opening time. |
| admin.directory.conflict | Medtem je to zavetišče uredil nekdo drug. Osvežite in spremembe vnesite znova. | Someone else edited this shelter in the meantime. Refresh and enter your changes again. |
| admin.directory.conflict_refresh | Osveži | Refresh |
| admin.directory.municipality_shelter | Pristojno zavetišče | Responsible shelter |
| admin.directory.municipality_none | Ni potrjeno | Not confirmed |
| admin.directory.municipality_help | Če zavetišče ni potrjeno, javne strani ljudem svetujejo, naj pokličejo občino. | Without a confirmed shelter, the public pages tell people to call the municipality. |
| admin.directory.history_title | Zgodovina | History |
| admin.directory.history_time | Čas | Time |
| admin.directory.history_actor | Kdo | Who |
| admin.directory.history_change | Sprememba | Change |
| admin.directory.history_before | prej | before |
| admin.directory.history_after | zdaj | now |
| admin.directory.history_restore | Obnovi to različico | Restore this version |
| admin.directory.history_restored | Različica je obnovljena kot nova sprememba. | Version restored as a new change. |
| admin.directory.import_title | Uvoz CSV | Import CSV |
| admin.directory.import_drop | Datoteko CSV povlecite sem ali | Drag a CSV file here or |
| admin.directory.import_choose | Izberi datoteko | Choose a file |
| admin.directory.import_summary | {new, plural, one {# nov vnos} two {# nova vnosa} few {# novi vnosi} other {# novih vnosov}}, {changed, plural, one {# spremenjen} two {# spremenjena} few {# spremenjeni} other {# spremenjenih}}, {removed, plural, one {# odstranjen} two {# odstranjena} few {# odstranjeni} other {# odstranjenih}}, {errors, plural, one {# napaka} two {# napaki} few {# napake} other {# napak}} | {new, plural, one {# new entry} other {# new entries}}, {changed} changed, {removed} removed, {errors, plural, one {# error} other {# errors}} |
| admin.directory.import_col_entry | Vnos | Entry |
| admin.directory.import_col_field | Polje | Field |
| admin.directory.import_error_row | Vrstica {row}: {reason} | Row {row}: {reason} |
| admin.directory.import_apply | Uveljavi spremembe | Apply changes |
| admin.directory.import_apply_blocked | Najprej popravite napake v datoteki in jo naložite znova. | Fix the errors in the file and upload it again first. |
| admin.directory.import_applying | Uveljavljamo spremembe … | Applying changes … |
| admin.directory.delete_refused | Zavetišča ne morete izbrisati, ker je pristojno za {count, plural, one {# občino} two {# občini} few {# občine} other {# občin}}. Najprej jih dodelite drugemu zavetišču. | You cannot delete this shelter because it serves {count, plural, one {# municipality} other {# municipalities}}. Assign them to another shelter first. |
| admin.directory.delete_body | Zavetišče izgine z javnih strani in iz gumbov za klic. Izbris bo zabeležen v revizijski sledi. | The shelter disappears from the public pages and the call buttons. The deletion will be recorded in the audit log. |
| admin.directory.import_errors | Napake | Errors |
| admin.directory.import_changes | Spremembe | Changes |
| admin.directory.row_municipalities | Občine: {n} | Municipalities: {n} |
| admin.directory.row_source | Vir: {source} | Source: {source} |
| admin.directory.history_field_hours | Delovni čas, {days} | Opening hours, {days} |
| admin.directory.history_initial | Začetni uvoz imenika | Initial directory import |
| admin.directory.tablist_label | Pogled imenika | Directory view |

Notes:

- `admin.directory.reminder` shows from 1 April until no entry is older than 12 months; the count is bold (marked `**#**`), `admin.directory.reminder_show` applies `admin.directory.filter_stale`. Not dismissible.
- A stale row shows the `clock` icon and `admin.directory.stale` in bold next to the date.
- Day-range options in the hours rows: SL "pon–pet", "pon–sob", "pon", "tor", "sre", "čet", "pet", "sob", "ned", "prazniki"; EN "Mon–Fri", "Mon–Sat", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Public holidays".
- Delete dialog: `admin.destructive_title` with the action `admin.directory.action_delete` and the shelter name, body `admin.directory.delete_body`, audit note REQUIRED (`admin.audit_note_required_label`, help `admin.audit_note_required_help`; the delete button stays disabled until it is filled). Cancel: `admin.cancel`. Municipality drawer audit note and source use the same keys as the shelter form.
- Time format in the hours fields and history: SL "8.00" and ranges "8.00–15.00" (like the public pages); EN 24 h "08:00" and "08:00–15:00".
- The directory is admin only; moderators get the access-denied screen, so there is no view-only copy.
- Empty search, error and retry: §3 keys.

# 9. SEO and alt text

SEO: N/A, the console is `noindex, nofollow` and requires sign-in. Document title pattern "{page} · Konzola Najdimo" / "{page} · Najdimo console". Alt text: enrolment QR `admin.enrol_qr_alt`; otherwise icons only.

# 10. CHANGE requests

- `CHANGE docs/design/pages/P19-admin-shell.md§Layout: remove "Orders" from the Commerce group (QR tags out of scope, brief v0.7); add "Vet Partners" (later) next to Enquiries.`
- `CHANGE docs/tech/contracts/C14-ads-partners.md§Tables (leads): add interest ('ad' | 'vet_partner' | 'unsure') for the Partners form (P22).`
