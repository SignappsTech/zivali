import type { ArticleContent } from '@/components/content/article';

// T2 How it works, copy from docs/content/pages/P3-public-pages.md. Inline `**bold**` and `[text](/internal-path)`.
export const howItWorks: Record<'sl' | 'en', ArticleContent> = {
	sl: {
		seo: {
			title: 'Kako deluje prijava izgubljene živali · Najdimo',
			description:
				'Prijavite izgubljeno ali najdeno žival, prejmite obvestilo o možnem ujemanju in se varno pogovorite v aplikaciji. Brezplačno, po vsej Sloveniji.',
		},
		crumb: 'Kako deluje',
		h1: 'Kako deluje Najdimo',
		lede: 'Najdimo poveže ljudi, ki pogrešajo žival, s tistimi, ki so jo našli ali videli. Ujemanja iščemo mi, odločitve pa so vaše.',
		sections: [
			{
				title: 'Če ste izgubili žival',
				blocks: [
					{
						ol: [
							'Prijavite izgubljeno žival: dodajte fotografijo, opis ter kraj in čas, ko ste jo nazadnje videli.',
							'Iskanje objavimo v nekaj minutah. Ljudje v bližini, ki imajo vklopljena opozorila, prejmejo obvestilo.',
							'Ko kdo prijavi najdeno ali opaženo žival, ki je podobna vaši, vam sporočimo možno ujemanje.',
							'Prenesite plakat s QR kodo ter ga delite s sosedi in v lokalnih skupinah na družbenih omrežjih.',
						],
					},
					'Za prijavo izgubljene živali potrebujete račun. Tako vas lahko obvestimo o ujemanjih, ljudje pa vam lahko pišejo, ne da bi videli vašo telefonsko številko. Vse, kar vnesete pred vpisom, se ohrani.',
					{
						tip: '**Nasvet:** profil živali s fotografijami in številko čipa lahko shranite že vnaprej. Če se žival kdaj izgubi, je prijava oddana v nekaj sekundah.',
					},
				],
			},
			{
				title: 'Če ste našli ali videli žival',
				blocks: [
					'Prijava vzame manj kot minuto in ne potrebuje računa: fotografija, kraj in odgovor na vprašanje, ali je žival pri vas ali ste jo samo videli. Na koncu dobite zasebno povezavo, s katero prijavo urejate in se pogovarjate z osebo, ki žival išče.',
					'Ne sprašujemo, kje je žival zdaj, in tega nikoli ne prikažemo.',
					'Če ima žival ovratnico z obeskom ali čip, to zelo pomaga. Čip lahko prebere veterinar ali zavetišče.',
				],
			},
			{
				title: 'Kako iščemo ujemanja',
				blocks: [
					'Vsako novo prijavo primerjamo z odprtimi prijavami na drugi strani: izgubljene živali z najdenimi in opaženimi ter obratno.',
					{
						ul: [
							'**Številka čipa.** Če se ujema, vas obvestimo takoj, tudi ponoči.',
							'**Območje.** Kako blizu sta kraja, kjer se je žival izgubila in kjer je bila najdena.',
							'**Čas.** Ali je bila žival najdena potem, ko se je izgubila.',
							'**Opis.** Vrsta, velikost, barva in spol.',
						],
					},
					'Kmalu bomo primerjali tudi podobnost fotografij.',
					'Ujemanje je predlog, ne potrditev. Fotografije pogledate sami in se odločite, ali je to vaša žival. Ujemanj, ki jih zavrnete, ne pokažemo več.',
				],
			},
			{
				title: 'Pogovor in prevzem',
				blocks: [
					'Ko potrdite ujemanje ali nekomu pišete pri prijavi, se odpre pogovor v aplikaciji. Telefonskih številk in e-naslovov ne prikažemo.',
					'Prevzem se dogovorite v pogovoru. Dobite se na javnem kraju, podnevi, in nikoli ne plačajte vnaprej. Preberite [nasvete za varnost](/safety).',
				],
			},
			{
				title: 'Ko je žival spet doma',
				blocks: [
					'Izberite **Žival je spet doma**. Opozorila se ustavijo, prijava pa pokaže, da je žival doma. Tako zemljevid ostane zanesljiv za vse.',
					'Če prijave nekaj časa ne posodobite, vas po 7, 14 in 30 dneh vprašamo, ali še iščete. Prijava izgubljene živali se po 90 dneh brez posodobitve samodejno zaključi, podaljšate pa jo lahko takoj. Prijave najdenih in opaženih živali potečejo po 30 dneh brez posodobitve.',
				],
			},
			{
				title: 'Opozorila v bližini',
				blocks: [
					'Vklopite opozorila za svoje domače območje (privzeto 5 km) in obvestili vas bomo, ko se v bližini izgubi pes ali mačka. Izberete lahko vrsto živali, polmer, največje število opozoril na dan in tihi čas.',
				],
			},
			{
				title: 'Kaj je brezplačno',
				blocks: [
					'Naš cilj je, da se živali vrnejo domov. Zato je vse, kar k temu pripomore, brezplačno za vse in za vedno: prijava izgubljene, najdene ali opažene živali, zemljevid in opozorila, iskanje ujemanj, pogovor, plakat s QR kodo, deljenje in preverjanje čipa. Za zavetišča in občine je brezplačno vse.',
					'Denar potrebujemo le za delovanje: strežnike, zemljevide in pošiljanje opozoril. Pokrivajo ga oglasi lokalnih partnerjev, vedno označeni z besedo **Oglas**, in prostovoljni prispevki. Oglasov nikoli ne prikažemo med prijavo izgubljene ali najdene živali, v pogovoru ali pri plačilu.',
				],
			},
		],
		actions: [
			{ label: 'Prijavi izgubljeno žival', href: '/report/lost', primary: true },
			{ label: 'Prijavi najdeno žival', href: '/report/found' },
		],
	},
	en: {
		seo: {
			title: 'How reporting a lost pet works · Najdimo',
			description:
				'Report a lost or found pet, get notified about possible matches and talk safely in the app. Free, across Slovenia.',
		},
		crumb: 'How it works',
		h1: 'How Najdimo works',
		lede: 'Najdimo connects people who are missing a pet with people who have found or seen one. We look for matches; the decisions are yours.',
		sections: [
			{
				title: 'If you have lost your pet',
				blocks: [
					{
						ol: [
							'Report your lost pet: add a photo, a description, and where and when you last saw them.',
							'We publish your search within minutes. People nearby who have alerts turned on get a notification.',
							'When someone reports a found or sighted animal that looks like yours, we tell you about the possible match.',
							'Download a poster with a QR code and share it with neighbours and in local social media groups.',
						],
					},
					'You need an account to report a lost pet. That way we can tell you about matches, and people can message you without seeing your phone number. Everything you enter before signing in is kept.',
					{
						tip: '**Tip:** you can save a pet profile with photos and the chip number in advance. If your pet ever goes missing, your report is ready in seconds.',
					},
				],
			},
			{
				title: 'If you have found or seen an animal',
				blocks: [
					'Reporting takes under a minute and needs no account: a photo, the place, and whether the animal is with you or you only saw it. At the end you get a private link to manage the report and talk to the person who is searching.',
					'We never ask where the animal is now, and we never show it.',
					'A collar with a tag or a microchip helps a lot. A vet or a shelter can read the chip.',
				],
			},
			{
				title: 'How we find matches',
				blocks: [
					'We compare every new report with open reports on the other side: lost pets with found and sighted animals, and the other way round.',
					{
						ul: [
							'**Chip number.** If it matches, we tell you straight away, even at night.',
							'**Area.** How close the place where the pet went missing is to where the animal was found.',
							'**Time.** Whether the animal was found after the pet went missing.',
							'**Description.** Species, size, colour and sex.',
						],
					},
					'Soon we will compare photos for similarity too.',
					'A match is a suggestion, not a confirmation. You look at the photos and decide whether it is your pet. Matches you reject are never shown again.',
				],
			},
			{
				title: 'Talking and collecting your pet',
				blocks: [
					'When you confirm a match or message someone about a report, a conversation opens in the app. Phone numbers and email addresses are not shown.',
					'Arrange the handover in the conversation. Meet in a public place, in daylight, and never pay in advance. Read the [safety tips](/safety).',
				],
			},
			{
				title: 'When your pet is home again',
				blocks: [
					'Choose **Pet is home again**. Alerts stop and the report shows that the pet is home. This keeps the map reliable for everyone.',
					'If you have not updated your report for a while, we ask after 7, 14 and 30 days whether you are still searching. A lost-pet report closes automatically after 90 days without an update, and you can extend it straight away. Found and sighted reports expire after 30 days without an update.',
				],
			},
			{
				title: 'Nearby alerts',
				blocks: [
					'Turn on alerts for your home area (5 km by default) and we will let you know when a dog or cat goes missing nearby. You can choose the species, radius, maximum number of alerts per day and quiet hours.',
				],
			},
			{
				title: 'What is free',
				blocks: [
					'Our goal is getting animals home. So everything that helps is free for everyone, forever: reporting a lost, found or sighted animal, the map and alerts, matching, messaging, the poster with its QR code, sharing and chip lookup. For shelters and municipalities, everything is free.',
					'We only need money to keep the service running: servers, maps and sending alerts. Ads from local partners, always labelled **Ad**, and voluntary contributions cover it. We never show ads while you report a lost or found animal, in conversations or during payment.',
				],
			},
		],
		actions: [
			{ label: 'Report a lost pet', href: '/report/lost', primary: true },
			{ label: 'Report a found animal', href: '/report/found' },
		],
	},
};
