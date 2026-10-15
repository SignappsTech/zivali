import { type ArticleContent, SUPPORT_EMAIL } from '@/components/content/article';

// T2 For shelters, copy from docs/content/pages/P3-public-pages.md. The slice's client marker for the shelters address
// is the one shared support address until the client names another (slice open point 1).
const email = `[${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL})`;

export const forShelters: Record<'sl' | 'en', ArticleContent> = {
	sl: {
		seo: {
			title: 'Za zavetišča: brezplačna objava najdenih živali · Najdimo',
			description:
				'Najdene živali objavite v nekaj minutah, mi pa poiščemo ljudi, ki jih iščejo. Za zavetišča in občine brezplačno, za vedno. Pilot v Ljubljani.',
		},
		crumb: 'Za zavetišča',
		h1: 'Za zavetišča, veterinarje in občine',
		lede: 'Pomagamo vam hitreje najti lastnike najdenih živali, z manj dela. Za zavetišča in občine je vse brezplačno, za vedno.',
		sections: [
			{
				title: 'Zakaj Najdimo',
				blocks: [
					{
						ul: [
							'Ena objava doseže ljudi, ki v vaši okolici iščejo žival.',
							'Vsako najdeno žival samodejno primerjamo z odprtimi prijavami izgubljenih živali, tudi s tistimi, ki pridejo pozneje.',
							'Z ljudmi, ki žival iščejo, se pogovarjate v aplikaciji, brez deljenja telefonskih številk.',
							'Pri mačkah, ki pogosto nimajo čipa, je ujemanje po opisu, kraju in času pogosto edina pot do doma.',
						],
					},
				],
			},
			{
				title: 'Kaj pripravljamo za pilot',
				blocks: [
					{
						ul: [
							'**Množično nalaganje:** do 30 fotografij naenkrat, iz katerih nastanejo osnutki prijav.',
							'**Uvoz CSV** iz vaše obstoječe evidence, s pregledom napak pred objavo.',
							'**Pregled verjetnih lastnikov** za vsako žival.',
							'**Preverjanje čipa:** vpišete prebrano številko, mi pa obvestimo lastnika, če je čip vpisan pri nas. Osebnih podatkov ne vidite.',
							'**Značka Preverjeno zavetišče** po preverjanju organizacije.',
							'**Opomniki za roke hrambe**, ki jih nastavite sami.',
						],
					},
				],
			},
			{
				title: 'Brezplačno, za vedno',
				blocks: [
					'Zavetišča in občine uporabljajo vse brezplačno in brez omejitev: portal, množično nalaganje in uvoz CSV, ujemanja, povezavo API, analitiko, stran za posvojitve in poročila za občine. Plačljivega paketa za zavetišča ni in ga ne bo. Naš cilj je, da se živali vrnejo domov, ne dobiček.',
				],
			},
			{
				title: 'Za veterinarje',
				blocks: [
					'Vse, kar pomaga vrniti žival domov, je brezplačno tudi za veterinarske ambulante: prijava najdenih živali, ki vam jih prinesejo, preverjanje čipa, ujemanja in pogovor z lastniki. Ambulante, ki želijo večjo prepoznavnost v svoji okolici, lahko izberejo [Veterinarski partner](/advertise#veterinarski-partner).',
				],
			},
			{
				title: 'Sodelujte v pilotu',
				blocks: [
					'Pilot začenjamo v Ljubljani z dvema ali tremi zavetišči. Pomagamo pri prvem uvozu in prilagodimo, kar vam ne ustreza.',
					`Pišite nam na ${email} in dogovorimo se za kratek pogovor.`,
					'Najdimo ne nadomešča zakonskih obveznosti zavetišč in občin ter ne daje pravnih nasvetov.',
				],
			},
		],
		actions: [{ label: 'Pišite nam', href: `mailto:${SUPPORT_EMAIL}`, primary: true }],
	},
	en: {
		seo: {
			title: 'For shelters: publish found animals free · Najdimo',
			description:
				'Publish found animals in minutes and we find the people searching for them. Free for shelters and municipalities, forever. Pilot in Ljubljana.',
		},
		crumb: 'For shelters',
		h1: 'For shelters, vets and municipalities',
		lede: 'We help you find the owners of found animals faster, with less work. For shelters and municipalities everything is free, forever.',
		sections: [
			{
				title: 'Why Najdimo',
				blocks: [
					{
						ul: [
							'One post reaches people near you who are searching for a pet.',
							'We automatically compare every found animal with open lost-pet reports, including ones that come in later.',
							'You talk to the people searching in the app, without sharing phone numbers.',
							'For cats, which often have no chip, matching by description, place and time is often the only way home.',
						],
					},
				],
			},
			{
				title: 'What we are building for the pilot',
				blocks: [
					{
						ul: [
							'**Bulk upload:** up to 30 photos at once, turned into draft reports.',
							'**CSV import** from your existing records, with an error check before publishing.',
							'**Likely owners** for every animal at a glance.',
							'**Chip lookup:** enter the number you scanned and we notify the owner if the chip is registered with us. You never see personal data.',
							'**Verified shelter badge** once we have checked your organisation.',
							'**Holding-period reminders** that you set yourself.',
						],
					},
				],
			},
			{
				title: 'Free, forever',
				blocks: [
					'Shelters and municipalities use everything for free, with no limits: the portal, bulk upload and CSV import, matching, the API connection, analytics, the adoption page and municipality reports. There is no paid shelter plan and there will not be one. Our goal is getting animals home, not profit.',
				],
			},
			{
				title: 'For vets',
				blocks: [
					'Everything that helps an animal home is free for vet practices too: reporting found animals brought to you, chip lookup, matches and talking to owners. Practices that want more visibility in their area can choose [Vet Partner](/advertise#vet-partner).',
				],
			},
			{
				title: 'Join the pilot',
				blocks: [
					'We are starting the pilot in Ljubljana with two or three shelters. We help with your first import and adjust whatever does not suit you.',
					`Write to us at ${email} and we will arrange a short call.`,
					'Najdimo does not replace the legal duties of shelters and municipalities and does not give legal advice.',
				],
			},
		],
		actions: [{ label: 'Write to us', href: `mailto:${SUPPORT_EMAIL}`, primary: true }],
	},
};
