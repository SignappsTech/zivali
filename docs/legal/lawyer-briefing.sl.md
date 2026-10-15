**Draft — requires client/legal review.**
source: docs/legal/lawyer-briefing.md v0.2 (slovenski prevod); 02§FR-045; brief v1.1

**Osnutek – zahteva pregled naročnika in pravnika.**

| Polje | Vrednost |
|---|---|
| Dokument | Gradivo za pravni pregled: Najdimo |
| Različica | 0.3 (zmanjšanje natančnosti lokacije) |
| Datum | 15. 10. 2026 |
| Pripravil | vsebinski strateg za naročnika (Signapps) |
| Naloga | TASK-91 (FR-045, Q-013); pogoj za TASK-71 (končna besedila pravnih strani) |
| Jezik | Slovenščina. Angleški izvirnik: `lawyer-briefing.md`. Pri razlikah velja ta slovenska različica, angleška služi za primerjavo. |

> **Ni pravni nasvet. Za pregled odvetnika.** Gradivo je pripravila produktna ekipa (ne pravniki), da bi slovenskega odvetnika seznanila s storitvijo. Kjer opisujemo pravo, gre za naše razumevanje primarnih virov in sekundarne literature, ki ga pogosto nismo preverili v prečiščenih besedilih v PISRS. Naši »predlagani odgovori« so predlogi, ki jih potrdite, popravite ali zavrnete. Nanje se nihče ne sme zanašati, dokler jih ne pregledate.

# 0. Kako uporabljati to gradivo

**Kaj vas prosimo**

1. Odgovorite na odprta vprašanja v poglavju 6. Prosimo, odgovarjajte po oznakah (na primer »LQ-07: se strinjam«, »LQ-19: spremeniti v …«, »LQ-40: potrebujem več informacij«). Začnite z vprašanji, ki so v zadnjem stolpcu označena z »Lansiranje«.
2. Preglejte in označite popravke v petih osnutkih pravnih besedil iz poglavja 4, vključno s slovensko pravno terminologijo.
3. Potrdite ali popravite osnutek ocene učinka v zvezi z varstvom podatkov (poglavje 7), preglednico rokov hrambe (poglavje 8) in kontrolni seznam za pogodbe o obdelavi (poglavje 9).
4. Sporočite nam, kateri dokumenti manjkajo. Naš seznam manjkajočih dokumentov za poslovne stranke je v poglavju 4.2.

**Vodnik za branje**

| Del | Kaj vsebuje | Čas |
|---|---|---|
| 1 Povzetek | Storitev, ponudnik in glavne pravne teme na eni strani | 5 min |
| 2–3 Storitev in funkcije | Kako storitev deluje ter vsaka pravno pomembna funkcija z njenimi podatki in zaščitnimi ukrepi | 20 min |
| 4 Osnutki | Osnutki pravnih besedil in njihove znane vrzeli | 5 min |
| 5 Tokovi podatkov | Vsak obdelovalec in uporabnik podatkov, podatki, ki jih prejme, in kje | 10 min |
| 6 Odprta vprašanja | 67 oznak vprašanj s predlaganimi odgovori; 62 odprtih, 5 jih ni več relevantnih | 45 min |
| 7–9 Ocena učinka, hramba, pogodbe o obdelavi | Delovni osnutki, ki jih potrdite | 20 min |
| 10 Odločitve naročnika | Kaj mora odločiti naročnik, z vašim mnenjem | 5 min |

**Različice.** Funkcije se bodo po pošiljanju tega gradiva še spreminjale. Vsaka nova različica navede svoje spremembe v poglavju 11, vsaka spremenjena vrstica pa je označena z »(spremenjeno v v0.x)«.

# 1. Povzetek na eni strani

- **Storitev.** Najdimo je spletna stran in mobilna aplikacija (iOS, Android), ki v Sloveniji pomaga vrniti izgubljene pse in mačke njihovim lastnikom. Lastniki prijavijo izgubljeno žival. Najditelji in mimoidoči brez računa prijavijo najdeno ali opaženo žival. Zavetišča naložijo podatke o sprejetih živalih. Sistem predlaga ujemanja (številka čipa, podobnost fotografij, kraj, čas, lastnosti), nato se osebi pogovorita v pogovoru v aplikaciji.
- **Ponudnik storitve in upravljavec.** Signapps (podatki o družbi: CD-01). Naročnik je upravljavec za vse obdelave, opisane v tem gradivu.
- **Stanje.** Storitev še ni javno na voljo. Pilotni projekt je načrtovan v Ljubljani in Mariboru. Vsa plačila tečejo v preskusnem načinu ponudnika Stripe, prava plačila pa so onemogočena v konfiguraciji. V tej fazi aplikacija ni objavljena v trgovinah App Store in Google Play.
- **Temeljno pravilo.** Vse, kar živali vrača domov, je brezplačno za vse in za vedno: prijava, zemljevid in opozorila, ujemanje, pogovor, plakat PDF s QR kodo, deljenje in iskanje po številki čipa. Zavetišča in občine vse uporabljajo brezplačno. Plačljive možnosti teh funkcij nikoli ne omejujejo.
- **Prihodki.** Prostovoljni prispevki (»prispevek«, nikoli »donacija«), mesečni podporniški paket (Podpornik), Boost (4,99 €), Premium Zaščita (2,99 € na mesec ali 24,99 € na leto), oglasi (»Oglas«) in plačljiv paket večje prepoznavnosti za veterinarske ambulante (Veterinarski partner, približno 39 € na mesec). Posredovanja nagrad prek aplikacije (escrow) ni, ker je bilo 15. 10. 2026 izločeno iz obsega: lastnik lahko v prijavi le navede, da ponuja nagrado, o nagradi pa se lastnik in najditelj dogovorita sama, zunaj aplikacije.
- **Lokacija podatkov.** Zbirka podatkov in vpis sta pri ponudniku Supabase v EU (AWS, Frankfurt). Naša programska oprema teče na enem strežniku Hetzner v EU (Nemčija ali Finska). Fotografije in varnostne kopije so v storitvi Cloudflare R2 (vedra v pristojnosti EU). Iskanje krajev teče na našem strežniku iz odprtih podatkov GURS; iskalnega niza ali točke ne prejme nobena tretja oseba. E-pošto pošiljamo prek ponudnika Brevo (Francija). Ponudniki iz ZDA: Anthropic in Voyage AI (analiza fotografij), Expo (potisna obvestila), Cloudflare (preverjanje »nisem robot« in CDN), Google (analitika, samo s privolitvijo), Stripe (deloma).
- **Glavne pravne teme.**
  1. Dolžnosti po Zakonu o zaščiti živali (ZZZiv) in kako jih aplikacija ubesedi, ne da bi trdila, da jih nadomešča.
  2. Splošna uredba o varstvu podatkov: lokacije lastnikov, fotografije, številke čipov, anonimne prijave, ponudniki umetne inteligence v ZDA, ocena učinka in roki hrambe.
  3. Obveznosti platforme po Aktu o digitalnih storitvah (DSA): prijave vsebin, moderiranje, samodejno skrivanje.
  4. Potrošniško pravo za Boost in naročnine: predpogodbene informacije, odstop od pogodbe in prekinitev naročnine.
  5. Lastnikova navedba nagrade, ki je zgolj prikazana: ali gre za javno obljubo nagrade in kako opozarjamo na prevare s plačilom vnaprej.
  6. Oglasi in Veterinarski partner: označevanje, razvrščanje in trditve o »najbližjem veterinarju« (ZVPot-1, ZEPT, uredba P2B).
  7. Prispevki: pravna narava, DDV, davčno potrjevanje računov (ZDavPR) in dohodnina.
  8. Dostopnost (Evropski akt o dostopnosti) in licence za odprte podatke.
- **Pogoji za lansiranje.** 34 vprašanj, ki so v poglavju 6 označena z »Lansiranje«. Druga vprašanja pogojujejo posamezno funkcijo, prava plačila ali objavo v trgovinah z aplikacijami. Pet vprašanj ni več relevantnih: LQ-48, LQ-49 in LQ-53, ker posredovanja nagrad ni več, ter LQ-21 in LQ-64, ker iskanje krajev zdaj teče na našem lastnem geokodirniku.

# 2. Kako storitev deluje

| Potek | Kaj se zgodi | Je potreben račun? |
|---|---|---|
| Prijava izgubljene živali | Lastnik izbere shranjeno žival ali vnese podatke, doda od 1 do 5 fotografij, označi kraj, kjer je bila žival nazadnje videna, s polmerom, čas in okoliščine ter izbere stik samo prek pogovora (privzeto) ali prek pogovora in telefona po potrjenem ujemanju. Neobvezno doda navedbo nagrade (»Nagrada«, z zneskom, kratko opombo ali obojim); denar prek Najdimo ne teče. Ob objavi se prijava prikaže, steče ujemanje, uporabniki v bližini pa prejmejo opozorilo. Kontrolni seznam nato lastniku svetuje, naj pobeg prijavi veterinarju ali pristojnemu zavetišču, z gumbi za klic na en dotik. | Da (obrazec lahko izpolni že prej) |
| Prijava najdene ali opažene živali | Fotografija, kraj (GPS ali metapodatki fotografije), »žival je pri meni« ali »žival ni pri meni«, neobvezna opomba in neobvezen e-naslov. Najditelj dobi zasebno povezavo za upravljanje, s katero prijavo ureja, zaključi in piše v pogovoru. Po oddaji ga obvestilo napoti, naj najdbo prijavi pristojnemu zavetišču, z gumbi za klic. Cilj: manj kot 60 sekund. | Ne |
| Zemljevid, seznam in podrobnosti | Javni zemljevid in seznam odprtih prijav s filtri. Stran s podrobnostmi prikaže fotografije, lastnosti, približno območje, datum in opis. Dejanja: pošlji sporočilo, deli, plakat, prijavi zlorabo, »to žival sem videl«. | Ne |
| Ujemanje | Vsako novo ali spremenjeno prijavo primerjamo s prijavami druge vrste: enaka številka čipa (ocena 1,0), sicer vrsta živali, razdalja, čas in lastnosti, pozneje tudi podobnost fotografij. Lastnik vidi predloge z razlogi ter jih potrdi ali zavrne. Nobena stran ne vidi kontaktnih podatkov, preden lastnik ujemanje potrdi. | Lastnik: da |
| Pogovor | Odpre se, ko lastnik potrdi ujemanje ali ko nekdo piše iz prijave. Stalno varnostno opozorilo (»Nikoli ne pošiljajte denarja vnaprej«), povezave niso klikljive, prijava zlorabe in blokiranje sta vgrajena. Po zaključku prijave je pogovor samo za branje. | Najditelj: zadošča zasebna povezava |
| Opozorila | Nabiralnik v aplikaciji, potisna obvestila in e-pošta. Opozorila v bližini za domače območje (privzeto 5 km, od 1 do 25 km), vrsto živali, dnevno omejitev in tihi čas. | Da |
| Plakat in deljenje | Plakat A4 v obliki PDF s fotografijo, podatki, približnim območjem in QR kodo, ki odpre javno prijavo. Brez telefonske številke. Besedila za deljenje na WhatsAppu, Facebooku in drugje. | Lastnik: da |
| Spet doma | Lastnik označi, da je žival spet doma; prijave se zaključijo, opozorila se ustavijo. Zahvalni zaslon ponudi neobvezen prispevek in eno oglasno mesto. | Da |
| Portal za zavetišča (M3) | Preverjene organizacije nalagajo podatke o sprejetih živalih (paket fotografij, CSV ali API), vidijo verjetne lastnike in se z njimi pogovarjajo. Osebje nikoli ne vidi osebnih podatkov lastnikov. Iskanje po čipu obvesti lastnika, vpisanega pri nas, ne da bi razkrilo kar koli osebnega. | Račun organizacije |
| Imenik zavetišč | Vseh 212 občin poveže s 17 registriranimi zavetišči (javni podatki organizacij); uporablja se za gumbe za klic in javne strani. | Ne |
| Plačila | Stripe Checkout na spletu (mobilna aplikacija ga odpre v brskalniku v aplikaciji). Samo preskusni način. | Da |
| Oglasi | Štiri stalna oglasna mesta (vir prijav, stran s podrobnostmi, zaslon »Spet doma«, stranski stolpec na spletu), ciljana samo po regiji in vrsti živali. Nikoli v poteku prijave, ob vpisu, v pogovoru ali pri plačilu. | Ne |
| Administracija | Čakalna vrsta za moderiranje, preverjanje organizacij, oglasi, ključni kazalniki. Močna overitev in revizijski dnevnik. | Skrbniška vloga |

# 3. Pravno pomembne funkcije

Oznake vprašanj se nanašajo na poglavje 6. »Mx« je mejnik razvoja, v katerem funkcijo izdelamo.

| Oznaka | Funkcija | Osebni podatki | Vgrajeni zaščitni ukrepi | Vprašanja |
|---|---|---|---|---|
| F-01 | **Računi in vloge** (M1): e-naslov in geslo, vpis z Googlom ali Applom; vloge uporabnik, član zavetišča, moderator, skrbnik | E-naslov, prikazno ime, jezik, domače območje, neobvezna telefonska številka (nikoli javna), nastavitve obvestil, žetoni za potisna obvestila | Potrditev e-naslova pred opozorili in pogovorom; telefonska številka je vidna samo v potrjenem pogovoru, če jo lastnik izbere; močna overitev skrbnikov | LQ-16, LQ-33 |
| F-02 | **Anonimne prijave najdenih in opaženih živali** (M2): brez računa; zasebna povezava za upravljanje (hranimo le njeno zgoščeno vrednost) | Fotografija, kraj, čas, neobvezen e-naslov, anonimna seja, naključni identifikator naprave, zgoščen IP naslov (48 ur) | Preverjanje »nisem robot« (Cloudflare Turnstile), omejitve števila zahtev (privzeto 5 na uro in 20 na dan na IP naslov in napravo), zaznavanje podvojenih fotografij, zadržanje za moderiranje ob vzorcih zlorabe; izbris prek zasebne povezave | LQ-14, LQ-30, LQ-34, LQ-39 |
| F-03 | **Zameglitev lokacije** (M1): javnost vidi približno območje, nikoli točne točke | Premaknjena točka (20 do 30 m od prave lege, pogosto blizu lastnikovega doma), javna točka in polmer, občina in regija | Izgubljena žival: polmer najmanj 500 m, najdena in opažena: najmanj 150 m; zameglitev je za vsako prijavo enaka, zato ponovni ogledi ne razkrijejo središča; surove točke GPS nikoli ne shranjujemo: naključni premik za 20 do 30 m se uporabi enkrat ob shranjevanju, v napravi in še enkrat na strežniku, shranjena točka se nikoli ne ponovno naključno spremeni; javna zameglitev izhaja iz te premaknjene točke; shranjeno točko vidi samo prijavitelj (označeno »približno«) ali sogovornik v pogovoru, če mu jo prijavitelj pokaže; 30 dni po zaključku se shranjena točka dodatno zamegli (N je predlog, LQ-19); koordinat ne zapisujemo v dnevnike; kje je najdena žival, nikoli ne sprašujemo | tveganje D-01 (LQ-21: ni več relevantno) |
| F-04 | **Geografske ograde in podatki brez povezave v napravi** (mobilna aplikacija, M2–M3): telefon hrani javne prijave iz bližine za uporabo brez povezave in lahko uporabnika obvesti, ko vstopi v območje izgubljene živali | Iz naprave ne odide nič. Telefon hrani javna zamegljena območja, pomanjšane fotografije, osnutke in prijave v čakalni vrsti | Geografske ograde so izključno na izrecno željo uporabnika, z razlago pred dovoljenjem »Vedno« za lokacijo; uporablja se samo vgrajeno spremljanje območij operacijskega sistema, brez neprekinjenega GPS; lokacija se nikoli ne naloži na strežnik; dnevna omejitev 3; eno stikalo odstrani vse ograde; predpomnilnik največ 50 MB in 7 dni, ob odjavi se izbriše | LQ-28 |
| F-05 | **Analiza fotografij z umetno inteligenco** (M3–M4): model za razpoznavanje slik predlaga vrsto, pasmo, barve, velikost, ovratnico in posebne znake ter da signal za moderiranje; model za vektorske predstavitve izračuna vektor za podobnost fotografij; Premium doda besedila za prijavo in družbena omrežja, oblikovanje plakata in načrt iskanja, ki jih pripravi UI | Fotografije (na katerih so lahko ljudje); identifikatorjev uporabnikov, metapodatkov in lokacije ne pošiljamo | Predlogi so označeni, jih je mogoče urediti in se brez potrditve nikoli ne shranijo; en klic na fotografijo, predpomnjenje po zgoščeni vrednosti slike, omejitve na napravo in na mesec, ob napaki ročni vnos; besedila Premium nikoli ne vsebujejo številke čipa ali točne lokacije; označene slike pred objavo pregleda moderator | LQ-36, LQ-37, LQ-38 |
| F-06 | **Ujemanje** (M2–M3): samodejni predlogi med prijavami izgubljenih in najdenih živali | Podatki prijav, številke čipov, vektorji fotografij | Samo predlog; lastnik ga potrdi ali zavrne; razlogi so prikazani; kontaktni podatki so skriti do potrditve | LQ-17 |
| F-07 | **Pogovor** (M2): sporočila v realnem času med stranema | Sporočila, vzdevki, stanje prebranosti, blokade | Varnostno opozorilo, povezave niso klikljive, prijava zlorabe in blokiranje; moderatorji preberejo pogovor šele, ko je sporočilo v njem prijavljeno; izbris 6 mesecev po zaključku prijave | LQ-24, LQ-39 |
| F-08 | **Moderiranje in samodejno skrivanje** (M2, M4): zlorabo lahko prijavi vsak; tri neodvisne prijave skrijejo prijavo do pregleda; pregled slik zadrži označene fotografije | Prijave zlorab, odločitve, revizijski dnevnik | Odločitve so popravljive, revizijski dnevnik, cilj 90 % pregledanih v 24 urah, ugovor po e-pošti; prijave iz računov, mlajših od 24 ur, štejejo pol | LQ-17, LQ-38, LQ-40 |
| F-09 | **Obvestila in opozorila v bližini** (M2): nabiralnik, potisna obvestila (Expo) in e-pošta (Brevo) | E-naslov, žeton za potisna obvestila, domače območje, besedila obvestil | Nastavitve po vrsti obvestil, tihi čas, dnevna omejitev, v opozorilih samo zamegljena območja; brez plačljive vsebine v potisnih obvestilih in e-pošti brez privolitve za trženje | LQ-35 |
| F-10 | **Plakat in deljenje** (M2) | Fotografija živali, ime, območje; brez kontaktnih podatkov | QR koda odpre samo javno prijavo; brez telefonske številke, čipa, točnega kraja ali kraja, kjer je žival; neobvezna vrstica Veterinarskega partnerja je označena z »Oglas« in jo lastnik lahko odstrani | LQ-55 |
| F-11 | **Iskanje po čipu za zavetišča in veterinarje** (M3) | Številka čipa, ki jo vnese član preverjene organizacije | Samo preverjeni člani; rezultat je »lastnik obveščen« ali »ni najdeno«; nikoli ime, kontakt ali naslov; 30 iskanj na uro na člana; revizijski dnevnik hrani zgoščeno vrednost, ne številke; brez povezave na zaprt javni vpogled v CRHŽ | LQ-11 |
| F-12 | **Nalaganje podatkov zavetišč** (M3): paketi fotografij, CSV (največ 500 vrstic), API z zgoščenimi ključi; stran za posvojitve; poročila za občine | Sprejete živali s čipom, vrsto, krajem in časom najdbe, fotografije; člani organizacij | Preverjanje organizacij; nalaganja nepreverjenih organizacij so zadržana za moderiranje; predloga CSV nima polj za podatke o osebah; števila pod 5 so v poročilih združena | LQ-09, LQ-12, LQ-22 |
| F-13 | **Imenik zavetišč in kontrolni seznami zakonskih dolžnosti** (M2) | Ni (javni podatki organizacij) | Prikazana sta vir in datum zadnjega preverjanja; nepotrjene številke se nikoli ne prikažejo; zakonski roki se pokažejo samo, ko je vklopljeno stikalo za pravno vsebino | LQ-06, LQ-07, LQ-08 |
| F-14 | **Plačila** (M2, M4): prispevki po ponovnem srečanju, po prijavi in na profilu (3 € / 5 € / 10 € / poljubno, najmanj 2 €), Podpornik od 2 € na mesec, Boost 4,99 € za 7 dni, Premium 2,99 € na mesec ali 24,99 € na leto, Veterinarski partner | ID plačila, namen, znesek, stanje, čas; podatki kartice samo pri ponudniku Stripe | Samo preskusni način; znesek ni vnaprej izbran; »Preskoči« je enako viden kot »Plačaj«; nikoli v poteku prijave; anonimni najditelji ne vidijo poziva k plačilu; mobilna aplikacija odpre spletno plačilo | LQ-41 do LQ-43, LQ-51, LQ-52 |
| F-15 | **Navedba nagrade, samo za prikaz** (M4; spremenjeno v v0.2, posredovanje nagrad izločeno iz obsega 15. 10. 2026): lastnik lahko prijavi izgubljene živali doda »Nagrada«, neobvezno z zneskom v celih evrih (od 1 do 10.000) in opombo do 80 znakov, ki ne sme vsebovati kontaktnih podatkov (brez spletnega naslova, e-naslova ali niza 6 ali več števk); navedba se prikaže na strani s podrobnostmi in na plakatu. Najdimo nagrad ne hrani, ne izplačuje in zanje ne jamči; lastnik in najditelj se dogovorita zunaj aplikacije | Znesek in opomba (oba neobvezna) kot del prijave | Prikazana je kot lastnikova ponudba; ob vsaki navedbi nagrade je opozorilo pred prevaro (»Nikoli nikomur ne plačajte vnaprej …«); pogoji uporabe (poglavje 6) navajajo, da Najdimo ni stranka dogovora; plačilnih podatkov ne zbiramo | LQ-67 (LQ-48, LQ-49, LQ-53: ni več relevantno) |
| F-16 | **Oglasi in povpraševanja partnerjev** (M2) | Oglasi: ni (števci združeni po oglasu, oglasnem mestu, dnevu in regiji, brez piškotkov ali identifikatorjev). Obrazec za povpraševanje: podjetje, ime kontaktne osebe, e-naslov, neobvezna telefonska številka, sporočilo, čas privolitve | Oznaka »Oglas«, `rel="sponsored"`, samo kontekstno ciljanje, seznam prepovedanih vsebin za prodajo ali oddajo živali, Premium je brez oglasov; oglaševalci prejmejo samo združena poročila | LQ-54, LQ-58, LQ-59 |
| F-17 | **Veterinarski partner** (M4): plačljiv profil ambulante, izpostavljeno mesto v oglasnem mestu za veterinarje na njenem območju, označena vrstica na plakatih in v opozorilih v aplikaciji za njeno regijo, mesečno združeno poročilo | Podatki ambulante, kontaktna oseba, podatki za obračun in identifikacijska številka za DDV (prek Stripe Billing) | Vedno »Oglas«; naslov »Veterinar v vaši regiji«, nikoli »najbližji«, razen če to drži; povezava »Kako razvrščamo«; funkcija ostane izklopljena, dokler je ne potrdite | LQ-47, LQ-55, LQ-56, LQ-57 |
| F-18 | **Analitika in privolitev** (M1): Google Analytics 4 na spletu, Firebase Analytics v aplikaciji | Psevdonimizirani analitični dogodki (regija, občina, vrsta živali, vrsta prijave, oglasno mesto, znesek); brez imen, e-naslovov, številk čipov, koordinat ali prostega besedila | Pasica za privolitev z enakovrednima gumboma Sprejmi in Zavrni; pred privolitvijo se nič ne naloži (osnovni način Consent Mode v2); odobren je samo `analytics_storage`; hramba 14 mesecev; Googlovi signali in deljenje podatkov izklopljeni | LQ-26, LQ-27 |
| F-19 | **Zgodbe z lepim koncem** (M5) | Besedilo in fotografije, ki jih izbere lastnik | Izrecna privolitev, moderiranje, umik objave v 24 urah po preklicu | LQ-32 |
| F-20 | **Pravice glede zasebnosti** (M3): samopostrežni izvoz (JSON ali ZIP v 5 minutah) in izbris računa | Vse zbirke iz popisa podatkov | Ponovna overitev; račun se takoj onemogoči, podatki se izbrišejo ali anonimizirajo v 30 dneh; test ne uspe, če nova tabela manjka v popisu podatkov | LQ-30, LQ-31 |
| F-21 | **Skrbniška konzola** (M2–M4) | Dostop do podatkov moderiranja, organizacij, povpraševanj | Močna overitev (TOTP), dostop glede na vlogo, revizijski dnevnik vsakega dejanja, zadnjega skrbnika ni mogoče odstraniti | LQ-29 |

# 4. Osnutki pravnih besedil

## 4.1 Osnutki za vaš pregled

Vsi osnutki imajo na vrhu oznako »Osnutek – zahteva pregled naročnika in pravnika« in se končajo z internimi »opombami za pravni pregled«. Vse opombe so zbrane v poglavju 6, zato lahko odgovorite tam.

| Dokument | Datoteka | Različica | Pot (SL / EN) | Znane vrzeli |
|---|---|---|---|---|
| Politika zasebnosti | privacy-policy.md | 0.4 (posredovanje nagrad odstranjeno; navedba nagrade med podatki prijave; lasten geokodirnik, MapTiler odstranjen) | `/zasebnost` / `/en/privacy` | Podatki o družbi (CD-01); funkcije, ki še niso na voljo, so opisane, kot bodo ob lansiranju (LQ-04) |
| Politika piškotkov | cookie-policy.md | 0.3 (iskanje krajev na naših strežnikih) | `/piskotki` / `/en/cookies` | Dejanska trajanja piškotkov je treba preveriti v izdelani storitvi |
| Pogoji uporabe | terms-of-use.md | 0.2 (posredovanje nagrad odstranjeno; navedba nagrade v poglavju 6) | `/pogoji-uporabe` / `/en/terms` | Dolžnosti najditelja (LQ-08), pravica do odstopa (LQ-41), izvajalec izvensodnega reševanja sporov (LQ-44), besedilo po DSA (LQ-40) |
| Impresum | imprint.md | 0.4 (iskanje krajev na podatkih GURS; MapTiler odstranjen) | `/impresum` / `/en/imprint` | Podatki o družbi (CD-01) |
| Izjava o dostopnosti | accessibility-statement.md | 0.1 | `/dostopnost` / `/en/accessibility` | Pristojni organ in predpis (LQ-62); stanje po presoji dostopnosti v mejniku M5 |

Druga pravno pomembna vsebina:

| Vsebina | Datoteka | Zakaj je pomembna |
|---|---|---|
| Raziskava predpisov | regulatory.md | Naše razumevanje ZZZiv, pravil o dohodnini in o označevanju oglasov, s stopnjami zanesljivosti in viri |
| Javne strani (varnostni nasveti, pogosta vprašanja, Za zavetišča) | P3-public-pages.md | Vrstice z oznako **[legal review]** opisujejo dolžnosti najditeljev in zavetišč |
| Pasica za privolitev | P17-consent.md | Natančno besedilo privolitve |
| Pozivi k podpori | P15-support-moments.md | Besedilo o prispevkih (»prispevek«, nikoli »donacija«) |
| Stran za partnerje in obrazec za povpraševanje | P22-partners.md | Vrstica o privolitvi, statistika občinstva |
| Obvestila in e-pošta | notifications-and-emails.md | Besedilo potrdil o plačilu, vrstica Veterinarskega partnerja v opozorilih |
| Plakat | P18-poster-share.md | Vrstica Veterinarskega partnerja na plakatih in lastnikovo stikalo; navedba nagrade in opozorilo |
| Prijava izgubljene in najdene živali | P6-report-lost.md, P7-report-found.md | Obvestila o dolžnostih po oddaji, vrstice o zasebnosti, navedba nagrade |
| Pravila ubeseditve | voice-and-tone.md, glossary.md | Prepovedane besede (na primer »donacija«), oznaka »Oglas« |

## 4.2 Dokumenti, ki jih še ni

| Dokument | Potreben pred | Predlog |
|---|---|---|
| Pogoji za Veterinarskega partnerja (naročilnica in splošni pogoji za poslovne stranke: cena, DDV, mesečna odpoved, pravila razvrščanja, označevanje, jamstvo ambulante za delovni čas in trditve o 24-urni pomoči, skladnost s pravili veterinarske stroke) | Veterinarski partner začne delovati | Kratko različico pripravimo po poglavju 6 H za vaš pregled (LQ-60) |
| Pogoji za oglaševalce (naročilnica, pravila za vsebino, seznam prepovedanih vsebin, združena poročila, brez sledenja) | Prvi plačani oglas | Enako (LQ-60) |
| Pogoji za organizacije in API (zavetišča, občine, veterinarji: preverjanje, pravila za podatke ob nalaganju, uporaba ključev API) | Portal za zavetišča (M3) | Enako (LQ-22, LQ-60) |
| Pogoji za posredovanje nagrad | Ni več relevantno | Ni več relevantno: izločeno iz obsega 15. 10. 2026 (posredovanja nagrad ni, projektna naloga v1.1) |
| Stran »Kako razvrščamo« (kako razvrščamo mesta veterinarjev) | Veterinarski partner začne delovati | Pripravi vsebinska ekipa (LQ-56) |
| Stran za preglednost »Kam gre vaš denar« | Prava plačila prispevkov | Pripravi vsebinska ekipa (FR-024); brez besedila o dohodnini do odgovora na LQ-50 |
| Evidenca dejavnosti obdelave (člen 30) | Lansiranje | Pripravimo iz popisa podatkov in poglavja 5 (LQ-29) |
| Ocena učinka v zvezi z varstvom podatkov, presoje zakonitega interesa, ocene učinka prenosa | Lansiranje | Iz poglavij 7 in 9 (LQ-15, LQ-18, LQ-20) |

# 5. Tokovi podatkov in obdelovalci

## 5.1 Arhitektura (projektna naloga v1.0)

Spletni brskalnik ali mobilna aplikacija komunicira:

- **prek HTTPS s strežnikom Hetzner v EU** (Nemčija ali Finska), kjer tečejo Caddy, spletna stran (Next.js), aplikacijski vmesnik (Express, vključno z našim geokodirnikom) in opravila v ozadju. Strežnik pošilja podatke naprej:
  - Supabase, AWS Frankfurt: Postgres (vsi podatki aplikacije in register krajev GURS), Auth (računi, seje), Realtime (dostava sporočil v pogovorih);
  - Cloudflare R2, shramba v EU: izvirniki fotografij (zasebni), objavljene kopije fotografij (javne, prek omrežja Cloudflare CDN), nočni izpisi zbirke podatkov (30 dni);
  - Anthropic, ZDA: samo fotografija, vrne predlagane lastnosti in signal za moderiranje (M3);
  - Voyage AI, ZDA: samo fotografija, vrne vektor slike (M3);
  - Brevo, EU: e-naslov, ime, jezik, besedilo sporočila;
  - Expo Push, ZDA, naprej Apple APNs in Google FCM: žeton za potisna obvestila, besedilo obvestila;
  - Stripe, EU (in ZDA): seje plačila, naročnine, povratni klici (preskusni način);
  - Cloudflare Turnstile, ZDA: preverjanje žetona »nisem robot«;
  - Sentry, regija EU: dogodki napak z odstranjenimi osebnimi podatki (M5);
- **neposredno** s Supabase Auth (vpis) in Supabase Realtime (kanal pogovora);
- **neposredno** s Cloudflare R2 (enkratna povezava za nalaganje fotografije);
- **neposredno** s stranjo Stripe Checkout (podatki kartice nikoli ne pridejo do nas);
- **neposredno** z OpenFreeMap (zemljevidne ploščice: IP naslov);
- **neposredno** s pripomočkom Cloudflare Turnstile (signali naprave in brskalnika);
- **neposredno** z Google Analytics 4 in Firebase Analytics (samo po privolitvi);
- **neposredno** z vpisom prek Googla ali Appla (če ga uporabnik izbere).

Samo v napravi ostanejo: geografske ograde, predpomnilnik javnih prijav za delo brez povezave, osnutki, prijave najdenih živali v čakalni vrsti in žeton zasebne povezave.

Zbirka podatkov ni dostopna iz interneta: vsi podatki aplikacije gredo skozi naš aplikacijski vmesnik, ki preveri dovoljenja. Tabele so v neizpostavljeni shemi z varnostjo na ravni vrstic, ki privzeto vse zavrne.

## 5.2 Obdelovalci in uporabniki podatkov

»V uporabi od« pomeni mejnik, v katerem začnejo podatki teči k ponudniku.

| Ponudnik | Vloga (predlog) | Namen | Podatki, ki jih prejme | Lokacija; podlaga za prenos | V uporabi od |
|---|---|---|---|---|---|
| Supabase, Inc. (družba iz ZDA) | Obdelovalec | Zbirka podatkov, vpis, dostava sporočil v pogovorih | Vse iz poglavja 3 politike zasebnosti razen fotografij | Podatki v EU (AWS eu-central-1, Frankfurt); možen dostop podpore iz ZDA: DPF ali SCC (preveriti) | M1 |
| Hetzner Online GmbH, Nemčija | Obdelovalec | Strežnik za spletno stran, aplikacijski vmesnik in opravila v ozadju; strežniški zapisi | Vsi podatki, ki tečejo skozi storitev; zapisi z IP naslovi (približno 7 dni) | EU (Nemčija ali Finska, CD-10); prenosa ni | M1 (preskusno okolje) |
| Cloudflare, Inc., ZDA: R2 | Obdelovalec | Shramba fotografij, javna dostava fotografij (CDN), nočne varnostne kopije | Fotografije; varnostne kopije vsebujejo celotno zbirko podatkov; IP naslovi obiskovalcev v omrežju CDN | Shramba v EU (vedra ustvarjena v pristojnosti EU, ADR-014); CDN po vsem svetu; DPF ali SCC | M1 |
| Cloudflare, Inc., ZDA: Turnstile | Obdelovalec | Preverjanje »nisem robot« ob registraciji, anonimnih prijavah in obrazcu za partnerje | Signali naprave in brskalnika, IP naslov | ZDA; DPF ali SCC | M1 (preskusni ključi do prejema poverilnic) |
| Brevo (Sendinblue SAS), Francija | Obdelovalec | Transakcijska e-pošta (vpis, opozorila, potrdila) | E-naslov, ime, jezik, besedilo sporočila | EU | M1 |
| Expo (650 Industries, Inc.), ZDA | Obdelovalec | Dostava potisnih obvestil prek Appla in Googla | Žeton za potisna obvestila, besedilo obvestila (brez kontaktnih podatkov) | ZDA; DPF ali SCC (preveriti) | M2 |
| Apple (APNs, Sign in with Apple) in Google (FCM, vpis z Googlom) | Samostojna upravljavca (infrastruktura in identiteta) | Prenos potisnih obvestil; vpis, če ga uporabnik izbere | Žeton in vsebina obvestila; podatki o identiteti ob vpisu | Po njunih pogojih | M2 |
| Stripe Payments Europe, Ltd., Irska | Obdelovalec ter samostojni upravljavec za preprečevanje goljufij in svoje zakonske obveznosti | Plačilo (Checkout), naročnine, računi z DDV za Veterinarskega partnerja | Podatki kartice in za obračun, vneseni na Stripovi strani | EU, možna obdelava v ZDA; DPF ali SCC | M2 (preskusni način) |
| Anthropic (Anthropic PBC, ZDA, ali njegova pogodbena družba v EU: preveriti) | Obdelovalec | Predlogi lastnosti in signal za moderiranje iz fotografij; besedila UI za Premium | Samo fotografija (brez identifikatorjev uporabnikov, metapodatkov in lokacije); za besedila Premium javne lastnosti iz prijave | ZDA; DPF ali SCC (preveriti) | M3 |
| Voyage AI (od leta 2025 del družbe MongoDB, Inc.: preveriti pogodbeno družbo) | Obdelovalec | Vektorji slik za podobnost fotografij | Samo fotografija | ZDA; DPF ali SCC (preveriti) | M3 |
| Google Ireland Ltd. | Obdelovalec (pogoji Google Analytics za obdelavo podatkov) | GA4 na spletu, Firebase Analytics v aplikaciji | Psevdonimizirani dogodki in identifikatorji naprave ali brskalnika, samo po privolitvi | EU, možna obdelava v ZDA; DPF | M1 (samo po privolitvi) |
| OpenFreeMap | Samostojni upravljavec (navodil mu ne moremo dajati) | Zemljevidne ploščice | IP naslov | Javni strežniki ploščic | M1 |
| Sentry (Functional Software, Inc.), podatkovna regija EU | Obdelovalec | Sledenje napakam | Tehnični podatki o napakah, osebni podatki odstranjeni | Regija EU; družba iz ZDA: DPF ali SCC | M5, ko so na voljo poverilnice |
| Nadzor razpoložljivosti (ponudnik še ni izbran) | Obdelovalec | Preverjanje delovanja javnih končnih točk | Brez osebnih podatkov | Še ni izbrano | M5 |
| Ponudnik davčnega potrjevanja računov (če je potreben, LQ-52) | Obdelovalec | Davčno potrjevanje računov (ZOI in EOR) | Podatki računa: znesek, čas, poslovni prostor; pri poslovnih strankah identifikacijska številka kupca za DDV | Slovenija | Pred pravimi plačili |
| GitHub (Microsoft) | Ni obdelovalec podatkov uporabnikov | Izvorna koda, CI, slike vsebnikov | Brez produkcijskih osebnih podatkov (testi uporabljajo sintetične podatke) | ZDA | Že zdaj |

**Drugi uporabniki podatkov:** drugi uporabniki (samo tisto, kar je po poglavju 3 javno ali deljeno v pogovoru), organi na podlagi zakonite odredbe, oglaševalci in ambulante Veterinarskega partnerja (samo združena poročila), organizacije, ki iščejo po čipu (samo »lastnik obveščen« ali »ni najdeno«).

**Kaj nikoli ne zapusti našega sistema:** številke čipov (nikoli javne, nikoli poslane UI ali analitiki), točne točke (nikoli javne in nikoli poslane tretji osebi: iskanje krajev in ime območja za točko pripravi naš lastni geokodirnik; spremenjeno v v0.2), telefonske številke (samo potrjenemu sogovorniku, če lastnik to izbere), e-naslovi (samo ponudniku Brevo za pošiljanje), kraj, kjer je najdena žival (tega podatka ne zbiramo).

# 6. Odprta pravna vprašanja

Vsaka odprta pravna točka iz opomb k osnutkom, raziskave predpisov, registra tveganj (R-0xx) in odprtih vprašanj projektne naloge (Q-0xx) je tu navedena enkrat. Vrednosti v zadnjem stolpcu: **Lansiranje** (javno lansiranje; vprašanje blokira lansiranje), **Prava plačila**, **Trgovini z aplikacijami** (objava v App Store ali Google Play) ali poimenovana funkcija, ki ostane izklopljena do odgovora. **Ni več relevantno** označuje vprašanje, katerega funkcija je bila izločena iz obsega; oznako ohranimo, da se prejšnji odgovori še ujemajo.

## A. Ponudnik, besedila in postopek

| Oznaka | Vprašanje | Predlagani odgovor | Vir | Rok / blokira lansiranje |
|---|---|---|---|---|
| LQ-01 | Kdo je upravljavec in ponudnik storitve, naveden v vseh besedilih? | Storitev kot družba upravlja Signapps, ki je tudi upravljavec osebnih podatkov. Ločeno neprofitno pravno osebo obravnavamo samo zaradi dohodnine (LQ-50). | Projektna naloga; politika zasebnosti, opomba 1; D-03 | Lansiranje (blokira) |
| LQ-02 | Kaj mora vsebovati impresum spletne strani družbe (ZGD-1, ZEPT)? Ali moramo navesti nadzorni organ ali pravila stroke? | Preglednica v impresumu: polno ime in pravnoorganizacijska oblika, sedež, matična številka, davčna številka in identifikacijska številka za DDV, vpis v register, osnovni kapital (d.o.o.), zastopnik, kontakt. Dejavnost ni regulirana, zato nadzornega organa ni. | Impresum, opombi 1–2 | Lansiranje (blokira) |
| LQ-03 | Katera jezikovna različica pravnih besedil prevlada? Ali po Zakonu o javni rabi slovenščine (ZJRS) potrebujemo kar koli več kot slovensko besedilo? | Izvirnik je slovensko besedilo, ki prevlada; angleško je prevod za lažje razumevanje. V pogoje uporabe in politiko zasebnosti dodamo stavek, ki to pove. | Vsebinska ekipa | Lansiranje (blokira) |
| LQ-04 | Ali smeta politika zasebnosti in pogoji uporabe opisovati funkcije, ki še niso na voljo (UI, plačila, Boost, Premium, Veterinarski partner, navedba nagrade, zgodbe z lepim koncem), ali je treba besedila voditi v različicah po izdajah? | Različice po izdajah: objavimo samo dele za delujoče funkcije; del dodamo, ko vklopimo njegovo funkcijo; vodimo datiran dnevnik sprememb. | Politika zasebnosti, opomba 14; pogoji uporabe, opomba 13 | Lansiranje (blokira) |
| LQ-05 | Ali je slovenska pravna terminologija v osnutkih pravilna (upravljavec, obdelovalec, zakoniti interes, standardne pogodbene klavzule, višja sila, »kot je«)? | Prosimo, da popravke označite neposredno v slovenskih besedilih. | Vsi osnutki, zadnja opomba | Lansiranje (blokira) |

## B. Zaščita živali (ZZZiv) in ubeseditev v storitvi

| Oznaka | Vprašanje | Predlagani odgovor | Vir | Rok / blokira lansiranje |
|---|---|---|---|---|
| LQ-06 | Ali so te dolžnosti in roki veljavni: lastnik prijavi pobeg psa v 3 dneh (ZZZiv, 6(4)); lastnik prijavi izgubo najbližjemu zavetišču v 72 urah (Pravilnik o zaščiti hišnih živali, 5(1)); najditelj obvesti zavetišče ali veterinarja v 24 urah (ZZZiv, 29(1), Pravilnik, 5(2)); 8-dnevni rok za prevzem, preden sme zavetišče žival oddati (ZZZiv, 30), in kako deluje »pisni poziv«? | Dokler tega ne potrdite, aplikacija ne prikazuje rokov. Navaja: »Čim prej jo prijavite pristojnemu zavetišču ali veterinarju«, z gumbi za klic. Roki so za stikalom za pravno vsebino, ki ga vklopimo samo z vašim potrjenim besedilom. | R-02 do R-06; raziskava predpisov, odprti točki 1–2; R-027; A-029 | Lansiranje (blokira) |
| LQ-07 | Ali lahko prijava na Najdimo kdaj velja za zakonsko predpisano prijavo zavetišču ali veterinarju? | Ne. Besedilo pove, da prijava na Najdimo ne nadomešča te dolžnosti, in ponudi klic pristojnemu zavetišču iz imenika na en dotik. | Raziskava predpisov, odprta točka 3; FR-005; FR-006 | Lansiranje (blokira) |
| LQ-08 | Ali najditelj, ki najdeno žival obdrži doma, krši 24-urno dolžnost? Kaj sme reči potek prijave najdbe (»Žival je pri meni«)? | Potek prijave le zabeleži dejstvo in nikoli ne svetuje, naj najditelj žival obdrži. Po oddaji obvestilo najditelja napoti, naj najdbo prijavi pristojnemu zavetišču, z gumbi za klic. Pogosta vprašanja navajajo: če živali ne morete obdržati, pokličite zavetišče, s katerim sodeluje vaša občina. | Raziskava predpisov, odprta točka 4; vrstice P3 [legal review]; pogoji uporabe, poglavje 7 | Lansiranje (blokira) |
| LQ-09 | Portal za zavetišča: privzeto 8-dnevno odštevanje »dni do možne oddaje«. Ali odgovarjamo, če se zavetišče nanj zanese? | Označeno je kot opomnik, ki ga nastavi zavetišče, ne kot zakonski rok. Pogoji uporabe (poglavje 9) navajajo, da Najdimo ne daje pravnih nasvetov. | R-014; FR-015; pogoji uporabe, opomba 3 | Portal za zavetišča (M3) |
| LQ-10 | Pravila Stvarnopravnega zakonika (SPZ) o najdenih stvareh (obvestilo lastniku ali policiji; lastninska pravica po enem letu): ali naj jih storitev omenja? | Ne. Sklicujemo se samo na pot prek zavetišča in veterinarja po ZZZiv. | R-14 | Lansiranje (blokira) |
| LQ-11 | Številke čipov: ali smemo hraniti številke čipov lastnikov in preverjenim zavetiščem in veterinarjem omogočiti iskanje, s katerim obvestimo lastnika (brez prikaza podatkov)? Na CRHŽ, katerega javni vpogled je bil junija 2026 zaprt, ne povezujemo. | Da, kot del storitve, ki jo je lastnik zahteval (pogodba), in na podlagi našega zakonitega interesa, da se živali vrnejo domov. Omejeno število iskanj, revizija prek zgoščene vrednosti, brez prikaza osebnih podatkov. Besedilo pove, da čip v CRHŽ prebere veterinar ali pristojno zavetišče. | R-16; FR-016; A-003; Q-004 | Portal za zavetišča (M3) |
| LQ-12 | Stran za posvojitve za zavetišča (FR-028) in oglasi za živali: po ZZZiv, 10(3), mora oglas za spremembo lastništva psa navajati podatke o označitvi, ponudnik oglasnega prostora pa jih mora preveriti. Ali objava za posvojitev šteje za tak oglas? Ali mora biti številka čipa tedaj javna, kar nasprotuje našemu pravilu, da številke čipov nikoli niso javne? | Uporabniki ne smejo objavljati oglasov za prodajo ali oddajo; moderatorji jih odstranijo, seznam prepovedanih vsebin pa jih zavrne. Za stran za posvojitve predlagamo: zavetišče ob nalaganju potrdi podatke o označitvi (shranjeni, ne javni), objava navaja »Označen s čipom: da« in zavetišče kot odgovorno osebo. Če zakon zahteva samo številko, stran za posvojitve odložimo (CD-17). | R-11; raziskava predpisov, odprta točka 5; FR-018; FR-029 | Stran za posvojitve (M3–M4) |
| LQ-13 | Uredba EU o dobrobiti in sledljivosti psov in mačk (sprejeta 2026): ali nalaga obveznosti platformam, ki prikazujejo oglase za posvojitev ali prodajo (na primer preverjanje identifikacije pred objavo), in od kdaj? | Spremljamo. Oglase za prodajo že prepovedujemo. Ponovno preverimo, preden začne delovati stran za posvojitve. | R-17 | Stran za posvojitve |

## C. Varstvo osebnih podatkov in zasebnost v elektronskih komunikacijah

| Oznaka | Vprašanje | Predlagani odgovor | Vir | Rok / blokira lansiranje |
|---|---|---|---|---|
| LQ-14 | Pravne podlage v poglavju 4 politike zasebnosti: (a) anonimni najditelji: pogodba ali zakoniti interes? (b) povpraševanja partnerjev: ukrepi pred sklenitvijo pogodbe in privolitev? (c) potisna obvestila: opozorila, ki jih uporabnik vklopi, temeljijo na pogodbi, dovoljenje operacijskega sistema pa ni privolitev po Splošni uredbi? (d) uveljavljanje in obramba pravnih zahtevkov kot namen? | (a) Zakoniti interes (brez računa, minimalni podatki). (b) Ukrepi pred sklenitvijo pogodbe; potrditveno polje za privolitev ohranimo kot vljudnost in dokaz. (c) Da. (d) Da, zakoniti interes. | Politika zasebnosti, opomba 3 | Lansiranje (blokira) |
| LQ-15 | Na zakoniti interes se opiramo pri: preverjanju »nisem robot« in omejitvah števila zahtev, moderiranju in samodejnem skrivanju, predlogih UI in pregledu slik, štetju oglasov, statistiki storitve iz lastne zbirke podatkov. Ali zadoščajo načrtovane enostranske presoje (tehtanje za vsak namen)? | Da. Za vsak namen pripravimo eno presojo iz gradiva za oceno učinka (poglavje 7) za vaš pregled. | Politika zasebnosti, opomba 3(d) | Lansiranje (blokira) |
| LQ-16 | Najnižja starost za račun 15 let (ZVOP-2, člen 8, preveriti) in plačljive možnosti samo za polnoletne. Kako naj preverjamo starost? | Ob registraciji uporabnik potrdi »Imam najmanj 15 let«. Ob plačilu potrdi, da ima 18 let ali več. Dokumentov ne preverjamo. | Politika zasebnosti, opomba 6; pogoji uporabe, opomba 2 | Lansiranje (blokira) |
| LQ-17 | Člen 22 Splošne uredbe: ali sta samodejno začasno skrivanje (tri prijave) in predlogi ujemanja avtomatizirani odločitvi s pravnimi ali podobno pomembnimi učinki? | Ne. Skrivanje je začasno in ga pregleda človek (cilj v 24 urah), ugovor je mogoč po e-pošti. Ujemanje le predlaga; odloči lastnik. | Politika zasebnosti, opomba 5; pogoji uporabe, opomba 11 | Lansiranje (blokira) |
| LQ-18 | Ali je ocena učinka v zvezi z varstvom podatkov obvezna (člen 35 in seznam Informacijskega pooblaščenca) glede na lokacije lastnikov, fotografije, analizo z UI in ujemanje prijav? | Pripravimo jo v vsakem primeru po osnutku iz poglavja 7 in jo posodobimo ob vsakem mejniku. | Politika zasebnosti, opomba 4 | Lansiranje (blokira) |
| LQ-19 | Hramba: ali so roki iz poglavja 8 sprejemljivi? Zlasti: kaj ostane od zaključene prijave po 12 mesecih, 24 mesecev za prijave zlorab in revizijski dnevnik ter 10 let za plačilne zapise. Še: ali je 30 dni po zaključku sprejemljiv rok za zameglitev shranjene točke (surove točke ne shranjujemo; ob shranjevanju jo premaknemo za 20 do 30 m)? | Poglavje 8, kot je predlagano. Shranjena točka se zamegli 30 dni po zaključku (predlagani N; potrdite). Po 12 mesecih zaključena prijava izgubi fotografije, točno točko in prosto besedilo; preostala polja niso več povezana z računom in jih hranimo samo za statistiko. | A-012; NFR-PRIV; politika zasebnosti, opomba 7 | Lansiranje (blokira) |
| LQ-20 | Prenosi v ZDA (dostop podpore Supabase, Cloudflare, Expo, Anthropic, Voyage AI, Stripe, Google, Sentry): okvir za zasebnost podatkov (DPF), kjer je ponudnik certificiran, sicer standardna pogodbena določila in ocena učinka prenosa? | Da. Ob zagonu za vsakega ponudnika preverimo seznam DPF in za necertificirane pripravimo kratko oceno učinka prenosa (poglavje 9). | Politika zasebnosti, opomba 8 | Lansiranje (blokira) |
| LQ-21 | Ni več relevantno: lasten geokodirnik na podatkih GURS, brez tretje osebe (15. 10. 2026). (Prej: ali je MapTiler obdelovalec ali upravljavec za točno točko in ali naj jo zaokrožimo.) | Odgovor ni potreben. | ADR-007; politika zasebnosti, opomba 10 | Ni več relevantno |
| LQ-22 | Zavetišča in druge organizacije, ki nalagajo podatke o sprejetih živalih (fotografija, čip, kraj in čas najdbe): ali so samostojni upravljavci, naši obdelovalci ali skupni upravljavci? | Samostojni upravljavci za lastne evidence; Najdimo je upravljavec za tisto, kar je objavljeno na platformi. Pogoji za organizacije prepovedujejo nalaganje podatkov o najditeljih ali lastnikih; predloga CSV nima takih polj. Pogodba o obdelavi ni potrebna. | Politika zasebnosti, opomba 16; FR-015 | Portal za zavetišča (M3) |
| LQ-23 | Na fotografijah in v prostem besedilu so lahko drugi ljudje (obrazi, otroci, registrske tablice, hišne številke). Ali naš pristop zadošča? | Pogoji uporabe to prepovedujejo, zasloni za nalaganje uporabnike opomnijo, pregled z UI označi izrazito vidne osebe in fotografijo zadrži, moderatorji pa na zahtevo v 72 urah odstranijo ali zameglijo vsebino. | Politika zasebnosti, opomba 17; FR-014 | Lansiranje (blokira) |
| LQ-24 | Moderatorji preberejo pogovor šele, ko je sporočilo v njem prijavljeno. Ali to zadošča za zaupnost komunikacije? | Da, z vpisom vsakega dostopa v revizijski dnevnik in s pravilom, navedenim v politiki zasebnosti (poglavje 5). | Politika zasebnosti, poglavje 5; FR-018 | Lansiranje (blokira) |
| LQ-25 | Shranjevanje v napravi brez privolitve (pravila ZEKom-2 o piškotkih): seja vpisa, izbira glede piškotkov, jezik, osnutki, žeton zasebne povezave, naključni identifikator naprave za omejitve zahtev, predpomnilnik za delo brez povezave, območja geografskih ograd, Turnstile. Ali so vsi nujno potrebni? | Da, vsi. Identifikator primerka aplikacije Firebase nastane šele po privolitvi. | Politika piškotkov, opombe 3, 4, 8 | Lansiranje (blokira) |
| LQ-26 | Dokazilo o privolitvi (člen 7(1)): izbira, različica besedila in čas so shranjeni samo v piškotku `zz_consent` (12 mesecev) in v varni shrambi aplikacije. Ali potrebujemo tudi zapis na strežniku? | Dodamo dnevnik na strežniku z naključnim identifikatorjem privolitve, izbiro, različico in časom ter brez drugega identifikatorja, s hrambo 24 mesecev. Potrebujemo vaše mnenje, ali tak zapis brez povezave z osebo sploh kaj dokazuje. | Politika zasebnosti, opomba 7; politika piškotkov, opomba 5 | Lansiranje (blokira) |
| LQ-27 | Google Analytics 4 in Firebase v EU: ali je sprejemljivo s privolitvijo, DPF, osnovnim načinom Consent Mode (brez zahtev pred privolitvijo), hrambo 14 mesecev, izklopljenimi Googlovimi signali in deljenjem podatkov ter brez osebnih podatkov v dogodkih? Ali moramo upoštevati katero stališče Informacijskega pooblaščenca? | Sprejemljivo. Naša zbirka podatkov ostane verodostojen vir za ključne kazalnike in poročila o oglasih. | R-004; FR-038 | Lansiranje (blokira) |
| LQ-28 | Geografske ograde v napravi: telefon preverja, ali uporabnik vstopi v javno, zamegljeno območje; lokacija nikoli ne zapusti naprave. Ali to sploh pomeni našo obdelavo? Kaj mora navesti politika zasebnosti? | Ne gre za našo obdelavo v smislu Splošne uredbe, vendar jo pojasnimo (politika zasebnosti, poglavje 6) in jo ohranimo izključno na izrecno željo uporabnika, s stikalom, ki odstrani vse ograde. Razkritja v trgovinah z aplikacijami obravnava LQ-66. | FR-043; R-024; politika zasebnosti, opomba 13 | Geografske ograde (M3) |
| LQ-29 | Evidence in kršitve (členi 30, 33, 34): ali je sprejemljiva evidenca dejavnosti obdelave, pripravljena iz našega popisa podatkov in poglavja 5? Kdo v 72 urah obvesti Informacijskega pooblaščenca? | Da; naročnik določi odgovorno osebo (CD-21), mi pa v operativni priročnik dodamo enostranski postopek ob kršitvi. | Vsebinska ekipa | Lansiranje (blokira) |
| LQ-30 | Pravice anonimnih najditeljev: edini dokaz identitete je posedovanje zasebne povezave. Ali to zadošča? | Da. Brez povezave osebe ne moremo identificirati (člen 11), razen če je navedla e-naslov. | FR-034; politika zasebnosti, poglavje 7 | Lansiranje (blokira) |
| LQ-31 | Izbris računa: sporočila izbrisanega uporabnika anonimiziramo (»Izbrisan uporabnik«), da druga oseba obdrži pogovor do konca 6-mesečne hrambe pogovorov. Ali je to sprejemljivo? | Da; vsebina je skupna korespondenca, ki se po urniku tako ali tako izbriše. | FR-034; tehnična zasnova, hramba | Izvoz in izbris (M3) |
| LQ-32 | Zgodbe z lepim koncem: izrecna privolitev, drugi ljudje na fotografijah, preklic v 24 urah. | Potrditveno polje za privolitev in moderiranje; lastnik potrdi, da se prikazane osebe strinjajo; zgodbo umaknemo v 24 urah po preklicu. | FR-012; A-023 | Zgodbe z lepim koncem (M5) |
| LQ-33 | Ali potrebujemo pooblaščeno osebo za varstvo podatkov (člen 37)? | Ni obvezna: ni posebnih vrst podatkov in ni sistematičnega spremljanja kot temeljne dejavnosti. Presojo dokumentiramo in določimo kontaktno osebo za zasebnost. | Politika zasebnosti, opomba 2 | Lansiranje (blokira) |
| LQ-34 | Anonimne prijave nimajo preverjanja starosti. Ali je to sprejemljivo za mladoletne, ki prijavijo najdeno žival? | Da: brez računa, z minimalnimi podatki, e-naslov je neobvezen. | Vsebinska ekipa | Lansiranje (blokira) |
| LQ-35 | E-pošta in potisna obvestila: tržnih sporočil ne načrtujemo. Ali bi plačana vrstica Veterinarskega partnerja v e-poštnem ali potisnem opozorilu sporočilo spremenila v komercialno sporočilo, za katero je potrebna predhodna privolitev (ZEKom-2, 226; ZEPT, 6)? | Da, tako ga obravnavamo. Brez plačane vrstice v e-pošti ali potisnih obvestilih brez privolitve za trženje; samo v aplikaciji in na plakatih. | V-07; obvestila, opomba Q7; politika zasebnosti, opomba 15 | Veterinarski partner (M4) |

## D. Umetna inteligenca

| Oznaka | Vprašanje | Predlagani odgovor | Vir | Rok / blokira lansiranje |
|---|---|---|---|---|
| LQ-36 | Pogodbeni pogoji ponudnikov Anthropic in Voyage AI: brez učenja na naših fotografijah, rok hrambe, pogodba o obdelavi, podobdelovalci, pogodbena družba (Voyage AI je od leta 2025 del družbe MongoDB, Inc.). Kaj lahko politika zasebnosti resnično navede? | Preverimo veljavne poslovne pogoje in pogodbe o obdelavi. Politika zasebnosti navede »ponudnika fotografij ne uporabljata za učenje svojih modelov« samo, če pogoji to potrjujejo. | Politika zasebnosti, opomba 11 | Funkcije UI (M3) |
| LQ-37 | Akt o umetni inteligenci: kaj velja za nas kot uvajalca? Pismenost na področju UI (člen 4) za osebje; preglednost (člen 50, od 2. avgusta 2026, preveriti morebitni odlog) za besedila za prijavo in družbena omrežja ter oblikovanje plakatov, ki jih pripravi UI (Premium). Ali morajo biti deljene objave označene kot ustvarjene z UI? | Predlogi UI so v aplikaciji označeni (»Predlog iz fotografije. Umetna inteligenca se lahko moti.«). Besedila in oblikovanje Premium so v aplikaciji označeni z »Pripravljeno s pomočjo umetne inteligence«; uporabnik jih uredi in objavi kot svoje, zato v deljeni objavi oznake ni. Kratko gradivo o pismenosti na področju UI za skrbnike in moderatorje. | Pogoji uporabe, opomba 12; FR-026 | Funkcije UI (M3–M4) |
| LQ-38 | Pregled slik z UI zadrži označeno fotografijo pred objavo. Ali mora obrazložitev po DSA (člen 17) navesti, da so bila uporabljena avtomatizirana sredstva? | Da. Obvestilo o zadržanju pove, da je fotografijo označilo samodejno preverjanje in da jo bo pregledala oseba. | FR-018 R-018.4 | Pregled slik (M4) |

## E. Obveznosti platforme (DSA) in uporabniška vsebina

| Oznaka | Vprašanje | Predlagani odgovor | Vir | Rok / blokira lansiranje |
|---|---|---|---|---|
| LQ-39 | Anonimne prijave najdenih živali samo s preverjanjem »nisem robot« in omejitvami števila zahtev (Q-003): ali obstaja pravni razlog, da zahtevamo identifikacijo, na primer zaradi odvračanja od prevar? Kakšna je naša odgovornost za prevare uporabnikov in ali moramo prevare prijaviti policiji? | Identifikacije ne zahtevamo. Opiramo se na izjemo od odgovornosti za gostovanje, hitro ukrepamo na prijave, kontaktne podatke skrivamo, prikazujemo varnostno opozorilo in na zahtevo sodelujemo s policijo. | Q-003; R-007 | Lansiranje (blokira) |
| LQ-40 | DSA: menimo, da smo storitev gostovanja in spletna platforma, ki se uvršča med mikro ali mala podjetja (izvzeta iz večine oddelka 3, člen 19, in iz poročil o preglednosti, člen 15(2)). Katere obveznosti veljajo in ali zadošča naš načrt: kontaktne točke za organe in uporabnike (člena 11–12), pravila moderiranja v pogojih uporabe (člen 14), »Prijavi zlorabo« kot mehanizem za prijavo, odprt za vse (člen 16), obrazložitve, ko vsebino skrijemo ali odstranimo (člen 17), obveščanje o sumu kaznivih dejanj zoper življenje ali varnost (člen 18)? Kateri organ je slovenski koordinator za digitalne storitve (menimo, da AKOS)? | Da: v impresum in pogoje uporabe dodamo odstavek o kontaktni točki, poglavje 8 pogojev uporabe razširimo s pravili moderiranja in postopkom obrazložitve, obrazec za prijavo zlorabe pa ostane odprt za obiskovalce. | Pogoji uporabe, opomba 11 | Lansiranje (blokira) |

## F. Potrošniško pravo in plačljive možnosti

| Oznaka | Vprašanje | Predlagani odgovor | Vir | Rok / blokira lansiranje |
|---|---|---|---|---|
| LQ-41 | Boost (7 dni, začne veljati takoj), Premium in Podpornik (naročnini): predpogodbene informacije, 14-dnevna pravica do odstopa od pogodbe in njena izguba, ko se izpolnjevanje z izrecnim soglasjem začne takoj, spletna »funkcija odstopa« (Direktiva (EU) 2023/2673, od 19. junija 2026; preveriti prenos v ZVPot-1) ter spletna prekinitev naročnin. | Plačilo prikaže ceno z DDV, trajanje, podaljšanje in način prekinitve. Za Boost: potrditveno polje »Povečan doseg naj začne veljati takoj. Razumem, da s tem izgubim pravico do odstopa od pogodbe.«. Naročnino je mogoče prekiniti z dvema klikoma (Stripov portal za stranke, povezan v aplikaciji), velja pa do konca obdobja. Povezava za odstop je v računu in v vsakem e-poštnem potrdilu. | Pogoji uporabe, opomba 5 | Prava plačila |
| LQ-42 | Prispevki (»prispevek«): pravna narava (darilo družbi?), ali velja potrošniško pravo, in »se ne vrača, razen kadar to zahteva zakon«. | Prostovoljno plačilo brez protidajatve, torej ne potrošniška pogodba za storitev. Izraz ostane »prispevek«, nikoli »donacija«. Kot dobronamerno politiko predlagamo vračilo na zahtevo v 14 dneh (osnutek pogojev uporabe zdaj navaja »se ne vrača«). | Pogoji uporabe, opomba 6; Q-008; P15 | Prava plačila |
| LQ-43 | Cene: prikazane z vključenim 22-odstotnim DDV; potrdila DDV izkazujejo ločeno (FR-046). Ali je za navajanje cen potrebno še kaj? | Vse cene so končne in z DDV; oznaka preskusnega načina ostane do pravih plačil. | FR-046 | Prava plačila |
| LQ-44 | Izvensodno reševanje potrošniških sporov (ZIsRPS): ali moramo navesti izvajalca in ali moramo povedati, ali v postopkih sodelujemo? (Evropska platforma za spletno reševanje sporov je bila leta 2025 ukinjena.) | Navedemo pristojnega izvajalca in pojasnimo, da se družba za začetek ne zaveže k sodelovanju (CD-16). | Pogoji uporabe, opomba 8 | Lansiranje (blokira) |
| LQ-45 | Omejitve odgovornosti v poglavju 15 pogojev uporabe, tudi za dogovore med uporabniki, kot je nagrada: ali so skladne z obveznim potrošniškim pravom in Obligacijskim zakonikom? (Spremenjeno v v0.2: pravilo o posredovanju nagrad je odstranjeno.) | Izjeme ohranimo (naklep, huda malomarnost, telesne poškodbe). | Pogoji uporabe, opomba 9 | Lansiranje (blokira) |
| LQ-46 | Licenca, ki nam jo podelijo uporabniki (poglavje 12 pogojev uporabe): hramba, obdelava, prikaz, uporaba za ujemanje, plakat in deljenje, brez podlicenciranja razen našim ponudnikom. Ali zadošča in je skladna s politiko zasebnosti? | Da, kot je zapisano. | Pogoji uporabe, opomba 10 | Lansiranje (blokira) |

## G. Plačila, nagrade, davki in davčno potrjevanje

| Oznaka | Vprašanje | Predlagani odgovor | Vir | Rok / blokira lansiranje |
|---|---|---|---|---|
| LQ-47 | Računi z DDV iz Stripe Billing za Veterinarskega partnerja (poslovne stranke, vse ambulante v Sloveniji): ali Stripovi računi zadoščajo ZDDV-1 (številčenje, obvezni podatki)? | Da, z našim zaporedjem številčenja in podatki o družbi; potrdi računovodja. | Politika zasebnosti, opomba 19(b); A-026 | Veterinarski partner (M4) |
| LQ-48 | Ni več relevantno: izločeno iz obsega 15. 10. 2026. (Prej: pravila o plačilnih storitvah za nagrado, ki jo hrani aplikacija.) | Odgovor ni potreben. | Projektna naloga v1.1; Q-011 zaprto | Ni več relevantno |
| LQ-49 | Ni več relevantno: izločeno iz obsega 15. 10. 2026. (Prej: obdavčitev in poročanje platforme o nagradah, plačanih prek aplikacije.) | Odgovor ni potreben. | Projektna naloga v1.1 | Ni več relevantno |
| LQ-50 | Dohodnina: Signapps ne more biti upravičenec, novo društvo pa za to potrebuje približno 2 leti. Ali je model s partnersko nevladno organizacijo zakonit in kako ga smemo ubesediti (»Namenite del dohodnine društvu X, ki podpira Najdimo«)? | Razdelek ostane skrit. Pozneje se povežemo z nevladno organizacijo, ki že ima status v javnem interesu na področju zaščite živali, s pisnim dogovorom, in dohodnino promoviramo samo za to organizacijo. | D-01 do D-05; Q-008; R-005; raziskava predpisov, odprta točka 6 | Razdelek o dohodnini |
| LQ-51 | DDV in računovodska obravnava prispevkov: ali je prispevek brez protidajatve zunaj sistema DDV? FR-046 zdaj določa, da je na vsakem računu 22 % DDV. Kateri dokument prejme plačnik (»potrdilo o prispevku«, nikoli »potrdilo o donaciji«)? | Za računovodjo: če je zunaj sistema DDV, plačnik prejme potrdilo o plačilu, ne računa; temu sledi besedilo e-poštnega potrdila. | Q-008; obvestila, opomba Q6; FR-046 | Prava plačila |
| LQ-52 | Davčno potrjevanje računov (ZDavPR): ali ga potrebujejo spletna plačila s kartico (Boost, Premium, prispevki, Veterinarski partner)? Kateri certificirani ponudnik? | Za računovodjo (Q-012). Vmesnik je pripravljen; prava plačila ostanejo onemogočena, dokler odločitev ni zapisana. | Q-012; FR-046; TASK-92 | Prava plačila |
| LQ-53 | Ni več relevantno: izločeno iz obsega 15. 10. 2026. (Prej: obveznosti platforme pri izplačilih najditeljem.) | Odgovor ni potreben. | Projektna naloga v1.1 | Ni več relevantno |
| LQ-67 | Navedba nagrade samo za prikaz (novo v v0.2). Lastnik lahko v prijavi izgubljene živali prikaže »Nagrada«, neobvezno z zneskom in kratko opombo, za nagrado pa se z najditeljem dogovori zunaj aplikacije. Ali je ta navedba javna obljuba nagrade (Obligacijski zakonik), ki zavezuje lastnika, in ali za nas pomeni kakršno koli odgovornost? Ali zadošča naše besedilo: pogoji uporabe, poglavje 6 (»To je izjava lastnika, ne naša. Najdimo nagrad ne hrani, ne izplačuje in zanje ne jamči.«), in opozorilo pred prevaro ob vsaki navedbi nagrade? | Zavezuje kvečjemu lastnika; Najdimo ni stranka dogovora in le prikaže lastnikovo izjavo (izjema za gostovanje). Besedilo pogojev uporabe in opozorilo »Nikoli nikomur ne plačajte vnaprej. Nagrado lastnik izroči šele, ko je žival spet doma.« ohranimo. Navedba dovoljuje znesek v celih evrih in opombo do 80 znakov; opombo s spletnim naslovom, e-naslovom ali nizom 6 ali več števk sistem zavrne, opombo, ki zahteva plačilo vnaprej, pa odstrani moderator. | Projektna naloga v1.1; pogoji uporabe, poglavje 6 in opomba 4; P6, P9, P18 | Navedba nagrade (M4) |

## H. Oglaševanje in Veterinarski partner

| Oznaka | Vprašanje | Predlagani odgovor | Vir | Rok / blokira lansiranje |
|---|---|---|---|---|
| LQ-54 | Vsak oglas in vsako plačano mesto ima oznako »Oglas« (EN »Ad«), povezave pa uporabljajo `rel="sponsored"`. Tudi lastni oglasi (lastna promocija: postanite podpornik, sodelujte z nami, posvojite iz zavetišča) imajo oznako »Oglas«. Ali to zadošča po ZVPot-1, 50(2), in ZEPT, 6? | Da. Pri vsakem oglasu je navedeno ime oglaševalca; nobena uredniška vsebina ne omenja plačujočega partnerja brez oznake »sponzorirano«. | V-01, V-04, V-06; R-030.1 | Oglasi (M2) |
| LQ-55 | Plakati: vrstica Veterinarskega partnerja (»Oglas · Potrebujete veterinarja? {ambulanta}«) je na lastnikovem plakatu privzeto vklopljena, lastnik pa jo lahko pred prenosom izklopi (odločitev naročnika). Ali je to sprejemljivo? | Da, če sta stikalo in njegova razlaga (»Plačan oglas lokalnega veterinarskega partnerja«) prikazana pred prenosom. | V-01; R-026; P18 | Veterinarski partner (M4) |
| LQ-56 | Oglasno mesto za veterinarje na strani s podrobnostmi in na zaslonu »Spet doma«: plačujoča ambulanta je prikazana prva pod naslovom »Veterinar v vaši regiji«, z oznako »Oglas« in povezavo »Kako razvrščamo«; »najbližji« samo, ko to geografsko drži; oznaka 24-urne pomoči je preverjena. Ali to zadošča po ZVPot-1, 49, 50(5)–(6) in 51, točka 12? | Da, skupaj s pravili razvrščanja v pogojih za Veterinarskega partnerja. | V-02, V-03, V-05; FR-028 | Veterinarski partner (M4) |
| LQ-57 | Uredba P2B (EU) 2019/1150: ali so ambulante »poslovni uporabniki« spletne posredniške storitve? Ali pravila veterinarske stroke (Veterinarska zbornica Slovenije) omejujejo oglaševanje ambulant? | Obravnavamo jih kot poslovne uporabnike: parametri razvrščanja in vpliv plačila so v pogojih za Veterinarskega partnerja. Ambulanta jamči, da njena vsebina upošteva pravila stroke; zbornico neformalno povprašamo. | V-06, V-09 | Veterinarski partner (M4) |
| LQ-58 | Kontekstni oglasi, ciljani samo po regiji in vrsti živali, z združenim štetjem brez piškotkov (brez identifikatorjev, nič v napravi): ali privolitev po pravilih o zasebnosti v elektronskih komunikacijah in Splošni uredbi ni potrebna? Ali člena 26 in 28 DSA za mikro ali malo platformo ne veljata? | Da v obeh primerih. Pri vsakem oglasu kljub temu prikažemo »Oglas · Partner: X«. | Politika zasebnosti, opomba 12; politika piškotkov, opomba 9; V-08 | Oglasi (M2) |
| LQ-59 | Pravila za vsebino oglasov: brez oglasov za prodajo, oddajo ali premestitev živali (ZZZiv, 10(3)); katere druge kategorije zahtevajo previdnost (zdravila za uporabo v veterinarski medicini, zdravstvene trditve za hrano za živali, zavarovanja)? | Seznam prepovedanih vsebin in ročna odobritev vsakega oglasa s strani skrbnika; pogoji za oglaševalce naštejejo prepovedane vsebine. | R-11; FR-029; FR-031 | Oglasi (M2) |
| LQ-60 | Dokumenti za poslovne stranke (pogoji za Veterinarskega partnerja, pogoji za oglaševalce, pogoji za organizacije in API): jih pripravite vi ali jih v kratki različici pripravimo mi za vaš pregled? | Kratke različice pripravimo mi za vaš pregled (poglavje 4.2). | Pogoji uporabe, opomba 7 | Prodaja oglasov, Veterinarski partner, M3 |

## I. Dostopnost, licence in ime

| Oznaka | Vprašanje | Predlagani odgovor | Vir | Rok / blokira lansiranje |
|---|---|---|---|---|
| LQ-61 | Ime »Najdimo«: preverjanje in registracija znamke, domena. Kdaj lahko odstranimo vrstice z »delovnim imenom«? | Naročnik opravi poizvedbo v bazah SIPO, EUIPO in TMview ter registrira besedno znamko, če je prosta; vrstice z »delovnim imenom« odstranimo, ko je ime dokončno. | Q-001; impresum, opomba 5; noga P1 | Lansiranje (blokira) |
| LQ-62 | Evropski akt o dostopnosti: ali storitev spada vanj (potrošniška spletna trgovina prek plačljivih možnosti)? Ali za Signapps velja izjema za mikropodjetja, ki opravljajo storitve? Kateri slovenski predpis prenaša akt in kateri organ ga nadzoruje? Ali je sprejemljiv naš pristop do strani tretjih oseb (Stripe, vpis z Googlom in Applom, Turnstile) in do samodejno ustvarjenih nadomestnih besedil za fotografije uporabnikov? | Storitev ne glede na to obravnavamo, kot da spada v področje uporabe, ciljamo na WCAG 2.2 AA, izjavo objavimo po presoji dostopnosti v mejniku M5 in organ navedemo, ko ga potrdite. | Izjava o dostopnosti, opombe 2, 3, 6, 7 | Lansiranje (blokira) |
| LQ-63 | Odprti podatki in zemljevidi: meje GURS ter podatki GURS o naseljih, ulicah in hišnih številkah, na katerih teče naše iskanje krajev (vse CC BY 4.0), in podatki OpenStreetMap prek OpenFreeMap in OpenMapTiles (ODbL). Ali zadošča naša navedba avtorstva: v impresumu (»Viri podatkov in zemljevidi«), na vsakem zemljevidu, pod iskanjem krajev in ob statistiki po regijah? (Spremenjeno v v0.2: MapTiler odstranjen.) | Da; besedila so v osnutku impresuma in v vsebinskih specifikacijah strani. | R-019; supabase/seed/geo/LICENSE.md | Lansiranje (blokira) |
| LQ-64 | Ni več relevantno: lasten geokodirnik na podatkih GURS, brez tretje osebe (15. 10. 2026). (Prej: paket MapTiler in komercialna uporaba; javni API Photon.) | Odgovor ni potreben. | ADR-007 | Ni več relevantno |
| LQ-65 | Licence za slike, pisave in ikone: fotografije Unsplash so samo v oblikovalskih osnutkih; ikone so Phosphor (MIT). Ali je treba v impresumu navesti še kaj? | V produkciji ni fotografij iz fotobank; navedbe avtorstva so v impresumu. | Impresum, opomba 4 | Lansiranje (blokira) |

## J. Trgovini z aplikacijami

| Oznaka | Vprašanje | Predlagani odgovor | Vir | Rok / blokira lansiranje |
|---|---|---|---|---|
| LQ-66 | App Store in Google Play: pravila za nakupe v aplikaciji za prispevke družbi, Boost, Premium in Podpornik; spletno plačilo iz aplikacije; razkritja o zasebnosti v trgovinah (Applove oznake zasebnosti, Googlov razdelek o varnosti podatkov); utemeljitev lokacije v ozadju. | Pisna odločitev pred vsako objavo v trgovinah (TASK-75). V tej fazi aplikacija odpre spletno plačilo. Razkritja pripravimo iz poglavja 5. | R-003; R-024; A-014 | Trgovini z aplikacijami |

# 7. Osnutek ocene učinka v zvezi z varstvom podatkov

Delovni osnutek po členu 35(7). Naročnik ga kot upravljavec potrdi po vašem pregledu, mi pa ga posodobimo ob vsakem mejniku in ob vsaki spremembi funkcije iz poglavja 3.

## 7.1 Presejanje

| Merilo (smernice EOVP) | Velja? | Zakaj |
|---|---|---|
| Vrednotenje ali točkovanje | Deloma | Ocene ujemanja med prijavami (o živalih, a povezane z lastniki) |
| Avtomatizirana odločitev s pravnim ali podobnim učinkom | Ne | Samo predlogi; skrivanje je začasno in pregledano (LQ-17) |
| Sistematično spremljanje | Ne | Brez sledenja; geografske ograde ostanejo v napravi |
| Občutljivi ali zelo osebni podatki | Deloma | Lokacija blizu domov ljudi; brez posebnih vrst podatkov |
| Obsežna obdelava | Še ne | Pilotni projekt za 5.000 mesečnih uporabnikov; pozneje vsa država |
| Ujemanje ali združevanje zbirk podatkov | Da | Prijave se ujemajo po čipu, kraju, času, lastnostih in vektorjih fotografij |
| Ranljivi posamezniki | Deloma | Lastniki v stiski so tarča prevar; mladoletni lahko prijavljajo anonimno |
| Inovativna tehnologija | Da | Razpoznavanje slik z UI in vektorske predstavitve slik |
| Preprečuje uporabo storitve ali uveljavljanje pravice | Ne | Obdelava ne pogojuje ničesar |

Rezultat: veljata vsaj dve merili, zato oceno učinka izvedemo (LQ-18).

## 7.2 Opis obdelave

- Nameni, podatki, uporabniki in hramba: poglavja 3, 5 in 8 tega gradiva ter poglavja 3, 4, 12 in 14 politike zasebnosti.
- Posamezniki, na katere se nanašajo osebni podatki: lastniki, najditelji in mimoidoči (z računom ali brez), člani skupnosti z opozorili, osebje organizacij, kontaktne osebe Veterinarskega partnerja, kontaktne osebe oglaševalcev, ljudje, ki so po naključju na fotografijah.
- Sredstva: Supabase (zbirka podatkov, overitev, sporočila v realnem času), strežnik Hetzner, Cloudflare R2, mobilne naprave.

## 7.3 Nujnost in sorazmernost

- Pravne podlage po namenih (politika zasebnosti, poglavje 4; LQ-14, LQ-15).
- Najmanjši obseg podatkov: najditelji ne potrebujejo računa; javne lokacije so zamegljene; kraja, kjer je najdena žival, nikoli ne zbiramo; v analitiki in štetju oglasov ni osebnih podatkov; fotografije gredo k UI brez identifikatorjev ali metapodatkov; številke čipov nikoli niso javne in so v dnevnikih le kot zgoščene vrednosti.
- Točnost: uporabniki urejajo svoje prijave; predlogi UI se brez potrditve nikoli ne shranijo.
- Omejitev shranjevanja: poglavje 8, izvaja ga načrtovano opravilo za brisanje.
- Pravice: samopostrežni izvoz in izbris, zasebna povezava za anonimne najditelje, kontaktni naslov.
- Obdelovalci in prenosi: poglavje 9.

## 7.4 Tveganja in ukrepi

| Oznaka | Tveganje za posameznike | Verjetnost / resnost (pred ukrepi) | Ukrepi | Preostalo tveganje |
|---|---|---|---|---|
| D-01 | Prijava izgubljene živali razkrije, kje živi lastnik (živali se pogosto izgubijo blizu doma) | Visoka / visoka | Surova točka GPS se nikoli ne shrani (naključni premik za 20 do 30 m enkrat ob shranjevanju, v napravi in na strežniku), javno območje s polmerom najmanj 500 m iz premaknjene točke, enaka zameglitev ob vsakem ogledu, premaknjena točka vidna samo prijavitelju in 30 dni po zaključku dodatno zameglena, koordinat ni v dnevnikih, točke nikoli v predpomnilniku za delo brez povezave, analitiki ali slikah za deljenje in nikoli poslane tretji osebi (lasten geokodirnik) | Nizko |
| D-02 | Prevarant izkoristi prijavo najdene ali izgubljene živali za izsiljevanje lastnika (»plačajte in vrnem vam psa«) | Visoka / visoka | Privzeto stik samo prek pogovora, varnostno opozorilo, povezave niso klikljive, prijava zlorabe in blokiranje, čip in posebni znaki ostanejo zadržani (»eno posebnost obdržite zase«), opozorilo pred prevaro ob vsaki navedbi nagrade (»nikomur ne plačajte, preden žival ni spet pri vas«) | Srednje |
| D-03 | Nekdo poišče in ukrade najdeno žival ali dragoceno žival | Srednja / visoka | Kraja, kjer je najdena žival, nikoli ne sprašujemo; območja najdb so zamegljena (najmanj 150 m); kontaktni podatki so skriti, dokler lastnik ne potrdi ujemanja | Nizko |
| D-04 | Številke čipov se sistematično preizkušajo, da bi se identificirali lastniki | Nizka / visoka | Iskanje samo za člane preverjenih organizacij, 30 na uro, revizija prek zgoščene vrednosti, odgovor nikoli ne vsebuje osebnih podatkov | Nizko |
| D-05 | Na fotografijah so ljudje, otroci, registrske tablice ali hišne številke | Srednja / srednja | Opomnik ob nalaganju, pogoji uporabe, UI označi izrazito vidne osebe, odstranitev na zahtevo, metapodatki odstranjeni iz vseh shranjenih kopij | Nizko |
| D-06 | Fotografije obdelujejo ponudniki UI v ZDA | Srednja / srednja | Samo fotografija, brez identifikatorjev, metapodatkov ali lokacije; DPF ali SCC; omejitve; pogodbeni pogoji o učenju in hrambi (LQ-36) | Nizko do srednje |
| D-07 | Nadlegovanje ali zloraba prek pogovora | Srednja / srednja | Prijava zlorabe in blokiranje, čakalna vrsta za moderiranje, začasna in trajna izključitev, izbris pogovora 6 mesecev po zaključku | Nizko |
| D-08 | Neupravičeno samodejno skritje pristne prijave | Srednja / srednja | Potrebne so tri neodvisne prijave, novi računi štejejo pol, cilj človeškega pregleda 24 ur, ugovor po e-pošti | Nizko |
| D-09 | Lažne anonimne prijave za zvabljanje lastnikov ali za neželeno vsebino | Srednja / srednja | Preverjanje »nisem robot«, omejitve števila zahtev, zaznavanje podvojenih fotografij, zadržanje za moderiranje ob vzorcih | Nizko do srednje |
| D-10 | Kršitev varnosti zbirke podatkov ali varnostnih kopij | Nizka / visoka | Zbirka podatkov ni izpostavljena (samo prek aplikacijskega vmesnika, varnost na ravni vrstic, ki privzeto vse zavrne), šifrirane povezave, šifrirane varnostne kopije s 30-dnevnim življenjskim ciklom, TOTP za skrbnike, skrivnosti samo na strežniku, varnostni pregled pred lansiranjem | Nizko |
| D-11 | Lokacija v ozadju se zbira, ne da bi uporabniki to razumeli | Nizka / srednja | Na izrecno željo z razlago, samo spremljanje območij operacijskega sistema, lokacija se nikoli ne naloži, eno stikalo vse odstrani | Nizko |
| D-12 | Izgubljen ali ukraden telefon razkrije podatke v predpomnilniku | Nizka / nizka | Predpomnilnik vsebuje samo javne zamegljene podatke, največ 7 dni; ob odjavi se izbriše | Nizko |
| D-13 | Oblikovanje profilov prek analitike | Nizka / srednja | Samo s privolitvijo; brez osebnih podatkov v dogodkih; Googlovi signali izklopljeni; hramba 14 mesecev | Nizko |
| D-14 | Podatki se hranijo dlje, kot je potrebno | Srednja / srednja | Opravilo za brisanje po poglavju 8, test popisa podatkov v CI | Nizko |
| D-15 | Zloraba s strani skrbnikov ali moderatorjev | Nizka / visoka | Dostop glede na vlogo, revizijski dnevnik vsakega dejanja, dostop do pogovora šele po prijavi | Nizko |

## 7.5 Posvetovanje in potrditev

- Pooblaščena oseba za varstvo podatkov: ni imenovana (LQ-33); pregled opravi kontaktna oseba za zasebnost.
- Mnenja posameznikov: povratne informacije lastnikov, najditeljev ter dveh ali treh zavetišč v pilotnem projektu.
- Predhodno posvetovanje z Informacijskim pooblaščencem samo, če po ukrepih ostane visoko tveganje.
- Potrditev: naročnik kot upravljavec, po vašem pregledu. Sprožilci za ponoven pregled: funkcije UI (M3), geografske ograde (M3), navedba nagrade in Veterinarski partner (M4), lansiranje v vsej državi.

# 8. Preglednica rokov hrambe (osnutek)

Vse vrednosti so predlogi za vaš pregled (A-012). Stolpec »V politiki« pove, ali politika zasebnosti vrednost že navaja.

| Podatki | Kje | Rok hrambe | Kako ga izvajamo | V politiki |
|---|---|---|---|---|
| Račun, nastavitve, profili živali | Supabase, R2 | Dokler jih uporabnik ne izbriše ali do izbrisa računa; ob izbrisu računa: takoj onemogočen, izbris ali anonimizacija v 30 dneh | Opravilo za izbris, popis podatkov | Da |
| Dodatni profili živali po prehodu s Premium na brezplačni paket | Supabase, R2 | 90 dni samo za branje, nato lastnik izbere 2, ki ju obdrži; ostali se po opomniku izbrišejo | Opravilo | Ne (dodati) |
| Anonimne seje brez odprte prijave | Supabase Auth | 30 dni | Opravilo za brisanje | Da |
| Odprte prijave | Supabase, R2 | Dokler so odprte; prijave izgubljenih živali se zaključijo po 90 dneh (podaljšanje na en dotik); najdenih in opaženih po 30 dneh brez posodobitve | Opravilo življenjskega cikla | Da |
| Zaključene prijave: shranjena točka (že premaknjena za 20 do 30 m ob shranjevanju) | Supabase | Zamegljena 30 dni po zaključku (predlagani N, LQ-19); ostaneta samo zamegljena točka in ime območja | Opravilo hrambe | Ne (dodati) |
| Zaključene prijave: fotografije, točka, prosto besedilo | Supabase, R2 | 12 mesecev po zaključku | Opravilo za brisanje | Da (fotografije in točka); dodati prosto besedilo |
| Zaključene prijave: preostala polja (vrsta živali, občina, datumi, izid) | Supabase | Hranimo za statistiko, po 12 mesecih brez povezave z računom | Opravilo za brisanje | Ne (dodati, LQ-19) |
| Ujemanja in razlogi | Supabase | Skupaj s prijavami, ki jih povezujejo | Kaskadni izbris | Ne (dodati) |
| Sporočila v pogovorih | Supabase | 6 mesecev po zaključku povezane prijave; sporočila izbrisanega uporabnika se takoj anonimizirajo | Opravilo za brisanje | Da |
| E-naslov najditelja za zasebno povezavo | Supabase | 30 dni po zaključku prijave | Opravilo za brisanje | Da |
| Zgoščena vrednost zasebne povezave | Supabase | Skupaj s prijavo | Kaskadni izbris | Da |
| Zgoščeni IP naslovi in števci za omejitve zahtev | Supabase | 48 ur | Opravilo za brisanje | Da |
| Naložene datoteke, ki niso pripete na prijavo | R2 | 24 ur | Opravilo za brisanje | Da |
| Rezultati UI in vektorji slik | Supabase | Skupaj s fotografijo; vnos v predpomnilniku se izbriše, ko ne ostane nobena fotografija s to zgoščeno vrednostjo | Kaskadni izbris | Ne (dodati) |
| Dnevnik iskanj po čipu (samo zgoščena vrednost) | Supabase | 12 mesecev | Opravilo za brisanje | Ne (dodati) |
| Prijave zlorab, odločitve moderatorjev, skrbniški revizijski dnevnik | Supabase | 24 mesecev | Opravilo za brisanje | Da |
| Nabiralnik obvestil | Supabase | 12 mesecev ali do izbrisa računa, kar nastopi prej | Opravilo za brisanje | Ne (spremeniti »do izbrisa računa«) |
| Žetoni za potisna obvestila | Supabase | Do odjave, odstranitve aplikacije ali zavrnitve s strani Appla ali Googla; po 90 dneh neaktivnosti | Opravilo | Ne (dodati) |
| Naročnina na opozorila v bližini | Supabase | Do izklopa ali izbrisa računa | Dejanje uporabnika | Da |
| Plačilni zapisi in računi | Supabase, Stripe | Kot zahtevata davčna in računovodska zakonodaja (pričakovano 10 let, ZDDV-1; potrdi računovodja) | Izvzeto iz izbrisa | Da |
| Profil ambulante Veterinarskega partnerja in kontaktna oseba | Supabase | Do prenehanja naročnine, nato izbris v 30 dneh; računi kot zgoraj | Opravilo | Da |
| Povpraševanja partnerjev | Supabase | 24 mesecev po zadnjem stiku | Opravilo za brisanje | Da |
| Člani organizacij, ključi API (zgoščeni) | Supabase | Do odstranitve ali preklica | Dejanje uporabnika | Ne (dodati) |
| Datoteke CSV za uvoz | R2 | Izbrisane po koncu uvoza, najpozneje v 24 urah | Opravilo | Ne (dodati) |
| Statistika oglasov | Supabase | Združena, brez osebnih podatkov; 36 mesecev | Opravilo za brisanje | Ni potrebno |
| Zgodbe z lepim koncem | Supabase, R2 | Do preklica privolitve; odstranitev v 24 urah | Dejanje skrbnika | Da |
| Izbira glede piškotkov (spletni piškotek, varna shramba aplikacije) | Naprava | 12 mesecev, nato uporabnika vprašamo znova | Potek veljavnosti | Da |
| Dnevnik privolitev na strežniku (če bo odgovor na LQ-26 pritrdilen) | Supabase | 24 mesecev | Opravilo za brisanje | Ne (dodati) |
| Google Analytics 4 in Firebase | Google | 14 mesecev | Nastavitev GA4 | Da |
| Dnevnik pošiljanja e-pošte | Supabase | 30 dni | Opravilo za brisanje | Da |
| Arhiv čakalne vrste opravil | Supabase | 7 dni | Nastavitev pg-boss | Ni potrebno (tehnično) |
| Strežniški zapisi (spletna stran, aplikacijski vmesnik) | Hetzner | 7 dni | Rotacija zapisov | Da (»približno 7 dni«) |
| Sledenje napakam | Sentry | 30 dni | Nastavitev Sentry | Ne (dodati) |
| Varnostne kopije (nočni izpis zbirke podatkov) | R2 | 30 dni, drseče | Pravilo življenjskega cikla vedra | Da |
| Predpomnilnik javnih prijav za delo brez povezave | Naprava | Največ 7 dni in 50 MB; izbris ob odjavi in izbrisu računa | Aplikacija | Da (politika zasebnosti, poglavje 6) |
| Osnutki in prijave najdenih živali v čakalni vrsti | Naprava | Do oddaje ali zavrženja; izbris ob odjavi | Aplikacija | Da (politika piškotkov) |
| Območja geografskih ograd | Naprava | Do zaključka prijave ali dokler uporabnik funkcije ne izklopi | Aplikacija | Da (politika zasebnosti, poglavje 6) |
| Imenik zavetišč | Supabase | Javni podatki organizacij, brez osebnih podatkov; različice se hranijo | Skrbnik | Ni potrebno |

# 9. Kontrolni seznam za pogodbe o obdelavi

## 9.1 Pregled stanja

Stanje danes: za produkcijo ni podpisana ali sprejeta nobena pogodba; preskusno okolje uporablja preskusne ali brezplačne račune.

| Obdelovalec | Kako se sklene pogodba o obdelavi | Podlaga za prenos | Nastavitve za preverjanje | Stanje |
|---|---|---|---|---|
| Supabase | Pogodba o obdelavi pri Supabase (podpis prek nadzorne plošče) | DPF ali SCC za dostop podpore iz ZDA; ocena učinka prenosa | Regija eu-central-1; Edge Functions in Storage se ne uporabljajo; seznam podobdelovalcev | Odprto |
| Hetzner | Pogodba o obdelavi v konzoli Hetzner | Ni potrebna (EU) | Lokacija strežnika Nemčija ali Finska (CD-10) | Odprto |
| Cloudflare (R2, CDN, Turnstile) | Pogodba o obdelavi je del Cloudflarovih pogojev | DPF ali SCC | Vedra R2 ustvarjena s pristojnostjo EU; predpomnjenje CDN samo za javne fotografije; način in piškotki Turnstile | Odprto |
| Brevo | Pogodba o obdelavi je del pogojev Brevo | Ni potrebna (EU) | Gostovanje podatkov v EU; brez tržnih seznamov; sledilne slikovne pike in sledenje povezav v transakcijski e-pošti izklopljeni | Odprto |
| Expo (650 Industries) | Pogodba o obdelavi na zahtevo ali v pogojih (preveriti) | DPF ali SCC (preveriti) | Samo potisna obvestila; brez EAS Insights ali analitike z osebnimi podatki | Odprto |
| Stripe | Pogodba o obdelavi je del pogodbe Stripe Services Agreement | DPF ali SCC | Samo preskusni način; Checkout; davčne nastavitve Billing | Odprto |
| Anthropic | Pogodba o obdelavi v poslovnih pogojih (preveriti pogodbeno družbo) | DPF ali SCC (preveriti) | Brez učenja na vhodnih podatkih; hramba; možnost brez hrambe, če je na voljo | Odprto |
| Voyage AI (MongoDB) | Pogodba o obdelavi (po prevzemu preveriti pogodbeno družbo) | DPF ali SCC (preveriti) | Enako kot pri Anthropic | Odprto |
| Google (GA4, Firebase) | V konzolah sprejeti pogoje Google Analytics za obdelavo podatkov in pogoje Firebase za obdelavo podatkov | DPF | Hramba 14 mesecev, Googlovi signali izklopljeni, deljenje podatkov izklopljeno, obravnava IP naslovov, osnovni način Consent Mode | Odprto |
| Sentry | Pogodba o obdelavi v pogojih Sentry | Regija EU; DPF ali SCC za družbo iz ZDA | Odstranjevanje osebnih podatkov vklopljeno; hramba 30 dni | Odprto (M5) |
| Nadzor razpoložljivosti | Pogodba o obdelavi ponudnika | Še ni izbrano | Brez osebnih podatkov v preverjanjih | Odprto (M5) |
| Ponudnik davčnega potrjevanja računov | Pogodba o obdelavi ponudnika | Ni potrebna (Slovenija) | Samo če LQ-52 to zahteva | Odprto |

## 9.2 Kontrolni seznam po členu 28(3) za vsako pogodbo

| Št. | Zahteva | Preverjeno (da / ne) |
|---|---|---|
| 1 | Predmet, trajanje, narava in namen obdelave |  |
| 2 | Vrste osebnih podatkov in kategorije posameznikov, na katere se nanašajo osebni podatki |  |
| 3 | Obdelava samo po dokumentiranih navodilih, tudi glede prenosov |  |
| 4 | Zaupnost oseb, ki podatke obdelujejo |  |
| 5 | Varnostni ukrepi po členu 32 |  |
| 6 | Pogoji za podobdelovalce: predhodno dovoljenje, seznam, obvestilo o spremembah, prenos enakih obveznosti |  |
| 7 | Pomoč pri zahtevah posameznikov |  |
| 8 | Pomoč pri varnosti, obveščanju o kršitvah (z rokom, po možnosti brez nepotrebnega odlašanja in v 48 urah), ocenah učinka in predhodnem posvetovanju |  |
| 9 | Izbris ali vrnitev vseh podatkov ob koncu, tudi iz varnostnih kopij |  |
| 10 | Pravice do informacij in revizije |  |
| 11 | Kadar podatki zapustijo EGP: navedena podlaga za prenos (DPF ali modul SCC) in, kjer je potrebno, ocena učinka prenosa |  |
| 12 | Zaveza glede lokacije podatkov, kjer se nanjo opiramo (Supabase Frankfurt, R2 s pristojnostjo EU, Sentry EU, Brevo EU) |  |
| 13 | Prijava na obvestila vsakega ponudnika o spremembah podobdelovalcev |  |

# 10. Odločitve naročnika

| Oznaka | Odločitev | Možnosti in naše priporočilo | Potrebno pred |
|---|---|---|---|
| CD-01 | Podatki o družbi za vsa pravna besedila: polno ime in pravnoorganizacijska oblika, sedež, matična številka, davčna številka in identifikacijska številka za DDV, vpis v register, osnovni kapital, zastopnik, odgovorna oseba za vsebino, e-naslovi za zasebnost, kontakt in dostopnost, telefon | Posredujte jih pred pravnim pregledom, da lahko odvetnik pregleda popolne osnutke | Pravni pregled |
| CD-02 | Odvetnik: kdo, obseg (to gradivo), proračun in časovnica; jezik gradiva | Pošljite slovensko različico (`najdimo-pravni-pregled.docx`, pripravljena od v0.2), angleško gradivo pa priložite za primerjavo | Takoj |
| CD-03 | Pooblaščena oseba za varstvo podatkov | Dokumentirajte, da ni obvezna; določite kontaktno osebo za zasebnost (LQ-33) | Lansiranje |
| CD-04 | Roki hrambe | Potrdite poglavje 8 po odgovoru odvetnika na LQ-19 | Lansiranje |
| CD-05 | Starostne omejitve | Račun od 15 let, plačljive možnosti od 18 let (LQ-16) | Lansiranje |
| CD-06 | Anonimne prijave (Q-003) | Ohranite preverjanje »nisem robot« in omejitve števila zahtev, brez preverjanja telefonske številke (LQ-39) | Lansiranje |
| CD-07 | Zakonski roki v storitvi | Stikalo za pravno vsebino vklopite samo z besedilom odvetnika; določite, kdo ga posodablja (LQ-06) | Lansiranje |
| CD-08 | Funkcije UI | Predizpolnjevanje z UI in podobnost slik omogočite v mejniku M3 po LQ-36; besedila UI v paketu Premium označite (LQ-37) | M3 |
| CD-09 | Geokodiranje | Odločeno 15. 10. 2026: lasten geokodirnik na podatkih GURS (ADR-007), brez tretje osebe in brez stroškov. Odprto ostaja: kdo osveži podatke GURS (letno) in posodobi datum v navedbi vira | Lansiranje |
| CD-10 | Nastavitve gostovanja | Lokacija strežnika Hetzner (priporočamo Nemčijo, najbližje Supabase v Frankfurtu); ali tudi spletna stran teče za omrežjem Cloudflare CDN. Vedra R2 v pristojnosti EU so odločena (ADR-014); naročnik jih tako ustvari | Lansiranje |
| CD-11 | Ponudniki nadzora | Sentry v regiji EU in nadzor razpoložljivosti v EU v mejniku M5 | M5 |
| CD-12 | Posredovanje nagrad | Ni več relevantno: izločeno iz obsega 15. 10. 2026 (projektna naloga v1.1, Q-011 zaprto). Ostane samo navedba nagrade za prikaz (LQ-67). | Ni več relevantno |
| CD-13 | Začetek Veterinarskega partnerja | Šele po LQ-55 do LQ-57; vrstica na plakatu privzeto vklopljena z lastnikovim stikalom (odločeno 15. 10. 2026); brez plačane vrstice v e-pošti ali potisnih obvestilih brez privolitve za trženje | M4 |
| CD-14 | Prispevki in davčna pravila | Z računovodjo: obravnava DDV (LQ-51), davčno potrjevanje in ponudnik (LQ-52), politika vračil (LQ-42) | Prava plačila |
| CD-15 | Dohodnina | Partnerska nevladna organizacija ali brez razdelka o dohodnini (LQ-50) | Pred vklopom |
| CD-16 | Izvensodno reševanje sporov | Navedite izvajalca; za začetek brez zaveze k sodelovanju (LQ-44) | Lansiranje |
| CD-17 | Stran za posvojitve | Izdelati šele po LQ-12 in LQ-13; sicer odložiti | M3–M4 |
| CD-18 | Ime in znamka | Opravite poizvedbo in registrirajte »Najdimo«, če je ime prosto (LQ-61) | Lansiranje |
| CD-19 | Zavarovanje odgovornosti | Pri zavarovalnici preverite, ali za storitev ustreza zavarovanje poklicne ali splošne odgovornosti (na primer za napačno predajo živali) | Lansiranje |
| CD-20 | Objava v trgovinah z aplikacijami | Pisna odločitev o nakupih v aplikaciji (TASK-75, LQ-66) | Trgovini z aplikacijami |
| CD-21 | Odgovorne osebe | Kdo odgovarja na zahteve posameznikov (1 mesec), prijave zlorab (cilj 24 ur), povratne informacije o dostopnosti (14 dni) in obvešča o kršitvah (72 ur) | Lansiranje |
| CD-22 | Dokumenti za poslovne stranke | Pripravi jih odvetnik, ali jih pripravimo mi in jih odvetnik pregleda (LQ-60) | Prodaja oglasov, M3, M4 |

# 11. Dnevnik sprememb

| Različica | Datum | Sprememba |
|---|---|---|
| 0.1 | 15. 10. 2026 | Prva različica za odvetnika: funkcije, obdelovalci po projektni nalogi v1.0 (Hetzner, Supabase Free za zbirko podatkov, overitev in sporočila v realnem času, Cloudflare R2, Brevo, brez Vercela), 66 zbranih vprašanj, osnutek ocene učinka, preglednica rokov hrambe, kontrolni seznam za pogodbe o obdelavi, odločitve naročnika. Hkrati posodobljeni osnutki: politika zasebnosti 0.3, politika piškotkov 0.2, impresum 0.3 (s poglavjem o virih podatkov). |
| 0.2 | 15. 10. 2026 | Projektna naloga v1.1: posredovanje nagrad izločeno iz obsega. F-15 je zdaj navedba nagrade samo za prikaz; LQ-48, LQ-49 in LQ-53 označeni kot »ni več relevantno« (oznake ohranjene); novo vprašanje LQ-67 o navedbi nagrade; spremenjeni LQ-04 in LQ-45; CD-12 ni več relevantna; CD-02 slovenska različica; Stripe Connect odstranjen iz poglavij 1, 5, 8 (evidenca nagrad, izjave v sporih) in 9; spremenjen ukrep pri tveganju D-02. Lasten geokodirnik na podatkih GURS (ADR-007): MapTiler in Photon odstranjena iz poglavij 1, 5 in 9; LQ-21 in LQ-64 nista več relevantna; spremenjena LQ-63 in CD-09; vedra R2 v pristojnosti EU odločena (poglavje 5, CD-10). Navedba nagrade ima zdaj tudi kratko opombo (F-15, LQ-67). Vprašanj, ki blokirajo lansiranje: 34. Hkrati posodobljeni osnutki: politika zasebnosti 0.4, pogoji uporabe 0.2, politika piškotkov 0.3, impresum 0.4. Dodana slovenska različica (`lawyer-briefing.sl.md`, `najdimo-pravni-pregled.docx`). |
| 0.3 | 15. 10. 2026 | Zmanjšanje natančnosti lokacije (odločitev naročnika): surove točke GPS ne shranjujemo; naključni premik za 20 do 30 m enkrat ob shranjevanju, v napravi in na strežniku; javna zameglitev (500 m / 150 m) izhaja iz premaknjene točke; shranjena točka se zamegli 30 dni po zaključku (predlagani N). Spremenjeno: F-03, LQ-19, ocena učinka D-01, poglavje 8. Politika zasebnosti 0.5. |
