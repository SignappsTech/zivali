**Draft — requires client/legal review.**
source: 02§Content, SEO and legal requirements (Legal, accessibility); NFR-A11Y (WCAG 2.2 AA); 03§Accessibility; owner decision 2026-10-16 (TASK-114.16, option 1)

| Field | Value |
|---|---|
| Version | 0.2 |
| Date | 2026-10-18 |
| Route SL | `/dostopnost` |
| Route EN | `/en/accessibility` |
| Slug SL / EN | `dostopnost` / `accessibility` |
| Structured data | WebPage |
| Template | T4 Legal (numbered h2 sections, "On this page" list, draft note) |

**Decision and basis (2026-10-16, owner).** The page is a short voluntary "Dostopnost" page, not a formal accessibility statement. It makes no legal compliance claims. The WCAG 2.2 AA work and its quality gates (axe in e2e and the quality kit) stay.

Basis: the European Accessibility Act (Directive (EU) 2019/882, Art. 4(5)) and the Slovenian ZDPSI (Zakon o dostopnosti do proizvodov in storitev za invalide) exempt microenterprises providing services: fewer than 10 employees and annual turnover or balance-sheet total not above EUR 2 million. The public-sector act (ZDSMA) does not apply to a private operator. Najdimo is operated by SIGNAPPS d.o.o.

To revisit: if SIGNAPPS d.o.o. grows past the thresholds, or Najdimo moves to its own company, re-check the exemption and, if it no longer applies, restore a formal statement (scope, conformance status from an audit, competent authority). The general lawyer review (TASK-91) may glance at this page and confirm that SIGNAPPS d.o.o. qualifies as a microenterprise.

**SEO (SL)**

- Meta title: Dostopnost · Najdimo
- Meta description: Kako si prizadevamo, da je Najdimo uporabno za vsakogar: naš cilj WCAG 2.2 AA, znane omejitve in kam sporočite oviro.
- Focus keyword: dostopnost

**SEO (EN)**

- Meta title: Accessibility · Najdimo
- Meta description: How we work to make Najdimo usable for everyone: our WCAG 2.2 AA goal, known limitations and where to report a barrier.
- Focus keyword: accessibility

---

# Dostopnost (slovenščina)

**Osnutek – zahteva pregled naročnika in pravnika.**

Zadnja posodobitev: 18. 10. 2026

## 1. Na kratko

Najdimo naj bi bilo uporabno za vsakogar, tudi v stresu in na majhnem zaslonu. Delamo po smernicah WCAG 2.2 na ravni AA in jih redno preverjamo s samodejnimi testi.

To je prostovoljen cilj, ne uradna izjava o skladnosti. Ne trdimo, da je vsaka stran popolnoma skladna.

## 2. Kaj že počnemo

- Besedilo in glavno dejanje imata visok kontrast.
- Vse deluje s tipkovnico in bralnikom zaslona.
- Zemljevid ima vedno enakovredno alternativo v obliki seznama.
- Fotografije imajo nadomestno besedilo.
- Spoštujemo nastavitev zmanjšanega gibanja.
- Besedilo lahko povečate do 200 %, ne da bi se vsebina pokvarila.
- Oznake polj so nad polji, napake pa so zapisane z besedilom, ne samo z barvo.

## 3. Znane omejitve

- **Interaktivni zemljevid** je dopolnilo. Vse, kar je na njem, najdete tudi na seznamu.
- **Fotografije uporabnikov** imajo lahko samo opis, ustvarjen iz lastnosti živali, ker avtor ni napisal svojega.
- **Strani tretjih ponudnikov** nimamo pod nadzorom: plačilo na Stripe Checkout, vpis z Googlom ali Applom in preverjanje „nisem robot“ (Cloudflare Turnstile).
- **PDF plakati** so označeni (tagged), vendar se lahko dostopnost med plakati razlikuje.
- **Skrbniški portal in portal za zavetišča** sta prirejena predvsem za namizne računalnike.

## 4. Sporočite oviro

Če naletite na oviro ali potrebujete vsebino v drugi obliki, nam pišite na info@signapps.si. Odgovorimo v 14 dneh.

---

# Accessibility (English)

**Draft — requires client/legal review.**

Last updated: 18 October 2026

## 1. In short

Najdimo should work for everyone, including under stress and on a small screen. We build to WCAG 2.2 level AA and check it regularly with automated tests.

This is a voluntary goal, not a formal statement of conformance. We do not claim that every page is fully conformant.

## 2. What we already do

- Body text and the main action have high contrast.
- Everything works with a keyboard and a screen reader.
- The map always has an equivalent list alternative.
- Photos have alt text.
- We respect the reduced-motion setting.
- You can enlarge text up to 200 % without breaking the content.
- Field labels sit above the fields, and errors are written as text, not shown by colour alone.

## 3. Known limitations

- **The interactive map** is a supplement. Everything on it is also in the list.
- **User photos** may have only a description generated from the animal's attributes, because the author did not write one.
- **Third-party pages** are outside our control: payment on Stripe Checkout, sign-in with Google or Apple, and the "not a robot" check (Cloudflare Turnstile).
- **PDF posters** are tagged, but accessibility may vary between posters.
- **The admin portal and the shelter portal** are designed mainly for desktop computers.

## 4. Report a barrier

If you meet a barrier or need content in another format, write to info@signapps.si. We reply within 14 days.

---

# Notes for legal review (EN, internal, not published)

1. **Exemption basis.** See "Decision and basis" above. TASK-91 may confirm that SIGNAPPS d.o.o. qualifies as a microenterprise (headcount, turnover) and that payments do not take Najdimo out of the services exemption.
2. **Claims to verify against the build.** High contrast; keyboard and screen-reader support; list alternative to the map; reduced motion; 200 % text; labels above fields; errors as text. Remove any claim that is not true.
3. **Contact.** info@signapps.si and the 14-day reply are our proposed commitment. Confirm that it can be met.
4. **Third-party content.** Stripe Checkout, Google and Apple sign-in and Turnstile are outside our control.
5. **Quality.** The Slovenian text needs a native review of terminology (e.g. „bralnik zaslona“, „nadomestno besedilo“).
