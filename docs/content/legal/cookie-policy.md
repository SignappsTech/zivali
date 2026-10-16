**Draft — requires client/legal review.**
source: 02§Content, SEO and legal requirements (Legal); FR-038; FR-039; NFR-PRIV; privacy-policy.md chapters 10 and 11

| Field | Value |
|---|---|
| Version | 0.3 |
| Date | 2026-10-15 |
| Route SL | `/piskotki` |
| Route EN | `/en/cookies` |
| Slug SL / EN | `piskotki` / `cookies` |
| Structured data | WebPage |
| Template | T4 Legal (numbered h2 sections, "On this page" list, draft note) |

Change in 0.3: place search runs on our own servers (GURS data, ADR-007); MapTiler and Photon removed from chapter 6.

Change in 0.2: mobile items for drafts and queued reports, the offline copy of public reports and the proximity-alert areas (FR-041 to FR-043).

**SEO (SL)**

- Meta title: Politika piškotkov · Najdimo
- Meta description: Kateri piškotki in podobni zapisi so v Najdimo, čemu služijo, kako dolgo trajajo in kako izbiro spremenite ali prekličete.
- Focus keyword: politika piškotkov

**SEO (EN)**

- Meta title: Cookie policy · Najdimo
- Meta description: Which cookies and similar storage Najdimo uses, what they are for, how long they last and how to change or withdraw your choice.
- Focus keyword: cookie policy

---

# Politika piškotkov (slovenščina)

**Osnutek – zahteva pregled naročnika in pravnika.**

Zadnja posodobitev: 15. 10. 2026

## 1. Na kratko

Najdimo uporablja le nekaj piškotkov in podobnih zapisov. Večina jih je nujnih, da storitev sploh deluje. Analitiko vklopimo samo z vašo privolitvijo.

- Nujni zapisi delujejo brez privolitve: vaša izbira glede piškotkov, vpis, jezik, osnutki prijav in zasebna povezava do prijave.
- Google Analytics nastavi piškotka `_ga` in `_ga_PKY4SCX3RL` samo, če sprejmete.
- Oglaševalskih in sledilnih piškotkov ni. Prikaze in klike oglasov štejemo združeno in brez piškotkov.
- Izbiro lahko kadar koli spremenite ali prekličete prek povezave „Nastavitve piškotkov“ v nogi strani ali v nastavitvah aplikacije.

## 2. Kaj so piškotki in podobni zapisi

Piškotek je majhna datoteka, ki jo spletna stran shrani v vaš brskalnik. Podobne zapise (lokalna shramba brskalnika, varna shramba v aplikaciji) obravnavamo enako. V tem besedilu jim skupaj rečemo „zapisi“.

Zapise delimo na dve vrsti:

- **nujni**: brez njih storitev ne deluje ali ne more izpolniti tega, kar ste zahtevali. Zanje ne potrebujemo privolitve;
- **analitični**: merijo uporabo storitve. Nastavimo jih samo z vašo privolitvijo.

## 3. Zapisi na spletni strani

| Ime | Ponudnik | Čemu služi | Vrsta | Trajanje |
|---|---|---|---|---|
| `zz_consent` (piškotek) | Najdimo | Shrani vašo izbiro glede piškotkov, različico besedila in čas izbire. | nujni | 12 mesecev |
| `sb-<projekt>-auth-token` (piškotek; lahko je razdeljen na `.0`, `.1`) | Najdimo (Supabase) | Ohrani vpis, ko ste vpisani. | nujni | do 400 dni ali do odjave [naročnik: preveriti dejansko trajanje] |
| `NEXT_LOCALE` (piškotek) | Najdimo | Si zapomni izbran jezik. | nujni | [naročnik: preveriti trajanje, verjetno do konca seje] |
| Osnutek prijave (lokalna shramba) | Najdimo | Shrani nedokončano prijavo, da je ne izgubite. | nujni | dokler prijave ne oddate ali osnutka ne zavržete |
| `manage:<ID prijave>` (lokalna shramba) | Najdimo | Hrani žeton zasebne povezave, prek katere upravljate prijavo brez računa. | nujni | do zaključka prijave ali do izbrisa shrambe |
| `manage_token` (sejna shramba) | Najdimo | Začasno hrani žeton zasebne povezave iz naslova /m, da ga po osvežitvi strani ne izgubite. | nujni | do zaprtja zavihka |
| Identifikator naprave (lokalna shramba) | Najdimo | Naključna oznaka za omejevanje zlorab (število zahtev). | nujni | do izbrisa shrambe |
| Preverjanje „nisem robot“ (Turnstile) | Cloudflare, Inc. | Loči ljudi od botov s tehničnimi signali naprave in brskalnika. Ne služi oglaševanju. [naročnik: preveriti, ali nastavi piškotke] | nujni | po pravilih ponudnika |
| `_ga` (piškotek) | Google Ireland Limited | Loči uporabnike za statistiko obiska. | analitični | 2 leti |
| `_ga_PKY4SCX3RL` (piškotek) | Google Ireland Limited | Hrani stanje seje v Google Analytics 4. | analitični | 2 leti |

Analitična piškotka nastavimo samo, če sprejmete. Podatke v Google Analytics hranimo 14 mesecev.

## 4. Zapisi v mobilni aplikaciji

| Ime | Ponudnik | Čemu služi | Vrsta | Trajanje |
|---|---|---|---|---|
| Izbira glede piškotkov (varna shramba naprave) | Najdimo | Shrani vašo izbiro, različico besedila in čas. | nujni | 12 mesecev |
| Seja vpisa (shramba aplikacije) | Najdimo (Supabase) | Ohrani vpis. | nujni | do odjave [naročnik: preveriti trajanje] |
| Žeton za potisna obvestila | Najdimo; Apple in Google prenašata obvestila | Pošiljanje obvestil, ko jih dovolite v napravi. | nujni | dokler obvestil ne izklopite ali aplikacije ne odstranite |
| Žeton zasebne povezave (varna shramba) | Najdimo | Upravljanje prijave brez računa. | nujni | do zaključka prijave ali do odstranitve aplikacije |
| Identifikator naprave | Najdimo | Omejevanje zlorab. | nujni | do odstranitve aplikacije |
| Osnutki in prijave, ki čakajo na pošiljanje | Najdimo | Shrani nedokončano prijavo in prijavo najdene živali, oddano brez povezave, dokler je ne pošljemo. | nujni | dokler prijave ne pošljemo ali osnutka ne zavržete; izbrišemo ob odjavi |
| Kopija javnih prijav v okolici | Najdimo | Zemljevid in seznam delujeta tudi brez povezave. Samo približna območja in pomanjšane fotografije. | nujni | največ 7 dni in 50 MB; izbrišemo ob odjavi |
| Območja za opozorila, ko ste blizu | Najdimo (preverja jih operacijski sistem telefona) | Telefon vas opozori, ko vstopite v približno območje izgubljene živali. Samo če funkcijo vklopite. | nujni | dokler se iskanje ne zaključi ali funkcije ne izklopite |
| Identifikator namestitve aplikacije (Firebase Analytics) | Google Ireland Limited | Loči namestitve za statistiko uporabe. | analitični | po pravilih ponudnika; podatke v Googlu hranimo 14 mesecev [naročnik: preveriti] |

Identifikator Firebase Analytics ustvarimo šele po vaši privolitvi.

## 5. Česa ne uporabljamo

- Oglaševalskih in sledilnih piškotkov ni. Vse štiri Googlove nastavitve privolitve so privzeto zavrnjene. Če sprejmete, odobrimo samo `analytics_storage`.
- Prikaze in klike oglasov štejemo v svoji zbirki, združeno in brez piškotkov. Pri tem ničesar ne shranimo v vaši napravi.

## 6. Storitve tretjih oseb

- **Stripe.** Plačilo poteka na Stripovi strani (Stripe Checkout). Tam veljata Stripova politika piškotkov in zasebnosti.
- **Zemljevid in iskanje krajev.** Zemljevidne ploščice (OpenFreeMap) ne nastavljajo piškotkov, vidijo pa vaš IP naslov. Iskanje krajev teče na naših strežnikih in ne nastavlja piškotkov.
- **Vpis z Googlom ali Applom.** Ob vpisu veljajo pravila izbranega ponudnika.

Več o teh ponudnikih je v [politiki zasebnosti](/zasebnost).

## 7. Kako deluje vaša izbira

- Dokler se ne odločite, ne naložimo nobene Googlove skripte, ne pošljemo nobene zahteve Googlu in ne nastavimo nobenega Googlovega piškotka (osnovni način Consent Mode v2).
- Če zavrnete ali ne izberete ničesar, storitev deluje enako. Nič ni zaklenjeno.
- Če sprejmete, odobrimo samo `analytics_storage`.
- Vprašamo vas znova po 12 mesecih ali ko se spremenijo ponudniki ali nameni.

## 8. Kako izbiro spremenite ali prekličete

Kadar koli odprite „Nastavitve piškotkov“ v nogi strani ali v nastavitvah aplikacije in spremenite izbiro. Preklic velja takoj, piškotke `_ga` pa izbrišemo še isti trenutek. Piškotke lahko izbrišete tudi v nastavitvah brskalnika; nujni zapisi se nato ustvarijo znova, ko jih storitev potrebuje, osnutki pa se izgubijo.

## 9. Spremembe

Besedilo posodobimo, ko dodamo ali odstranimo zapis ali ponudnika. Datum zadnje posodobitve je na vrhu strani. Pri pomembni spremembi vas znova vprašamo za izbiro.

## 10. Kontakt

Vprašanja: [naročnik: e-naslov za zasebnost]. Splošno o obdelavi podatkov: [politika zasebnosti](/zasebnost).

---

# Cookie policy (English)

**Draft — requires client/legal review.**

Last updated: 15 October 2026

## 1. In short

Najdimo uses only a few cookies and similar storage items. Most are necessary for the service to work at all. We switch on analytics only with your consent.

- Necessary items work without consent: your cookie choice, sign-in, language, report drafts and the private link to a report.
- Google Analytics sets the cookies `_ga` and `_ga_PKY4SCX3RL` only if you accept.
- There are no advertising or tracking cookies. We count ad impressions and clicks in aggregate and without cookies.
- You can change or withdraw your choice at any time through "Cookie settings" in the page footer or in the app settings.

## 2. What cookies and similar storage are

A cookie is a small file that a website saves in your browser. We treat similar items (the browser's local storage, secure storage in the app) the same way. In this text we call them all "items".

We split items into two kinds:

- **necessary**: without them the service does not work or cannot do what you asked for. We do not need consent for them;
- **analytics**: they measure how the service is used. We set them only with your consent.

## 3. Items on the website

| Name | Provider | Purpose | Category | Duration |
|---|---|---|---|---|
| `zz_consent` (cookie) | Najdimo | Stores your cookie choice, the text version and the time of the choice. | necessary | 12 months |
| `sb-<project>-auth-token` (cookie; may be split into `.0`, `.1`) | Najdimo (Supabase) | Keeps you signed in. | necessary | up to 400 days or until you sign out [client: verify actual duration] |
| `NEXT_LOCALE` (cookie) | Najdimo | Remembers the language you chose. | necessary | [client: verify duration, likely session] |
| Report draft (local storage) | Najdimo | Saves an unfinished report so you do not lose it. | necessary | until you submit the report or discard the draft |
| `manage:<report id>` (local storage) | Najdimo | Holds the private-link token that lets you manage a report without an account. | necessary | until the report closes or storage is cleared |
| `manage_token` (session storage) | Najdimo | Temporarily holds the private-link token from the /m address so a page reload does not lose it. | necessary | until the tab closes |
| Device identifier (local storage) | Najdimo | Random identifier for abuse limits (rate limiting). | necessary | until storage is cleared |
| "Not a robot" check (Turnstile) | Cloudflare, Inc. | Tells people from bots using technical device and browser signals. Not used for advertising. [client: verify whether it sets cookies] | necessary | per the provider's rules |
| `_ga` (cookie) | Google Ireland Limited | Distinguishes users for visit statistics. | analytics | 2 years |
| `_ga_PKY4SCX3RL` (cookie) | Google Ireland Limited | Keeps session state in Google Analytics 4. | analytics | 2 years |

We set the two analytics cookies only if you accept. We keep data in Google Analytics for 14 months.

## 4. Items in the mobile app

| Name | Provider | Purpose | Category | Duration |
|---|---|---|---|---|
| Cookie choice (device secure storage) | Najdimo | Stores your choice, the text version and the time. | necessary | 12 months |
| Sign-in session (app storage) | Najdimo (Supabase) | Keeps you signed in. | necessary | until you sign out [client: verify duration] |
| Push notification token | Najdimo; Apple and Google carry the notifications | Sends notifications once you allow them on your device. | necessary | until you turn notifications off or remove the app |
| Private-link token (secure storage) | Najdimo | Manages a report without an account. | necessary | until the report closes or the app is removed |
| Device identifier | Najdimo | Abuse limits. | necessary | until the app is removed |
| Drafts and reports waiting to be sent | Najdimo | Keeps an unfinished report, and a found-animal report made offline until we send it. | necessary | until the report is sent or the draft discarded; deleted on sign-out |
| Copy of public reports nearby | Najdimo | Lets the map and list work offline. Approximate areas and small photos only. | necessary | at most 7 days and 50 MB; deleted on sign-out |
| Areas for alerts when you are nearby | Najdimo (checked by the phone's operating system) | Your phone alerts you when you enter the approximate area of a lost pet. Only if you turn the feature on. | necessary | until the search closes or you turn the feature off |
| App-instance identifier (Firebase Analytics) | Google Ireland Limited | Tells installations apart for usage statistics. | analytics | per the provider's rules; we keep data in Google for 14 months [client: verify] |

We create the Firebase Analytics identifier only after you consent.

## 5. What we do not use

- There are no advertising or tracking cookies. All four Google consent settings are denied by default. If you accept, we grant only `analytics_storage`.
- We count ad impressions and clicks in our own database, in aggregate and without cookies. We store nothing on your device for it.

## 6. Third-party services

- **Stripe.** Payment takes place on Stripe's page (Stripe Checkout). Stripe's cookie and privacy policies apply there.
- **Map and place search.** Map tiles (OpenFreeMap) set no cookies, but they can see your IP address. Place search runs on our servers and sets no cookies.
- **Sign-in with Google or Apple.** The rules of the provider you choose apply at sign-in.

More about these providers is in the [privacy policy](/en/privacy).

## 7. How your choice works

- Until you decide, we load no Google script, send no request to Google and set no Google cookie (basic Consent Mode v2).
- If you decline or choose nothing, the service works the same. Nothing is locked.
- If you accept, we grant only `analytics_storage`.
- We ask you again after 12 months or when providers or purposes change.

## 8. How to change or withdraw your choice

At any time, open "Cookie settings" in the page footer or in the app settings and change your choice. Withdrawal takes effect at once, and we delete the `_ga` cookies at that moment. You can also delete cookies in your browser settings; necessary items are created again when the service needs them, but drafts are lost.

## 9. Changes

We update this text when we add or remove an item or a provider. The date of the last update is at the top of the page. For an important change we ask for your choice again.

## 10. Contact

Questions: [client: privacy contact email]. General information about data processing: [privacy policy](/en/privacy).

---

# Notes for legal review (EN, internal, not published)

1. **Markers.** Every `[naročnik: …]` / `[client: …]` marker needs a value or a verified fact; the build should fail while one remains.
2. **Durations to verify in the built product.** `sb-<project>-auth-token` (400 days is the cookie maximum; the real value depends on the Supabase and `@supabase/ssr` settings), `NEXT_LOCALE` (likely session), the mobile session, and the Firebase app-instance id. Check with a real browser session and update the tables.
3. **Turnstile.** Confirm whether Cloudflare Turnstile sets cookies or only uses storage and signals in the current widget mode. If it sets any, list the names. I classified it as necessary (security of anonymous forms); confirm this under ePrivacy rules (ZEKom-2) and document the legitimate interest.
4. **ePrivacy and legal basis.** Slovenian rules for storing information on a device are in ZEKom-2 (not verified by me). Confirm the necessary/consent split, in particular the device identifier for rate limits and the `manage:<id>` token.
5. **Consent record.** `zz_consent` stores choice, version and time for 12 months. Check whether longer retention of proof of consent is needed (see privacy-policy note 7).
6. **Consent Mode v2 (basic).** The text promises: no Google script, request or cookie before acceptance; four signals denied by default; only `analytics_storage` granted on acceptance. Confirm with the developers that this is exactly how the build behaves (also GA4 cookie names: `_ga`, `_ga_PKY4SCX3RL`, 2 years each).
7. **Reject button.** Check that "decline" is as easy as "accept" in the banner (equal prominence).
8. **Mobile.** Confirm that the Firebase app-instance id is not created before consent, and where each token is stored (secure storage vs plain app storage).
9. **Ad counting without consent.** The claim rests on aggregate, cookieless, identifier-free counting (privacy-policy chapter 11); confirm.
10. **Stripe and sign-in providers** may set their own cookies on their own pages; we only point to their policies.
11. **Slovenian wording** needs a native legal review (e.g. „piškotki“ vs „zapisi“, „lokalna shramba“).
