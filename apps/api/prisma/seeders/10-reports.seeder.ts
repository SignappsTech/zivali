// Seeder 10-reports (C4, C5), local only: pets of the fixture owners and 30 open reports across Slovenia (lost,
// found, sighted; two chip pairs for matching), written through ReportsDomain.insertReport so every point is
// coarsened and fuzzed like a real one. Fixed ids: reruns skip existing rows. Photos from data/photos/ (licences in
// data/photos/LICENSE.md) are put in the media bucket on every run, so a wiped MinIO is refilled.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import type { Colour, Pattern, ReportType, Sex, Size, Species } from '@zivali/types';

import { adapters } from '../../adapters/index.ts';
import { ReportsDomain, type NewReport } from '../../domains/reports/index.ts';
import { config } from '../../lib/config.ts';
import { userCtx } from '../../lib/ctx.ts';
import { logger } from '../../lib/logger.ts';
import { prisma } from '../prisma.ts';
import { fixtureUsers } from './00-users.seeder.ts';

const DAY = 24 * 3600 * 1000;
/** Reports 1…, pets 2…, photos 3… */
const fixtureId = (kind: 1 | 2 | 3, n: number) => `00000000-0000-4000-8000-${kind}${String(n).padStart(11, '0')}`;
// owner@, owner2@, finder@, shelter@, mod@, admin@
const [OWNER, OWNER2, FINDER, SHELTER, MOD, ADMIN] = fixtureUsers.map((fixture) => fixture.id) as [
	string,
	string,
	string,
	string,
	string,
	string,
];

// Two chip pairs: lost Piki ↔ found by the finder, lost Megi ↔ found by the shelter (matching, C8).
const CHIP_PIKI = '705098100012345';
const CHIP_MEGI = '705098100067890';

const PHOTOS = {
	'dog-aussie.jpg': [800, 800],
	'dog-aussie-wide.jpg': [1200, 900],
	'dog-beagle.jpg': [800, 800],
	'dog-golden.jpg': [800, 800],
	'dog-golden-tall.jpg': [800, 1000],
	'dog-terrier.jpg': [800, 800],
	'cat-bw.jpg': [800, 800],
	'cat-ginger.jpg': [800, 800],
	'cat-siamese.jpg': [800, 800],
	'cat-tabby.jpg': [800, 800],
} as const;
type PhotoFile = keyof typeof PHOTOS;

type Look = { breed: string; colours: Colour[]; pattern: Pattern; size: Size };
const LOOKS = {
	aussie: { breed: 'dog.australian_shepherd', colours: ['black', 'white', 'tan'], pattern: 'merle', size: 'm' },
	beagle: { breed: 'dog.beagle', colours: ['brown', 'white', 'black'], pattern: 'tricolour', size: 's' },
	golden: { breed: 'dog.golden_retriever', colours: ['golden'], pattern: 'solid', size: 'l' },
	terrier: { breed: 'dog.jack_russell_terrier', colours: ['white', 'black', 'tan'], pattern: 'tricolour', size: 's' },
	bw: { breed: 'cat.european_shorthair', colours: ['black', 'white'], pattern: 'bicolour', size: 'm' },
	ginger: { breed: 'cat.european_shorthair', colours: ['red'], pattern: 'tabby', size: 'm' },
	siamese: { breed: 'cat.siamese', colours: ['cream', 'brown'], pattern: 'pointed', size: 's' },
	tabby: { breed: 'cat.european_shorthair', colours: ['grey', 'brown'], pattern: 'tabby', size: 'm' },
} satisfies Record<string, Look>;
type LookName = keyof typeof LOOKS;

const PETS: { n: number; owner: string; species: Species; name: string; look: LookName; sex: Sex; chip?: string }[] = [
	{ n: 1, owner: OWNER, species: 'dog', name: 'Piki', look: 'beagle', sex: 'male', chip: CHIP_PIKI },
	{ n: 2, owner: OWNER, species: 'cat', name: 'Luna', look: 'siamese', sex: 'female' },
	{ n: 3, owner: OWNER, species: 'dog', name: 'Rex', look: 'golden', sex: 'male' },
	{ n: 4, owner: OWNER2, species: 'dog', name: 'Megi', look: 'aussie', sex: 'female', chip: CHIP_MEGI },
	{ n: 5, owner: OWNER2, species: 'cat', name: 'Muri', look: 'tabby', sex: 'male' },
];

type Fixture = {
	by: string;
	type: ReportType;
	species: Species;
	look: LookName;
	at: [number, number];
	days: number;
	text: string;
	photo?: PhotoFile;
	name?: string;
	pet?: number;
	chip?: string;
	sex?: Sex;
	reward?: [number | null, string | null];
	radius?: number;
	linked?: number;
};

// Report n is fixtureId(1, n), in this order.
const REPORTS: Fixture[] = [
	// 1–6 lost, owner@
	{
		by: OWNER,
		type: 'lost',
		species: 'dog',
		look: 'beagle',
		name: 'Piki',
		pet: 1,
		chip: CHIP_PIKI,
		sex: 'male',
		at: [46.0511, 14.5051],
		days: 2,
		photo: 'dog-beagle.jpg',
		reward: [100, 'Za vsako koristno informacijo'],
		text: 'Ušel med sprehodom ob Ljubljanici, ko ga je prestrašil pok. Je prijazen, a plašen.',
	},
	{
		by: OWNER,
		type: 'lost',
		species: 'cat',
		look: 'siamese',
		name: 'Luna',
		pet: 2,
		sex: 'female',
		at: [46.0702, 14.4875],
		days: 5,
		photo: 'cat-siamese.jpg',
		text: 'Skozi odprto okno je skočila na dvorišče in se ni vrnila.',
	},
	{
		by: OWNER,
		type: 'lost',
		species: 'dog',
		look: 'golden',
		name: 'Rex',
		pet: 3,
		sex: 'male',
		radius: 3000,
		at: [46.1381, 14.594],
		days: 1,
		photo: 'dog-golden.jpg',
		text: 'Pobegnil z vrta, verjetno proti polju ob Kamniški Bistrici.',
	},
	{
		by: OWNER,
		type: 'lost',
		species: 'cat',
		look: 'bw',
		name: 'Bela',
		sex: 'female',
		at: [46.2259, 14.6121],
		days: 9,
		photo: 'cat-bw.jpg',
		text: 'Zunanja mačka, ki se vsak večer vrne domov. Zadnjič videna pred tednom dni.',
	},
	{
		by: OWNER,
		type: 'lost',
		species: 'dog',
		look: 'terrier',
		name: 'Fido',
		sex: 'male',
		at: [46.2389, 14.3556],
		days: 3,
		photo: 'dog-terrier.jpg',
		reward: [50, null],
		text: 'Izgubil se je na sejmu v starem mestnem jedru.',
	},
	{
		by: OWNER,
		type: 'lost',
		species: 'cat',
		look: 'ginger',
		name: 'Tačka',
		sex: 'male',
		at: [46.2309, 15.2604],
		days: 14,
		photo: 'cat-ginger.jpg',
		text: 'Po selitvi je ušel iz novega stanovanja. Ne pozna okolice.',
	},
	// 7–12 lost, owner2@
	{
		by: OWNER2,
		type: 'lost',
		species: 'dog',
		look: 'aussie',
		name: 'Megi',
		pet: 4,
		chip: CHIP_MEGI,
		sex: 'female',
		at: [46.5547, 15.6459],
		days: 4,
		photo: 'dog-aussie.jpg',
		reward: [200, 'Nagrada za najditelja'],
		text: 'Med nevihto je preskočila ograjo. Ima modro ovratnico.',
	},
	{
		by: OWNER2,
		type: 'lost',
		species: 'cat',
		look: 'tabby',
		name: 'Muri',
		pet: 5,
		sex: 'male',
		at: [46.545, 15.638],
		days: 6,
		photo: 'cat-tabby.jpg',
		text: 'Ponoči ni prišel domov, kar zanj ni običajno.',
	},
	{
		by: OWNER2,
		type: 'lost',
		species: 'dog',
		look: 'golden',
		name: 'Zlata',
		sex: 'female',
		at: [46.42, 15.87],
		days: 8,
		photo: 'dog-golden-tall.jpg',
		text: 'Odtavala je z dvorišča ob Dravi, ko so bila vrata odprta.',
	},
	{
		by: OWNER2,
		type: 'lost',
		species: 'cat',
		look: 'bw',
		name: 'Snežka',
		sex: 'female',
		at: [46.6625, 16.1664],
		days: 12,
		photo: 'cat-bw.jpg',
		text: 'Sterilizirana mačka, zelo plaha do tujcev.',
	},
	{
		by: OWNER2,
		type: 'lost',
		species: 'dog',
		look: 'terrier',
		name: 'Bobi',
		sex: 'male',
		at: [45.803, 15.1689],
		days: 0,
		photo: 'dog-terrier.jpg',
		text: 'Danes zjutraj je ušel med sprehodom ob Krki.',
	},
	{
		by: OWNER2,
		type: 'lost',
		species: 'dog',
		look: 'aussie',
		name: 'Lisa',
		sex: 'female',
		radius: 1500,
		at: [45.5469, 13.7294],
		days: 10,
		photo: 'dog-aussie-wide.jpg',
		text: 'Izgubila se je na sprehodu po obali proti Izoli.',
	},
	// 13–17 found, 18–21 sighted, finder@
	{
		by: FINDER,
		type: 'found',
		species: 'dog',
		look: 'beagle',
		chip: CHIP_PIKI,
		sex: 'male',
		at: [46.072, 14.513],
		days: 1,
		photo: 'dog-beagle.jpg',
		text: 'Pes je hodil sam po pločniku in prišel k meni. Ima čip.',
	},
	{
		by: FINDER,
		type: 'found',
		species: 'cat',
		look: 'ginger',
		at: [46.042, 14.487],
		days: 3,
		photo: 'cat-ginger.jpg',
		text: 'Mačka sedi pred blokom že tri dni in je lačna.',
	},
	{
		by: FINDER,
		type: 'found',
		species: 'dog',
		look: 'golden',
		sex: 'male',
		at: [46.3592, 15.1103],
		days: 2,
		photo: 'dog-golden.jpg',
		text: 'Najden ob jezeru, zelo prijazen, brez ovratnice.',
	},
	{
		by: FINDER,
		type: 'found',
		species: 'cat',
		look: 'siamese',
		sex: 'female',
		at: [45.956, 13.648],
		days: 5,
		photo: 'cat-siamese.jpg',
		text: 'Mlada mačka se je zatekla v našo garažo.',
	},
	{
		by: FINDER,
		type: 'found',
		species: 'dog',
		look: 'terrier',
		at: [46.4365, 14.0526],
		days: 0,
		photo: 'dog-terrier.jpg',
		text: 'Najden na parkirišču pred trgovino, zdaj je pri meni.',
	},
	{
		by: FINDER,
		type: 'sighted',
		species: 'dog',
		look: 'beagle',
		linked: 1,
		at: [46.056, 14.542],
		days: 1,
		text: 'Videl sem podobnega psa teči čez cesto proti BTC.',
	},
	{
		by: FINDER,
		type: 'sighted',
		species: 'cat',
		look: 'tabby',
		linked: 8,
		at: [46.548, 15.641],
		days: 2,
		photo: 'cat-tabby.jpg',
		text: 'Siva mačka se skriva pod avtomobili na parkirišču.',
	},
	{
		by: FINDER,
		type: 'sighted',
		species: 'dog',
		look: 'aussie',
		at: [46.3683, 14.1146],
		days: 4,
		photo: 'dog-aussie.jpg',
		text: 'Pes brez lastnika na sprehajalni poti okoli jezera.',
	},
	{
		by: FINDER,
		type: 'sighted',
		species: 'cat',
		look: 'bw',
		at: [45.5395, 13.6604],
		days: 6,
		text: 'Črno-bela mačka se je zadrževala v pristanišču.',
	},
	// 22–26 found, shelter@ (organisation)
	{
		by: SHELTER,
		type: 'found',
		species: 'dog',
		look: 'aussie',
		chip: CHIP_MEGI,
		sex: 'female',
		at: [46.5603, 15.6511],
		days: 2,
		photo: 'dog-aussie.jpg',
		text: 'Sprejeta v zavetišče, čip prebran pri veterinarju.',
	},
	{
		by: SHELTER,
		type: 'found',
		species: 'cat',
		look: 'tabby',
		at: [46.5103, 15.0806],
		days: 7,
		photo: 'cat-tabby.jpg',
		text: 'V zavetišču od prejšnjega tedna, iščemo lastnika.',
	},
	{
		by: SHELTER,
		type: 'found',
		species: 'dog',
		look: 'golden',
		sex: 'female',
		at: [46.2355, 15.2701],
		days: 4,
		photo: 'dog-golden-tall.jpg',
		text: 'Najdena ob regionalni cesti, zdaj v zavetišču.',
	},
	{
		by: SHELTER,
		type: 'found',
		species: 'cat',
		look: 'bw',
		sex: 'male',
		at: [45.959, 15.491],
		days: 11,
		photo: 'cat-bw.jpg',
		text: 'Mačka je bila pripeljana v zavetišče iz okolice Krškega.',
	},
	{
		by: SHELTER,
		type: 'found',
		species: 'dog',
		look: 'terrier',
		sex: 'male',
		at: [45.9033, 15.5911],
		days: 1,
		photo: 'dog-terrier.jpg',
		text: 'Majhen pes, najden blizu meje, zdaj v zavetišču.',
	},
	// 27–30 mod@ and admin@
	{
		by: MOD,
		type: 'sighted',
		species: 'dog',
		look: 'golden',
		at: [45.7743, 14.2153],
		days: 3,
		photo: 'dog-golden.jpg',
		text: 'Zlati prinašalec se je sprehajal sam ob glavni cesti.',
	},
	{
		by: MOD,
		type: 'sighted',
		species: 'cat',
		look: 'ginger',
		at: [45.5283, 13.5683],
		days: 5,
		photo: 'cat-ginger.jpg',
		text: 'Rdeča mačka na Tartinijevem trgu, ni videti potepuška.',
	},
	{
		by: ADMIN,
		type: 'sighted',
		species: 'dog',
		look: 'terrier',
		at: [46.155, 15.0533],
		days: 2,
		text: 'Manjši pes je tekel ob železniški progi.',
	},
	{
		by: ADMIN,
		type: 'found',
		species: 'cat',
		look: 'siamese',
		at: [46.1655, 14.3062],
		days: 8,
		photo: 'cat-siamese.jpg',
		text: 'Mačka je prišla v hišo in noče oditi.',
	},
];

const mediaBase = () => config.MEDIA_BASE_URL ?? `${config.S3_ENDPOINT}/${config.R2_BUCKET_MEDIA}`;
const photoDir = new URL('./data/photos/', import.meta.url);

export default async function seedReports(): Promise<void> {
	if (config.APP_ENV !== 'local') {
		logger.warn('fixture reports skipped: local only');
		return;
	}
	const users = new Map(fixtureUsers.map((fixture) => [fixture.id, fixture]));
	if ((await prisma.profiles.count({ where: { id: { in: [...users.keys()] } } })) < users.size) {
		logger.warn('fixture reports skipped: fixture users missing (seeder 00-users)');
		return;
	}

	for (const pet of PETS) {
		const { breed, colours, pattern, size } = LOOKS[pet.look];
		const chip = pet.chip ? { chip_number: pet.chip, chip_status: 'valid', chip_registered_crhz: 'yes' } : {};
		await prisma.pets.upsert({
			where: { id: fixtureId(2, pet.n) },
			create: {
				id: fixtureId(2, pet.n),
				owner_id: pet.owner,
				species: pet.species,
				name: pet.name,
				breed_codes: [breed],
				colours,
				pattern,
				size,
				sex: pet.sex,
				birth_year: 2019 + pet.n,
				...chip,
				...(pet.species === 'cat' && { lifestyle: 'both' }),
			},
			update: {},
		});
	}

	const now = Date.now();
	const existing = new Set(
		(
			await prisma.reports.findMany({
				where: { id: { in: REPORTS.map((_, i) => fixtureId(1, i + 1)) } },
				select: { id: true },
			})
		).map((row) => row.id)
	);
	let created = 0;
	for (const [i, fixture] of REPORTS.entries()) {
		const id = fixtureId(1, i + 1);
		const { breed, colours, pattern, size } = LOOKS[fixture.look];
		if (!existing.has(id)) {
			const input: NewReport = {
				id,
				type: fixture.type,
				species: fixture.species,
				pet_id: fixture.pet ? fixtureId(2, fixture.pet) : null,
				name: fixture.name ?? null,
				breed_codes: [breed],
				colours,
				pattern,
				size,
				sex: fixture.sex ?? null,
				chip: fixture.chip ?? null,
				location: { lat: fixture.at[0], lng: fixture.at[1] },
				requested_radius_m: fixture.radius ?? null,
				event_at: new Date(now - fixture.days * DAY - (i % 5) * 3600 * 1000),
				circumstances: fixture.text,
				reward_eur: fixture.reward?.[0] ?? null,
				reward_note: fixture.reward?.[1] ?? null,
				linked_report_id: fixture.linked ? fixtureId(1, fixture.linked) : null,
				source: fixture.by === SHELTER ? 'organisation' : 'user',
			};
			const by = users.get(fixture.by)!;
			await ReportsDomain.insertReport(
				input,
				userCtx({
					user_id: by.id,
					role: by.role,
					is_anonymous: false,
					aal: 'aal1',
					email_verified: true,
					locale: 'sl',
				})
			);
			created++;
		}
		if (fixture.photo) {
			const photoId = fixtureId(3, i + 1);
			const body = readFileSync(new URL(fixture.photo, photoDir));
			// No sharp before TASK-14.1: the original JPEG serves as display and thumb.
			const key = `r/${id}/${photoId}/display.jpg`;
			await adapters.storage.put({ bucket: 'media', key }, body, 'image/jpeg');
			const [width, height] = PHOTOS[fixture.photo];
			await prisma.photos.upsert({
				where: { id: photoId },
				create: {
					id: photoId,
					owner_id: fixture.by,
					report_id: id,
					sha256: createHash('sha256').update(body).digest('hex'),
					width,
					height,
					bytes: body.length,
					status: 'published',
					public_display_url: `${mediaBase()}/${key}`,
					public_thumb_url: `${mediaBase()}/${key}`,
				},
				update: {},
			});
		}
	}
	logger.info({ reports: REPORTS.length, created, pets: PETS.length }, 'fixture reports ready');
}
