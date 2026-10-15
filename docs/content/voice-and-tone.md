---
source: 02§Content, SEO and legal requirements; 03§Content strategy; 03§Brand and visual language
doc: voice-and-tone
title: Voice and tone guide (SL source, EN second)
version: 0.2
status: Approved (client, 2026-10-15)
date: 2026-10-15
owner: Content Strategist
story: TASK-2
---

# Najdimo voice and tone

Every string in the product (web, mobile, notifications, emails, posters, legal pages) follows this guide. Terms come from `docs/content/glossary.md`. Slovenian is the source language. English is written from the Slovenian, not the other way round.

The product name is **Najdimo** (working name, Q-001). Tagline: **Spet doma.** / **Home again.** If the client picks another name, only the name changes; the voice stays.

# 1. Who we are talking to

| Person | State of mind | What they need from the words |
|---|---|---|
| Owner of a lost pet | Panic, guilt, little sleep, phone in one hand | The next step, now. Reassurance that something is happening. No blame. |
| Finder or passer-by | Kind but busy, unsure, no wish to sign up | "This takes a minute. Nobody gets your number. Thank you." |
| Neighbour with alerts on | Willing to help, easily annoyed by noise | Short, relevant alerts. An easy way to turn them down. |
| Shelter, vet, municipality | Overworked, practical, sceptical of new tools | Less work, plain facts, no marketing gloss. |
| Sponsor | Commercial, wants proof | Real numbers, clear formats, honesty about pilot size. |

# 2. Mission first

Our goal is getting animals home. Money only keeps the service running. Everything that helps an animal home is free for everyone, forever: reporting lost, found and sighted animals, the map and alerts, matching, messaging, the poster with its QR code, sharing and chip lookup. Copy never suggests that the free search is not enough (Boost is extra reach on top of an alert radius that already works), and money is never mentioned in a match, an alert or a reunion message. Paid extras (Boost, Premium, Podpornik, Vet Partner, ads) are described as optional, after the help.

# 2a. Voice: a kind neighbour who knows what to do

We sound like a calm, competent neighbour who has helped before. Four traits, always together:

| Trait | We are | We are not |
|---|---|---|
| Calm | Short sentences, one idea each, the next step first | Alarmist: capitals, red banners, exclamation marks, "NUJNO" |
| Warm | Kind, human, thankful | Cute: paw puns, "kuža", "muca", baby talk, emoji |
| Hopeful | Realistic optimism: "Many animals are found close to home." | Promising: "We will find your dog." |
| Trustworthy | Plain facts, honest about limits, privacy said at the moment it matters | Vague, salesy, legalese in the interface |

# 3. Grammar and address (Slovenian)

## 3.1 Vikanje in all running text

We address users with the formal **vi** (vikanje) everywhere: headings, body, questions, errors, notifications, emails. Reasons: many users are older than 40, the topic is serious (safety, money, personal data), and the formal plural participle is the accepted polite form for everyone, which keeps copy gender-neutral without workarounds.

- Write "Ste našli žival?", "Prijavili ste izgubljeno žival." The standard polite form uses the plural participle for every reader.
- Never use polvikanje ("ste našla", "ste bil").
- "vi", "vaš", "vam" in lowercase. Capitalised "Vi" only in personal letters, never in the interface or emails.

## 3.2 Buttons and commands: short imperative

Buttons, menu items and links that act use the short imperative (Slovenian UI convention): **Prijavi, Shrani, Pošlji, Nadaljuj, Deli, Prekliči, Zapri.** They read as commands to the app, not as tikanje. Keep them to one to three words, verb first.

| Do | Do not |
|---|---|
| Objavi iskanje | Objavite iskanje (too long for a button) |
| Pošlji prijavo | Klikni tukaj |
| Nadaljuj | OK |

Links inside sentences describe the destination: "Preberite nasvete za varnost", not "tukaj".

## 3.3 Gender-neutral copy

- Address the reader with vikanje (3.1); describe the animal with "žival" (feminine), which keeps adjectives stable: "izgubljena žival", "najdena žival".
- Avoid role nouns about the reader in the interface. Instead of "Lastnik bo obveščen" write "Obvestili bomo osebo, ki žival išče" or rephrase around the animal: "Lunino iskanje je objavljeno".
- Where a short role label is unavoidable (chat alias, legal defined terms, admin tables), we use the generic forms from the glossary ("lastnik", "najditelj"). Legal texts add the standard clause that grammatical masculine forms apply to all genders. This is an open point for native review (see glossary §Open points).
- Plural role nouns for groups of third parties are fine in B2B, SEO and legal copy ("dosezite lastnike psov in mačk", "zavetišča najdejo lastnike"); the rule above is about addressing or describing the individual reader.
- Never write "on/ona" about users. About animals, follow the pet's sex when known ("Luna je spet doma."), otherwise talk about "žival".

## 3.4 Numbers, counters and the dual

Slovenian has four plural forms. Every string with a number uses ICU plural with `one`, `two`, `few`, `other`, and the whole phrase goes inside the plural, because verbs and cases change too.

| n | Rule | Example (žival, verb agrees) |
|---|---|---|
| 1, 101, 201 | one | 1 žival je spet doma |
| 2, 102 | two | 2 živali sta spet doma |
| 3, 4, 103, 104 | few | 3 živali so spet doma |
| 0, 5 to 100, 105 … | other | 5 živali je spet doma |

Case matters too: "Prikaži 1 prijavo / 2 prijavi / 3 prijave / 5 prijav" (accusative). The glossary lists the four forms for every counted noun.

## 3.4a Names are never declined

Pet names, area names and people's display names are inserted by software, which cannot decline them. Put them only where the nominative is correct: at the start of a sentence as the subject ("Luna je spet doma."), after a colon or middle dot ("Možno ujemanje · Luna", "Območje: Šiška"), or in apposition after a noun ("žival z imenom Luna", "v okolici kraja Šiška"). Never write templates like "Morda smo našli {name}" (needs the accusative "Luno") or "Novo sporočilo o {name}" (needs the locative "Luni"). The examples in §4 and §5 that show declined names illustrate tone only; the final strings are in the content slices and in `docs/content/notifications-and-emails.md`.

## 3.5 Formatting

| Item | Slovenian | English |
|---|---|---|
| Money | `5 €` in copy for whole amounts, `5,50 €` with cents; from `formatEur` in data | `€5`, `€5.50` |
| Dates | from `formatDate`: `14. 10. 2026`; in copy "14. oktobra" | `14 October 2026` |
| Times | from `formatDate` (do not hard-code); in long copy "ob 18.30" | `6.30 pm` in long copy, data from `formatDate` |
| Units | `500 m`, `5 km` with a non-breaking space | same |
| Quotes | „…“ | “…” |
| Dash | spaced en dash: "Najdimo – spet doma" | spaced en dash |
| Ellipsis | one character … | … |
| Chip numbers | grouped `705 1234 5678 9012`, tabular figures | same |
| Days, months | lowercase: "v ponedeljek", "oktober" | capitalised |

Headings use sentence case in both languages. No full stop after headings and button labels; full stop after sentences in notes, toasts and body.

# 4. Tone by moment

The voice stays the same; the tone changes with the user's state.

| Moment | Tone | Example SL | Example EN |
|---|---|---|---|
| Reporting a lost pet | Steady, directive, short | Kje ste žival nazadnje videli? | Where did you last see your pet? |
| Confirmation of a lost report | Reassuring, concrete next steps | Iskanje je objavljeno. Ljudem v bližini že pošiljamo opozorilo. | Your search is live. We are already alerting people nearby. |
| Finder flow | Light, grateful, fast | Hvala, da pomagate. Vzelo vam bo le minuto. | Thanks for helping. This takes a minute. |
| Possible match | Honest, careful, no hype | Morda smo našli Luno. Poglejte fotografije in presodite sami. | We may have found Luna. Look at the photos and decide. |
| Chip match | Clear, calm, urgent without alarm | Najdena žival ima enako številko čipa kot Luna. Odprite ujemanje. | The chip number matches Luna's. Open the match. |
| Reunited | Quiet joy, gratitude, short | Luna je spet doma. Veselimo se z vami. | Luna is home again. We are so glad. |
| Asking for support | Gentle, optional, no guilt | Če želite, lahko s prispevkom pomagate, da Najdimo ostane brezplačno za vse. | If you like, a small contribution helps keep Najdimo free for everyone. |
| Errors | Calm, blameless, what to do next | Povezava se je prekinila. Osnutek je shranjen, poskusite znova. | The connection dropped. Your draft is saved. Please try again. |
| Scam warnings | Matter-of-fact, specific, not scary | Nikoli ne plačajte vnaprej. Kdor je žival res našel, denarja vnaprej ne zahteva. | Never pay in advance. A genuine finder does not ask for money. |
| Shelters and sponsors | Practical, factual, respectful of time | Najdene živali objavite v nekaj minutah, brez dvojnega vnosa. | Publish intake animals in minutes, with no double entry. |
| Legal | Plain language first, precise second | Vaše točne lokacije ne prikažemo nikomur. | We never show your exact location to anyone. |

# 5. Do and do not, by element

## 5.1 Headings

| Do (SL) | Do (EN) | Do not | Why |
|---|---|---|---|
| Katero žival iščete? | Which pet are you looking for? | IZGUBLJENA ŽIVAL!!! | No capitals, no exclamation marks |
| Kje ste žival nazadnje videli? | Where did you last see your pet? | Lokacija | A question tells people what to do |
| Luna je spet doma | Luna is home again | Juhuuu, uspelo nam je! 🎉 | No emoji, no hype; the joy is theirs, not ours |
| Kaj se zgodi zdaj | What happens next | Naslednji koraki procesa | Human, not process language |

## 5.2 Body copy

- One idea per sentence; at most 20 words per sentence in flows, 25 in articles.
- Put the action or the answer first, the reason second: "Vaša telefonska številka ostane skrita. Pišete si v aplikaciji."
- Say what will happen and when only if we can keep the promise ("V nekaj minutah", not "takoj" unless it is instant).
- Use "mi" for the service ("obvestili bomo"). Never "sistem", "platforma", "algoritem".

## 5.3 Buttons

| Do | Do not |
|---|---|
| Prijavi izgubljeno žival | Začni postopek |
| To je moja žival | Potrdi ujemanje #1 |
| Ni moja žival | Zavrni |
| Preskoči | Ne, hvala, ne želim pomagati |

The "no" option is always neutral. We never shame a choice ("Ne, ne maram živali").

## 5.4 Errors

Structure: what happened (no blame) + what is safe + what to do. No error codes, no "Napaka 500", no "neveljaven vnos".

| Do (SL) | Do (EN) | Do not |
|---|---|---|
| Fotografija se ni naložila. Preverite povezavo in poskusite znova. | The photo did not upload. Check your connection and try again. | Napaka pri nalaganju (code 413). |
| Številka čipa je običajno dolga 15 števk. Shranili jo bomo, a preverite jo, ko boste lahko. | Chip numbers usually have 15 digits. We will save it, but please check it when you can. | Neveljavna številka čipa. |
| V kratkem času ste oddali več prijav, zato smo jih začasno omejili. Poskusite znova čez 20 minut. | You have sent several reports in a short time, so we have paused new ones for a moment. Please try again in 20 minutes. | Preveč zahtev. Dostop zavrnjen. |

## 5.5 Notifications (push, in-app, email)

- Title: the fact, with the pet name when we have it, up to 45 characters. Body: one sentence, up to 100 characters, with the next action.
- Never put personal data in push text (no chip number, exact address, phone, email, message body).
- Respect the moment: nearby alerts are information, not alarms.

| Do (SL) | Do (EN) | Do not |
|---|---|---|
| Morda smo našli Luno · Najdena mačka 1–3 km stran. Poglejte, ali je to ona. | We may have found Luna · A cat found 1–3 km away. See if it is her. | NAŠLI SMO VAŠO MAČKO!!! |
| Izgubljen pes v vaši bližini · Bežigrad, pred 20 minutami. Ste ga morda videli? | Lost dog near you · Bežigrad, 20 minutes ago. Have you seen it? | Pomagajte takoj! Pes je v smrtni nevarnosti! |
| Novo sporočilo o Luni | New message about Luna | Janez: "Pokličite me na 041 …" |

## 5.6 Scam and safety warnings

Short, specific, and repeated at the right moments (chat banner, detail page, poster, safety page). We warn about behaviour, never about groups of people.

| Do (SL) | Do (EN) | Do not |
|---|---|---|
| Nikoli ne pošiljajte denarja vnaprej. | Never send money in advance. | Pazite, na spletu je veliko prevarantov! |
| Žival prevzemite na javnem kraju, podnevi in v spremstvu. | Collect the animal in a public place, in daylight, with someone you trust. | Ne zaupajte nikomur. |
| Kode, ki jo prejmete po SMS, ne povejte nikomur. | Never share a code you receive by text message. | (silence) |

## 5.7 Asking for money (support, contributions, ads)

- Words: "podpora", "prispevek", "prispevek v zahvalo". Never "donacija", "dobrodelni prispevek" or "napitnina" unless a qualifying non-profit operates the service (Q-008).
- Always optional, never pre-selected, "Preskoči" as visible as "Plačaj", never inside the report-lost or report-found flow, never repeated after a skip.
- No guilt, no pressure, no counters, no "samo še danes", no "99 % ljudi ne pomaga".
- Say what the money does in one honest sentence: "Prispevki pokrivajo strežnike, zemljevide in pošiljanje opozoril."
- Ads are always labelled "Oglas" / "Ad".

## 5.8 Privacy at the moment it matters

Say it where the worry appears, in one sentence, with the shield icon:

- On a location step: "Javno prikažemo le približno območje."
- On contact: "Vaša telefonska številka ostane skrita."
- In the finder flow: "Ne sprašujemo, kje je žival zdaj."

# 6. Words we avoid

| Avoid | Use instead | Why |
|---|---|---|
| kuža, muca, ljubljenček (in labels) | pes, mačka, žival | Calm and neutral; "ljubljenček" is fine in warm marketing copy only |
| uporabnik (to the reader) | vi | Personal |
| sistem, algoritem, platforma | mi, Najdimo | Human |
| donacija, dobrodelnost | podpora, prispevek | Legal entity not confirmed (Q-008) |
| zagotovo, garantirano, takoj (unless true) | običajno, v nekaj minutah | No promises we cannot keep |
| prevarant (in UI) | "kdor zahteva denar vnaprej" | Describe behaviour |
| Prijava (for sign-in) | Vpis | "Prijava" is our report (see glossary) |
| klikni, tapni | odprite, izberite | Works on every device |
| žal (more than once per screen) | — | One apology is enough |

# 7. English

English is a translation for residents and visitors who do not read Slovenian. Same voice, plain British-leaning English (colour, organisation), contractions allowed in UI ("we'll", "it's"), never in legal text. "Pet" for an owner's animal, "animal" for found and sighted ones. Status labels: Lost, Found, Sighted, Home again.

# 8. Checklist for every string

- [ ] Uses the glossary term (no synonyms for core terms).
- [ ] Vikanje in sentences, short imperative in buttons.
- [ ] Gender-neutral; no polvikanje.
- [ ] Numbers use ICU plural with one, two, few, other (SL) and one, other (EN).
- [ ] No exclamation marks, no capitals for emphasis, no emoji.
- [ ] No promise we cannot keep; no guilt.
- [ ] No personal data in push, analytics or public text.
- [ ] Fits the space at 200 % text (Slovenian runs 15 to 20 % longer than English).
- [ ] č, š, ž correct (never c, s, z substitutes); „…“ quotes.

# Change log

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-10-15 | Brief v0.7: mission-first principle (§2). |
| 0.3 | 2026-10-15 | CH-91: chip example fixed to 15 digits. |
| 0.1 | 2026-10-14 | First draft: voice, address form (vikanje, imperative buttons), gender-neutral rules, plural rules, tone by moment, do and do not for headings, errors, notifications and scam warnings. |
