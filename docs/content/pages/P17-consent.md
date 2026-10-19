---
source: 03§P17; docs/design/pages/P17-consent.md; 02§FR-039, FR-038; docs/tech/contracts/C12-analytics-consent.md
page: P17 Consent banner and preferences
stories: TASK-13 (FR-039, FR-038)
copy-for: docs/design/pages/P17-consent.md
version: 0.2
status: Draft, native Slovenian review and legal review pending (with the cookie policy)
date: 2026-10-19
---

# P17 Consent: copy

Namespace `consent`. Basic Consent Mode v2: nothing is sent to Google before the choice; all four signals start as denied; accepting grants only `analytics_storage`. The copy says exactly that, no more. Reject all and Accept all carry the same weight; nothing is pre-selected. Details and durations: `docs/content/legal/cookie-policy.md`.

# 1. First view (web banner, mobile sheet)

| Key | SL | EN |
|---|---|---|
| consent.title | Piškotki in vaša zasebnost | Cookies and your privacy |
| consent.body_web | Nujne piškotke potrebujemo, da stran deluje, na primer za vpis. Če dovolite, z orodjem Google Analytics merimo tudi, kako se stran uporablja, brez imen, točnih lokacij in številk čipov; pred vašo odločitvijo Googlu ne pošljemo ničesar. | We need essential cookies for the site to work, for example to keep you signed in. If you allow it, we also use Google Analytics to see how the site is used, without names, exact locations or chip numbers; nothing is sent to Google before you decide. |
| consent.body_app | Nekaj podatkov na napravi potrebujemo, da aplikacija deluje, na primer za vpis. Če dovolite, z orodjem Google Analytics for Firebase merimo tudi, kako se aplikacija uporablja, brez imen, točnih lokacij in številk čipov; pred vašo odločitvijo Googlu ne pošljemo ničesar. | The app needs to store a little data on your device to work, for example to keep you signed in. If you allow it, we also use Google Analytics for Firebase to see how the app is used, without names, exact locations or chip numbers; nothing is sent to Google before you decide. |
| consent.policy_link | Politika piškotkov | Cookie policy |
| consent.reject_all | Zavrni vse | Reject all |
| consent.accept_all | Sprejmi vse | Accept all |
| consent.customise | Prilagodi | Customise |
| consent.dialog_label | Izbira piškotkov | Cookie choice |

Web banner (as built, TASK-115.11; design change CH-630): "Zavrni vse" and "Sprejmi vse" are an equal `secondary` pair, side by side, same size and weight; "Prilagodi" is a text button after them (in the same row from about 390 px, under the pair below that). Rejecting stays exactly as easy as accepting. Mobile app sheet: the three buttons as before, equal size, in the order Zavrni vse, Sprejmi vse, Prilagodi. Escape or ignoring the banner keeps everything denied. The labels are unchanged: "Prilagodi" / "Customise" reads as a link to the settings view, and the two choices keep their verbs.

# 2. Customise view and Cookie settings

| Key | SL | EN |
|---|---|---|
| consent.back | Nazaj | Back |
| consent.settings_title | Nastavitve piškotkov | Cookie settings |
| consent.necessary_title | Nujni | Essential |
| consent.necessary_body | Omogočajo vpis, si zapomnijo jezik, izbiro glede piškotkov in osnutke prijav ter ščitijo pred zlorabami. Ponudnika: Najdimo in Cloudflare (preverjanje, da niste robot). Trajanje je navedeno v politiki piškotkov. | They keep you signed in, remember your language, your cookie choice and report drafts, and protect against abuse. Providers: Najdimo and Cloudflare (bot check). Durations are listed in the cookie policy. |
| consent.necessary_locked | Vedno vklopljeno | Always on |
| consent.analytics_title | Analitični | Analytics |
| consent.analytics_body_web | Pomagajo nam razumeti, katere strani in koraki se uporabljajo, da iskanje izboljšamo. Ponudnik: Google (Google Analytics 4). Piškotka _ga in _ga_* se hranita 2 leti, podatki v Google Analytics 14 mesecev. Oglaševalskih piškotkov ne uporabljamo. | They help us understand which pages and steps are used, so we can improve searching. Provider: Google (Google Analytics 4). The _ga and _ga_* cookies are kept for 2 years and the data in Google Analytics for 14 months. We do not use advertising cookies. |
| consent.analytics_body_app | Pomagajo nam razumeti, kateri zasloni in koraki se uporabljajo, da iskanje izboljšamo. Ponudnik: Google (Google Analytics for Firebase). Podatki se v Google Analytics hranijo 14 mesecev. Oglaševalskih identifikatorjev ne uporabljamo. | They help us understand which screens and steps are used, so we can improve searching. Provider: Google (Google Analytics for Firebase). Data is kept in Google Analytics for 14 months. We do not use advertising identifiers. |
| consent.analytics_switch_a11y | Analitični piškotki | Analytics cookies |
| consent.save | Shrani izbiro | Save choice |
| consent.saved_toast | Izbira je shranjena. | Choice saved. |
| consent.ads_note | Oglase štejemo brez piškotkov in brez podatkov o vas, zato za to ne potrebujemo vašega soglasja. | We count ads without cookies and without any data about you, so this needs no consent. |

Customise buttons, equal size: Shrani izbiro, Sprejmi vse, Zavrni vse. The settings view opened from the footer ("Nastavitve piškotkov") or the profile row shows the stored choice. Withdrawing is one switch plus "Shrani izbiro"; analytics stops and the `_ga` cookies are deleted at once.

# 3. Re-ask

| Key | SL | EN |
|---|---|---|
| consent.reask_changed | Od vaše zadnje izbire se je nekaj spremenilo: {change}. Prosimo, izberite znova. | Something has changed since your last choice: {change}. Please choose again. |
| consent.reask_year | Od vaše zadnje izbire je minilo leto dni. Prosimo, izberite znova. | It has been a year since your last choice. Please choose again. |

`{change}` is a short phrase written with each consent version, for example "dodali smo novega ponudnika analitike" / "we added a new analytics provider". It is shown as the first sentence, before the normal `consent.body_web` or `consent.body_app`; the rest of the banner stays the same.

# 4. SEO and alt text

N/A: overlay, no images.

# Change log

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-10-19 | CH-630 (copy side): web banner has Reject all and Accept all as the equal pair and Customise as a text button; labels unchanged; equal weight now means the two choices. |
