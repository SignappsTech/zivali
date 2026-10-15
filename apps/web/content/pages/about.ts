import { type ArticleContent, SUPPORT_EMAIL } from '@/components/content/article';

// T2 About, copy from docs/content/pages/P3-public-pages.md. `#financiranje` / `#funding` is the M2 link target of
// the support house ad (P21). The slice's client marker for the support address is the shared support address.
const email = `[${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL})`;

export const about: Record<'sl' | 'en', ArticleContent> = {
	sl: {
		seo: {
			title: 'O nas: zakaj smo ustvarili Najdimo · Najdimo',
			description:
				'Najdimo je slovenska storitev za iskanje izgubljenih psov in mačk. Jedro je brezplačno, zasebnost privzeta, številke pa prave, tudi ko so majhne.',
		},
		crumb: 'O nas',
		h1: 'O nas',
		lede: 'Najdimo je slovenska storitev za iskanje izgubljenih psov in mačk. Nastala je, ker se iskanje danes razprši po skupinah na družbenih omrežjih in plakatih, kjer se objave hitro izgubijo.',
		sections: [
			{
				title: 'Kaj nas vodi',
				blocks: [
					{
						ul: [
							'**Vse, kar pomaga vrniti žival domov, je brezplačno, za vedno:** prijava, ujemanja, pogovor, opozorila, plakat in preverjanje čipa.',
							'**Zasebnost je privzeta:** telefonske številke in točne lokacije niso nikoli javne.',
							'**Iskreni smo:** ne obljubljamo, česar ne moremo izpolniti, in pokažemo prave številke, tudi ko so majhne.',
							'**Varnost pred prevarami** je del vsakega koraka.',
						],
					},
				],
			},
			{
				title: 'Kdo smo',
				blocks: ['Najdimo razvija ekipa podjetja Signapps iz Slovenije. Najdimo je delovno ime storitve.'],
			},
			{
				id: 'financiranje',
				title: 'Kako se financiramo',
				blocks: [
					'Naš cilj je, da se živali vrnejo domov; denar potrebujemo le za delovanje. Pokrivajo ga jasno označeni oglasi lokalnih partnerjev, Veterinarski partner za ambulante in prostovoljni prispevki. Ko je vaša žival spet doma, lahko pustite prispevek v zahvalo. Prispevek je prostovoljno plačilo za delovanje storitve in ne vpliva na nobeno funkcijo.',
					'Oglašujete lahko tudi vi: [Oglašujte pri nas](/advertise).',
				],
			},
			{
				title: 'Stik',
				blocks: [`Pišite nam na ${email}. Podatki o podjetju so v [impresumu](/imprint).`],
			},
		],
	},
	en: {
		seo: {
			title: 'About us: why we built Najdimo · Najdimo',
			description:
				'Najdimo is a Slovenian service for finding lost dogs and cats. The core is free, privacy is the default and our numbers are real, even when small.',
		},
		crumb: 'About us',
		h1: 'About us',
		lede: 'Najdimo is a Slovenian service for finding lost dogs and cats. We built it because today searches are scattered across social media groups and paper posters, where posts quickly disappear.',
		sections: [
			{
				title: 'What guides us',
				blocks: [
					{
						ul: [
							'**Everything that helps an animal home is free, forever:** reporting, matching, messaging, alerts, the poster and chip lookup.',
							'**Privacy by default:** phone numbers and exact locations are never public.',
							'**We are honest:** we do not promise what we cannot deliver, and we show real numbers, even when they are small.',
							'**Protection from scams** is part of every step.',
						],
					},
				],
			},
			{
				title: 'Who we are',
				blocks: [
					"Najdimo is built by the team at Signapps in Slovenia. Najdimo is the service's working name.",
				],
			},
			{
				id: 'funding',
				title: 'How we are funded',
				blocks: [
					'Our goal is getting animals home; we only need money to keep running. It comes from clearly labelled ads from local partners, Vet Partner for clinics and voluntary contributions. When your pet is home again, you can leave a thank-you contribution. A contribution is a voluntary payment towards running the service and does not change any feature.',
					'You can advertise too: [Advertise with us](/advertise).',
				],
			},
			{
				title: 'Contact',
				blocks: [`Write to us at ${email}. Company details are in the [imprint](/imprint).`],
			},
		],
	},
};
