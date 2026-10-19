---
source: 02§FR-026 (v0.11, R-026.1 to R-026.10), §Content, SEO and legal requirements; 01 brief v1.2 (Premium, owner 2026-10-19); TASK-54; docs/content/legal/terms-of-use.md chapter 10
page: P24 Premium plan page (proposed ID, see CHANGE)
stories: TASK-54 (FR-026); wireframe gate TASK-54.1
copy-for: the plan page wireframe TASK-54.1 (not yet approved; this copy does not depend on its layout)
version: 0.1
status: Draft, native Slovenian review and owner approval pending; lines marked † need legal review (terms chapter 10, lawyer pack LQ-41, LQ-74)
date: 2026-10-19
---

# P24 Premium plan page: copy

Namespace `premium`. Premium sells convenience, AI help and insight, never a better chance of getting a pet home. The page says first what stays free, then what Premium adds, then the two plans. Calm and plain: no urgency, no countdown, no guilt, no "only today", no struck-through price, no plan pre-selected. The "no" choice is always neutral (voice guide 5.3).

Who sees it: signed-in and signed-out people on the web, and the app (which opens the web checkout, §8). Shelter and municipality members never see the page, an entry to it or any upgrade prompt (R-026.5).

Name: **Premium Zaščita** / **Premium Protect** (glossary §6). It declines in SL ("s Premium Zaščito", "Premium Zaščite"). In tight labels "Premium" alone is allowed, uninflected.

Prices come from config (`C13`, test mode): `{price}` is formatted with `formatEur` ("29,99 €" / "€29.99"). Today: yearly 29,99 €, monthly 3,99 €, so the yearly plan is 2,50 € a month and `{saving}` = round((12 × 3,99 − 29,99) / (12 × 3,99) × 100) = 37. Compute all three from the config, never type them into the copy.

# 1. Hero

| Key | SL | EN |
|---|---|---|
| premium.title | Premium Zaščita | Premium Protect |
| premium.lede | Vse, kar žival pripelje domov, je brezplačno za vse. Premium Zaščita doda udobje, pomoč umetne inteligence in pregled nad vašimi prijavami. | Everything that brings a pet home is free for everyone. Premium Protect adds convenience, AI help and insight into your reports. |

h1 `title`, lede under it. No button in the hero: the plans (§4) are the action.

# 2. What stays free (first)

| Key | SL | EN |
|---|---|---|
| premium.free_title | Vedno brezplačno, za vse | Always free, for everyone |
| premium.free_intro | Nič, kar pomaga, da se žival vrne domov, ne bo nikoli plačljivo ali počasnejše. | Nothing that helps a pet get home will ever cost money or be slower. |
| premium.free_report | Prijava izgubljene, najdene ali opažene živali | Reporting a lost, found or sighted animal |
| premium.free_matching | Ujemanje po čipu, opisu in fotografiji ter predlogi iz fotografije | Matching by chip, description and photo, and suggestions from your photos |
| premium.free_alerts | Opozorila ljudem v bližini v običajnem polmeru | Alerts to people nearby in the standard radius |
| premium.free_chat | Varen pogovor v aplikaciji | Safe messaging in the app |
| premium.free_poster | Plakat s kodo QR za tiskanje | A printable poster with a QR code |
| premium.free_share | Deljenje prijave | Sharing your report |
| premium.free_map | Javni zemljevid z vsemi opažanji | The public map with every sighting |
| premium.free_pets | {limit, plural, one {Do # profila živali} two {Do # profilov živali} few {Do # profilov živali} other {Do # profilov živali}} | {limit, plural, one {Up to # pet profile} other {Up to # pet profiles}} |

A check icon per row (decorative). `{limit}` is `pets.free_limit` (now 2), as in P8. This list comes before the Premium list on every layout, also on the phone (R-026.1).

# 3. What Premium adds

| Key | SL | EN |
|---|---|---|
| premium.adds_title | Kaj doda Premium Zaščita | What Premium Protect adds |
| premium.perk_pets | Neomejeno profilov živali | Unlimited pet profiles |
| premium.perk_lost_mode | Prijava izgubljene živali iz profila z dvema dotikoma | Report a lost pet from their profile in two taps |
| premium.perk_ai_texts | Besedilo prijave in objave za družbena omrežja, ki ga v slovenščini in angleščini napiše umetna inteligenca | Listing and social post texts written by AI, in Slovenian and English |
| premium.perk_ai_posters | Dodatni oblikovani plakati (osnovni plakat ostane brezplačen) | Extra poster designs (the standard poster stays free) |
| premium.perk_search_plan | Načrt iskanja za vašo žival z zemljevidom gostote opažanj | A search plan for your pet with a sightings heatmap |
| premium.perk_stats | Statistika vaših prijav: ogledi, delitve in poslana opozorila | Statistics for your reports: views, shares and alerts sent |
| premium.perk_translate | Samodejni prevod pogovora med slovenščino in angleščino | Automatic chat translation between Slovenian and English |
| premium.perk_boost | 1 brezplačen povečan doseg na leto | 1 free Boost a year |
| premium.perk_boost_note | Pri mesečni naročnini po tretjem plačanem mesecu. | On the monthly plan, after the third paid month. |
| premium.perk_no_ads | Brez oglasov | No ads |
| premium.perks_fair_use | Pomoč umetne inteligence in prevodi imajo razumne mesečne omejitve. Ko je omejitev dosežena, deluje brezplačna različica. | AI help and translations have fair monthly limits. When a limit is reached, the free version keeps working. |
| premium.no_badge | Premium Zaščita vaši prijavi ne doda oznake in je ne postavi višje. | Premium Protect adds no badge to your report and does not rank it higher. |

- `perk_boost_note` sits under `perk_boost` in smaller text. It follows the default of open question OQ-004 (owner): if the owner chooses "yearly plan only", the note becomes "Samo pri letni naročnini." / "Yearly plan only."
- `no_badge` closes the list: there is no paid trust signal (R-026.5).
- The order matches the brief. Statistics, translation and the heatmap are the 2026-10-19 additions.

# 4. Plans

Yearly first and marked; monthly next to it with an equally clear button (from `md` side by side, below that yearly on top). Neither is pre-selected; each card has its own button.

| Key | SL | EN |
|---|---|---|
| premium.plans_title | Izberite naročnino | Choose your plan |
| premium.yearly_title | Letna naročnina | Yearly |
| premium.yearly_badge | Najboljša vrednost | Best value |
| premium.yearly_price | {price} na leto | {price} a year |
| premium.yearly_per_month | To je {price} na mesec. | That is {price} a month. |
| premium.yearly_saving | {saving} % manj kot pri mesečnem plačevanju | {saving}% less than paying monthly |
| premium.yearly_cta | Naroči za {price} na leto | Subscribe for {price} a year |
| premium.yearly_terms | Cena vključuje DDV. Naročnina se obnovi vsako leto, 7 dni prej vas opomnimo po e-pošti. Prekličete jo lahko kadar koli. | Price includes VAT. Renews every year; we remind you by email 7 days before. Cancel any time. |
| premium.monthly_title | Mesečna naročnina | Monthly |
| premium.monthly_price | {price} na mesec | {price} a month |
| premium.monthly_cta | Naroči za {price} na mesec | Subscribe for {price} a month |
| premium.monthly_terms | Cena vključuje DDV. Naročnina se obnovi vsak mesec. Prekličete jo lahko kadar koli. | Price includes VAT. Renews every month. Cancel any time. |
| premium.test_note | Preskusni način: kartica ne bo bremenjena. | Test mode: your card will not be charged. |

- `yearly_badge` is a pill on the yearly card, text not colour alone.
- `yearly_saving` compares with 12 monthly payments and states two current prices; there is never a "was" price (R-026.1). `{saving}` is a whole number; SL keeps the space before "%", EN does not.
- The price is in the button, so the amount is stated at the moment of choice. `*_terms` sits directly under each button, `test_note` under it while Stripe is in test mode (both cards).

## 4.1 Before checkout †

Under the two buttons, once for both plans, an unticked box that must be ticked before either button continues. Proposal for the wireframe (TASK-54.1): the buttons stay enabled; pressing one with the box empty shows `start_now_required` under the box and moves focus to it.

| Key | SL | EN |
|---|---|---|
| premium.start_now_label | Želim, da Premium Zaščita začne veljati takoj. | I want Premium Protect to start straight away. |
| premium.start_now_help | Od pogodbe lahko odstopite v 14 dneh. Takrat vam vrnemo plačani znesek, zmanjšan sorazmerno s časom, ko je Premium Zaščita že veljala. | You can withdraw within 14 days. We then refund the amount paid, reduced in proportion to the time Premium Protect was already on. |
| premium.start_now_required | Za nadaljevanje potrdite, da naj Premium Zaščita začne veljati takoj. | To continue, confirm that Premium Protect should start straight away. |
| premium.terms_line | Z naročnino se strinjate s <terms>pogoji uporabe</terms>. | By subscribing you agree to the <terms>terms of use</terms>. |

`<terms>` links to `/pogoji-uporabe#s10` (`/en/terms#s10`). The withdrawal wording follows terms chapter 10 and waits for the lawyer (LQ-74).

## 4.2 Signed out

| Key | SL | EN |
|---|---|---|
| premium.gate_title | Za naročnino se vpišite | Sign in to subscribe |
| premium.gate_body | Premium Zaščita velja za vaš račun, zato se najprej vpišite ali ustvarite račun. | Premium Protect belongs to your account, so please sign in or create an account first. |

The plan buttons stay visible; pressing one opens the P16 gate with these strings and returns to this page with the chosen plan.

# 5. Questions

| # | SL question | SL answer | EN question | EN answer |
|---|---|---|---|---|
| 1 | Ali moram plačati, da najdem svojo žival? | Ne. Prijava, ujemanje, opozorila v bližini, pogovor, plakat in deljenje so brezplačni za vse, za vedno. Premium Zaščita doda udobje in dodatno pomoč. | Do I have to pay to find my pet? | No. Reporting, matching, nearby alerts, chat, the poster and sharing are free for everyone, forever. Premium Protect adds convenience and extra help. |
| 2 | Kako prekličem naročnino? | V nastavitvah računa izberite Prekliči naročnino. Premium Zaščita velja do konca plačanega obdobja, potem se ne obnovi več. | How do I cancel? | In your account settings, choose Cancel subscription. Premium Protect stays on until the end of the paid period and then does not renew. |
| 3 | Kaj se zgodi, ko se naročnina konča? | Vse, kar žival pripelje domov, deluje naprej. Dodatni profili živali ostanejo 90 dni na voljo za branje, statistika, prevodi in zemljevid gostote opažanj pa se zaklenejo. Podatki ostanejo shranjeni. | What happens when my subscription ends? | Everything that brings pets home keeps working. Extra pet profiles stay readable for 90 days, and statistics, translations and the sightings heatmap lock. Your data stays saved. |
| 4 | Ali lahko od naročnine odstopim? † | Da, v 14 dneh od sklenitve. Vrnemo vam plačani znesek, zmanjšan sorazmerno s časom, ko je Premium Zaščita že veljala. Pišite nam na info@signapps.si. | Can I withdraw? † | Yes, within 14 days of subscribing. We refund the amount paid, reduced in proportion to the time Premium Protect was already on. Write to info@signapps.si. |
| 5 | Ali bo moja prijava bolj vidna? | Ne. Premium Zaščita prijavi ne doda oznake in je ne postavi višje. Za večji doseg je Povečan doseg, ki ga Premium Zaščita vključuje enkrat na leto. | Will my report be more visible? | No. Premium Protect adds no badge and does not rank your report higher. For more reach there is Boost, which Premium Protect includes once a year. |

Keys `premium.faq_<1-5>_q`, `premium.faq_<1-5>_a`, heading `premium.faq_title` "Pogosta vprašanja" / "Frequently asked questions".

# 6. Active subscription

Shown on the plan page and in account settings (`/racun`, row "Premium Zaščita") when the user has Premium.

| Key | SL | EN |
|---|---|---|
| premium.active_title | Premium Zaščita je vklopljena | Premium Protect is on |
| premium.active_plan | {plan, select, yearly {Letna naročnina} other {Mesečna naročnina}} · obnovi se {date} | {plan, select, yearly {Yearly plan} other {Monthly plan}} · renews on {date} |
| premium.active_ending | {plan, select, yearly {Letna naročnina} other {Mesečna naročnina}} · velja do {date}, ne obnovi se | {plan, select, yearly {Yearly plan} other {Monthly plan}} · on until {date}, does not renew |
| premium.manage | Upravljaj naročnino | Manage subscription |
| premium.switch_yearly | Zamenjaj na letno naročnino | Switch to yearly |
| premium.switch_monthly | Zamenjaj na mesečno naročnino | Switch to monthly |
| premium.cancel | Prekliči naročnino | Cancel subscription |
| premium.resume | Nadaljuj naročnino | Keep my subscription |
| premium.success_title | Premium Zaščita je vklopljena | Premium Protect is on |
| premium.success_body | Hvala. Potrdilo smo vam poslali po e-pošti. Naročnino upravljate v nastavitvah računa. | Thank you. We have emailed you a receipt. You manage the subscription in your account settings. |

- `{date}` is a long date ("19. oktober 2027" / "19 October 2027").
- `manage` opens the Stripe customer portal (card, invoices). `cancel` is as easy to reach as the plan buttons: a visible text button next to `manage`, never inside the portal only (TASK-54 AC#6).
- `resume` shows instead of `cancel` while a cancelled subscription is still on (`active_ending`).
- A switch keeps the free Boost rule: at most one in 12 months, never doubled by a switch.
- Return states after checkout (cancelled, failed, pending): `payments.*` (P15 §4), with `payments.cancel_back` going back to this page.

## 6.1 Cancel confirm

| Key | SL | EN |
|---|---|---|
| premium.cancel_title | Prekličete naročnino? | Cancel your subscription? |
| premium.cancel_body | Premium Zaščita bo veljala do {date}, potem se ne obnovi več. Vaši podatki in profili živali ostanejo shranjeni. | Premium Protect stays on until {date} and then does not renew. Your data and pet profiles stay saved. |
| premium.cancel_confirm | Prekliči naročnino | Cancel subscription |
| premium.cancel_keep | Obdrži naročnino | Keep subscription |
| premium.cancelled_toast | Naročnina je preklicana. Premium Zaščita velja do {date}. | Subscription cancelled. Premium Protect stays on until {date}. |

Two equal buttons, no persuasion text, no "are you sure you want to lose …".

# 7. When Premium has ended

| Key | SL | EN |
|---|---|---|
| premium.ended_title | Premium Zaščita ni več vklopljena | Premium Protect has ended |
| premium.ended_body | Vse, kar žival pripelje domov, deluje naprej. Dodatni profili živali so 90 dni na voljo samo za branje. Statistika, prevodi in zemljevid gostote opažanj so zaklenjeni, oglasi pa se znova prikazujejo. Vsi podatki ostanejo shranjeni. | Everything that brings pets home keeps working. Extra pet profiles are read-only for 90 days. Statistics, translations and the sightings heatmap are locked, and ads show again. All your data stays saved. |
| premium.resubscribe | Znova naroči | Subscribe again |

Shown once as a notice in account settings and on the plan page after a lapse (R-026.4). The locked views use their own short lines (P9 §5a `stats.locked_*`, P12 §4a).

# 8. Mobile app

The app has no in-app purchase in this phase: the plan page explains it and opens the web checkout (TASK-54 AC#7, brief R-003).

| Key | SL | EN |
|---|---|---|
| premium.mobile_note | Naročnino zdaj sklenete na spletni strani. Odprli jo bomo v brskalniku, nato se vrnete v aplikacijo. | For now you subscribe on the website. We will open it in your browser, and then you come back to the app. |
| premium.mobile_open_web | Odpri na spletni strani | Open the website |

The app shows §1 to §3 and §5 as on the web; in place of the plan buttons it shows the two plan cards with prices and `mobile_note`, then `mobile_open_web`. The hand-off sheet is `payments.handoff_*` (P15 §3).

# 9. States

| State | Copy |
|---|---|
| Premium not available yet (API 503 before M4) | `payments.premium_unavailable` (P15) |
| Loading prices | `common.loading`; the plan cards show skeletons, never a placeholder price |
| Price load failed | `premium.prices_error` "Cen ta trenutek ne moremo prikazati. Poskusite znova pozneje." / "We cannot show the prices right now. Please try again later." with `common.try_again` |
| Network error at checkout | `errors.NETWORK` (P1) |

# 10. Email: yearly renewal reminder

Template `premium_renewal_reminder`: `docs/content/notifications-and-emails.md` §2.13.

# 11. SEO

| Field | SL | EN |
|---|---|---|
| Meta title | Premium Zaščita: več pomoči pri iskanju · Najdimo | Premium Protect: more help when searching · Najdimo |
| Meta description | Vse, kar žival pripelje domov, je brezplačno. Premium Zaščita doda neomejeno profilov, pomoč umetne inteligence, statistiko prijav in prevod pogovora. | Everything that brings pets home is free. Premium Protect adds unlimited pet profiles, AI help, report statistics and chat translation. |
| Focus keyword | Premium Zaščita | Premium Protect |
| Slug | `/premium` (proposed, see CHANGE) | `/en/premium` |
| Structured data | `WebPage` + `BreadcrumbList`. No `Product` or `Offer` markup while prices are test-mode placeholders. | same |

Indexable once Premium is live (M4); `noindex` until then.

# 12. Alt text

| Image | SL | EN |
|---|---|---|
| Check and plus icons in §2 and §3 | `alt=""`, decorative (the text says it) | |
| Hero photo, if the wireframe adds one | Licensed photo of a pet at home; alt describes it, never a real lost animal | |

# 13. CHANGE requests

- `CHANGE docs/03-design-specification.md§Page inventory: add P24 Premium plan page (TASK-54, wireframe TASK-54.1), copy slice docs/content/pages/P24-premium-plan.md.`
- `CHANGE docs/tech/contracts/C15-routes-deeplinks.md§Web routes: add premium /premium, /en/premium (plan page, P24).`
- `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: add premium_renewal_reminder (email only, transactional) with { renews_at, amount_cents, is_test }, sent 7 days before a yearly renewal.`

# Open points

1. OQ-004 (owner): the free Boost on the monthly plan; `perk_boost_note` follows the default.
2. Legal (LQ-41, LQ-74): the withdrawal wording in §4.1 and FAQ 4, and whether withdrawal needs an online button.
3. The wireframe (TASK-54.1) may reorder §2 to §4 within the rules; the keys stay.

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-10-19 | CH-639: first version (PRD v0.11 R-026.1/.2, owner prices 29,99 € a year shown first, 3,99 € a month): free list first, perks, yearly-first plans with saving, VAT, renewal, cancel and test-mode lines at each button, express-consent box, signed-out gate, questions, active, cancel, ended and mobile states, SEO. |
