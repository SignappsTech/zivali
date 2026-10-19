---
source: 03§P15; docs/design/pages/P15-support-moments.md; 02§FR-021, FR-020
page: P15 Support moments (tip, contribution, checkout hand-off)
stories: TASK-33, TASK-32 (FR-021, FR-020)
copy-for: docs/design/pages/P15-support-moments.md
version: 0.5
status: Draft, native Slovenian review and client approval pending (wording depends on Q-008)
date: 2026-10-19
---

# P15 Support moments: copy

Namespaces `support` and `payments`. Mission first: the animal is home or the search is live before we mention money, and the ask is one quiet, optional sentence. Words: "prispevek", "podpora", "prispevek v zahvalo". Never "donacija", "dobrodelno" or "napitnina" (Q-008). No guilt, no counters, no pre-selected amount, Skip as visible as Pay. Anonymous finders never see these blocks.

# 1. Thank-you contribution (on the reunited screen, P14)

| Key | SL | EN |
|---|---|---|
| support.tip_title | Pomagajte, da Najdimo ostane brezplačno | Help keep Najdimo free |
| support.tip_body | Iskanje je brezplačno za vse in tako bo ostalo. Če želite, lahko s prispevkom v zahvalo pomagate pokriti strežnike, zemljevide in pošiljanje opozoril. | Searching is free for everyone and will stay that way. If you like, a thank-you contribution helps cover servers, maps and sending alerts. |
| support.amount_group | Znesek prispevka | Contribution amount |
| support.amount_3 | 3 € | €3 |
| support.amount_5 | 5 € | €5 |
| support.amount_10 | 10 € | €10 |
| support.amount_other | Drug znesek | Other amount |
| support.amount_other_label | Drug znesek v evrih (najmanj 2 €) | Other amount in euros (at least €2) |
| support.amount_min_error | Najmanjši znesek je 2 €. | The minimum amount is €2. |
| support.amount_max_error | Največji znesek je 500 €. | The maximum amount is €500. |
| support.pay | Plačaj {amount} | Pay {amount} |
| support.pay_disabled | Plačaj | Pay |
| support.pay_disabled_help | Najprej izberite znesek. | Choose an amount first. |
| support.skip | Preskoči | Skip |
| support.where_money_goes | Kam gre denar | Where the money goes |
| support.test_note | Testno plačilo: s kartice se ne bremeni denar. | Test payment: no money is taken from your card. |
| support.not_donation_note | Prispevek je prostovoljno plačilo za delovanje storitve in ne vpliva na nobeno funkcijo. | A contribution is a voluntary payment towards running the service and does not change any feature. |

Profile card (C13 `support`, mobile and web Profile), drafted by TASK-33.3 and adopted here:

| Key | SL | EN |
|---|---|---|
| support.card_title | Pomagajte nam izboljšati Najdimo | Help us improve Najdimo |
| support.card_body | Iskanje je brezplačno za vse in tako bo ostalo. Če želite, lahko s prispevkom pomagate pokriti strežnike, zemljevide in pošiljanje opozoril. | Searching is free for everyone and will stay that way. If you like, a contribution helps cover servers, maps and sending alerts. |

`{amount}` from `formatEur` ("5,00 €" / "€5.00"; whole amounts may drop the decimals in the button). Upper bound 500 € from C13 (`tip` 200 to 50 000 cents). `support.where_money_goes` is hidden until the transparency page exists (M4). `support.test_note` shows outside production only.

# 2. Contribution at the lost-report confirmation (P6)

| Key | SL | EN |
|---|---|---|
| support.contribution_row | Pomagajte ohraniti Najdimo brezplačno | Help keep Najdimo free |
| support.contribution_body | Prijava, opozorila in iskanje ujemanj so brezplačni in takšni bodo ostali. Če želite, lahko z majhnim prispevkom pomagate pokriti stroške. | Reporting, alerts and matching are free and will stay that way. If you like, a small contribution helps cover the costs. |
| support.contribution_2 | 2 € | €2 |
| support.contribution_3 | 3 € | €3 |
| support.contribution_5 | 5 € | €5 |
| support.contribution_pay | Prispevaj {amount} | Contribute {amount} |
| support.contribution_hide | Skrij | Hide |
| support.contribution_expand_a11y | Pokaži možnost prispevka | Show the contribution option |
| support.contribution_pay_disabled | Prispevaj | Contribute |
| support.amount_suggested_a11y | predlagano | suggested |
| support.supporter_monthly_label | Podpiram mesečno | I support monthly |
| support.pay_monthly | Plačaj {amount} na mesec | Pay {amount} per month |

`support.contribution_pay` uses the accusative with no preposition, so it reads correctly for any amount ("Prispevaj 3 €").

`support.contribution_pay_disabled` is the label while no amount is chosen (the button stays visible but inactive; `support.pay_disabled_help` explains). `support.amount_suggested_a11y` is read after the amount by screen readers on the suggested chip only ("5 €, predlagano"); it is not shown. `support.supporter_monthly_label` is an unticked option; `support.pay_monthly` replaces the pay button label when it is ticked. A monthly contribution can be cancelled at any time (cancel flow copy is outside this slice). CH-53 supersedes CH-47.

Hiding or ignoring the row records the skip; the row is not shown again for that report.

# 3. Checkout hand-off (mobile)

| Key | SL | EN |
|---|---|---|
| payments.handoff_title | Plačali boste v brskalniku | You will pay in your browser |
| payments.handoff_body | Odprli bomo varno plačilno stran Stripe. Ko končate, se vrnete v aplikacijo. | We will open Stripe's secure payment page. When you are done, you will come back to the app. |
| payments.handoff_continue | Nadaljuj | Continue |
| payments.handoff_cancel | Prekliči | Cancel |

# 4. Return states

| Key | SL | EN |
|---|---|---|
| payments.success_title | Hvala za vaš prispevek | Thank you for your contribution |
| payments.success_body | Potrdilo o plačilu smo vam poslali po e-pošti. | We have emailed you a receipt. |
| payments.success_back | Nazaj na prijavo | Back to my report |
| payments.cancel_title | Plačilo je preklicano | Payment cancelled |
| payments.cancel_body | Nič ni bilo zaračunano. | Nothing was charged. |
| payments.cancel_back | Nazaj | Back |
| payments.cancel_retry | Poskusi znova | Try again |
| payments.failed_title | Plačilo ni uspelo | The payment did not go through |
| payments.failed_body | Banka plačila ni odobrila. Nič ni bilo zaračunano. | Your bank did not approve the payment. Nothing was charged. |
| payments.failed_retry | Poskusi z drugo kartico | Try another card |
| payments.failed_skip | Preskoči | Skip |
| payments.pending_title | Potrjujemo plačilo … | Confirming your payment … |
| payments.pending_body | To lahko traja nekaj trenutkov. Stran se bo osvežila sama. | This can take a moment. The page will refresh by itself. |
| payments.pending_back | Nazaj | Back |
| payments.pending_slow | Potrditev še traja. Ko bo plačilo končano, ga najdete med svojimi plačili. | Still processing. You can check the payment under My payments once it is done. |
| payments.pending_payments | Moja plačila | My payments |

`pending_slow` replaces `pending_body` when the confirmation takes longer than the page waits; `pending_payments` is the link to `/racun/placila` next to it. The SL draft in the catalogue used tikanje ("lahko preveriš"); fixed to vikanje.

# 5. My payments (Profile, `/racun/placila`)

| Key | SL | EN |
|---|---|---|
| payments.list_title | Plačila | Payments |
| payments.row | {date} · {purpose} · {amount} | {date} · {purpose} · {amount} |
| payments.purpose_tip | Prispevek v zahvalo | Thank-you contribution |
| payments.purpose_report_contribution | Prispevek ob prijavi | Contribution when reporting |
| payments.purpose_support | Podpora za Najdimo | Support for Najdimo |
| payments.status_paid | Plačano | Paid |
| payments.status_refunded | Vrnjeno | Refunded |
| payments.refunded_partial | Delno vrnjeno: {amount} | Partly refunded: {amount} |
| payments.status_failed | Neuspešno | Failed |
| payments.receipt | Potrdilo | Receipt |
| payments.test_label | Testno | Test |
| payments.empty | Plačil še ni. | No payments yet. |

`payments.refunded_partial` shows next to "Plačano" (`status_paid`) on a partly refunded payment (CH-371). `payments.purpose_support` is the row label for purpose `support` (the profile card) and the same text as the API Checkout product name (CH-254, CH-264). Two drafts existed, "Podpora za Najdimo" and "Prispevek za Najdimo". The first is kept: it matches the glossary concept "podpora" (§6) and the Checkout product name, and "prispevek" stays for the two per-report purposes above.

# 6. States

| Key | SL | EN |
|---|---|---|
| support.gate_title | Za prispevek se vpišite | Sign in to contribute |
| support.gate_body | Za prispevek potrebujete račun, da vam lahko pošljemo potrdilo. | You need an account to contribute, so we can send you a receipt. |
| support.unverified | Potrdilo bomo poslali, ko potrdite svoj e-naslov. | We will send the receipt once you confirm your email address. |
| support.already_paid | Hvala, za to prijavo ste že prispevali. | Thank you, you have already contributed for this report. |

Network errors: `errors.NETWORK` (already in packages/i18n: "Povezava se je prekinila. Preverite internet in poskusite znova." / "The connection dropped. Check your internet and try again."; no new key); minimum amount from the API: `errors.MIN_AMOUNT` (P1).

# 7. SEO and alt text

SEO: N/A (in-app, `noindex`). Alt text: none (icons only, decorative).

# Change log

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-10-15 | CH-53 (supersedes CH-47): added support.contribution_pay_disabled, support.gate_title, support.supporter_monthly_label, support.pay_monthly, support.amount_suggested_a11y; errors.NETWORK confirmed. |
| 0.3 | 2026-10-18 | CH-254, CH-264: `payments.purpose_support` added (§5). |
| 0.5 | 2026-10-19 | `payments.pending_slow` (vikanje fix, catalogue updated) and `payments.pending_payments` added to §4. `support.gate_title` uses "vpišite" (glossary §5: sign-in is "vpis", never "prijava"). |
| 0.4 | 2026-10-18 | CH-371: `payments.refunded_partial` (§5). CH-376: Profile card `support.card_title`, `support.card_body` (§1). |
