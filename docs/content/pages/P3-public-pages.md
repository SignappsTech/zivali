---
source: 03§P3; docs/design/pages/P3-public-pages.md; 02§FR-035, §Content, SEO and legal requirements
page: P3 Public pages (home and content templates)
stories: TASK-27, TASK-72 (FR-035)
copy-for: docs/design/pages/P3-public-pages.md
version: 0.2
status: Draft, native Slovenian review and client approval pending (TASK-27 AC#4)
date: 2026-10-15
---

# P3 Public pages: copy

Final copy for Home (T1), How it works, Safety tips, For shelters and About (T2 Article), FAQ (T3) and the legal template strings (T4). Legal body texts are in `docs/content/legal/`. Keys live in the `pages` namespace (C16); long article bodies may be MDX files rendered from this slice. Lines marked **[legal review]** contain claims that need client and legal review before launch (Q-006).

Contact markers in the form `[naročnik: …]` / `[client: …]` are facts only the client can supply (email addresses). Everything else is final.

Public pages carry no ad slot.

---

# T1 Home (`/`, `/en`)

## 1. Hero

| Key | SL | EN |
|---|---|---|
| pages.home.hero_title | Izgubljena žival? Skupaj jo pripeljemo domov. | Lost pet? Let's bring them home together. |
| pages.home.hero_lede | Prijavite izgubljeno ali najdeno žival. Mi poiščemo možna ujemanja in obvestimo ljudi v bližini. Brezplačno. | Report a lost or found pet. We look for possible matches and alert people nearby. For free. |
| pages.home.hero_primary | Prijavi izgubljeno žival | Report a lost pet |
| pages.home.hero_secondary | Prijavi najdeno žival | Report a found animal |

Hero lede: 15 words (SL), within the 20-word limit. Headline wraps to two lines at 60 px.

## 2. Near you

| Key | SL | EN |
|---|---|---|
| pages.home.near_title | V vaši bližini | Near you |
| pages.home.near_title_no_location | Nedavne prijave | Recent reports |
| pages.home.near_open_map | Odpri zemljevid | Open the map |
| pages.home.near_empty_title | V bližini ni odprtih prijav | No open reports near you |
| pages.home.near_empty_body | To je dobra novica. Vklopite opozorila in obvestili vas bomo, če bo kdo v bližini pogrešal žival. | That is good news. Turn on alerts and we will let you know if someone nearby is missing a pet. |
| pages.home.near_empty_action | Vklopi opozorila | Turn on alerts |

Tiles use the row strings from P4 (status word, relative time, distance band).

## 3. How it works

| Key | SL | EN |
|---|---|---|
| pages.home.how_title | Kako deluje | How it works |
| pages.home.how_1_title | Prijavite | Report |
| pages.home.how_1_body | Prijava izgubljene živali vzame nekaj minut, najdene pa manj kot minuto in brez računa. | Reporting a lost pet takes a few minutes. A found animal takes under a minute, with no account. |
| pages.home.how_2_title | Poiščemo ujemanja | We look for matches |
| pages.home.how_2_body | Primerjamo številko čipa, območje, čas in opis ter vam sporočimo, ko najdemo možno ujemanje. | We compare chip numbers, areas, times and descriptions, and tell you when we find a possible match. |
| pages.home.how_3_title | Pogovorite se varno | Talk safely |
| pages.home.how_3_body | Pišete si v aplikaciji. Telefonska številka in točen naslov ostaneta skrita. | You message each other in the app. Phone numbers and exact addresses stay hidden. |
| pages.home.how_more | Več o tem, kako deluje | More about how it works |

## 4. Safe by design

| Key | SL | EN |
|---|---|---|
| pages.home.safe_title | Zasnovano za vašo varnost | Designed for your safety |
| pages.home.safe_body | Ko se žival izgubi, se žal oglasijo tudi tisti, ki želijo izkoristiti stisko. Zato vaši podatki ostanejo pri vas. | When a pet goes missing, some people try to take advantage. That is why your details stay with you. |
| pages.home.safe_1 | Telefonska številka ni nikoli javna. | Your phone number is never public. |
| pages.home.safe_2 | Javno prikažemo le približno območje, nikoli naslova. | We only show an approximate area, never an address. |
| pages.home.safe_3 | Pogovor poteka v aplikaciji, z jasnim opozorilom pred prevarami. | Conversations happen in the app, with a clear warning about scams. |
| pages.home.safe_action | Preberite nasvete za varnost | Read the safety tips |

## 5. For shelters and vets

| Key | SL | EN |
|---|---|---|
| pages.home.shelters_title | Za zavetišča, veterinarje in občine | For shelters, vets and municipalities |
| pages.home.shelters_body | Najdene živali objavite hitro, mi pa jih primerjamo z vsemi prijavami izgubljenih živali. Za zavetišča in občine je vse brezplačno, za vedno. | Publish found animals quickly and we compare them with every lost-pet report. For shelters and municipalities everything is free, forever. |
| pages.home.shelters_action | Več za zavetišča | More for shelters |

## 6. Keep it free (hidden until M4, flag `transparency_page`)

| Key | SL | EN |
|---|---|---|
| pages.home.free_body | Naš cilj je, da se živali vrnejo domov, zato je vse, kar k temu pripomore, brezplačno za vse in za vedno. Delovanje pokrivajo označeni oglasi lokalnih partnerjev in prostovoljni prispevki. | Our goal is getting animals home, so everything that helps is free for everyone, forever. Clearly labelled ads from local partners and voluntary contributions keep the service running. |
| pages.home.free_link | Kam gre denar | Where the money goes |

## Home SEO

| Field | SL | EN |
|---|---|---|
| Meta title | Izgubljene živali v Sloveniji: psi in mačke · Najdimo | Lost and found pets in Slovenia · Najdimo |
| Meta description | Ste izgubili ali našli psa ali mačko? Prijavite brezplačno. Najdimo poišče ujemanja po čipu in opisu ter obvesti ljudi v bližini. | Lost or found a dog or cat? Report it for free. Najdimo looks for matches by chip and description and alerts people nearby. |
| Focus keyword | izgubljene živali (also: izgubljen pes, pogrešana mačka) | lost pets Slovenia |
| Slug | `/` | `/en` |
| Structured data | `Organization` + `WebSite` | same, `inLanguage: en` |
| OG image | `og-home.png` 1200 by 630 (image task), alt below | |

Organization JSON-LD values: `name` "Najdimo", `url` site root, `logo` the app icon PNG, `description` = SL meta description, `parentOrganization` `{ "@type": "Organization", "name": "Signapps" }`, `areaServed` "SI". `WebSite`: `name` "Najdimo", `inLanguage` "sl" (EN page "en"); no `SearchAction` (there is no site search).

## Home alt text

| Image | SL alt | EN alt |
|---|---|---|
| Hero photo (placeholder `docs/design/directions/img/dog-aussie-wide.jpg` until licensed final photo) | Pes rjave in bele barve z dolgo dlako in privzdignjenim ušesom | A brown and white long-haired dog with one ear raised |
| How-it-works photo (placeholder `docs/design/directions/img/cat-tabby.jpg`) | Tigrasta mačka z modro ovratnico in obeskom sedi na stopnicah | A tabby cat with a blue collar and tag sitting on stairs |
| Empty-state illustration (`assets/empty-no-reports.png`) | (empty alt, decorative) | (empty alt) |
| OG image | Najdimo – izgubljene in najdene živali v Sloveniji | Najdimo – lost and found pets in Slovenia |

Pet tiles: alt from the rule in P9 §Alt text. Final photos must be licensed and must not show a real lost animal as decoration.

---

# T2 How it works (`/kako-deluje`, `/en/how-it-works`)

## SL

**h1** Kako deluje Najdimo

**Lede** Najdimo poveže ljudi, ki pogrešajo žival, s tistimi, ki so jo našli ali videli. Ujemanja iščemo mi, odločitve pa so vaše.

### Če ste izgubili žival

1. Prijavite izgubljeno žival: dodajte fotografijo, opis ter kraj in čas, ko ste jo nazadnje videli.
2. Iskanje objavimo v nekaj minutah. Ljudje v bližini, ki imajo vklopljena opozorila, prejmejo obvestilo.
3. Ko kdo prijavi najdeno ali opaženo žival, ki je podobna vaši, vam sporočimo možno ujemanje.
4. Prenesite plakat s QR kodo ter ga delite s sosedi in v lokalnih skupinah na družbenih omrežjih.

Za prijavo izgubljene živali potrebujete račun. Tako vas lahko obvestimo o ujemanjih, ljudje pa vam lahko pišejo, ne da bi videli vašo telefonsko številko. Vse, kar vnesete pred vpisom, se ohrani.

Nasvet: profil živali s fotografijami in številko čipa lahko shranite že vnaprej. Če se žival kdaj izgubi, je prijava oddana v nekaj sekundah.

### Če ste našli ali videli žival

Prijava vzame manj kot minuto in ne potrebuje računa: fotografija, kraj in odgovor na vprašanje, ali je žival pri vas ali ste jo samo videli. Na koncu dobite zasebno povezavo, s katero prijavo urejate in se pogovarjate z osebo, ki žival išče.

Ne sprašujemo, kje je žival zdaj, in tega nikoli ne prikažemo.

Če ima žival ovratnico z obeskom ali čip, to zelo pomaga. Čip lahko prebere veterinar ali zavetišče.

### Kako iščemo ujemanja

Vsako novo prijavo primerjamo z odprtimi prijavami na drugi strani: izgubljene živali z najdenimi in opaženimi ter obratno.

- **Številka čipa.** Če se ujema, vas obvestimo takoj, tudi ponoči.
- **Območje.** Kako blizu sta kraja, kjer se je žival izgubila in kjer je bila najdena.
- **Čas.** Ali je bila žival najdena potem, ko se je izgubila.
- **Opis.** Vrsta, velikost, barva in spol.

Kmalu bomo primerjali tudi podobnost fotografij.

Ujemanje je predlog, ne potrditev. Fotografije pogledate sami in se odločite, ali je to vaša žival. Ujemanj, ki jih zavrnete, ne pokažemo več.

### Pogovor in prevzem

Ko potrdite ujemanje ali nekomu pišete pri prijavi, se odpre pogovor v aplikaciji. Telefonskih številk in e-naslovov ne prikažemo.

Prevzem se dogovorite v pogovoru. Dobite se na javnem kraju, podnevi, in nikoli ne plačajte vnaprej. Preberite [nasvete za varnost](/varnost).

### Ko je žival spet doma

Izberite **Žival je spet doma**. Opozorila se ustavijo, prijava pa pokaže, da je žival doma. Tako zemljevid ostane zanesljiv za vse.

Če prijave nekaj časa ne posodobite, vas po 7, 14 in 30 dneh vprašamo, ali še iščete. Prijava izgubljene živali se po 90 dneh brez posodobitve samodejno zaključi, podaljšate pa jo lahko takoj. Prijave najdenih in opaženih živali potečejo po 30 dneh brez posodobitve.

### Opozorila v bližini

Vklopite opozorila za svoje domače območje (privzeto 5 km) in obvestili vas bomo, ko se v bližini izgubi pes ali mačka. Izberete lahko vrsto živali, polmer, največje število opozoril na dan in tihi čas.

### Kaj je brezplačno

Naš cilj je, da se živali vrnejo domov. Zato je vse, kar k temu pripomore, brezplačno za vse in za vedno: prijava izgubljene, najdene ali opažene živali, zemljevid in opozorila, iskanje ujemanj, pogovor, plakat s QR kodo, deljenje in preverjanje čipa. Za zavetišča in občine je brezplačno vse.

Denar potrebujemo le za delovanje: strežnike, zemljevide in pošiljanje opozoril. Pokrivajo ga oglasi lokalnih partnerjev, vedno označeni z besedo **Oglas**, in prostovoljni prispevki. Oglasov nikoli ne prikažemo med prijavo izgubljene ali najdene živali, v pogovoru ali pri plačilu.

**Closing actions** primary "Prijavi izgubljeno žival", text button "Prijavi najdeno žival".

## EN

**h1** How Najdimo works

**Lede** Najdimo connects people who are missing a pet with people who have found or seen one. We look for matches; the decisions are yours.

### If you have lost your pet

1. Report your lost pet: add a photo, a description, and where and when you last saw them.
2. We publish your search within minutes. People nearby who have alerts turned on get a notification.
3. When someone reports a found or sighted animal that looks like yours, we tell you about the possible match.
4. Download a poster with a QR code and share it with neighbours and in local social media groups.

You need an account to report a lost pet. That way we can tell you about matches, and people can message you without seeing your phone number. Everything you enter before signing in is kept.

Tip: you can save a pet profile with photos and the chip number in advance. If your pet ever goes missing, your report is ready in seconds.

### If you have found or seen an animal

Reporting takes under a minute and needs no account: a photo, the place, and whether the animal is with you or you only saw it. At the end you get a private link to manage the report and talk to the person who is searching.

We never ask where the animal is now, and we never show it.

A collar with a tag or a microchip helps a lot. A vet or a shelter can read the chip.

### How we find matches

We compare every new report with open reports on the other side: lost pets with found and sighted animals, and the other way round.

- **Chip number.** If it matches, we tell you straight away, even at night.
- **Area.** How close the place where the pet went missing is to where the animal was found.
- **Time.** Whether the animal was found after the pet went missing.
- **Description.** Species, size, colour and sex.

Soon we will compare photos for similarity too.

A match is a suggestion, not a confirmation. You look at the photos and decide whether it is your pet. Matches you reject are never shown again.

### Talking and collecting your pet

When you confirm a match or message someone about a report, a conversation opens in the app. Phone numbers and email addresses are not shown.

Arrange the handover in the conversation. Meet in a public place, in daylight, and never pay in advance. Read the [safety tips](/en/safety).

### When your pet is home again

Choose **Pet is home again**. Alerts stop and the report shows that the pet is home. This keeps the map reliable for everyone.

If you have not updated your report for a while, we ask after 7, 14 and 30 days whether you are still searching. A lost-pet report closes automatically after 90 days without an update, and you can extend it straight away. Found and sighted reports expire after 30 days without an update.

### Nearby alerts

Turn on alerts for your home area (5 km by default) and we will let you know when a dog or cat goes missing nearby. You can choose the species, radius, maximum number of alerts per day and quiet hours.

### What is free

Our goal is getting animals home. So everything that helps is free for everyone, forever: reporting a lost, found or sighted animal, the map and alerts, matching, messaging, the poster with its QR code, sharing and chip lookup. For shelters and municipalities, everything is free.

We only need money to keep the service running: servers, maps and sending alerts. Ads from local partners, always labelled **Ad**, and voluntary contributions cover it. We never show ads while you report a lost or found animal, in conversations or during payment.

**Closing actions** primary "Report a lost pet", text button "Report a found animal".

## SEO

| Field | SL | EN |
|---|---|---|
| Meta title | Kako deluje prijava izgubljene živali · Najdimo | How reporting a lost pet works · Najdimo |
| Meta description | Prijavite izgubljeno ali najdeno žival, prejmite obvestilo o možnem ujemanju in se varno pogovorite v aplikaciji. Brezplačno, po vsej Sloveniji. | Report a lost or found pet, get notified about possible matches and talk safely in the app. Free, across Slovenia. |
| Focus keyword | prijava izgubljene živali | report a lost pet |
| Slug | `/kako-deluje` | `/en/how-it-works` |
| Structured data | `WebPage` + `BreadcrumbList` (Najdimo › Kako deluje) | same |

Alt text: no images on this page.

---

# T2 Safety tips (`/varnost`, `/en/safety`)

## SL

**h1** Nasveti za varnost

**Lede** Ko se žival izgubi, smo ranljivi. Večina ljudi želi pomagati, nekateri pa poskušajo izkoristiti stisko. Ti nasveti vam pomagajo prepoznati prevaro in varno prevzeti žival.

### Pogoste prevare

- Nekdo trdi, da ima vašo žival, a zahteva denar vnaprej, na primer za prevoz, hrano ali veterinarja.
- Nekdo vas prosi za kodo, ki ste jo prejeli po SMS, ali za podatke kartice.
- Nekdo trdi, da ima vašo žival, vendar je ne zna opisati ali ne pošlje nove fotografije.
- Sporočilo vas preusmeri na drugo spletno stran ali v drugo aplikacijo, kjer naj bi plačali.
- Nekdo se predstavi kot zavetišče ali veterinar in zahteva plačilo prek povezave.

### Kako se zaščitite

- **Nikoli ne pošiljajte denarja vnaprej.** Kdor je žival res našel, denarja ne zahteva.
- **Pogovor imejte v aplikaciji.** Tako vaša telefonska številka ostane skrita.
- **Eno posebnost obdržite zase.** V prijavi ne opišite vsega. Če nekdo trdi, da ima vašo žival, ga vprašajte za posebnost, ki je niste objavili, na primer brazgotino ali obliko lise.
- **Prosite za novo fotografijo**, na primer z listkom, na katerem je današnji datum.
- **Ne odpirajte povezav neznancev** in ne nameščajte aplikacij, ki vam jih priporočijo.
- **Kode, ki jo prejmete po SMS, ne povejte nikomur.**

Nikoli vas ne bomo prosili za plačilo v pogovoru, za geslo ali za kodo iz SMS.

### Varen prevzem živali

- Dobite se na javnem, osvetljenem kraju, podnevi, na primer pred trgovino ali policijsko postajo.
- Vzemite s seboj nekoga, ki mu zaupate.
- Prinesite dokaz, da je žival vaša: fotografije, potni list za hišne živali ali potrdilo s številko čipa.
- Če ste v dvomih, se dogovorite za prevzem pri veterinarju ali v zavetišču, kjer lahko preberejo čip.

Če žival vračate vi: prosite za dokaz, da je žival res njihova, in jo predajte na javnem kraju. Če dvomite, jo odpeljite v zavetišče ali k veterinarju.

### Ko izgubite žival: prvih 24 ur

1. Takoj preiščite okolico in žival kličite z mirnim glasom. Mačke se pogosto skrijejo zelo blizu doma, v kleteh, garažah in pod avtomobili.
2. Prijavite izgubljeno žival na Najdimo. Ljudje v bližini prejmejo opozorilo.
3. Obvestite bližnja zavetišča in veterinarske ambulante. Pošljite jim fotografijo in opis.
4. Za psa preverite pri svojem veterinarju, ali so vaši podatki v Centralnem registru psov (CRPsi) pravilni.
5. Natisnite plakat s QR kodo in ga izobesite v soseski, v trgovinah in pri veterinarjih.
6. Prijavo delite v lokalnih skupinah na družbenih omrežjih.
7. Pred vrata postavite posodo z vodo in kos oblačila, ki diši po vas.

### Ko najdete žival

1. Najprej poskrbite za svojo varnost in varnost na cesti. Prestrašeni živali se približajte mirno in počasi.
2. Preverite, ali ima ovratnico ali obesek s kontaktom.
3. Fotografirajte jo in jo prijavite na Najdimo. Prijava vzame manj kot minuto in ne potrebuje računa.
4. Čip lahko prebere veterinar ali zavetišče.
5. Če žival ne morete obdržati, pokličite zavetišče, s katerim sodeluje vaša občina. **[legal review]**
6. Ne objavljajte, kje točno je žival zdaj. Oseba, ki žival išče, vam bo pisala v aplikaciji.

### Če sumite prevaro

V pogovoru ali pri prijavi izberite **Prijavi zlorabo**. Prijavo pregleda naša ekipa, druga oseba pa ne izve, kdo jo je prijavil.

Če ste denar že nakazali, se takoj obrnite na svojo banko in zadevo prijavite policiji. V nujnih primerih pokličite 113.

**Closing action** text button "Odpri zemljevid".

## EN

**h1** Safety tips

**Lede** When a pet goes missing, we are vulnerable. Most people want to help, but some try to take advantage. These tips help you spot a scam and collect your pet safely.

### Common scams

- Someone says they have your pet but asks for money in advance, for transport, food or a vet.
- Someone asks for a code you received by text message, or for your card details.
- Someone says they have your pet but cannot describe it or will not send a new photo.
- A message sends you to another website or app to pay.
- Someone pretends to be a shelter or a vet and asks you to pay through a link.

### How to protect yourself

- **Never send money in advance.** A genuine finder does not ask for money.
- **Keep the conversation in the app.** That way your phone number stays hidden.
- **Keep one detail to yourself.** Do not describe everything in your report. If someone claims to have your pet, ask about a detail you did not publish, such as a scar or the shape of a patch.
- **Ask for a new photo**, for example with a note showing today's date.
- **Do not open links from strangers** or install apps they recommend.
- **Never share a code you receive by text message.**

We will never ask you for a payment in a conversation, for your password or for a code from a text message.

### Collecting your pet safely

- Meet in a public, well-lit place, in daylight, for example outside a shop or a police station.
- Bring someone you trust.
- Bring proof that the pet is yours: photos, the pet passport or a document with the chip number.
- If in doubt, arrange the handover at a vet or a shelter, where they can read the chip.

If you are returning an animal: ask for proof that it is theirs and hand it over in a public place. If in doubt, take it to a shelter or a vet.

### If you lose your pet: the first 24 hours

1. Search the area straight away and call your pet in a calm voice. Cats often hide very close to home, in cellars, garages and under cars.
2. Report your lost pet on Najdimo. People nearby get an alert.
3. Tell nearby shelters and vet practices. Send them a photo and a description.
4. For a dog, check with your vet that your details in the Central Register of Dogs (CRPsi) are correct.
5. Print the poster with the QR code and put it up in your neighbourhood, in shops and at vets.
6. Share your report in local social media groups.
7. Leave a bowl of water and a piece of clothing that smells of you outside your door.

### If you find an animal

1. Look after your own safety and road safety first. Approach a frightened animal calmly and slowly.
2. Check for a collar or a tag with contact details.
3. Take a photo and report it on Najdimo. It takes under a minute and needs no account.
4. A vet or a shelter can read the chip.
5. If you cannot keep the animal, call the shelter your municipality works with. **[legal review]**
6. Do not post where exactly the animal is now. The person searching for it will message you in the app.

### If you suspect a scam

In the conversation or on the report, choose **Report abuse**. Our team reviews it, and the other person is not told who reported them.

If you have already sent money, contact your bank straight away and report it to the police. In an emergency, call 113.

**Closing action** text button "Open the map".

## SEO

| Field | SL | EN |
|---|---|---|
| Meta title | Izgubljen pes ali mačka: nasveti in prevare · Najdimo | Lost pet tips and how to avoid scams · Najdimo |
| Meta description | Kaj storiti, ko izgubite ali najdete psa ali mačko, in kako prepoznati prevaro. Nikoli ne plačajte vnaprej. Nasveti za varen prevzem živali. | What to do when you lose or find a dog or cat, and how to spot a scam. Never pay in advance. Tips for collecting your pet safely. |
| Focus keyword | izgubljen pes kaj storiti | lost dog what to do |
| Slug | `/varnost` | `/en/safety` |
| Structured data | `Article` (headline = h1, `author` and `publisher` Organization Najdimo, `datePublished` at launch) + `BreadcrumbList` | same |

Alt text: no images. If an inline image is added later, it is decorative unless it shows a step.

---

# T2 For shelters (`/za-zavetisca`, `/en/for-shelters`)

## SL

**h1** Za zavetišča, veterinarje in občine

**Lede** Pomagamo vam hitreje najti lastnike najdenih živali, z manj dela. Za zavetišča in občine je vse brezplačno, za vedno.

### Zakaj Najdimo

- Ena objava doseže ljudi, ki v vaši okolici iščejo žival.
- Vsako najdeno žival samodejno primerjamo z odprtimi prijavami izgubljenih živali, tudi s tistimi, ki pridejo pozneje.
- Z ljudmi, ki žival iščejo, se pogovarjate v aplikaciji, brez deljenja telefonskih številk.
- Pri mačkah, ki pogosto nimajo čipa, je ujemanje po opisu, kraju in času pogosto edina pot do doma.

### Kaj pripravljamo za pilot

- **Množično nalaganje:** do 30 fotografij naenkrat, iz katerih nastanejo osnutki prijav.
- **Uvoz CSV** iz vaše obstoječe evidence, s pregledom napak pred objavo.
- **Pregled verjetnih lastnikov** za vsako žival.
- **Preverjanje čipa:** vpišete prebrano številko, mi pa obvestimo lastnika, če je čip vpisan pri nas. Osebnih podatkov ne vidite.
- **Značka Preverjeno zavetišče** po preverjanju organizacije.
- **Opomniki za roke hrambe**, ki jih nastavite sami.

### Brezplačno, za vedno

Zavetišča in občine uporabljajo vse brezplačno in brez omejitev: portal, množično nalaganje in uvoz CSV, ujemanja, povezavo API, analitiko, stran za posvojitve in poročila za občine. Plačljivega paketa za zavetišča ni in ga ne bo. Naš cilj je, da se živali vrnejo domov, ne dobiček.

### Za veterinarje

Vse, kar pomaga vrniti žival domov, je brezplačno tudi za veterinarske ambulante: prijava najdenih živali, ki vam jih prinesejo, preverjanje čipa, ujemanja in pogovor z lastniki. Ambulante, ki želijo večjo prepoznavnost v svoji okolici, lahko izberejo [Veterinarski partner](/oglasevanje#veterinarski-partner).

### Sodelujte v pilotu

Pilot začenjamo v Ljubljani z dvema ali tremi zavetišči. Pomagamo pri prvem uvozu in prilagodimo, kar vam ne ustreza.

Pišite nam na [naročnik: e-naslov za zavetišča] in dogovorimo se za kratek pogovor.

Najdimo ne nadomešča zakonskih obveznosti zavetišč in občin ter ne daje pravnih nasvetov. **[legal review]**

**Closing action** primary "Pišite nam" (mailto).

## EN

**h1** For shelters, vets and municipalities

**Lede** We help you find the owners of found animals faster, with less work. For shelters and municipalities everything is free, forever.

### Why Najdimo

- One post reaches people near you who are searching for a pet.
- We automatically compare every found animal with open lost-pet reports, including ones that come in later.
- You talk to the people searching in the app, without sharing phone numbers.
- For cats, which often have no chip, matching by description, place and time is often the only way home.

### What we are building for the pilot

- **Bulk upload:** up to 30 photos at once, turned into draft reports.
- **CSV import** from your existing records, with an error check before publishing.
- **Likely owners** for every animal at a glance.
- **Chip lookup:** enter the number you scanned and we notify the owner if the chip is registered with us. You never see personal data.
- **Verified shelter badge** once we have checked your organisation.
- **Holding-period reminders** that you set yourself.

### Free, forever

Shelters and municipalities use everything for free, with no limits: the portal, bulk upload and CSV import, matching, the API connection, analytics, the adoption page and municipality reports. There is no paid shelter plan and there will not be one. Our goal is getting animals home, not profit.

### For vets

Everything that helps an animal home is free for vet practices too: reporting found animals brought to you, chip lookup, matches and talking to owners. Practices that want more visibility in their area can choose [Vet Partner](/en/advertise#vet-partner).

### Join the pilot

We are starting the pilot in Ljubljana with two or three shelters. We help with your first import and adjust whatever does not suit you.

Write to us at [client: shelters email address] and we will arrange a short call.

Najdimo does not replace the legal duties of shelters and municipalities and does not give legal advice. **[legal review]**

**Closing action** primary "Write to us" (mailto).

## SEO

| Field | SL | EN |
|---|---|---|
| Meta title | Za zavetišča: brezplačna objava najdenih živali · Najdimo | For shelters: publish found animals free · Najdimo |
| Meta description | Najdene živali objavite v nekaj minutah, mi pa poiščemo ljudi, ki jih iščejo. Za zavetišča in občine brezplačno, za vedno. Pilot v Ljubljani. | Publish found animals in minutes and we find the people searching for them. Free for shelters and municipalities, forever. Pilot in Ljubljana. |
| Focus keyword | zavetišče za živali | animal shelter Slovenia |
| Slug | `/za-zavetisca` | `/en/for-shelters` |
| Structured data | `WebPage` + `BreadcrumbList` | same |

Alt text: no images. If a screenshot of the portal is added in M3, alt: "Portal za zavetišča s seznamom najdenih živali in verjetnimi lastniki" / "Shelter portal showing found animals and their likely owners".

---

# T2 About (`/o-nas`, `/en/about`)

## SL

**h1** O nas

**Lede** Najdimo je slovenska storitev za iskanje izgubljenih psov in mačk. Nastala je, ker se iskanje danes razprši po skupinah na družbenih omrežjih in plakatih, kjer se objave hitro izgubijo.

### Kaj nas vodi

- **Vse, kar pomaga vrniti žival domov, je brezplačno, za vedno:** prijava, ujemanja, pogovor, opozorila, plakat in preverjanje čipa.
- **Zasebnost je privzeta:** telefonske številke in točne lokacije niso nikoli javne.
- **Iskreni smo:** ne obljubljamo, česar ne moremo izpolniti, in pokažemo prave številke, tudi ko so majhne.
- **Varnost pred prevarami** je del vsakega koraka.

### Kdo smo

Najdimo razvija ekipa podjetja Signapps iz Slovenije. Najdimo je delovno ime storitve.

### Kako se financiramo

Naš cilj je, da se živali vrnejo domov; denar potrebujemo le za delovanje. Pokrivajo ga jasno označeni oglasi lokalnih partnerjev, Veterinarski partner za ambulante in prostovoljni prispevki. Ko je vaša žival spet doma, lahko pustite prispevek v zahvalo. Prispevek je prostovoljno plačilo za delovanje storitve in ne vpliva na nobeno funkcijo.

Oglašujete lahko tudi vi: [Oglašujte pri nas](/oglasevanje).

### Stik

Pišite nam na [naročnik: e-naslov za podporo]. Podatki o podjetju so v [impresumu](/impresum).

## EN

**h1** About us

**Lede** Najdimo is a Slovenian service for finding lost dogs and cats. We built it because today searches are scattered across social media groups and paper posters, where posts quickly disappear.

### What guides us

- **Everything that helps an animal home is free, forever:** reporting, matching, messaging, alerts, the poster and chip lookup.
- **Privacy by default:** phone numbers and exact locations are never public.
- **We are honest:** we do not promise what we cannot deliver, and we show real numbers, even when they are small.
- **Protection from scams** is part of every step.

### Who we are

Najdimo is built by the team at Signapps in Slovenia. Najdimo is the service's working name.

### How we are funded

Our goal is getting animals home; we only need money to keep running. It comes from clearly labelled ads from local partners, Vet Partner for clinics and voluntary contributions. When your pet is home again, you can leave a thank-you contribution. A contribution is a voluntary payment towards running the service and does not change any feature.

You can advertise too: [Advertise with us](/en/advertise).

### Contact

Write to us at [client: support email address]. Company details are in the [imprint](/en/imprint).

## SEO

| Field | SL | EN |
|---|---|---|
| Meta title | O nas: zakaj smo ustvarili Najdimo · Najdimo | About us: why we built Najdimo · Najdimo |
| Meta description | Najdimo je slovenska storitev za iskanje izgubljenih psov in mačk. Jedro je brezplačno, zasebnost privzeta, številke pa prave, tudi ko so majhne. | Najdimo is a Slovenian service for finding lost dogs and cats. The core is free, privacy is the default and our numbers are real, even when small. |
| Focus keyword | Najdimo | Najdimo |
| Slug | `/o-nas` (CHANGE C15) | `/en/about` |
| Structured data | `AboutPage` + `BreadcrumbList` | same |

Section anchor `#financiranje` / `#funding` is the M2 link target of the support house ad (P21).

---

# T3 FAQ (`/pogosta-vprasanja`, `/en/faq`)

**h1** Pogosta vprašanja / Frequently asked questions

**Lede** Kratki odgovori na vprašanja, ki nam jih postavljate najpogosteje. / Short answers to the questions we hear most often.

## Group 1: Prijava izgubljene živali / Reporting a lost pet

| # | SL question | SL answer | EN question | EN answer |
|---|---|---|---|---|
| 1 | Ali je Najdimo brezplačno? | Da, vse, kar pomaga vrniti žival domov, je brezplačno za vse in za vedno: prijava, ujemanja, pogovor, opozorila, plakat in preverjanje čipa. Delovanje pokrivajo označeni oglasi in prostovoljni prispevki. | Is Najdimo free? | Yes. Everything that helps an animal home is free for everyone, forever: reporting, matching, messaging, alerts, the poster and chip lookup. Labelled ads and voluntary contributions keep it running. |
| 2 | Zakaj za prijavo izgubljene živali potrebujem račun? | Da vas lahko obvestimo o možnem ujemanju in da vam lahko ljudje pišejo, ne da bi videli vašo telefonsko številko. Vse, kar vnesete pred vpisom, se ohrani. | Why do I need an account to report a lost pet? | So we can tell you about possible matches and people can message you without seeing your phone number. Everything you enter before signing in is kept. |
| 3 | Zakaj je na zemljevidu prikazano le približno območje? | Da vas zaščitimo. Namesto točnega kraja prikažemo območje s polmerom vsaj 500 metrov, pri najdenih in opaženih živalih vsaj 150 metrov. Točno lokacijo vidite samo vi. | Why does the map only show an approximate area? | To protect you. Instead of the exact spot, we show an area with a radius of at least 500 metres, or at least 150 metres for found and sighted animals. Only you see the exact location. |
| 4 | Ali bo številka čipa javna? | Ne. Številko čipa vpišite v prijavo ali profil živali, a je nikoli ne prikažemo javno. Uporabimo jo samo za iskanje ujemanj. | Will the chip number be public? | No. Add the chip number to your report or pet profile; we never show it publicly. We only use it to find matches. |
| 5 | Kako dolgo ostane prijava objavljena? | Dokler je ne zaključite. Po 7, 14 in 30 dneh vas vprašamo, ali še iščete. Če prijave 90 dni ne posodobite, se samodejno zaključi, podaljšate pa jo lahko takoj. | How long does a report stay online? | Until you close it. After 7, 14 and 30 days we ask whether you are still searching. If you do not update it for 90 days, it closes automatically, and you can extend it straight away. |

## Group 2: Najdena ali opažena žival / Found or sighted animals

| # | SL question | SL answer | EN question | EN answer |
|---|---|---|---|---|
| 6 | Ali za prijavo najdene živali potrebujem račun? | Ne. Prijava vzame manj kot minuto. Na koncu dobite zasebno povezavo, s katero prijavo urejate in odgovarjate na sporočila. | Do I need an account to report a found animal? | No. It takes under a minute. At the end you get a private link to manage the report and reply to messages. |
| 7 | Kaj, če izgubim zasebno povezavo? | Če ste ob prijavi vpisali e-naslov, vam jo pošljemo znova. Brez e-naslova je ne moremo obnoviti, prijava pa poteče po 30 dneh. Povezavo lahko ohranite tudi tako, da ustvarite račun. | What if I lose my private link? | If you gave an email address, we can send it again. Without one we cannot recover it, and the report expires after 30 days. You can also keep it by creating an account. |
| 8 | Ali moram povedati, kje je žival zdaj? | Ne. Tega ne sprašujemo in nikoli ne prikažemo. Prevzem se dogovorite v pogovoru. | Do I have to say where the animal is now? | No. We do not ask and we never show it. You arrange the handover in the conversation. |
| 9 | Kaj naj storim, če žival ne morem obdržati? | Pokličite zavetišče, s katerim sodeluje vaša občina, ali veterinarja. Prijavo na Najdimo vseeno oddajte, da jo lastnik lažje najde. **[legal review]** | What should I do if I cannot keep the animal? | Call the shelter your municipality works with, or a vet. Please still report it on Najdimo so the owner can find it more easily. **[legal review]** |

## Group 3: Ujemanja in pogovor / Matches and messages

| # | SL question | SL answer | EN question | EN answer |
|---|---|---|---|---|
| 10 | Kako veste, da je to moja žival? | Ne vemo zagotovo. Primerjamo številko čipa, območje, čas in opis ter predlagamo možno ujemanje. Odločite se vi, ko pogledate fotografije. | How do you know it is my pet? | We cannot be sure. We compare the chip number, area, time and description, and suggest a possible match. You decide after looking at the photos. |
| 11 | Kdo vidi moja sporočila? | Samo udeleženci pogovora. Naša ekipa vidi sporočilo le, če ga kdo prijavi kot zlorabo. | Who can see my messages? | Only the people in the conversation. Our team sees a message only if someone reports it as abuse. |
| 12 | Se lahko pogovorimo po telefonu? | Številko lahko delite v pogovoru, a priporočamo, da ostanete v aplikaciji, dokler žival ni varno doma. | Can we talk on the phone? | You can share your number in the conversation, but we recommend staying in the app until your pet is safely home. |

## Group 4: Zasebnost in varnost / Privacy and safety

| # | SL question | SL answer | EN question | EN answer |
|---|---|---|---|---|
| 13 | Kako prepoznam prevaro? | Najpogostejši znak je zahteva po denarju vnaprej. Kdor je žival res našel, denarja ne zahteva. Več v [nasvetih za varnost](/varnost). | How can I spot a scam? | The most common sign is a request for money in advance. A genuine finder does not ask for money. More in the [safety tips](/en/safety). |
| 14 | Kako izbrišem svoje podatke? | Prijavo najdene ali opažene živali izbrišete prek zasebne povezave. Za izbris računa nam pišite na naslov iz [politike zasebnosti](/zasebnost). Kmalu boste račun lahko izbrisali sami v nastavitvah. | How do I delete my data? | You can delete a found or sighted report from your private link. To delete your account, write to the address in the [privacy policy](/en/privacy). Soon you will be able to delete it yourself in settings. |
| 15 | Ali uporabljate piškotke? | Nujne piškotke za delovanje, na primer za vpis. Analitične piškotke Google Analytics uporabimo le, če jih sprejmete. Izbiro lahko kadar koli spremenite v Nastavitvah piškotkov. | Do you use cookies? | Essential cookies to make the service work, for example to keep you signed in. We only use Google Analytics cookies if you accept them. You can change your choice at any time in Cookie settings. |

## Group 5: Oglasi in podpora / Ads and support

| # | SL question | SL answer | EN question | EN answer |
|---|---|---|---|---|
| 16 | Zakaj so na strani oglasi? | Da Najdimo ostane brezplačno. Oglasi lokalnih partnerjev so vedno označeni z besedo Oglas. Nikoli jih ne prikažemo med prijavo, v pogovoru ali pri plačilu in ne uporabljajo piškotkov za sledenje. | Why are there ads? | To keep Najdimo free. Ads from local partners are always labelled Ad. We never show them while you report, in conversations or during payment, and they do not use tracking cookies. |
| 17 | Kako lahko podprem Najdimo? | Ko je vaša žival spet doma, lahko pustite prispevek v zahvalo. Prispevek ni obvezen in ne vpliva na nobeno funkcijo. | How can I support Najdimo? | When your pet is home again, you can leave a thank-you contribution. It is optional and does not change any feature. |
| 18 | Kako lahko oglašujem? | Vse o oglasnih mestih in občinstvu je na strani [Oglašujte pri nas](/oglasevanje), kjer nam lahko tudi pišete. | How can I advertise? | Everything about ad slots and our audience is on [Advertise with us](/en/advertise), where you can also contact us. |

## Group 6: Zavetišča / Shelters

| # | SL question | SL answer | EN question | EN answer |
|---|---|---|---|---|
| 19 | Ali je Najdimo za zavetišča brezplačno? | Da, vse in za vedno, tudi portal, uvoz in poročila za občine. Portal za zavetišča pripravljamo. Če želite sodelovati v pilotu, preberite [Za zavetišča](/za-zavetisca). | Is Najdimo free for shelters? | Yes, everything, forever, including the portal, imports and municipality reports. We are building the shelter portal. If you would like to join the pilot, see [For shelters](/en/for-shelters). |
| 20 | Ali morajo veterinarji kaj plačati? | Ne za nič, kar pomaga vrniti žival domov: prijava najdene živali, preverjanje čipa, ujemanja in pogovor so brezplačni. Ambulante, ki želijo večjo prepoznavnost, lahko izberejo [Veterinarski partner](/oglasevanje#veterinarski-partner). | Do vets have to pay anything? | Not for anything that helps an animal home: reporting a found animal, chip lookup, matches and messaging are free. Practices that want more visibility can choose [Vet Partner](/en/advertise#vet-partner). |

**Closing note** SL: Niste našli odgovora? Pišite nam na [naročnik: e-naslov za podporo]. EN: Did not find your answer? Write to us at [client: support email address].

Group headings (h2): "Prijava izgubljene živali", "Najdena ali opažena žival", "Ujemanja in pogovor", "Zasebnost in varnost", "Oglasi in podpora", "Zavetišča" / "Reporting a lost pet", "Found or sighted animals", "Matches and messages", "Privacy and safety", "Ads and support", "Shelters".

FAQ row button accessible state: `pages.faq.expand` "Pokaži odgovor" / "Show answer", `pages.faq.collapse` "Skrij odgovor" / "Hide answer".

## SEO

| Field | SL | EN |
|---|---|---|
| Meta title | Pogosta vprašanja o izgubljenih živalih · Najdimo | FAQ about lost and found pets · Najdimo |
| Meta description | Odgovori o prijavi izgubljene ali najdene živali, zasebni povezavi, ujemanjih, zasebnosti, oglasih in sodelovanju zavetišč. | Answers about reporting a lost or found pet, the private link, matches, privacy, ads and working with shelters. |
| Focus keyword | najden pes kaj storiti | found a dog what to do |
| Slug | `/pogosta-vprasanja` | `/en/faq` |
| Structured data | `FAQPage` with every question and answer above (answers as plain text, links kept) + `BreadcrumbList` | same |

---

# T4 Legal template strings

| Key | SL | EN |
|---|---|---|
| legal.last_updated | Zadnja posodobitev: {date} | Last updated: {date} |
| legal.draft_note | Osnutek – besedilo zahteva pregled naročnika in pravnika. | Draft – this text requires client and legal review. |
| legal.toc | Na tej strani | On this page |
| legal.print | Natisni | Print |
| legal.title_privacy | Politika zasebnosti | Privacy policy |
| legal.title_cookies | Politika piškotkov | Cookie policy |
| legal.title_terms | Pogoji uporabe | Terms of use |
| legal.title_imprint | Impresum | Imprint |
| legal.title_accessibility | Izjava o dostopnosti | Accessibility statement |

Body texts, meta titles and descriptions: `docs/content/legal/*.md`.

---

# States (all templates)

| State | Copy |
|---|---|
| Loading | `common.loading_page` (P1) |
| Language fallback | `common.translation_missing` (P1) |
| Offline | `errors.offline_title`, `errors.offline_body` (P1) |

# Open points

1. Client contact addresses: support, shelters, privacy (markers above). One shared address is fine.
2. Final photography for the home page: licensed photos of real (non-lost) pets, or the image tasks. Placeholders are Unsplash files from the direction phase; record source and credit before launch.
3. Legal review lines: finder duties and municipal shelter duties (Q-006).
4. `CHANGE docs/tech/contracts/C15-routes-deeplinks.md§Web routes: add about /o-nas, /en/about (T2 page).`
