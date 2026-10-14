---
source: 03§P19; docs/design/pages/P19-admin-shell.md
page: P19 Admin console shell
stories: TASK-34 (FR-019)
copy-for: docs/design/pages/P19-admin-shell.md
version: 0.1
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

# 8. SEO and alt text

SEO: N/A, the console is `noindex, nofollow` and requires sign-in. Document title pattern "{page} · Konzola Najdimo" / "{page} · Najdimo console". Alt text: enrolment QR `admin.enrol_qr_alt`; otherwise icons only.

# 9. CHANGE requests

- `CHANGE docs/design/pages/P19-admin-shell.md§Layout: remove "Orders" from the Commerce group (QR tags out of scope, brief v0.7); add "Vet Partners" (later) next to Enquiries.`
- `CHANGE docs/tech/contracts/C14-ads-partners.md§Tables (leads): add interest ('ad' | 'vet_partner' | 'unsure') for the Partners form (P22).`
