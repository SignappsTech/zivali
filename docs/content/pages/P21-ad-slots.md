---
source: 03§P21; docs/design/pages/P21-ad-slots.md; 02§FR-029, FR-030; brief v0.7 (Vet Partner)
page: P21 Ad slots and house ads
stories: TASK-36, TASK-35 (FR-029, FR-030)
copy-for: docs/design/pages/P21-ad-slots.md
version: 0.3
status: Draft, native Slovenian review and client approval pending
date: 2026-10-19
---

# P21 Ad slots and house ads: copy

Namespace `ads`. Every ad and every paid placement (including Vet Partner) carries the label **Oglas** / **Ad**, always visible and in the accessible name. Ads never appear on report-lost, report-found, sign-in, chat, payment, consent settings, admin or the Partners page. House ads are honest about being ours and are labelled "Oglas" too.

# 1. Unit strings

| Key | SL | EN |
|---|---|---|
| ads.label | Oglas | Ad |
| ads.unit_a11y | Oglas: {title} | Ad: {title} |
| ads.learn_more | Več o tem | Learn more |
| ads.opens_new_tab | (odpre se v novem zavihku) | (opens in a new tab) |
| ads.sidebar_label | Oglasi | Ads |

`ads.learn_more` is the default text button when the ad has no own button text (max 24 characters). The sidebar unit sits in a complementary landmark named `ads.sidebar_label`.

# 2. Vet Partner placement (later, built on the detail slot)

Featured placement in the vet context of the detail slot, for paying vet clinics in the region:

| Key | SL | EN |
|---|---|---|
| ads.vet_context | Veterinar v vaši regiji | Vet in your region |
| ads.vet_badge_24h | Nujna pomoč 24 ur | 24-hour emergency care |
| ads.vet_partner_mark | Partnerska ambulanta | Partner clinic |
| ads.vet_open_now | Zdaj odprto | Open now |
| ads.vet_cta | Pokliči ali odpri zemljevid | Call or open map |

Title, text and link come from the clinic's profile. The "Oglas" label stays on the unit, followed by the context: "Oglas · Veterinar v vaši regiji" / "Ad · Vet in your region". v0.2: a paid placement never says "v bližini", "najbližji" or "nearest" (ad-labelling and ranking rules, lawyer pack LQ-56); a distance may only be shown when it is the real, measured distance. `ads.vet_cta` opens the clinic's phone (`tel:`) or its address in the maps app.

# 3. House ads

Limits from C14: title ≤ 60, text ≤ 120 (design), button ≤ 24, alt 5 to 140 characters. The seeder (`apps/api/prisma/seeders/30-commerce.seeder.ts`) carries this copy since 2026-10-19 (CH-489). It seeds once and never overwrites, so a database seeded earlier (the pilot) gets the copy through the admin console (`/admin/oglasi`, Lastni oglasi). Images: `assets/house-ad-support.png`, `assets/house-ad-partner.png`, `assets/house-ad-adopt.png` (image tasks). Check the alt text against the final images.

## 3.1 Support

| Field | SL | EN |
|---|---|---|
| Title | Pomagajte ohraniti iskanje brezplačno | Help keep searching free |
| Text | Vsaka vrnitev domov je brezplačna. Prostovoljni prispevki pokrivajo strežnike, zemljevide in opozorila. | Every way home is free. Voluntary contributions cover servers, maps and alerts. |
| Button | Kako pomagati | How to help |
| Link | M2: `/o-nas#financiranje` (`/en/about#funding`); M4: the transparency page or Podpornik page | |
| Alt | Ilustracija: sonce nad mehkimi griči in pot, ki vodi do hiše | Illustration: sun over soft hills and a path leading to a house |
| Kind | `supporter` | |

## 3.2 Partner with us

| Field | SL | EN |
|---|---|---|
| Title | Vaša ambulanta ali trgovina na tem mestu? | Your clinic or shop here? |
| Text | Veterinarji, trgovine in saloni: dosezite lastnike psov in mačk v svoji regiji. Oglasi so vedno jasno označeni. | Vets, shops and groomers: reach dog and cat owners in your region. Ads are always clearly labelled. |
| Button | Oglašujte pri nas | Advertise with us |
| Link | `/oglasevanje` (`/en/advertise`) | |
| Alt | Ilustracija: vrsta lokalnih trgovin in ambulanta ob ulici | Illustration: a row of local shops and a clinic along a street |
| Kind | `partner` | |

## 3.3 Adopt

| Field | SL | EN |
|---|---|---|
| Title | Posvojite žival iz zavetišča | Adopt an animal from a shelter |
| Text | Psi in mačke v zavetiščih čakajo na nov dom. Morda prav na vašega. | Dogs and cats in shelters are waiting for a new home. Maybe yours. |
| Button | Poišči zavetišče | Find a shelter |
| Link | Until the adoption page exists (shelter portal, free for shelters): our shelter directory `/zavetisca` (`/en/shelters`, P3 T5). Then the adoption page. | |
| Alt | Ilustracija: odprta vrata hiše, sonce in pot čez griče | Illustration: an open front door, the sun and a path over the hills |
| Kind | `adopt` | |

# 4. States

| State | Copy |
|---|---|
| Loading | No text; the reserved box is empty (`aria-hidden`). |
| Image missing | Text-only unit: label, title, text, button. |
| Long text | Two lines with an ellipsis; the full text stays in the accessible name. |
| Failed or blocked | The slot collapses silently; no message. |

# 5. Where ads never appear (mockup routes frame)

| Key | SL | EN |
|---|---|---|
| ads.never_title | Kjer oglasov ni nikoli | Where ads never appear |
| ads.never_list | Prijava izgubljene ali najdene živali, vpis in registracija, pogovori, plačila, nastavitve piškotkov, konzola in stran Oglašujte pri nas. | Reporting a lost or found animal, sign-in and sign-up, conversations, payments, cookie settings, the console and the Advertise with us page. |

# 6. Alt text rules for sponsor ads

Written by the admin in P20 (`admin.ads_alt_help`): describe the picture, not the slogan, 5 to 140 characters, no "slika" or "fotografija" at the start, no repeated title. Example: "Veterinarka pregleduje psa na mizi v ambulanti" / "A vet examining a dog on a clinic table".

# 7. SEO

N/A: ad units are not indexed content. Links carry `rel="sponsored noopener"`.

# 8. CHANGE requests

- `CHANGE docs/design/pages/P21-ad-slots.md§Rules: drop "tag scan" from the no-ad list (QR tags out of scope, brief v0.7); add the Vet Partner featured placement (brief v0.7) to the Detail slot description.`
- `CHANGE docs/design/pages/P21-ad-slots.md§House ads: the adopt house ad cannot link to "the shelters page" (`/za-zavetisca` is for shelter staff, not adopters); link to the public shelter directory `/zavetisca` (P3 T5) until the adoption page exists.`

# Change log

| Version | Date | Change |
|---|---|---|
| 0.3 | 2026-10-19 | CH-489: the house-ad copy of §3 replaces the seeder placeholders; the pilot database needs it entered in the admin console. |
