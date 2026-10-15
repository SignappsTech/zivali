import type { ArticleContent } from '@/components/content/article';

// T2 Safety tips, copy from docs/content/pages/P3-public-pages.md. Inline `**bold**` and `[text](/internal-path)`.
export const safety: Record<'sl' | 'en', ArticleContent> = {
	sl: {
		seo: {
			title: 'Izgubljen pes ali mačka: nasveti in prevare · Najdimo',
			description:
				'Kaj storiti, ko izgubite ali najdete psa ali mačko, in kako prepoznati prevaro. Nikoli ne plačajte vnaprej. Nasveti za varen prevzem živali.',
		},
		crumb: 'Nasveti za varnost',
		h1: 'Nasveti za varnost',
		lede: 'Ko se žival izgubi, smo ranljivi. Večina ljudi želi pomagati, nekateri pa poskušajo izkoristiti stisko. Ti nasveti vam pomagajo prepoznati prevaro in varno prevzeti žival.',
		sections: [
			{
				title: 'Pogoste prevare',
				blocks: [
					{
						ul: [
							'Nekdo trdi, da ima vašo žival, a zahteva denar vnaprej, na primer za prevoz, hrano ali veterinarja.',
							'Nekdo vas prosi za kodo, ki ste jo prejeli po SMS, ali za podatke kartice.',
							'Nekdo trdi, da ima vašo žival, vendar je ne zna opisati ali ne pošlje nove fotografije.',
							'Sporočilo vas preusmeri na drugo spletno stran ali v drugo aplikacijo, kjer naj bi plačali.',
							'Nekdo se predstavi kot zavetišče ali veterinar in zahteva plačilo prek povezave.',
						],
					},
				],
			},
			{
				title: 'Kako se zaščitite',
				blocks: [
					{
						ul: [
							'**Nikoli ne pošiljajte denarja vnaprej.** Kdor je žival res našel, denarja ne zahteva.',
							'**Pogovor imejte v aplikaciji.** Tako vaša telefonska številka ostane skrita.',
							'**Eno posebnost obdržite zase.** V prijavi ne opišite vsega. Če nekdo trdi, da ima vašo žival, ga vprašajte za posebnost, ki je niste objavili, na primer brazgotino ali obliko lise.',
							'**Prosite za novo fotografijo**, na primer z listkom, na katerem je današnji datum.',
							'**Ne odpirajte povezav neznancev** in ne nameščajte aplikacij, ki vam jih priporočijo.',
							'**Kode, ki jo prejmete po SMS, ne povejte nikomur.**',
						],
					},
					'Nikoli vas ne bomo prosili za plačilo v pogovoru, za geslo ali za kodo iz SMS.',
				],
			},
			{
				title: 'Varen prevzem živali',
				blocks: [
					{
						ul: [
							'Dobite se na javnem, osvetljenem kraju, podnevi, na primer pred trgovino ali policijsko postajo.',
							'Vzemite s seboj nekoga, ki mu zaupate.',
							'Prinesite dokaz, da je žival vaša: fotografije, potni list za hišne živali ali potrdilo s številko čipa.',
							'Če ste v dvomih, se dogovorite za prevzem pri veterinarju ali v zavetišču, kjer lahko preberejo čip.',
						],
					},
					'Če žival vračate vi: prosite za dokaz, da je žival res njihova, in jo predajte na javnem kraju. Če dvomite, jo odpeljite v zavetišče ali k veterinarju.',
				],
			},
			{
				title: 'Ko izgubite žival: prvih 24 ur',
				blocks: [
					{
						ol: [
							'Takoj preiščite okolico in žival kličite z mirnim glasom. Mačke se pogosto skrijejo zelo blizu doma, v kleteh, garažah in pod avtomobili.',
							'Prijavite izgubljeno žival na Najdimo. Ljudje v bližini prejmejo opozorilo.',
							'Obvestite bližnja zavetišča in veterinarske ambulante. Pošljite jim fotografijo in opis.',
							'Pokličite svojega veterinarja in preverite, ali so vaši podatki v Centralnem registru hišnih živali (CRHŽ) pravilni, predvsem telefonska številka. Ko žival najdejo, čip prebere veterinar ali pristojno zavetišče in vas tako lahko hitro pokliče.',
							'Natisnite plakat s QR kodo in ga izobesite v soseski, v trgovinah in pri veterinarjih.',
							'Prijavo delite v lokalnih skupinah na družbenih omrežjih.',
							'Pred vrata postavite posodo z vodo in kos oblačila, ki diši po vas.',
						],
					},
				],
			},
			{
				title: 'Ko najdete žival',
				blocks: [
					{
						ol: [
							'Najprej poskrbite za svojo varnost in varnost na cesti. Prestrašeni živali se približajte mirno in počasi.',
							'Preverite, ali ima ovratnico ali obesek s kontaktom.',
							'Fotografirajte jo in jo prijavite na Najdimo. Prijava vzame manj kot minuto in ne potrebuje računa.',
							'Čip lahko prebere veterinar ali zavetišče.',
							'Če žival ne morete obdržati, pokličite zavetišče, s katerim sodeluje vaša občina.',
							'Ne objavljajte, kje točno je žival zdaj. Oseba, ki žival išče, vam bo pisala v aplikaciji.',
						],
					},
				],
			},
			{
				title: 'Če sumite prevaro',
				blocks: [
					'V pogovoru ali pri prijavi izberite **Prijavi zlorabo**. Prijavo pregleda naša ekipa, druga oseba pa ne izve, kdo jo je prijavil.',
					'Če ste denar že nakazali, se takoj obrnite na svojo banko in zadevo prijavite policiji. V nujnih primerih pokličite 113.',
				],
			},
		],
		actions: [{ label: 'Odpri zemljevid', href: '/map' }],
	},
	en: {
		seo: {
			title: 'Lost pet tips and how to avoid scams · Najdimo',
			description:
				'What to do when you lose or find a dog or cat, and how to spot a scam. Never pay in advance. Tips for collecting your pet safely.',
		},
		crumb: 'Safety tips',
		h1: 'Safety tips',
		lede: 'When a pet goes missing, we are vulnerable. Most people want to help, but some try to take advantage. These tips help you spot a scam and collect your pet safely.',
		sections: [
			{
				title: 'Common scams',
				blocks: [
					{
						ul: [
							'Someone says they have your pet but asks for money in advance, for transport, food or a vet.',
							'Someone asks for a code you received by text message, or for your card details.',
							'Someone says they have your pet but cannot describe it or will not send a new photo.',
							'A message sends you to another website or app to pay.',
							'Someone pretends to be a shelter or a vet and asks you to pay through a link.',
						],
					},
				],
			},
			{
				title: 'How to protect yourself',
				blocks: [
					{
						ul: [
							'**Never send money in advance.** A genuine finder does not ask for money.',
							'**Keep the conversation in the app.** That way your phone number stays hidden.',
							'**Keep one detail to yourself.** Do not describe everything in your report. If someone claims to have your pet, ask about a detail you did not publish, such as a scar or the shape of a patch.',
							"**Ask for a new photo**, for example with a note showing today's date.",
							'**Do not open links from strangers** or install apps they recommend.',
							'**Never share a code you receive by text message.**',
						],
					},
					'We will never ask you for a payment in a conversation, for your password or for a code from a text message.',
				],
			},
			{
				title: 'Collecting your pet safely',
				blocks: [
					{
						ul: [
							'Meet in a public, well-lit place, in daylight, for example outside a shop or a police station.',
							'Bring someone you trust.',
							'Bring proof that the pet is yours: photos, the pet passport or a document with the chip number.',
							'If in doubt, arrange the handover at a vet or a shelter, where they can read the chip.',
						],
					},
					'If you are returning an animal: ask for proof that it is theirs and hand it over in a public place. If in doubt, take it to a shelter or a vet.',
				],
			},
			{
				title: 'If you lose your pet: the first 24 hours',
				blocks: [
					{
						ol: [
							'Search the area straight away and call your pet in a calm voice. Cats often hide very close to home, in cellars, garages and under cars.',
							'Report your lost pet on Najdimo. People nearby get an alert.',
							'Tell nearby shelters and vet practices. Send them a photo and a description.',
							'Call your vet and check that your details in the Central Register of Pets (CRHŽ) are correct, especially your phone number. When your pet is found, a vet or the responsible shelter reads the chip and can then call you quickly.',
							'Print the poster with the QR code and put it up in your neighbourhood, in shops and at vets.',
							'Share your report in local social media groups.',
							'Leave a bowl of water and a piece of clothing that smells of you outside your door.',
						],
					},
				],
			},
			{
				title: 'If you find an animal',
				blocks: [
					{
						ol: [
							'Look after your own safety and road safety first. Approach a frightened animal calmly and slowly.',
							'Check for a collar or a tag with contact details.',
							'Take a photo and report it on Najdimo. It takes under a minute and needs no account.',
							'A vet or a shelter can read the chip.',
							'If you cannot keep the animal, call the shelter your municipality works with.',
							'Do not post where exactly the animal is now. The person searching for it will message you in the app.',
						],
					},
				],
			},
			{
				title: 'If you suspect a scam',
				blocks: [
					'In the conversation or on the report, choose **Report abuse**. Our team reviews it, and the other person is not told who reported them.',
					'If you have already sent money, contact your bank straight away and report it to the police. In an emergency, call 113.',
				],
			},
		],
		actions: [{ label: 'Open the map', href: '/map' }],
	},
};
