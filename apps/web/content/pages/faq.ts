import { type FaqContent, SUPPORT_EMAIL } from '@/components/content/article';

// T3 FAQ, copy from docs/content/pages/P3-public-pages.md: groups of [question, answer]. Inline `**bold**` and
// `[text](/internal-path)`. The slice's client marker for the support address is the shared support address.
const email = `[${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL})`;

export const faq: Record<'sl' | 'en', FaqContent> = {
	sl: {
		seo: {
			title: 'Pogosta vprašanja o izgubljenih živalih · Najdimo',
			description:
				'Odgovori o prijavi izgubljene ali najdene živali, zasebni povezavi, ujemanjih, zasebnosti, oglasih in sodelovanju zavetišč.',
		},
		crumb: 'Pogosta vprašanja',
		h1: 'Pogosta vprašanja',
		lede: 'Kratki odgovori na vprašanja, ki nam jih postavljate najpogosteje.',
		groups: [
			{
				title: 'Prijava izgubljene živali',
				items: [
					[
						'Ali je Najdimo brezplačno?',
						'Da, vse, kar pomaga vrniti žival domov, je brezplačno za vse in za vedno: prijava, ujemanja, pogovor, opozorila, plakat in preverjanje čipa. Delovanje pokrivajo označeni oglasi in prostovoljni prispevki.',
					],
					[
						'Zakaj za prijavo izgubljene živali potrebujem račun?',
						'Da vas lahko obvestimo o možnem ujemanju in da vam lahko ljudje pišejo, ne da bi videli vašo telefonsko številko. Vse, kar vnesete pred vpisom, se ohrani.',
					],
					[
						'Zakaj je na zemljevidu prikazano le približno območje?',
						'Da vas zaščitimo. Namesto točnega kraja prikažemo območje s polmerom vsaj 500 metrov, pri najdenih in opaženih živalih vsaj 150 metrov. Točno lokacijo vidite samo vi.',
					],
					[
						'Ali bo številka čipa javna?',
						'Ne. Številko čipa vpišite v prijavo ali profil živali, a je nikoli ne prikažemo javno. Uporabimo jo samo za iskanje ujemanj.',
					],
					[
						'Kako dolgo ostane prijava objavljena?',
						'Dokler je ne zaključite. Po 7, 14 in 30 dneh vas vprašamo, ali še iščete. Če prijave 90 dni ne posodobite, se samodejno zaključi, podaljšate pa jo lahko takoj.',
					],
				],
			},
			{
				title: 'Najdena ali opažena žival',
				items: [
					[
						'Ali za prijavo najdene živali potrebujem račun?',
						'Ne. Prijava vzame manj kot minuto. Na koncu dobite zasebno povezavo, s katero prijavo urejate in odgovarjate na sporočila.',
					],
					[
						'Kaj, če izgubim zasebno povezavo?',
						'Če ste ob prijavi vpisali e-naslov, vam jo pošljemo znova. Brez e-naslova je ne moremo obnoviti, prijava pa poteče po 30 dneh. Povezavo lahko ohranite tudi tako, da ustvarite račun.',
					],
					[
						'Ali moram povedati, kje je žival zdaj?',
						'Ne. Tega ne sprašujemo in nikoli ne prikažemo. Prevzem se dogovorite v pogovoru.',
					],
					[
						'Kaj naj storim, če žival ne morem obdržati?',
						'Pokličite zavetišče, s katerim sodeluje vaša občina, ali veterinarja. Prijavo na Najdimo vseeno oddajte, da jo tisti, ki jo pogrešajo, lažje najdejo.',
					],
				],
			},
			{
				title: 'Ujemanja in pogovor',
				items: [
					[
						'Kako veste, da je to moja žival?',
						'Ne vemo zagotovo. Primerjamo številko čipa, območje, čas in opis ter predlagamo možno ujemanje. Odločite se vi, ko pogledate fotografije.',
					],
					[
						'Kdo vidi moja sporočila?',
						'Samo udeleženci pogovora. Naša ekipa vidi sporočilo le, če ga kdo prijavi kot zlorabo.',
					],
					[
						'Se lahko pogovorimo po telefonu?',
						'Številko lahko delite v pogovoru, a priporočamo, da ostanete v aplikaciji, dokler žival ni varno doma.',
					],
				],
			},
			{
				title: 'Zasebnost in varnost',
				items: [
					[
						'Kako prepoznam prevaro?',
						'Najpogostejši znak je zahteva po denarju vnaprej. Kdor je žival res našel, denarja ne zahteva. Več v [nasvetih za varnost](/safety).',
					],
					[
						'Kako izbrišem svoje podatke?',
						'Prijavo najdene ali opažene živali izbrišete prek zasebne povezave. Za izbris računa nam pišite na naslov iz [politike zasebnosti](/privacy). Kmalu boste račun lahko izbrisali sami v nastavitvah.',
					],
					[
						'Ali uporabljate piškotke?',
						'Nujne piškotke za delovanje, na primer za vpis. Analitične piškotke Google Analytics uporabimo le, če jih sprejmete. Izbiro lahko kadar koli spremenite v Nastavitvah piškotkov.',
					],
				],
			},
			{
				title: 'Oglasi in podpora',
				items: [
					[
						'Zakaj so na strani oglasi?',
						'Da Najdimo ostane brezplačno. Oglasi lokalnih partnerjev so vedno označeni z besedo Oglas. Nikoli jih ne prikažemo med prijavo, v pogovoru ali pri plačilu in ne uporabljajo piškotkov za sledenje.',
					],
					[
						'Kako lahko podprem Najdimo?',
						'Ko je vaša žival spet doma, lahko pustite prispevek v zahvalo. Prispevek ni obvezen in ne vpliva na nobeno funkcijo.',
					],
					[
						'Kako lahko oglašujem?',
						'Vse o oglasnih mestih in občinstvu je na strani [Oglašujte pri nas](/advertise), kjer nam lahko tudi pišete.',
					],
				],
			},
			{
				title: 'Zavetišča',
				items: [
					[
						'Ali je Najdimo za zavetišča brezplačno?',
						'Da, vse in za vedno, tudi portal, uvoz in poročila za občine. Portal za zavetišča pripravljamo. Če želite sodelovati v pilotu, preberite [Za zavetišča](/for-shelters).',
					],
					[
						'Ali morajo veterinarji kaj plačati?',
						'Ne za nič, kar pomaga vrniti žival domov: prijava najdene živali, preverjanje čipa, ujemanja in pogovor so brezplačni. Ambulante, ki želijo večjo prepoznavnost, lahko izberejo [Veterinarski partner](/advertise#veterinarski-partner).',
					],
				],
			},
		],
		note: `Niste našli odgovora? Pišite nam na ${email}.`,
	},
	en: {
		seo: {
			title: 'FAQ about lost and found pets · Najdimo',
			description:
				'Answers about reporting a lost or found pet, the private link, matches, privacy, ads and working with shelters.',
		},
		crumb: 'FAQ',
		h1: 'Frequently asked questions',
		lede: 'Short answers to the questions we hear most often.',
		groups: [
			{
				title: 'Reporting a lost pet',
				items: [
					[
						'Is Najdimo free?',
						'Yes. Everything that helps an animal home is free for everyone, forever: reporting, matching, messaging, alerts, the poster and chip lookup. Labelled ads and voluntary contributions keep it running.',
					],
					[
						'Why do I need an account to report a lost pet?',
						'So we can tell you about possible matches and people can message you without seeing your phone number. Everything you enter before signing in is kept.',
					],
					[
						'Why does the map only show an approximate area?',
						'To protect you. Instead of the exact spot, we show an area with a radius of at least 500 metres, or at least 150 metres for found and sighted animals. Only you see the exact location.',
					],
					[
						'Will the chip number be public?',
						'No. Add the chip number to your report or pet profile; we never show it publicly. We only use it to find matches.',
					],
					[
						'How long does a report stay online?',
						'Until you close it. After 7, 14 and 30 days we ask whether you are still searching. If you do not update it for 90 days, it closes automatically, and you can extend it straight away.',
					],
				],
			},
			{
				title: 'Found or sighted animals',
				items: [
					[
						'Do I need an account to report a found animal?',
						'No. It takes under a minute. At the end you get a private link to manage the report and reply to messages.',
					],
					[
						'What if I lose my private link?',
						'If you gave an email address, we can send it again. Without one we cannot recover it, and the report expires after 30 days. You can also keep it by creating an account.',
					],
					[
						'Do I have to say where the animal is now?',
						'No. We do not ask and we never show it. You arrange the handover in the conversation.',
					],
					[
						'What should I do if I cannot keep the animal?',
						'Call the shelter your municipality works with, or a vet. Please still report it on Najdimo so the people missing it can find it more easily.',
					],
				],
			},
			{
				title: 'Matches and messages',
				items: [
					[
						'How do you know it is my pet?',
						'We cannot be sure. We compare the chip number, area, time and description, and suggest a possible match. You decide after looking at the photos.',
					],
					[
						'Who can see my messages?',
						'Only the people in the conversation. Our team sees a message only if someone reports it as abuse.',
					],
					[
						'Can we talk on the phone?',
						'You can share your number in the conversation, but we recommend staying in the app until your pet is safely home.',
					],
				],
			},
			{
				title: 'Privacy and safety',
				items: [
					[
						'How can I spot a scam?',
						'The most common sign is a request for money in advance. A genuine finder does not ask for money. More in the [safety tips](/safety).',
					],
					[
						'How do I delete my data?',
						'You can delete a found or sighted report from your private link. To delete your account, write to the address in the [privacy policy](/privacy). Soon you will be able to delete it yourself in settings.',
					],
					[
						'Do you use cookies?',
						'Essential cookies to make the service work, for example to keep you signed in. We only use Google Analytics cookies if you accept them. You can change your choice at any time in Cookie settings.',
					],
				],
			},
			{
				title: 'Ads and support',
				items: [
					[
						'Why are there ads?',
						'To keep Najdimo free. Ads from local partners are always labelled Ad. We never show them while you report, in conversations or during payment, and they do not use tracking cookies.',
					],
					[
						'How can I support Najdimo?',
						'When your pet is home again, you can leave a thank-you contribution. It is optional and does not change any feature.',
					],
					[
						'How can I advertise?',
						'Everything about ad slots and our audience is on [Advertise with us](/advertise), where you can also contact us.',
					],
				],
			},
			{
				title: 'Shelters',
				items: [
					[
						'Is Najdimo free for shelters?',
						'Yes, everything, forever, including the portal, imports and municipality reports. We are building the shelter portal. If you would like to join the pilot, see [For shelters](/for-shelters).',
					],
					[
						'Do vets have to pay anything?',
						'Not for anything that helps an animal home: reporting a found animal, chip lookup, matches and messaging are free. Practices that want more visibility can choose [Vet Partner](/advertise#vet-partner).',
					],
				],
			},
		],
		note: `Did not find your answer? Write to us at ${email}.`,
	},
};
