**Draft — requires client/legal review.**
source: 02§Content, SEO and legal requirements (Legal); FR-034; FR-035; FR-038; FR-039; NFR-PRIV

| Field | Value |
|---|---|
| Version | 0.9 |
| Date | 2026-10-19 |
| Route SL | `/zasebnost` |
| Route EN | `/en/privacy` |
| Slug SL / EN | `zasebnost` / `privacy` |
| Structured data | WebPage |
| Template | T4 Legal (numbered h2 sections, "On this page" list, draft note) |

Change in 0.9 (CH-641, PRD v0.11 R-026.6, R-026.7, A-031, A-032): Premium Protect. Chapter 8 adds the automatic translation of chat messages by Anthropic in chats with a Premium participant (masking of contact data, no training use, kept as the chat, notice to both people). Chapter 11 adds the aggregate, cookieless view and share counters per report (report statistics). Chapters 1, 3, 4, 9, 12 and 14 follow. New claims carry **[pravni pregled]** / **[legal review]** (lawyer pack LQ-72 to LQ-74). Publish these parts only when the features go live (note 14).

Change in 0.8 (TASK-40.6, FR-013 R-013.5, C19, C20): AI assistance described as built, in chapters 1, 3, 4, 6, 8, 12, 14 and 16. Only a re-encoded copy of at most 1024 px goes to Anthropic and Voyage AI, with no EXIF, identifiers, location or text. Results are keyed by image hash. Nothing about people is kept beyond four yes/no safety flags. Flagged photos are never embedded. Vectors are deleted with the photo. Call records are kept 62 days. The earlier sentence "flagged images are held for review" is removed, because that is image screening (TASK-63, M4); add it back when TASK-63 goes live. Every new claim carries **[pravni pregled]** / **[legal review]**. Points only the client can confirm carry **[naročnik: …]** / **[client: …]** (note 23). All markers must be gone before this version is published, and the AI parts are published only when AI assistance is switched on (note 14, LQ-04).

Update to 0.8 (2026-10-19, TASK-40.6 AC3): the client markers in chapters 8 and 12 are filled from Anthropic's and Voyage AI's own published terms and the owner's facts of 2026-10-19 (note 23, with sources). New facts: Anthropic Ireland, Limited is the contracting party for EEA customers; Anthropic stores data in the USA but may also process it in selected countries in Europe, Asia and Australia; no training on our data; 30-day deletion with the flagged-content exception; Voyage AI Innovations, Inc. with the training opt-out, so photos are deleted once processed; standard contractual clauses in both DPAs; only photos uploaded after AI is switched on are sent. Owner decision 2026-10-19: 0.8 is published on najdimo.si before AI is switched on, with every marker removed from the live page. This master keeps the **[pravni pregled]** / **[legal review]** markers: the lawyer review continues (LQ-36, LQ-37, LQ-68 to LQ-71 open).

Change in 0.7 (CH-505, TASK-113): the `zz_consent` cookie lives 400 days and the choice counts 12 months, then we ask again; the consent text and the retention row now say so, as the cookie policy does.

Change in 0.6: remaining "exact location" wording aligned with the coarsened point (20–30 m, never raw); retention row split: photos 12 months, stored point blurred 30 days after closure (LQ-19, proposal, lawyer to confirm).

Change in 0.5: location minimisation (chapter 6): the raw GPS point is never stored; it is moved by 20–30 m before it is saved; the exact point is blurred 30 days after a report closes (proposal, lawyer to confirm).

Change in 0.4: reward escrow removed (brief v1.1): no reward is paid through Najdimo and Stripe Connect is no longer used; an owner's optional reward line is part of the report data (chapter 3) and is explained in chapter 9. Place search and the area name for a point run on our own servers from GURS open data (ADR-007): MapTiler and Photon are removed from chapters 6 and 12, and the Swiss adequacy sentence from chapter 13.

Change in 0.3: processors and hosting per brief v1.0 (Hetzner and Cloudflare R2; Vercel and Supabase file storage removed); exact location shared in a chat; on-device proximity alerts and offline data (chapter 6); database reachable only through our API (chapter 16). Open points are consolidated in `docs/legal/lawyer-briefing.md`.

Change in 0.2: removed QR/NFC pet tags and Shelter Pro (brief v0.7); added Vet Partner (chapter 9); added the mission line; meta titles use the " · Najdimo" suffix.

**SEO (SL)**

- Meta title: Politika zasebnosti · Najdimo
- Meta description: Kako Najdimo ravna z osebnimi podatki: kaj zbiramo in zakaj, kako dolgo hranimo, komu zaupamo in kako uveljavite svoje pravice.
- Focus keyword: politika zasebnosti

**SEO (EN)**

- Meta title: Privacy policy · Najdimo
- Meta description: How Najdimo handles personal data: what we collect and why, how long we keep it, who we share it with and how to use your rights.
- Focus keyword: privacy policy

---

# Politika zasebnosti (slovenščina)

**Osnutek – zahteva pregled naročnika in pravnika.**

Zadnja posodobitev: 19. 10. 2026

## 1. Na kratko

Najdimo pomaga, da se izgubljene živali vrnejo domov. Vse, kar živali vrača domov, je za vse brezplačno. Za to potrebujemo nekaj osebnih podatkov. Tu je povzetek, v nadaljevanju pa je vse natančno.

- Podatke uporabljamo za delovanje storitve: račun, prijave, ujemanje, pogovor, opozorila in plačila.
- Javno prikažemo le fotografije, lastnosti živali, približno območje, datum in okoliščine. Številke čipa, telefonske številke, e-naslova, shranjene točke prijave in kraja, kjer je najdena žival, ne prikažemo nikomur.
- Shranjeno (približno) točko prijave vidite samo vi, razen če jo sami delite v pogovoru.
- Google Analytics vklopimo le z vašo privolitvijo. Če jo zavrnete, Googlu ne pošljemo ničesar.
- Oglase samo preštejemo, in sicer brez piškotkov in brez oznak, ki bi razkrile, kdo ste. Enako štejemo oglede in delitve prijav za statistiko prijave (poglavje 11).
- Ko je vklopljena pomoč umetne inteligence, iz fotografij predlagamo podatke o živali. Predlogi so označeni, lahko se motijo in jih lahko spremenite (poglavje 8). [pravni pregled]
- V pogovoru, v katerem ima vsaj ena oseba Premium Zaščito, sporočila med slovenščino in angleščino samodejno prevaja ponudnik umetne inteligence. Obe osebi to vidita (poglavje 8). [pravni pregled]
- Glavna zbirka podatkov je v EU (Frankfurt), v EU so tudi naši strežniki in fotografije. Nekateri ponudniki so v ZDA; zanje veljajo zaščitni ukrepi (poglavje 13).
- Podatke lahko izvozite, račun pa izbrišete. Pravice uveljavite na info@signapps.si.

## 2. Kdo je upravljavec

Upravljavec vaših osebnih podatkov je družba SIGNAPPS, grafična in digitalna agencija, d.o.o., Kolomban 34B, 6280 Ankaran – Ancarano, Slovenija, matična številka 6575536000. V tem besedilu „mi“ pomeni to družbo kot upravljavca storitve Najdimo.

Za vprašanja o zasebnosti in za uveljavljanje pravic nam pišite na info@signapps.si ali nas pokličite na 040 975 210 (+386 40 975 210).

Za podatke, ki jih zavetišča in druge organizacije zbirajo zunaj Najdimo (na primer ob sprejemu živali), so odgovorne same.

Izrazi v moškem slovničnem spolu (na primer „uporabnik“, „upravljavec“, „moderator“) v tem besedilu veljajo za osebe vseh spolov.

## 3. Katere podatke obdelujemo

Večino podatkov nam daste sami: ko ustvarite račun, objavite prijavo ali pišete v pogovoru. Nekaj podatkov nastane ob uporabi storitve, na primer tehnični zapisi.

| Vrsta podatkov | Kaj vsebuje |
|---|---|
| Račun in nastavitve | prikazno ime, e-naslov, zgoščeno geslo ali identiteta pri Googlu oziroma Applu, jezik, vloga (na primer lastnik, najditelj ali zavetišče), domače območje, privzeti polmer opozoril, neobvezna telefonska številka (nikoli javna), tihi čas, nastavitve obvestil, žetoni za potisna obvestila |
| Profili živali | vrsta, ime, pasma, barve, vzorec, velikost, spol, leto rojstva, številka čipa (nikoli javna), stanje čipa, ovratnica, opombe (tudi o zdravilih in vedenju), od ene do pet fotografij; pozneje tudi veterinarski zapisi |
| Prijave (izgubljena, najdena, opažena žival) | vrsta prijave, fotografije, približna točka, premaknjena za 20 do 30 m (vidna samo avtorju prijave), javno približno območje, občina in regija, datum in čas, opis okoliščin, izbira načina stika, pri izgubljeni živali neobvezna navedba nagrade (znesek, kratka opomba) |
| Prijave brez računa | anonimna seja, zasebna povezava (hranimo samo njeno zgoščeno vrednost), neobvezen e-naslov, na katerega pošljemo povezavo, identifikator naprave, zgoščen IP naslov za omejevanje zlorab |
| Pogovori | sporočila, vzdevki, stanje prebranosti, blokade; v pogovorih z uporabnikom Premium Zaščite tudi zaznani jezik sporočila in njegov samodejni prevod [pravni pregled] |
| Obvestila in opozorila | nabiralnik obvestil, naročnina na opozorila v bližini (domača točka in polmer) |
| Zlorabe in moderiranje | prijave zlorab, odločitve moderatorjev, revizijski dnevnik skrbniških dejanj |
| Plačila | ID plačila, namen, znesek, stanje in časi; pri naročnini Premium Zaščita tudi paket (mesečni ali letni), stanje naročnine in datum obnove. Podatkov o kartici ne vidimo. |
| Statistika prijav | združeni števci po prijavi in dnevu: ogledi javne strani, delitve po kanalu, poslana opozorila po kanalu; brez oznak oseb, ki so si prijavo ogledale ali jo delile [pravni pregled] |
| Veterinarski partner (podjetja) | podatki ambulante (naziv, naslov, delovni čas, storitve, povezava za naročanje ali telefon, oznaka 24-urne nujne pomoči), ime, e-naslov in telefonska številka kontaktne osebe, podatki za obračun in davčna številka za DDV (prek Stripa), računi |
| Povpraševanja partnerjev | podjetje, kontaktna oseba, e-naslov, neobvezna telefonska številka, regija zanimanja, sporočilo, čas privolitve |
| Zgodbe z lepim koncem | besedilo in fotografije, ki jih objavimo samo z vašo izrecno privolitvijo |
| Privolitve | vaša izbira, različica besedila, čas |
| Pomoč umetne inteligence (ko je vklopljena) | predlagane lastnosti živali iz fotografije (vrsta, pasma, barve, vzorec, velikost, ovratnica, kratki opisi posebnih znakov), štiri varnostne oznake da ali ne (oseba v ospredju, golota, nasilje, vidni kontaktni podatki), vektor slike, zapis o vsakem klicu ponudnika (fotografija, ponudnik, model, izid, poraba, strošek, trajanje) [pravni pregled] |
| Tehnični podatki | IP naslov ter vrsta naprave in brskalnika v strežniških zapisih, dnevnik pošiljanja e-pošte, podatki o napakah |

**Ali morate podatke posredovati?** Brez računa lahko brskate in anonimno prijavite najdeno ali opaženo žival. Za račun potrebujemo e-naslov ali vpis z Googlom oziroma Applom. Druga polja, na primer telefonska številka, so neobvezna. Če podatka, ki ga funkcija nujno potrebuje, ne podate, te funkcije ne moremo zagotoviti.

## 4. Zakaj podatke obdelujemo in na kateri pravni podlagi

| Namen | Podatki | Pravna podlaga |
|---|---|---|
| Račun in vpis | račun in nastavitve | pogodba (člen 6(1)(b) GDPR) |
| Objava prijav, javni prikaz, plakat, deljenje | profili živali, prijave, fotografije | pogodba |
| Ujemanje in obvestila o predlogih | prijave, profili živali, številka čipa | pogodba |
| Pogovor med osebama | sporočila, vzdevki | pogodba |
| Opozorila v bližini, ki jih vklopite | domače območje, polmer, žetoni | pogodba |
| Plačila, ko so omogočena | podatki o plačilih | pogodba |
| Naročnina Premium Zaščita in opomnik po e-pošti 7 dni pred letno obnovo | podatki o naročnini, e-naslov | pogodba |
| Samodejni prevod sporočil v pogovorih z uporabnikom Premium Zaščite (Anthropic) | besedilo sporočila brez telefonskih številk, e-naslovov, povezav in številk, podobnih številki čipa; ciljni jezik | za uporabnika Premium Zaščite pogodba; za drugo osebo v pogovoru zakoniti interes, da se osebi sporazumeta [pravni pregled] |
| Varnost, preverjanje „nisem robot“, omejevanje števila zahtev, preprečevanje zlorab | IP (zgoščen), identifikator naprave, strežniški zapisi | zakoniti interes (člen 6(1)(f)) |
| Moderiranje, prijave zlorab, začasno skritje prijave | prijave, sporočila (samo prijavljena), odločitve | zakoniti interes |
| Predlogi lastnosti iz fotografije in varnostne oznake (Anthropic) | pomanjšana kopija fotografije, rezultat | zakoniti interes [pravni pregled] |
| Iskanje podobnih fotografij pri ujemanju (Voyage AI) | pomanjšana kopija fotografije, vektor slike | zakoniti interes [pravni pregled] |
| Nadzor stroškov in omejitev pomoči umetne inteligence | zapisi o klicih ponudnikov | zakoniti interes [pravni pregled] |
| Štetje prikazov in klikov oglasov | združeni števci brez oznak oseb | zakoniti interes |
| Statistika prijav (ogledi, delitve, poslana opozorila) | združeni števci brez oznak oseb | zakoniti interes [pravni pregled] |
| Izboljšave storitve brez analitičnih piškotkov | združene statistike iz naše zbirke | zakoniti interes |
| Uveljavljanje in obramba pravnih zahtevkov | podatki, ki jih za to nujno potrebujemo | zakoniti interes |
| Google Analytics 4 in Firebase | analitični dogodki | privolitev (člen 6(1)(a)) |
| Zgodbe z lepim koncem | besedilo in fotografije | privolitev |
| Potisna obvestila | žeton naprave | opozorila, ki jih vklopite: pogodba; dovoljenje za prikaz obvestil nastavite v napravi in ga kadar koli prekličete |
| Odgovor na povpraševanje partnerja | podatki iz obrazca | ukrepi pred sklenitvijo pogodbe na vašo zahtevo in privolitev, ki jo date z oddajo obrazca |
| Veterinarski partner: naročnina, račun, profil ambulante, mesečno poročilo | podatki ambulante in kontaktne osebe, podatki za obračun | pogodba |
| Računovodske in davčne evidence | podatki o plačilih | zakonska obveznost (člen 6(1)(c)) |

Pri zakoniti podlagi „zakoniti interes“ smo presodili, da vaši interesi in pravice ne prevladajo nad našim interesom, da je storitev varna in brez zlorab. Zoper tako obdelavo lahko ugovarjate (poglavje 15).

Pri pomoči umetne inteligence je naš interes, da je prijava hitrejša in da se izgubljene živali hitreje najdejo. Obdelava je omejena na pomanjšano kopijo fotografije, ki ji ne priložimo vašega imena, oznak ali lokacije, rezultat pa je samo predlog (poglavje 8). [pravni pregled]

Če obdelava temelji na privolitvi, jo lahko kadar koli prekličete. Preklic ne vpliva na zakonitost obdelave pred njim.

## 5. Kaj vidijo drugi

- **Vsakdo, tudi brez računa, vidi:** fotografije, lastnosti živali, približno območje, datum in okoliščine, ki ste jih opisali.
- **Nihče ne vidi:** številke čipa, telefonske številke, e-naslova, shranjene točke prijave in kraja, kjer je najdena žival.
- **Samo vi vidite:** približno točko svoje prijave (premaknjeno za 20 do 30 m). Osebi v pogovoru jo pokažemo le, če jo tam sami delite.
- **Osebi v pogovoru** vidita vzdevka in sporočila. Moderatorji sporočila preberejo samo, če je kdo pogovor prijavil kot zlorabo.
- **Zavetišča in veterinarji:** ko vnesejo številko čipa, ki je pri nas vpisana, obvestimo osebo, ki žival išče. Zavetišču ali veterinarju ne pokažemo nobenih osebnih podatkov.

V prosto besedilo (opis okoliščin, opombe) ne vpisujte osebnih podatkov drugih ljudi. Prosimo vas tudi, da ne objavljate fotografij, na katerih so prepoznavne osebe.

## 6. Fotografije in lokacija

**Fotografije.** Fotografije lahko vsebujejo metapodatke (EXIF), na primer čas in položaj snemanja. V vaši napravi vam lahko iz njih predlagamo kraj in čas za obrazec. V kopijah, ki jih prikažemo javno, metapodatke odstranimo. Izvirniki so zasebni. Tudi kopija, ki jo pošljemo ponudnikoma umetne inteligence, je brez metapodatkov (poglavje 8). [pravni pregled]

**Lokacija prijave.** Natančne (surove) točke GPS ne shranjujemo. Točko, ki jo označite, ob shranjevanju naključno premaknemo za 20 do 30 m: najprej v vaši napravi, še enkrat pa na našem strežniku. Premik se naredi samo enkrat in se pri ogledih ne spreminja. Shranjena točka je zato približna in jo vidite samo vi (označeno »Približna lokacija · vidno samo vam«). Javno prikažemo še širše območje, izračunano iz te točke: pri izgubljeni živali s polmerom najmanj 500 m, pri najdeni in opaženi najmanj 150 m. Koordinat ne zapisujemo v dnevnike. 30 dni po zaključku prijave shranjeno točko dodatno zameglimo, tako da ostaneta le zamegljena točka in ime območja.

**Lokacija naprave.** Lokacijo naprave uporabimo samo takrat, ko to izberete, na primer za določitev kraja prijave. Lokacije naprave ne spremljamo in je ne shranjujemo; shranimo le premaknjeno točko prijave, ki jo potrdite.

**Opozorilo, ko ste blizu (mobilna aplikacija).** Če to funkcijo izrecno vklopite in aplikaciji dovolite lokacijo tudi v ozadju, telefon sam preverja, ali ste vstopili v približno območje, kjer je bila nazadnje videna izgubljena žival. Ta območja so javna in približna. Preverjanje poteka samo v telefonu: vaše lokacije ne pošljemo nam ali komur koli drugemu. Funkcijo kadar koli izklopite v nastavitvah aplikacije in takrat iz telefona odstranimo vsa območja.

**Podatki v telefonu.** Da aplikacija deluje tudi brez povezave, v telefonu hrani javne prijave iz vaše okolice: približna območja in pomanjšane fotografije, največ 7 dni. Točk prijav, številk čipa, kontaktnih podatkov in pogovorov ne hrani. Ob odjavi te podatke izbrišemo.

**Zemljevid in iskanje krajev.** Zemljevidne ploščice naloži vaš brskalnik ali aplikacija neposredno pri strežnikih OpenFreeMap. Ti vidijo vaš IP naslov, piškotkov pa ne uporabljajo. Iskanje krajev in ime območja za točko na zemljevidu pripravimo na svojih strežnikih iz odprtih podatkov Geodetske uprave Republike Slovenije. Iskalnega niza in točke ne pošljemo nikomur drugemu in ju ne shranjujemo.

## 7. Prijave brez računa

Najdeno ali opaženo žival lahko prijavite brez računa. Pri tem nastane anonimna seja. Ob oddaji prijave dobite zasebno povezavo, prek katere prijavo upravljate in pišete v pogovoru. Hranimo samo zgoščeno vrednost povezave, ne povezave same. Zato je ne moremo obnoviti, razen če ste neobvezno vpisali e-naslov, na katerega smo jo poslali.

Za omejevanje zlorab hranimo naključen identifikator naprave in zgoščen IP naslov. Zgoščeni IP naslov izbrišemo po 48 urah. Prijavo in podatke lahko prek zasebne povezave kadar koli izbrišete.

## 8. Ujemanje, umetna inteligenca in samodejno skrivanje

### Ujemanje

Ko objavite prijavo, jo primerjamo z drugimi prijavami: po številki čipa, območju, času in lastnostih živali. Ko je vklopljena pomoč umetne inteligence, primerjamo tudi podobnost fotografij (spodaj). Če se prijavi ujemata samo po podobnosti fotografij, vam o tem pošljemo obvestilo le, če sta blizu tudi kraj in čas. [pravni pregled] Rezultat je samo predlog. Odloča oseba, ki žival išče: predlog potrdi ali zavrne. Predlog nima pravnih ali podobno pomembnih posledic za nikogar.

### Pomoč umetne inteligence

Ko je ta funkcija vklopljena, fotografije, ki jih naložite k prijavi ali profilu živali, obdelata dva ponudnika: [pravni pregled]

- **Anthropic Ireland, Limited (Irska)** z modelom Claude, ki prepozna vsebino slike. Predlaga vrsto, pasmo, barve, vzorec, velikost in ovratnico ter na kratko opiše posebne znake. Vrne tudi štiri varnostne oznake (da ali ne): ali je na sliki v ospredju oseba, golota, nasilje ali vidni kontaktni podatki. [pravni pregled]
- **Voyage AI Innovations, Inc. (ZDA)** izračuna številčni zapis slike (vektor), s katerim pri ujemanju iščemo podobne fotografije. [pravni pregled]

**Kaj pošljemo.** Samo pomanjšano kopijo fotografije (daljša stranica največ 1024 pik), na novo shranjeno brez metapodatkov EXIF. Ne pošljemo vašega imena, e-naslova ali drugih oznak uporabnika, oznak prijave ali fotografije, lokacije, besedila, ki ste ga vpisali, ali jezika. Pošljemo samo fotografije, naložene po vklopu pomoči umetne inteligence. Starejših fotografij ponudnikoma ne pošljemo. [pravni pregled]

**Ljudje na fotografijah.** Model opisuje samo žival. O osebah na fotografiji ne shranimo ničesar razen varnostnih oznak zgoraj in ne ugotavljamo, kdo so. Fotografij, na katerih je model zaznal osebo v ospredju ali goloto ali ni našel psa ali mačke, ne pošljemo ponudniku Voyage AI in zanje ne izračunamo vektorja. Enako velja za fotografije, ki jih model ni preveril. Varnostne oznake zdaj uporabljamo samo za to izločanje. [pravni pregled]

**Predlogi.** V obrazcu so predlogi označeni z »Predlog«. Lahko se motijo, zato jih preverite. Del prijave ali profila postanejo šele, ko jih potrdite oziroma ko obrazec shranite ali objavite. Do takrat jih lahko spremenite ali izbrišete. Polja, za katera predlog ni dovolj zanesljiv, pustimo prazna. Če pomoč ni na voljo, obrazec izpolnite sami in prijava deluje enako. [pravni pregled]

**Shranjevanje.** [pravni pregled]

- Rezultat ponudnika Anthropic shranimo pod zgoščeno vrednostjo slike (prstnim odtisom datoteke), ne pod vašim imenom ali računom. Tako iste slike ne pošljemo dvakrat, tudi če jo naloži kdo drug. Rezultat izbrišemo ob rednem čiščenju, ko pri nas ne ostane nobena fotografija s to zgoščeno vrednostjo.
- Vektor izbrišemo skupaj s fotografijo, torej tudi ob izbrisu prijave, profila živali ali računa.
- O vsakem klicu ponudnika hranimo zapis (fotografija, ponudnik, model, izid, poraba, strošek, trajanje), da nadziramo stroške in omejitve. Zapise izbrišemo po 62 dneh. Ko fotografijo izbrišemo, zapis z njo ni več povezan.

**Ponudnika, kraj obdelave in prenos.** Anthropic in Voyage AI fotografije obdelujeta kot naša obdelovalca, po naših navodilih. Pogoji vsakega ponudnika vključujejo dogovor o obdelavi podatkov. [pravni pregled]

- **Anthropic** podatke hrani v ZDA. Zahteve lahko obdela tudi v izbranih državah v Evropi, Aziji in Avstraliji, varnostne preglede, podporo in odzivanje na incidente pa lahko opravlja tudi v drugih državah, kjer delujejo on ali njegova povezana podjetja. Po Anthropicovih poslovnih pogojih naših podatkov ne sme uporabiti za učenje svojih modelov. Kopijo fotografije in rezultat samodejno izbriše v 30 dneh. Dlje ju lahko hrani, če ju njegovi varnostni sistemi označijo kot morebitno kršitev pravil uporabe (do dveh let, oceno varnostnega sistema do sedmih let) ali če to zahteva zakon. [pravni pregled]
- **Voyage AI** podatke obdeluje v ZDA. Pri Voyage AI smo zavrnili, da naše podatke hrani in uporablja za učenje svojih modelov. Zato kopijo fotografije izbriše takoj, ko jo obdela. [pravni pregled]
- Za prenos podatkov izven EU dogovora o obdelavi podatkov z obema ponudnikoma vključujeta standardne pogodbene klavzule Evropske komisije (poglavje 13). [pravni pregled]

### Samodejni prevod sporočil (Premium Zaščita)

Če ima v pogovoru vsaj ena oseba Premium Zaščito in ima prevod vklopljen, sporočila med slovenščino in angleščino samodejno prevaja **Anthropic Ireland, Limited** (isti ponudnik kot zgoraj, kot naš obdelovalec). Prevod velja v obe smeri: oseba s Premium Zaščito bere sporočila v svojem jeziku, druga oseba, na primer najditelj brez računa, pa njena sporočila v svojem. Obe osebi v pogovoru vidita obvestilo, da sporočila prevaja storitev umetne inteligence. [pravni pregled]

- **Kaj pošljemo.** Samo besedilo sporočila in jezik, v katerega prevajamo. Telefonske številke, e-naslove, povezave in številke, podobne številki čipa, pred pošiljanjem nadomestimo z oznakami in jih v prevod vstavimo nespremenjene. Imen, vzdevkov, oznak uporabnikov, pogovora ali prijave ne pošljemo. [pravni pregled]
- **Kdaj.** Izvirnik dostavimo takoj, prevod sledi. Sporočilo prevedemo samo, če je v drugem jeziku kot jezik bralca, in samo enkrat za vsak jezik. Brez osebe s Premium Zaščito v pogovoru ne prevajamo ničesar. [pravni pregled]
- **Brez učenja.** Anthropic naših podatkov ne sme uporabiti za učenje svojih modelov. Za hrambo pri ponudniku in kraj obdelave veljajo pogoji iz razdelka zgoraj. [pravni pregled]
- **Izvirnik velja.** Varnostno opozorilo, prijave zlorab, blokade in moderiranje delujejo na izvirniku. Izvirnik je vedno en dotik stran, prevod je označen s „Samodejno prevedeno“.
- **Hramba.** Prevod shranimo ob sporočilu in ga izbrišemo skupaj s pogovorom (poglavje 14). [pravni pregled]
- **Izklop.** Oseba s Premium Zaščito prevod izklopi v meniju pogovora. Od takrat ponudniku ne pošljemo nobenega novega sporočila iz tega pogovora.

Če prevod ni na voljo (mesečna omejitev, jezik, ki ga še ne podpiramo, ali napaka), je sporočilo prikazano v izvirniku in pogovor deluje enako.

### Samodejno začasno skritje

Če tri neodvisne osebe prijavijo isto prijavo zaradi zlorabe, jo začasno skrijemo, dokler je ne pregleda moderator. Moderator nato odloči, ali jo vrne ali odstrani. Če menite, da je bila prijava skrita po nepotrebnem, nam pišite na info@signapps.si. Odločitev bo ponovno pregledala oseba.

## 9. Plačila

**Trenutno stanje.** Plačila v Najdimo so zdaj samo v preskusnem načinu. Noben pravi denar se ne premakne in nobena kartica se ne bremeni. Ta poglavja o plačilih začnejo veljati, ko omogočimo prava plačila.

**Kako poteka plačilo.** Plačila obdeluje Stripe Payments Europe, Limited (Irska) prek strani Stripe Checkout. Ob plačilu vas preusmerimo na Stripovo stran. Podatkov o vaši kartici ne vidimo in jih ne hranimo. Pri nas ostanejo ID plačila, namen, znesek, stanje in časi. Stripe je za del obdelave (na primer preprečevanje goljufij in zakonske obveznosti) samostojni upravljavec; zanj velja Stripova politika zasebnosti.

**Kaj je vedno brezplačno.** Prijava izgubljene, najdene ali opažene živali, zemljevid in opozorila, ujemanje (čip, fotografija, lastnosti), pogovor, plakat v obliki PDF s QR kodo, deljenje in iskanje po številki čipa so brezplačni za vse, za vedno. Zavetišča in občine vse uporabljajo brezplačno. Plačljive možnosti tega nikoli ne omejujejo. QR koda na plakatu vodi samo na javno prijavo.

**Za kaj lahko plačate.** Zdaj: prispevek v zahvalo po ponovnem srečanju z živaljo (najmanj 2 €) in neobvezni prispevek po prijavi izgubljene živali (2–5 €). Pozneje: povečan doseg prijave (Boost), naročnina Premium Zaščita (mesečna ali letna; 7 dni pred letno obnovo vas opomnimo po e-pošti) in mesečna podpora Podpornik. Veterinarske ambulante lahko postanejo plačljivi Veterinarski partner (spodaj).

**Nagrada najditelju.** Nagrad ne izplačujemo in plačil med uporabniki ne posredujemo. Če lastnik v prijavi navede, da ponuja nagrado, je ta navedba del prijave (poglavje 3). Za nagrado se lastnik in najditelj dogovorita sama, zunaj Najdimo, zato o njej ne zbiramo nobenih plačilnih podatkov.

Prispevki so prostovoljna plačila družbi za delovanje storitve. Niso donacije.

### Veterinarski partner (poslovne stranke)

Veterinarski partner je mesečna poslovna naročnina za veterinarske ambulante. Vključuje preverjen profil ambulante, izpostavljeno mesto v oglasnih mestih „najbližji veterinar“ na njihovem območju, omembo v opozorilih o izgubljenih živalih in na plakatih v njihovi regiji (vedno označeno kot „Oglas“) ter mesečno poročilo z združenimi številkami (prikazi, kliki, ponovna srečanja na območju). Poročilo ne vsebuje osebnih podatkov.

- **Podatki:** podatki ambulante, ime, e-naslov in telefonska številka kontaktne osebe, podatki za obračun in davčna številka za DDV ter računi. Naročnino in račune z DDV obdeluje Stripe Billing; podatkov o kartici ne vidimo. Zdaj je Stripe samo v preskusnem načinu.
- **Pravna podlaga:** pogodba (člen 6(1)(b)) in zakonska obveznost za račune (člen 6(1)(c)).
- **Hramba:** profil ambulante in podatke kontaktne osebe hranimo do prenehanja naročnine in jih nato izbrišemo v 30 dneh, na zahtevo prej; račune in plačilne zapise toliko časa, kot zahtevata davčna in računovodska zakonodaja (pričakovano do 10 let).
- **Brezplačno ostane:** prijava najdene živali, iskanje po čipu, ujemanja in pogovor veljajo za veterinarje enako kot za vse.

## 10. Analitika in piškotki

Uporabo Najdimo merimo samo, če to dovolite.

- Na spletu uporabljamo Google Analytics 4, v aplikaciji pa Google Analytics for Firebase. Obe orodji pošiljata podatke v isto Googlovo lastnost, vsako prek svojega toka. Ponudnik je Google Ireland Limited.
- Dokler se ne odločite, ne naložimo nobene Googlove skripte, ne pošljemo nobene zahteve Googlu in ne nastavimo nobenega Googlovega piškotka.
- Vse štiri Googlove nastavitve privolitve (analytics_storage, ad_storage, ad_user_data, ad_personalization) so privzeto zavrnjene. Če sprejmete, odobrimo samo analytics_storage. Oglaševalske nastavitve ostanejo zavrnjene.
- Dogodki vsebujejo samo ime dogodka in parametre, kot so občina, statistična regija, vrsta živali, vrsta prijave, mesto in oznaka oglasa ter razred zneska. Nikoli ne vsebujejo imen, e-naslovov, telefonskih številk, številk čipa, koordinat, prostega besedila ali oznak prijav in uporabnikov.
- Googlovi signali so izklopljeni, deljenje podatkov je izklopljeno, podatke v Google Analytics hranimo 14 mesecev.
- Vašo izbiro (izbira, različica in čas) shranimo v piškotku `zz_consent`, ki velja 400 dni, v aplikaciji pa v varni shrambi naprave. Izbira velja 12 mesecev, nato vas vprašamo znova, prav tako ko se spremenijo ponudniki ali nameni.
- Privolitev kadar koli prekličete prek povezave „Nastavitve piškotkov“ v nogi strani ali v nastavitvah aplikacije. Preklic velja takoj, Googlove piškotke pa izbrišemo.

Seznam vseh piškotkov in podobnih zapisov je v [politiki piškotkov](/piskotki).

## 11. Štetje oglasov in statistika prijav

Oglasi so vedno označeni z „Oglas“. Oglasov ni v prijavi izgubljene ali najdene živali, ob vpisu, v pogovoru in pri plačilu.

Prikaze in klike štejemo v svoji zbirki, združeno po oglasu, oglasnem mestu, dnevu in regiji. Pri tem ne uporabljamo piškotkov, ne shranjujemo ničesar v vaši napravi in ne beležimo oznak, ki bi razkrile, kdo ste. Zato za to štetje ne potrebujemo privolitve. Oglas izberemo glede na kontekst, na primer regijo in vrsto živali, ne glede na to, kdo ste.

Klik gre prek naše preusmeritve na stran oglaševalca. Od tam naprej veljajo pravila oglaševalca. Oglaševalci od nas prejmejo samo združena poročila (prikazi in kliki).

**Statistika prijav.** Za vsako prijavo štejemo oglede javne strani (na spletu in v aplikaciji), delitve po kanalu (WhatsApp, Facebook, kopirana povezava, meni za deljenje v napravi, prenos plakata) in poslana opozorila po kanalu (potisno obvestilo, e-pošta, v aplikaciji). Števce hranimo združeno po prijavi in dnevu. Pri tem ne uporabljamo piškotkov, ne shranjujemo ničesar v vaši napravi in ne beležimo, kdo si je prijavo ogledal ali jo delil. Ogledov avtorja prijave, članov organizacij, moderatorjev in znanih robotov ne štejemo. Opozoril, ki jih telefon pokaže sam (poglavje 6), ne štejemo, ker lokacija ostane v telefonu. Zato za to štetje ne potrebujemo privolitve. Statistiko vidi samo avtor prijave s Premium Zaščito, pri prijavah zavetišč in občin pa člani te organizacije. Prijave, objavljene pred začetkom štetja, imajo statistiko od tega dne naprej. [pravni pregled]

## 12. Komu podatke zaupamo

Podatkov ne prodajamo. Ponudniki, ki jih potrebujemo za delovanje storitve, so:

| Ponudnik (vloga) | Čemu | Katere podatke prejme | Kje |
|---|---|---|---|
| Supabase Inc., ZDA (obdelovalec) | zbirka podatkov, vpis, dostava sporočil v pogovorih v živo | podatki iz poglavja 3 razen fotografij | podatki v EU, Frankfurt (AWS eu-central-1) |
| Hetzner Online GmbH, Nemčija (obdelovalec) | strežnik za spletno stran, aplikacijski vmesnik in opravila v ozadju | podatki, ki potujejo skozi storitev, in strežniški zapisi (IP naslov, tehnični podatki obiska) približno 7 dni | EU (Nemčija ali Finska) |
| Cloudflare, Inc., ZDA, storitev R2 (obdelovalec) | shramba fotografij, dostava javnih kopij fotografij prek Cloudflarovega omrežja, nočne šifrirane varnostne kopije zbirke | fotografije; varnostne kopije vsebujejo podatke iz poglavja 3; IP naslov, ko se naložijo javne fotografije | shramba v EU; javne kopije fotografij Cloudflare dostavlja prek svojega svetovnega omrežja |
| Brevo (Sendinblue SAS), Francija (obdelovalec) | e-pošta za vpis in obvestila | e-naslov, ime, jezik, besedilo sporočila | EU |
| Expo Push Service (650 Industries, Inc.), ZDA (obdelovalec); obvestila gredo prek Apple Push Notification service in Google Firebase Cloud Messaging | potisna obvestila | žeton naprave in besedilo obvestila, ki ne vsebuje osebnih podatkov | ZDA |
| Cloudflare Turnstile (Cloudflare, Inc.), ZDA (obdelovalec) | preverjanje „nisem robot“ ob ustvarjanju računa, anonimnih prijavah in obrazcu za partnerje | podatki o napravi in brskalniku, IP naslov | ZDA |
| OpenFreeMap (samostojni upravljavec) | zemljevidne ploščice | IP naslov (ploščice naloži vaš brskalnik ali aplikacija neposredno); brez piškotkov | javni strežniki ploščic |
| Google Ireland Limited (obdelovalec), samo z vašo privolitvijo | Google Analytics 4 in Google Analytics for Firebase | analitični dogodki iz poglavja 10 | EU, možna obdelava tudi v ZDA |
| Google in Apple (vsak kot samostojni upravljavec) | vpis z Googlom ali Applom, če ga izberete | podatki, ki jih ponudnik pošlje ob vpisu (e-naslov, ime, identifikator) | po pravilih ponudnika |
| Stripe Payments Europe, Limited, Irska (obdelovalec; za del obdelave samostojni upravljavec) | plačila in naročnine Veterinarski partner (ko so omogočeni), računi z DDV | podatki za plačilo, ki jih vnesete na Stripovi strani | EU, možna obdelava tudi v ZDA |
| Anthropic Ireland, Limited, Irska (obdelovalec), ko je pomoč umetne inteligence vklopljena [pravni pregled] | predlogi lastnosti živali iz fotografije, varnostne oznake; samodejni prevod sporočil v pogovorih z uporabnikom Premium Zaščite | pomanjšana kopija fotografije (največ 1024 pik), brez metapodatkov EXIF, oznak uporabnikov, prijav in fotografij, lokacije in besedila; pri prevodu besedilo sporočila brez telefonskih številk, e-naslovov, povezav in številk, podobnih številki čipa, ter ciljni jezik | hramba v ZDA; obdelava tudi v izbranih državah v Evropi, Aziji in Avstraliji [pravni pregled] |
| Voyage AI Innovations, Inc., ZDA (obdelovalec), ko je pomoč umetne inteligence vklopljena [pravni pregled] | vektor slike za iskanje podobnih fotografij pri ujemanju | enako kot Anthropic; ne prejme fotografij, na katerih je model zaznal osebo v ospredju ali goloto ali ni našel psa ali mačke | ZDA |
| Sentry (Functional Software, Inc.), podatkovna regija EU (obdelovalec), ko je sledenje napakam vklopljeno | sledenje napakam | tehnični podatki o napaki; osebne podatke pred pošiljanjem odstranimo | EU |

Poleg tega podatke posredujemo:

- **drugim uporabnikom**, v obsegu iz poglavja 5;
- **organom** (sodišču, policiji, inšpekciji), kadar nas k temu zavezuje zakon;
- **oglaševalcem** samo združene podatke brez osebnih podatkov (poglavje 11).

## 13. Prenosi izven EU

Glavna zbirka podatkov je v EU. Nekateri ponudniki iz poglavja 12 imajo sedež v ZDA ali podatke lahko obdelujejo tam. Za take prenose uporabljamo:

- okvir EU–ZDA za varstvo podatkov (Data Privacy Framework), kadar je ponudnik vanj vpisan;
- sicer standardne pogodbene klavzule Evropske komisije.

Kopijo zaščitnih ukrepov lahko zahtevate na e-naslovu iz poglavja 2.

## 14. Kako dolgo podatke hranimo

| Podatki | Rok hrambe |
|---|---|
| Račun, profili živali, nastavitve, nabiralnik obvestil, opozorila v bližini | do izbrisa računa |
| Odprte prijave | dokler so odprte ali do izbrisa |
| Fotografije zaključenih prijav | izbrišemo 12 mesecev po zaključku prijave |
| Shranjena (že približna) točka zaključene prijave | zameglimo 30 dni po zaključku prijave; ostaneta zamegljena točka in ime območja |
| Pogovori | izbrišemo 6 mesecev po zaključku povezane prijave |
| Samodejni prevodi sporočil | skupaj s pogovorom (6 mesecev po zaključku povezane prijave) [pravni pregled] |
| E-naslov najditelja za zasebno povezavo | izbrišemo 30 dni po zaključku prijave |
| Zgoščen IP naslov in podatki za omejevanje zahtev | 48 ur |
| Anonimni računi brez odprte prijave | 30 dni |
| Naložene datoteke, ki niso pripete na prijavo | 24 ur |
| Dnevnik pošiljanja e-pošte | 30 dni |
| Strežniški zapisi | približno 7 dni |
| Prijave zlorab in revizijski dnevnik skrbniških dejanj | do 24 mesecev |
| Analitika (Google Analytics 4) | 14 mesecev |
| Zapis privolitve za analitiko | Izbira velja 12 mesecev (piškotek živi 400 dni; ali varna shramba naprave) |
| Zgodbe z lepim koncem | do preklica privolitve; po preklicu jih odstranimo v 24 urah |
| Plačilni zapisi | dokler to zahtevata davčna in računovodska zakonodaja (pričakovano do 10 let) |
| Naročnina Premium Zaščita (paket, stanje, datum obnove) | do izbrisa računa; plačila naročnine kot plačilni zapisi |
| Statistika prijav (združeni števci) | skupaj s prijavo; števci ne vsebujejo osebnih podatkov [pravni pregled] |
| Veterinarski partner: profil ambulante in kontaktna oseba | do prenehanja naročnine, nato izbris v 30 dneh |
| Povpraševanja partnerjev | 24 mesecev po zadnjem stiku |
| Varnostne kopije | podatki iz njih izginejo najpozneje v 30 dneh |
| Rezultati pomoči umetne inteligence (shranjeni pod zgoščeno vrednostjo slike) | dokler pri nas obstaja fotografija s to zgoščeno vrednostjo [pravni pregled] |
| Vektorji slik | skupaj s fotografijo [pravni pregled] |
| Zapisi o klicih ponudnikov umetne inteligence | 62 dni; po izbrisu fotografije niso več povezani z njo [pravni pregled] |

**Izbris računa.** Ob izbrisu račun takoj onemogočimo, odprte prijave zaključimo, podatke pa izbrišemo ali anonimiziramo v 30 dneh. Izjema so plačilni zapisi, ki jih moramo hraniti po zakonu. Organizacije morajo pred izbrisom prenesti ali izbrisati organizacijo.

## 15. Vaše pravice

Imate pravico do:

- **dostopa** do svojih podatkov in kopije;
- **popravka** netočnih podatkov;
- **izbrisa** podatkov;
- **omejitve** obdelave;
- **prenosljivosti**: podatke prejmete v običajni strojno berljivi obliki;
- **ugovora** zoper obdelavo na podlagi zakonitega interesa;
- **preklica privolitve** kadar koli.

Podatke lahko izvozite (datoteka JSON ali ZIP) in račun izbrišete v nastavitvah računa. Anonimni najditelji lahko prijavo in podatke izbrišejo prek zasebne povezave. Za vse drugo nam pišite na info@signapps.si.

Odgovorimo najpozneje v enem mesecu. Pri zapletenih zahtevah lahko ta rok po zakonu podaljšamo; o tem vas obvestimo v prvem mesecu. Uveljavljanje pravic je brezplačno. Če ne moremo potrditi vaše identitete, vas lahko prosimo za dodatne podatke.

**Pritožba.** Če menite, da ravnamo nezakonito, se lahko pritožite pri nadzornem organu: Informacijski pooblaščenec Republike Slovenije, Dunajska cesta 22, 1000 Ljubljana, www.ip-rs.si. Pritožite se lahko tudi pri nadzornem organu v državi, kjer prebivate ali delate.

## 16. Varnost

Podatke varujemo z organizacijskimi in tehničnimi ukrepi, med drugim:

- povezave so šifrirane;
- zbirka podatkov ni neposredno dostopna iz brskalnika ali aplikacije: do podatkov pridemo samo prek našega strežnika, ki preveri, ali smete videti, kar zahtevate;
- skrbniški dostop zahteva močno overitev;
- varnostne kopije so šifrirane;
- število zahtev je omejeno, anonimne obrazce varuje preverjanje „nisem robot“;
- v kopijah fotografij za javni prikaz in v kopijah za ponudnika umetne inteligence ni metapodatkov EXIF. [pravni pregled]

Če pride do kršitve varstva podatkov, ki bi lahko ogrozila vaše pravice, bomo ravnali v skladu z zakonom, vključno z obvestilom Informacijskemu pooblaščencu in, kjer je to potrebno, vami.

## 17. Otroci

Račun lahko ustvarite, če ste dopolnili 15 let. Če izvemo, da je račun ustvarila mlajša oseba, ga izbrišemo. Plačljive možnosti so namenjene polnoletnim osebam. Če ste starš ali skrbnik in menite, da je otrok pri nas vpisal podatke, nam pišite na info@signapps.si.

## 18. Spremembe te politike

Politiko lahko spremenimo, na primer ko dodamo novo funkcijo ali ponudnika. Pomembne spremembe vam sporočimo vnaprej v aplikaciji, na spletni strani ali po e-pošti. Datum zadnje posodobitve je na vrhu strani.

---

# Privacy policy (English)

**Draft — requires client/legal review.**

Last updated: 19 October 2026

## 1. In short

Najdimo helps lost animals get home again. Everything that brings animals home is free for everyone. To do that we need some personal data. Here is a summary; the details follow.

- We use data to run the service: account, reports, matching, chat, alerts and payments.
- We show publicly only photos, the animal's attributes, an approximate area, the date and the circumstances. We never show a chip number, phone number, email address, the stored point of a report or the place where a found animal is kept.
- Only you can see the stored (approximate) point of your report, unless you share it in a chat yourself.
- We switch on Google Analytics only with your consent. If you decline, we send nothing to Google.
- We only count ads, without cookies and without any marker that could reveal who you are. We count report views and shares for report statistics the same way (chapter 11).
- When AI assistance is switched on, we suggest details about the animal from your photos. Suggestions are labelled, can be wrong and you can change them (chapter 8). [legal review]
- In a chat where at least one person has Premium Protect, an AI provider automatically translates messages between Slovenian and English. Both people can see this (chapter 8). [legal review]
- The main database is in the EU (Frankfurt), and so are our servers and photos. Some providers are in the United States; safeguards apply (chapter 13).
- You can export your data and delete your account. Use your rights at info@signapps.si.

## 2. Who is the controller

The controller of your personal data is the company SIGNAPPS, grafična in digitalna agencija, d.o.o., Kolomban 34B, 6280 Ankaran – Ancarano, Slovenia, registration number 6575536000. In this text "we" means that company as the operator of Najdimo.

For questions about privacy and to use your rights, write to info@signapps.si or call 040 975 210 (+386 40 975 210).

Shelters and other organisations are responsible for data they collect outside Najdimo (for example when taking in an animal).

Grammatically masculine terms in this text (for example "user", "controller", "moderator") apply to persons of all genders.

## 3. What data we process

You give us most of the data yourself: when you create an account, publish a report or write in a chat. Some data arises when you use the service, for example technical logs.

| Type of data | What it contains |
|---|---|
| Account and settings | display name, email address, password hash or Google/Apple identity, language, role (for example owner, finder or shelter), home area, default alert radius, optional phone number (never public), quiet hours, notification settings, push notification tokens |
| Pet profiles | species, name, breed, colours, pattern, size, sex, birth year, chip number (never public), chip status, collar, notes (including medication and temperament), one to five photos; later also vet records |
| Reports (lost, found, sighted animal) | report type, photos, approximate point, shifted by 20 to 30 m (visible only to the person who made the report), public approximate area, municipality and region, date and time, description of the circumstances, contact preference, and for a lost animal an optional reward line (amount, short note) |
| Reports without an account | anonymous session, private link (we store only its hash), optional email address to which we send the link, device identifier, hashed IP address for abuse limits |
| Chat | messages, aliases, read state, blocks; in chats with a Premium Protect user also the detected language of a message and its automatic translation [legal review] |
| Notifications and alerts | notification inbox, nearby-alert subscription (home point and radius) |
| Abuse and moderation | abuse reports, moderator decisions, audit log of administrator actions |
| Payments | payment ID, purpose, amount, status and timestamps; for a Premium Protect subscription also the plan (monthly or yearly), the subscription status and the renewal date. We never see your card details. |
| Report statistics | aggregate counters per report and day: views of the public page, shares by channel, alerts sent by channel; no identifiers of the people who viewed or shared the report [legal review] |
| Vet Partner (businesses) | clinic data (name, address, opening hours, services, booking or phone link, 24-hour emergency badge), contact person's name, email address and phone number, billing details and VAT ID (via Stripe), invoices |
| Partner enquiries | company, contact name, email address, optional phone number, region of interest, message, time of consent |
| Success stories | text and photos that we publish only with your explicit consent |
| Consents | your choice, text version, time |
| AI assistance (when switched on) | suggested attributes of the animal from the photo (species, breed, colours, pattern, size, collar, short descriptions of distinguishing marks), four yes/no safety flags (prominent person, nudity, violence, visible contact details), the image vector, a record of each provider call (photo, provider, model, outcome, usage, cost, duration) [legal review] |
| Technical data | IP address and device and browser type in server logs, email delivery log, error data |

**Do you have to provide data?** Without an account you can browse and report a found or sighted animal anonymously. For an account we need an email address or sign-in with Google or Apple. Other fields, such as the phone number, are optional. If you do not provide data that a feature strictly needs, we cannot provide that feature.

## 4. Why we process data and on what legal basis

| Purpose | Data | Legal basis |
|---|---|---|
| Account and sign-in | account and settings | contract (Article 6(1)(b) GDPR) |
| Publishing reports, public display, poster, sharing | pet profiles, reports, photos | contract |
| Matching and notices about suggestions | reports, pet profiles, chip number | contract |
| Chat between two people | messages, aliases | contract |
| Nearby alerts that you turn on | home area, radius, tokens | contract |
| Payments, once enabled | payment data | contract |
| Premium Protect subscription and the reminder email 7 days before a yearly renewal | subscription data, email address | contract |
| Automatic translation of messages in chats with a Premium Protect user (Anthropic) | message text without phone numbers, email addresses, links and chip-like numbers; the target language | for the Premium Protect user: contract; for the other person in the chat: legitimate interest in both people understanding each other [legal review] |
| Security, "not a robot" check, rate limits, abuse prevention | IP (hashed), device identifier, server logs | legitimate interest (Article 6(1)(f)) |
| Moderation, abuse reports, temporary hiding of a report | reports, messages (reported ones only), decisions | legitimate interest |
| Suggested attributes from the photo and safety flags (Anthropic) | smaller copy of the photo, the result | legitimate interest [legal review] |
| Finding similar photos for matching (Voyage AI) | smaller copy of the photo, the image vector | legitimate interest [legal review] |
| Controlling the cost and limits of AI assistance | records of provider calls | legitimate interest [legal review] |
| Counting ad impressions and clicks | aggregate counters with no identifiers of people | legitimate interest |
| Report statistics (views, shares, alerts sent) | aggregate counters with no identifiers of people | legitimate interest [legal review] |
| Improving the service without analytics cookies | aggregate statistics from our database | legitimate interest |
| Establishing, exercising and defending legal claims | data strictly needed for that | legitimate interest |
| Google Analytics 4 and Firebase | analytics events | consent (Article 6(1)(a)) |
| Success stories | text and photos | consent |
| Push notifications | device token | alerts that you turn on: contract; the permission to show notifications is set on your device and you can withdraw it at any time |
| Answering a partner enquiry | form data | steps before entering into a contract at your request, and the consent you give by submitting the form |
| Vet Partner: subscription, invoice, clinic profile, monthly report | clinic and contact person data, billing details | contract |
| Accounting and tax records | payment data | legal obligation (Article 6(1)(c)) |

Where the legal basis is "legitimate interest", we have assessed that your interests and rights do not override our interest in keeping the service safe and free of abuse. You can object to such processing (chapter 15).

For AI assistance, our interest is to make reporting faster and to find lost animals sooner. The processing is limited to a smaller copy of the photo, sent without your name, identifiers or location, and the result is only a suggestion (chapter 8). [legal review]

Where processing rests on consent, you can withdraw it at any time. Withdrawal does not affect the lawfulness of processing before it.

## 5. What others can see

- **Anyone, even without an account, sees:** photos, the animal's attributes, the approximate area, the date and the circumstances you described.
- **Nobody sees:** the chip number, phone number, email address, the stored point of a report and the place where a found animal is kept.
- **Only you see:** the approximate point of your report (shifted by 20 to 30 m). We show it to the other person in a chat only if you share it there yourself.
- **The two people in a chat** see the aliases and messages. Moderators read messages only if someone has reported the chat as abuse.
- **Shelters and vets:** when they enter a chip number that is registered with us, we notify the person who is looking for the animal. We show the shelter or vet no personal data.

Please do not enter other people's personal data in free text (circumstances, notes). Please also do not publish photos in which people can be recognised.

## 6. Photos and location

**Photos.** Photos can contain metadata (EXIF), for example the time and position of the shot. On your device we can use it to suggest a place and time for the form. We remove the metadata from the copies we show publicly. The originals are private. The copy we send to the AI providers carries no metadata either (chapter 8). [legal review]

**Report location.** We never store the raw GPS point. When you save, we randomly move the point you mark by 20 to 30 m: first on your device, and again on our server. The shift is made once and does not change between views. The stored point is therefore approximate and only you can see it (labelled "Approximate location · visible only to you"). The public sees a wider area calculated from that point: at least 500 m radius for a lost animal, at least 150 m for a found or sighted one. We do not write coordinates to logs. 30 days after a report closes, we blur the stored point further, so only the blurred point and the area name remain.

**Device location.** We use your device location only when you choose to, for example to set the place of a report. We do not track or store your device location; we store only the shifted report point you confirm.

**Alerts when you are nearby (mobile app).** If you turn this feature on and allow the app to use your location in the background, your phone itself checks whether you have entered an approximate area where a lost pet was last seen. These areas are public and approximate. The check happens only on your phone: your location is never sent to us or to anyone else. You can turn the feature off at any time in the app settings, and we then remove all areas from your phone.

**Data on your phone.** So that the app also works offline, it keeps public reports from your area on your phone: approximate areas and small photos, for at most 7 days. It never keeps report points, chip numbers, contact details or chats. When you sign out, we delete this data.

**Map and place search.** Your browser or app loads map tiles directly from OpenFreeMap servers. They can see your IP address and use no cookies. Place search and the area name for a point on the map run on our own servers, using open data from the Surveying and Mapping Authority of the Republic of Slovenia. We send the search text and the point to no one else and do not store them.

## 7. Reports without an account

You can report a found or sighted animal without an account. This creates an anonymous session. When you submit the report you receive a private link that you use to manage the report and to chat. We store only a hash of the link, not the link itself. For that reason we cannot restore it unless you optionally entered an email address.

To limit abuse we keep a random device identifier and a hashed IP address. We delete the hashed IP address after 48 hours. You can delete the report and its data at any time through the private link.

## 8. Matching, artificial intelligence and automatic hiding

### Matching

When you publish a report, we compare it with other reports: by chip number, area, time and the animal's attributes. When AI assistance is switched on, we also compare how similar the photos are (below). If two reports match only on how similar their photos are, we send you a notification about it only if the place and time are also close. [legal review] The result is only a suggestion. The person looking for the animal decides: they confirm or reject the suggestion. A suggestion has no legal or similarly significant effect on anyone.

### AI assistance

When this feature is switched on, the photos you upload to a report or pet profile are processed by two providers: [legal review]

- **Anthropic Ireland, Limited (Ireland)**, with the Claude model, which recognises what is in an image. It suggests the species, breed, colours, pattern, size and collar, and briefly describes distinguishing marks. It also returns four safety flags (yes or no): whether a person is prominent in the image, and whether it shows nudity, violence or visible contact details. [legal review]
- **Voyage AI Innovations, Inc. (USA)** computes a numerical representation of the image (a vector) that we use to look for similar photos when matching. [legal review]

**What we send.** Only a smaller copy of the photo (longer side at most 1024 pixels), saved again without EXIF metadata. We do not send your name, email address or any other user identifier, report or photo identifiers, location, the text you entered, or your language. We send only photos uploaded after AI assistance was switched on. Older photos are never sent to the providers. [legal review]

**People in photos.** The model describes only the animal. About the people in a photo we keep nothing beyond the safety flags above, and we do not try to find out who they are. Photos in which the model detected a prominent person or nudity, or found no dog or cat, are not sent to Voyage AI and get no vector. The same applies to photos the model has not checked. For now, the safety flags are used only for this exclusion. [legal review]

**Suggestions.** In the form, suggestions are labelled "Suggested". They can be wrong, so please check them. They become part of the report or profile only once you confirm them, or save or publish the form. Until then you can change or delete them. If a suggestion is not reliable enough, we leave the field empty. If AI assistance is not available, you fill in the form yourself and the report works the same. [legal review]

**Storage.** [legal review]

- We store Anthropic's result under a hash of the image (a fingerprint of the file), not under your name or account. That way we never send the same image twice, even if someone else uploads it. We delete the result in our regular clean-up once no photo with that hash remains with us.
- We delete the vector together with the photo, so also when a report, a pet profile or an account is deleted.
- We keep a record of every provider call (photo, provider, model, outcome, usage, cost, duration) to control costs and limits. We delete these records after 62 days. Once a photo is deleted, its record is no longer linked to it.

**The providers, where they process data, and transfers.** Anthropic and Voyage AI process the photos as our processors, on our instructions. Each provider's terms include a data processing agreement. [legal review]

- **Anthropic** stores the data in the USA. It may also process requests in selected countries in Europe, Asia and Australia, and it may carry out safety reviews, support and incident response in other countries where it or its affiliates operate. Under Anthropic's commercial terms, it may not use our data to train its models. It deletes the copy of the photo and the result automatically within 30 days. It may keep them longer if its safety systems flag them as a possible breach of its usage policy (up to two years, the safety system's score up to seven years), or where the law requires it. [legal review]
- **Voyage AI** processes the data in the USA. We have opted out of Voyage AI storing our data and using it to train its models, so it deletes the copy of the photo as soon as it has processed it. [legal review]
- For transfers outside the EU, the data processing agreements with both providers include the European Commission's standard contractual clauses (chapter 13). [legal review]

### Automatic translation of messages (Premium Protect)

If at least one person in a chat has Premium Protect with translation switched on, **Anthropic Ireland, Limited** (the same provider as above, as our processor) automatically translates messages between Slovenian and English. Translation works both ways: the person with Premium Protect reads messages in their language, and the other person, for example a finder without an account, reads theirs in their own. Both people in the chat see a notice that messages are translated by an AI service. [legal review]

- **What we send.** Only the text of the message and the language we translate into. Before sending, we replace phone numbers, email addresses, links and chip-like numbers with placeholders, and put them back unchanged in the translation. We send no names, aliases, or user, chat or report identifiers. [legal review]
- **When.** We deliver the original at once; the translation follows. We translate a message only if it is in a language other than the reader's, and only once per language. Without a person with Premium Protect in the chat, we translate nothing. [legal review]
- **No training.** Anthropic may not use our data to train its models. Its retention and processing locations are as described above. [legal review]
- **The original counts.** The safety banner, abuse reports, blocking and moderation act on the original. The original is always one tap away, and a translation is labelled "Auto-translated".
- **Retention.** We keep the translation with the message and delete it together with the chat (chapter 14). [legal review]
- **Switching off.** The person with Premium Protect switches translation off in the chat menu. From then on we send no new message from that chat to the provider.

If a translation is not available (the monthly limit, a language we do not support yet, or an error), the message shows in the original and the chat works the same.

### Automatic temporary hiding

If three independent people report the same listing for abuse, we hide it temporarily until a moderator reviews it. The moderator then decides whether to restore or remove it. If you think a report was hidden unnecessarily, write to info@signapps.si. A person will review the decision again.

## 9. Payments

**Current status.** Payments in Najdimo are at present in test mode only. No real money moves and no card is charged. These chapters on payments apply once we enable live payments.

**How a payment works.** Payments are processed by Stripe Payments Europe, Limited (Ireland) through Stripe Checkout. When you pay, we redirect you to Stripe's page. We never see or store your card details. We keep the payment ID, purpose, amount, status and timestamps. For part of the processing (for example fraud prevention and legal obligations) Stripe is an independent controller and its own privacy policy applies.

**What is always free.** Reporting a lost, found or sighted animal, the map and alerts, matching (chip, photo, attributes), chat, the printable PDF poster with a QR code, sharing and chip lookup are free for everyone, forever. Shelters and municipalities use everything for free. Paid options never restrict this. The QR code on the poster leads only to the public listing.

**What you can pay for.** Now: a thank-you contribution after a reunion with your animal (at least €2) and an optional contribution after reporting a lost animal (€2–5). Later: a boost for a report's visibility, the Premium Protect subscription (monthly or yearly; we remind you by email 7 days before a yearly renewal) and the monthly supporter plan Podpornik. Vet clinics can become a paying Vet Partner (below).

**Rewards for finders.** We do not pay out rewards and do not handle payments between users. If an owner states in a report that they offer a reward, that statement is part of the report (chapter 3). The owner and the finder arrange any reward between themselves, outside Najdimo, so we collect no payment data about it.

Contributions are voluntary payments to a company to help run the service. They are not donations.

### Vet Partner (business customers)

Vet Partner is a monthly business subscription for vet clinics. It includes a verified clinic profile, featured placement in the "nearest vet" ad slots in their area, a mention in lost-pet alerts and on posters for their region (always labelled "Ad"), and a monthly report with aggregate figures (impressions, clicks, reunions in the area). The report contains no personal data.

- **Data:** clinic data, the contact person's name, email address and phone number, billing details and VAT ID, and invoices. Stripe Billing handles the subscription and VAT invoices; we never see card details. Stripe is in test mode only for now.
- **Legal basis:** contract (Article 6(1)(b)) and legal obligation for invoices (Article 6(1)(c)).
- **Retention:** we keep the clinic profile and the contact person's data until the subscription ends and delete them within 30 days after that, or earlier on request; invoices and payment records for as long as tax and accounting law requires (expected up to 10 years).
- **Stays free:** reporting a found animal, chip lookup, matches and chat work for vets exactly as for everyone else.

## 10. Analytics and cookies

We measure the use of Najdimo only if you allow it.

- On the web we use Google Analytics 4 and in the app Google Analytics for Firebase. Both tools send data to the same Google property, each through its own stream. The provider is Google Ireland Limited.
- Until you decide, we do not load any Google script, send any request to Google or set any Google cookie.
- All four Google consent settings (analytics_storage, ad_storage, ad_user_data, ad_personalization) are denied by default. If you accept, we grant only analytics_storage. The advertising settings stay denied.
- Events contain only the event name and parameters such as municipality, statistical region, species, report type, ad slot and ad ID, and amount range. They never contain names, email addresses, phone numbers, chip numbers, coordinates, free text, or report or user IDs.
- Google signals are off, data sharing is off, and we keep data in Google Analytics for 14 months.
- We store your choice (choice, version and time) in the `zz_consent` cookie, which lives 400 days, and in the app in the device's secure storage. The choice counts for 12 months; we ask you again after that, or when providers or purposes change.
- You can withdraw consent at any time through "Cookie settings" in the page footer or in the app settings. Withdrawal takes effect at once and we delete the Google cookies.

The list of all cookies and similar storage is in the [cookie policy](/en/cookies).

## 11. Ad counting and report statistics

Ads are always labelled "Ad". There are no ads in the report-lost and report-found flows, at sign-in, in chat or at payment.

We count impressions and clicks in our own database, aggregated by ad, ad slot, day and region. We use no cookies, store nothing on your device and record no identifiers that could reveal who you are. For that reason we do not need consent for this counting. We choose an ad by context, for example the region and species, not by who you are.

A click goes through our redirect to the advertiser's page. From there the advertiser's rules apply. Advertisers receive only aggregated reports from us (impressions and clicks).

**Report statistics.** For every report we count views of the public page (on the web and in the app), shares by channel (WhatsApp, Facebook, copied link, the device's share menu, poster download) and alerts sent by channel (push, email, in the app). We keep the counters aggregated per report and day. We use no cookies, store nothing on your device and record nothing about who viewed or shared the report. Views by the person who made the report, by organisation members, by moderators and by known bots are not counted. Alerts that a phone shows by itself (chapter 6) are not counted, because the location stays on the phone. For that reason we do not need consent for this counting. Only the person who made the report sees the statistics, if they have Premium Protect; for shelter and municipality reports, the members of that organisation. Reports published before counting started have statistics from that day on. [legal review]

## 12. Who we entrust data to

We do not sell data. The providers we need to run the service are:

| Provider (role) | Purpose | Data it receives | Where |
|---|---|---|---|
| Supabase Inc., USA (processor) | database, sign-in, delivery of live chat messages | data from chapter 3 except photos | data in the EU, Frankfurt (AWS eu-central-1) |
| Hetzner Online GmbH, Germany (processor) | server for the website, the API and background jobs | data passing through the service, and server logs (IP address, technical data of the visit) for about 7 days | EU (Germany or Finland) |
| Cloudflare, Inc., USA, R2 service (processor) | photo storage, delivery of public photo copies through Cloudflare's network, nightly encrypted database backups | photos; backups contain the data from chapter 3; IP address when public photos load | storage in the EU; Cloudflare delivers public photo copies through its global network |
| Brevo (Sendinblue SAS), France (processor) | email for sign-in and notifications | email address, name, language, message text | EU |
| Expo Push Service (650 Industries, Inc.), USA (processor); notifications travel through Apple Push Notification service and Google Firebase Cloud Messaging | push notifications | device token and notification text, which contains no personal data | USA |
| Cloudflare Turnstile (Cloudflare, Inc.), USA (processor) | "not a robot" check at account creation, anonymous reports and the partner form | device and browser signals, IP address | USA |
| OpenFreeMap (independent controller) | map tiles | IP address (your browser or app loads the tiles directly); no cookies | public tile servers |
| Google Ireland Limited (processor), only with your consent | Google Analytics 4 and Google Analytics for Firebase | analytics events from chapter 10 | EU, processing in the USA is also possible |
| Google and Apple (each an independent controller) | sign-in with Google or Apple, if you choose it | data the provider sends at sign-in (email, name, identifier) | under the provider's rules |
| Stripe Payments Europe, Limited, Ireland (processor; for part of the processing an independent controller) | payments and Vet Partner subscriptions (once enabled), VAT invoices | payment data you enter on Stripe's page | EU, processing in the USA is also possible |
| Anthropic Ireland, Limited, Ireland (processor), when AI assistance is switched on [legal review] | suggested attributes of the animal from the photo, safety flags; automatic translation of messages in chats with a Premium Protect user | a smaller copy of the photo (at most 1024 pixels), with no EXIF metadata, user, report or photo identifiers, location or text; for translation, the message text without phone numbers, email addresses, links and chip-like numbers, and the target language | storage in the USA; processing also in selected countries in Europe, Asia and Australia [legal review] |
| Voyage AI Innovations, Inc., USA (processor), when AI assistance is switched on [legal review] | image vector to look for similar photos when matching | the same as Anthropic; it never receives photos in which the model detected a prominent person or nudity, or found no dog or cat | USA |
| Sentry (Functional Software, Inc.), EU data region (processor), when error tracking is switched on | error tracking | technical data about the error; we remove personal data before sending | EU |

We also share data with:

- **other users**, to the extent described in chapter 5;
- **authorities** (courts, police, inspectorates) where the law requires us to;
- **advertisers**, only aggregated data without personal data (chapter 11).

## 13. Transfers outside the EU

The main database is in the EU. Some providers in chapter 12 are based in the United States or may process data there. For such transfers we use:

- the EU–US Data Privacy Framework, where the provider is certified under it;
- otherwise, the European Commission's standard contractual clauses.

You can ask for a copy of the safeguards at the email address in chapter 2.

## 14. How long we keep data

| Data | Retention |
|---|---|
| Account, pet profiles, settings, notification inbox, nearby alerts | until you delete your account |
| Open reports | while they are open or until deleted |
| Photos of closed reports | deleted 12 months after the report closes |
| Stored (already approximate) point of a closed report | blurred 30 days after the report closes; only the blurred point and the area name remain |
| Chats | deleted 6 months after the related report closes |
| Automatic message translations | together with the chat (6 months after the related report closes) [legal review] |
| Finder's email address for the private link | deleted 30 days after the report closes |
| Hashed IP address and rate-limit data | 48 hours |
| Anonymous accounts without an open report | 30 days |
| Uploaded files not attached to a report | 24 hours |
| Email delivery log | 30 days |
| Server logs | about 7 days |
| Abuse reports and audit log of administrator actions | up to 24 months |
| Analytics (Google Analytics 4) | 14 months |
| Consent record for analytics | The choice counts 12 months (the cookie lives 400 days; or the device's secure storage) |
| Success stories | until you withdraw consent; after withdrawal we remove them within 24 hours |
| Payment records | as long as tax and accounting law requires (expected up to 10 years) |
| Premium Protect subscription (plan, status, renewal date) | until you delete your account; subscription payments as payment records |
| Report statistics (aggregate counters) | together with the report; the counters hold no personal data [legal review] |
| Vet Partner: clinic profile and contact person | until the subscription ends, then deleted within 30 days |
| Partner enquiries | 24 months after the last contact |
| Backups | data disappears from them within 30 days at the latest |
| AI assistance results (stored under the image hash) | while a photo with that hash exists with us [legal review] |
| Image vectors | together with the photo [legal review] |
| Records of AI provider calls | 62 days; no longer linked to the photo once it is deleted [legal review] |

**Deleting your account.** When you delete your account, we disable it at once, close open reports, and delete or anonymise the data within 30 days. The exception is payment records, which we must keep by law. Organisations must transfer or delete the organisation first.

## 15. Your rights

You have the right to:

- **access** your data and receive a copy;
- **rectification** of inaccurate data;
- **erasure** of your data;
- **restriction** of processing;
- **portability**: you receive your data in a common machine-readable format;
- **object** to processing based on legitimate interest;
- **withdraw consent** at any time.

You can export your data (a JSON or ZIP file) and delete your account in your account settings. Anonymous finders can delete their report and data through the private link. For anything else, write to info@signapps.si.

We reply within one month at the latest. For complex requests the law allows us to extend this period; we tell you within the first month. Using your rights is free of charge. If we cannot confirm your identity, we may ask you for further information.

**Complaint.** If you think we are acting unlawfully, you can complain to the supervisory authority: Informacijski pooblaščenec Republike Slovenije (Information Commissioner of the Republic of Slovenia), Dunajska cesta 22, 1000 Ljubljana, www.ip-rs.si. You may also complain to the supervisory authority in the country where you live or work.

## 16. Security

We protect data with organisational and technical measures, including:

- connections are encrypted;
- the database cannot be reached directly from a browser or the app: data is accessed only through our server, which checks that you are allowed to see it;
- administrator access requires strong authentication;
- backups are encrypted;
- the number of requests is limited, and anonymous forms are protected by a "not a robot" check;
- copies of photos shown publicly, and copies sent to the AI providers, carry no EXIF metadata. [legal review]

If a personal data breach occurs that could put your rights at risk, we will act as the law requires, including by notifying the Information Commissioner and, where necessary, you.

## 17. Children

You can create an account if you are at least 15 years old. If we learn that a younger person created an account, we delete it. Paid options are intended for adults. If you are a parent or guardian and think a child has entered data with us, write to info@signapps.si.

## 18. Changes to this policy

We may change this policy, for example when we add a new feature or provider. We will tell you about important changes in advance in the app, on the website or by email. The date of the last update is at the top of the page.

---

# Notes for legal review (EN, internal, not published)

1. **Company details.** Every `[naročnik: …]` / `[client: …]` marker needs a client value: full company name and legal form, registered address, registration number, privacy contact email, general contact email, phone number. The page template must fail the build while a marker is left in the text.
2. **DPO.** No DPO is named. Please document the Article 37 GDPR assessment (the service processes location and photo data at scale, but not systematic monitoring of people). If no DPO is needed, the privacy contact email stands in.
3. **Legal bases to confirm.** (a) Anonymous finders: I mapped reports without an account to "contract"; "legitimate interest" may fit better because no account is created. (b) Partner enquiries: the brief stores a consent timestamp, so I named both pre-contractual steps and consent; for B2B contacts consent is not strictly needed. (c) Push notifications: OS-level permission is not GDPR consent as such; the sending of alerts the user turned on is contract. (d) A legitimate-interest assessment (LIA) is needed for: AI suggestions and screening, moderation and automatic hiding, ad counting, service improvement. (e) Added purpose not in the brief: "establishing, exercising and defending legal claims".
4. **DPIA screening** recommended before launch (location data of owners, photos, AI processing, automatic hiding). Also check the record of processing (Article 30) and the data inventory (FR-034 R-034.3) against the tables in chapters 3 and 14.
5. **Article 22 GDPR.** Automatic temporary hiding after three independent abuse reports could be seen as a decision with significant effect for the poster. I described human review and a contest route by email. Please confirm this is sufficient.
6. **Minimum age 15.** Proposal based on the age of digital consent under ZVOP-2; I did not verify the article number. Contract capacity of minors under 18 under Slovenian civil law is limited, so I wrote that paid options are for adults (same line in the terms). This is a proposal, not a brief requirement.
7. **Retention values are proposals** (A-012). Items I had to propose beyond the brief: "abuse reports and audit log: up to 24 months"; "consent record 12 months" (how long the choice counts; the cookie itself lives 400 days; evidence of consent may need to be kept longer). Open: what remains of a closed report after the photos are removed at 12 months and the point is blurred at 30 days (text, municipality, dates, species)? Payment records "up to 10 years" is a likely Slovenian requirement and must be confirmed by the accountant. Sentry retention is not stated in the text; confirm and add if needed.
8. **International transfers.** Verify the Data Privacy Framework certification of each US provider at go-live (Supabase Inc., Cloudflare, Stripe, 650 Industries/Expo, Anthropic, Voyage AI (part of MongoDB, Inc. since 2025), Sentry, Google). Where not certified, standard contractual clauses and a transfer impact assessment are needed. Data processing agreements are needed with every processor in chapter 12 (the Google Analytics data processing terms must be accepted in GA4).
9. **Hosting and backups (updated in 0.3).** Brief v1.0: a Hetzner server in the EU runs the website, API and job worker; photos and nightly database backups are on Cloudflare R2; Vercel and Supabase file storage are no longer used. The text says R2 storage is in the EU, which holds only if the buckets are created with EU jurisdiction (requested from the tech lead). The Hetzner location (Germany or Finland) is a client decision.
10. **Map providers (changed in 0.4).** Place search and the area name for a point run on our own geocoder in the API, on GURS data (ADR-007, contract C6): queries and points travel only in POST bodies to our server, are never logged or stored, and reach no third party, so the rounding question is moot (lawyer pack LQ-21 and LQ-64 N/A). OpenFreeMap stays listed as an independent controller for map tiles (IP address) because we cannot instruct it.
11. **AI providers (updated 2026-10-19).** Chapter 8 now states the providers' retention, training, location and transfer terms, taken from their own published documents and the owner's facts (note 23). The owner decided on 2026-10-19 to publish this before your approval; please review the wording (LQ-36). AI Act transparency: LQ-37.
12. **Ads.** Confirm that ad selection uses only context (region, species) and never a user profile; the "by context" sentence in chapter 11 depends on it. Confirm that sponsors only get aggregate reports.
13. **Background location (updated in 0.3).** Chapter 6 now explains the opt-in proximity alerts (FR-043): the operating system checks geofences on the phone and no location leaves the device. Confirm with the mobile developers before publishing.
14. **Features that are not live yet.** AI assistance, payments, Boost, Premium, Podpornik, Vet Partner, the reward line, success stories, self-service export and delete, and Sentry error tracking are written as they will be at launch. Publish each part only when the feature goes live, or version the page per release. Payments are test mode only now.
15. **Email.** The text says nothing about marketing emails (none planned). If any are added, a separate consent and an update are needed.
16. **Shelters and organisations.** I wrote that they are responsible for data they collect outside Najdimo. If shelters upload intake data into Najdimo, check whether the relationship is joint controllership or processing on their behalf.
17. **Third-party data.** Photos and free text may show other people. The text asks users to avoid it; moderation handling needs a procedure.
18. **Template.** The section numbers are written into the headings and cross-references use "chapter N" (SL "poglavje N"). If the page template numbers headings itself, remove the manual numbers and keep the references in sync. English date format follows the style guide ("14 October 2026"); Slovenian uses "14. 10. 2026".
19. **Vet Partner (new in 0.2).** (a) Controller/processor: the clinic is a business customer; the contact person is a natural person, so GDPR applies to their data. Confirm the legal basis (contract) and retention (30 days after the subscription ends; invoices per tax law, proposed up to 10 years, accountant to confirm). (b) Stripe Billing and VAT invoicing: confirm Stripe's role, the VAT ID collection and the invoice rules with the accountant. (c) The monthly report is aggregate only; confirm no personal data enters it. (d) Paid mentions in alerts and on posters must be labelled "Ad" (consumer-protection and ad-labelling rules). (e) Removed with this version: QR/NFC tags (order, delivery address, 90-day retention) and Shelter Pro (brief v0.7).
20. **Quality.** The Slovenian text needs a native legal review of terminology (upravljavec, obdelovalec, zakoniti interes, pogodbene klavzule). Contributions are described as voluntary payments to a company, never donations (Q-008); no dohodnina text.
21. **Version 0.3.** Processors per brief v1.0, exact location shared in a chat (FR-004 R-004.3), on-device proximity alerts and offline cache (FR-041, FR-043), API-only database access (ADR-021). Every open point of this draft is consolidated, with a proposed answer, in `docs/legal/lawyer-briefing.md` (§6).
22. **Version 0.4.** Reward escrow is out of scope (brief v1.1, Q-011 closed): the Stripe Connect payout, the 5 % platform fee and the finder's identity and bank data (Stripe KYC) are gone from chapters 9 and 12. The owner's optional, display-only reward line is report data; no payment data about rewards exists. Lawyer pack: LQ-48, LQ-49, LQ-53 N/A; the reward line is LQ-67. Also in 0.4: own geocoder on GURS data (note 10); the processor table and chapter 13 no longer name MapTiler, Photon or Switzerland.
23. **AI provider facts (new in 0.8, filled 2026-10-19).** These replaced the `[naročnik: …]` / `[client: …]` markers in chapters 8 and 12. Every claim comes from the provider's own published document (URL and the date it was read) or from the owner (date). Where a fact is not published, it is listed as unknown and the text does not claim it.
    (a) **Owner facts, 2026-10-19.** A payment method was added in the Voyage AI dashboard and the training opt-out is on. Only photos uploaded after AI assistance is switched on are sent to the providers; older photos are never sent (TASK-40.11). Decision: publish 0.8 on najdimo.si before AI is switched on (text accepted in advance by the owner, Primož Božič, 2026-10-19); the lawyer review continues (LQ-36, LQ-37, LQ-68 to LQ-71 open). Please keep a dated screenshot of the opt-out.
    (b) **Anthropic, contracting entity.** Commercial Terms of Service, https://www.anthropic.com/legal/commercial-terms (effective 17 June 2025, read 2026-10-19): they "govern Customer's use of Anthropic API keys"; "'Anthropic' means Anthropic Ireland, Limited if Customer resides in the European Economic Area ('EEA'), Switzerland or UK, and Anthropic, PBC if Customer resides anywhere else." The DPA page footer: "Services in the EU are provided by Anthropic Ireland Limited."
    (c) **Anthropic, training.** Same Commercial Terms, §B: "Anthropic may not train models on Customer Content from Services."
    (d) **Anthropic, retention.** Privacy centre, "How long do you store my organization's data?", https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data (page dated 1 July 2026, read 2026-10-19): "For Anthropic API users, we automatically delete inputs and outputs on our backend within 30 days of receipt or generation", except: a service with retention under the customer's control such as the Files API (not used by C19), an agreement otherwise such as zero data retention (none known), Usage Policy enforcement and legal requirements; inputs and outputs flagged by trust and safety classifiers up to 2 years, classification scores up to 7 years; feedback 5 years (we send none); anonymised data for research where the contract allows (not personal data; not claimed). Covered Models: https://privacy.claude.com/en/articles/15425996-data-retention-practices-for-mythos-class-models (dated 5 September 2026, read 2026-10-19) covers Mythos-class models only; C19 uses `claude-haiku-5-5` (fallback `claude-sonnet-5-5`), which are not covered. The text says "may keep them longer if flagged ... or where the law requires it", without "only", so the other exceptions are not denied.
    (e) **Anthropic, location.** Privacy centre, "Where are your servers located? Do you host your models on EU servers?", https://privacy.claude.com/en/articles/7996890 (dated 15 June 2026, read 2026-10-19): "data is stored in the US"; "By default, we may route customer traffic to select countries in the US, Europe, Asia and Australia"; safety review, support and incident response may happen "in countries where we or our affiliates operate". Data residency docs, https://platform.claude.com/docs/en/manage-claude/data-residency (read 2026-10-19): `inference_geo` is `"global"` by default ("may run in any available geography") or `"us"` (1.1x price on Claude 4.6 and later, Haiku 5.5 included); workspace geo is `"us"` only. C19 sets no `inference_geo`. Unknown: our workspace's `default_inference_geo` (owner's Console, not public), so the text names the other regions. If the owner sets `"us"` for the workspace, chapter 8 and chapter 12 can say "USA" only.
    (f) **Anthropic, DPA and transfer basis.** Data Processing Addendum, https://www.anthropic.com/legal/data-processing-addendum (effective 24 February 2025, read 2026-10-19): incorporated by Commercial Terms §C; Anthropic is the customer's processor (§B.1); §I.1 incorporates "the SCCs Module Two (controller to processor) and/or Module Three (processor to processor)" "to the extent required by Applicable Data Protection Laws"; §I.4 gives transfer impact assessment support; the data importer is "the Anthropic entity that executed the Agreement". No mention of the Data Privacy Framework. Anthropic's privacy policy, https://www.anthropic.com/legal/privacy (effective 10 September 2026, read 2026-10-19), relies on standard contractual clauses for transfers to affiliates and has no DPF mention. Open for you: our contracting party is an EEA entity, so the transfer to the USA is Anthropic's onward transfer; whether that fully covers us (LQ-20, LQ-36).
    (g) **Voyage AI, contracting entity, training and retention.** Terms of Service, https://www.voyageai.com/tos (last updated 27 May 2026, read 2026-10-19): "The Service is owned and operated by Voyage AI Innovations, Inc."; California law; Customer Content may be used "to train, improve, and otherwise further develop the Service" unless the customer opts out; after the opt-out "your Customer Content provided after such opt out will be immediately deleted by Voyage AI after it is processed for you"; "any data provided prior to your opt out may continue to be subject to Section 3(iii)" (owner fact (a): no user photo was sent before the opt-out). FAQ, https://docs.voyageai.com/docs/faq (read 2026-10-18 and 2026-10-19): the opt-out gives "zero-day retention", needs a payment method on file and an organisation Admin, and cannot be reversed in the dashboard. Page footers: "© 2026 MongoDB, Inc."
    (h) **Voyage AI, DPA and transfer basis.** Data Processing Agreement, https://www.voyageai.com/dpa (no date on the page, read 2026-10-19): between Voyage AI Innovations Inc. and the customer, incorporated by the ToS; Voyage AI is the processor (§4); for transfers from the EEA to countries without an adequacy decision, the "Standard Contractual Clauses approved by the European Commission in decision 2021/914" apply (§20, Appendix C; modules not named; Irish law); subprocessors "Amazon Web Services, Inc.", "Google LLC" and "Baseten Labs, Inc. (August 2026)", with no locations. No mention of the Data Privacy Framework.
    (i) **Voyage AI, location.** Privacy Policy, https://www.voyageai.com/privacy (last updated 20 February 2025, read 2026-10-19): "we may transfer the data, including User Information, to United States and process it there." Unknown: where the subprocessors process (not published).
    (j) **DPF listings: unknown.** The DPF participant list, https://www.dataprivacyframework.gov/list (read 2026-10-19), loads only by script and could not be read; neither provider's terms, DPA or privacy policy mentions the DPF. The text therefore relies on the SCCs in the two DPAs, not on the DPF. Anthropic's subprocessor list, https://trust.anthropic.com/subprocessors (read 2026-10-19), also loads only by script: unknown. Please verify both DPF listings yourself (note 8).
    (k) **Not claimed in the text:** DPF certification; a zero data retention agreement with Anthropic; an exhaustive list of Anthropic's processing countries; the subprocessors and their locations; which SCC module applies.
24. **Version 0.8 (AI as built, C19 §Privacy, C20 §Privacy).** Facts for you to check against the build:
    (a) A photo goes to Voyage AI only with a clean safety check (C20, CH-562): if extraction did not run (AI off, a cap, a refusal, a failure), it is never embedded. Chapter 8 says so.
    (b) Private pet profile photos are processed and embedded too (C20: eligible photos are attached to a report or a pet).
    (c) The build has no per-person way to switch AI off. An objection under Article 21 would have to be handled by email (LQ-69).
    (d) The model also stores up to five short English descriptions of distinguishing marks. They are not shown in M3.
    (e) The four safety flags are used today only to keep flagged photos from Voyage AI. When image screening (TASK-63, M4) holds flagged photos for a moderator, add that to chapter 8, and add the hold notice of LQ-38.
    (f) The sentence on similarity-only notifications follows C8 §Visual similarity (a match on photo similarity alone reaches the notification strength only when distance and time are close). The tech lead confirms it at TASK-43.
    (g) The `[pravni pregled]` / `[legal review]` markers flag the new claims of 0.8 for your review. They stay in this master until you have reviewed the text, and are removed only in the published page (`apps/web/content/legal`).
25. **Version 0.9 (Premium Protect, PRD v0.11).** Facts to check against the build (TASK-117, TASK-118, contracts pending: CH-636, CH-637):
    (a) **Chat translation, legal basis for the other person.** The finder (often anonymous) has no contract with us for translation, but receives translated messages and their own messages are sent to the provider. We propose legitimate interest (both people understand each other, which helps the animal home), with the notice to both people, masking and no training. Is that right, or does the other person need a way to refuse (LQ-72)?
    (b) **Chat translation, transparency.** The label "Samodejno prevedeno" / "Auto-translated" and the notice for both people; is that enough under GDPR art. 13 and the AI Act (LQ-37, LQ-72)?
    (c) **Masking.** C9 masks phone numbers, email addresses, URLs and chip-like numbers before the provider call; names and addresses written in words are not masked. The text claims only what C9 masks.
    (d) **Report statistics.** Counting stores no identifier, cookie or device data; the server knows a signed-in viewer at request time only to leave out the owner's own views and does not store it. We propose that ePrivacy consent is not needed and legitimate interest covers it (LQ-73). Retention "together with the report" is our proposal; the PRD sets none.
    (e) **Premium subscription.** Terms chapter 10 now describes the plans, renewal, the reminder, cancellation and the 14-day withdrawal right (LQ-74).
