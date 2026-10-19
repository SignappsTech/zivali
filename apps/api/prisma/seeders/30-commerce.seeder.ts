// Seeder 30-commerce (TASK-6.8, C14): the house ads in every environment, created once and never overwritten (admins
// edit them later); locally also two sponsor ads targeted by region and species, one verified shelter and its intake
// FOUND report (needs the reports table and 10-reports' geo data). The local
// fixtures need the fixture profiles (00-users) and municipality 61 (01-geo); without the profiles they are skipped.
import type { Prisma } from '../../generated/client.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import { config } from '../../lib/config.ts';
import { userCtx } from '../../lib/ctx.ts';
import { logger } from '../../lib/logger.ts';
import { prisma } from '../prisma.ts';
import { fixtureUsers } from './00-users.seeder.ts';

const ALL_SLOTS: Prisma.adsCreateManyInput['slots'] = ['FEED', 'DETAIL', 'REUNITED', 'SIDEBAR'];
const id = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;

// House-ad copy from docs/content/pages/P21-ad-slots.md §3 (CH-489). Seeded once; on an existing database the admin
// console (/admin/oglasi) is where the copy changes.
export const houseAds: Prisma.adsCreateManyInput[] = [
	{
		id: id(101),
		house_kind: 'supporter',
		locales: ['sl'],
		title: 'Pomagajte ohraniti iskanje brezplačno',
		body: 'Vsaka vrnitev domov je brezplačna. Prostovoljni prispevki pokrivajo strežnike, zemljevide in opozorila.',
		cta: 'Kako pomagati',
		link_url: 'https://najdimo.si/o-nas#financiranje',
		image_alt: 'Ilustracija: sonce nad mehkimi griči in pot, ki vodi do hiše',
	},
	{
		id: id(102),
		house_kind: 'supporter',
		locales: ['en'],
		title: 'Help keep searching free',
		body: 'Every way home is free. Voluntary contributions cover servers, maps and alerts.',
		cta: 'How to help',
		link_url: 'https://najdimo.si/en/about#funding',
		image_alt: 'Illustration: sun over soft hills and a path leading to a house',
	},
	{
		id: id(103),
		house_kind: 'partner',
		locales: ['sl'],
		title: 'Vaša ambulanta ali trgovina na tem mestu?',
		body: 'Veterinarji, trgovine in saloni: dosezite lastnike psov in mačk v svoji regiji. Oglasi so vedno jasno označeni.',
		cta: 'Oglašujte pri nas',
		link_url: 'https://najdimo.si/oglasevanje',
		image_alt: 'Ilustracija: vrsta lokalnih trgovin in ambulanta ob ulici',
	},
	{
		id: id(104),
		house_kind: 'partner',
		locales: ['en'],
		title: 'Your clinic or shop here?',
		body: 'Vets, shops and groomers: reach dog and cat owners in your region. Ads are always clearly labelled.',
		cta: 'Advertise with us',
		link_url: 'https://najdimo.si/en/advertise',
		image_alt: 'Illustration: a row of local shops and a clinic along a street',
	},
	{
		id: id(105),
		house_kind: 'adopt',
		locales: ['sl'],
		title: 'Posvojite žival iz zavetišča',
		body: 'Psi in mačke v zavetiščih čakajo na nov dom. Morda prav na vašega.',
		cta: 'Poišči zavetišče',
		link_url: 'https://najdimo.si/zavetisca',
		image_alt: 'Ilustracija: odprta vrata hiše, sonce in pot čez griče',
	},
	{
		id: id(106),
		house_kind: 'adopt',
		locales: ['en'],
		title: 'Adopt an animal from a shelter',
		body: 'Dogs and cats in shelters are waiting for a new home. Maybe yours.',
		cta: 'Find a shelter',
		link_url: 'https://najdimo.si/en/shelters',
		image_alt: 'Illustration: an open front door, the sun and a path over the hills',
	},
].map((ad) => ({ ...ad, slots: ALL_SLOTS, status: 'active', is_house: true }));

const admin = fixtureUsers.find((user) => user.email === 'admin@zivali.test')!.id;
const shelterMember = fixtureUsers.find((user) => user.email === 'shelter@zivali.test')!.id;

// Local fixtures with made-up businesses: region ids are GURS statistical regions (8 osrednjeslovenska, 2 podravska).
export const sponsorAds: Prisma.adsCreateManyInput[] = [
	{
		id: id(201),
		locales: ['sl'],
		title: 'Ambulanta Tačka (testni oglas)',
		body: 'Dežurni veterinar 24/7 za pse v osrednji Sloveniji.',
		cta: 'Pokličite',
		link_url: 'https://example.com/ambulanta-tacka',
		image_alt: 'Veterinarka pregleduje psa',
		slots: ['DETAIL', 'FEED'],
		region_ids: [8],
		species: ['dog'],
		status: 'active',
		created_by: admin,
	},
	{
		id: id(202),
		locales: ['sl'],
		title: 'Trgovina Mijav (testni oglas)',
		body: 'Hrana in oprema za mačke v Podravju.',
		cta: 'V trgovino',
		link_url: 'https://example.com/trgovina-mijav',
		image_alt: 'Mačka se igra z vrvico',
		slots: ['FEED', 'SIDEBAR'],
		region_ids: [2],
		species: ['cat'],
		status: 'active',
		created_by: admin,
	},
];

export const SEED_SHELTER_ID = id(301);
export const SEED_INTAKE_REPORT_ID = id(401);

export default async function seedCommerce(): Promise<void> {
	await prisma.ads.createMany({ data: houseAds, skipDuplicates: true });
	if (config.APP_ENV !== 'local') return;
	const users = [admin, shelterMember];
	if ((await prisma.profiles.count({ where: { id: { in: users } } })) < users.length) {
		logger.warn('commerce fixtures skipped: needs the fixture users (00-users)');
		return;
	}
	await prisma.ads.createMany({ data: sponsorAds, skipDuplicates: true });

	// Municipality 61 = Ljubljana (seeder 01-geo).
	await prisma.organisations.upsert({
		where: { id: SEED_SHELTER_ID },
		create: {
			id: SEED_SHELTER_ID,
			kind: 'SHELTER',
			name: 'Zavetišče Tačke (test)',
			municipality_id: 61,
			verified_at: new Date('2026-10-01T00:00:00Z'),
			members: { create: { user_id: shelterMember, role: 'ADMIN' } },
		},
		update: {},
	});

	// The shelter's intake FOUND report (the intake exemption): written by its member as an organisation report.
	if (!(await prisma.reports.count({ where: { id: SEED_INTAKE_REPORT_ID } }))) {
		await ReportsDomain.insertReport(
			{
				id: SEED_INTAKE_REPORT_ID,
				type: 'found',
				species: 'dog',
				location: { lat: 46.0569, lng: 14.5058 },
				event_at: new Date(Date.now() - 2 * 24 * 3600 * 1000),
				circumstances: 'Sprejem v zavetišče: najdenega psa so pripeljali v zavetišče (testni podatek).',
				source: 'organisation',
			},
			userCtx({
				user_id: shelterMember,
				role: 'SHELTER_MEMBER',
				is_anonymous: false,
				aal: 'aal1',
				email_verified: true,
				locale: 'sl',
			})
		);
		await prisma.reports.update({
			where: { id: SEED_INTAKE_REPORT_ID },
			data: { organisation_id: SEED_SHELTER_ID },
		});
	}
}
