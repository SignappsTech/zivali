// Seeder 30-commerce (TASK-6.8, C14): the house ads in every environment, created once and never overwritten (admins
// edit them later); locally also two sponsor ads targeted by region and species and one verified shelter. The local
// fixtures need the fixture profiles (00-users) and municipality 61 (01-geo); without the profiles they are skipped.
import type { Prisma } from '../../generated/client.ts';
import { config } from '../../lib/config.ts';
import { logger } from '../../lib/logger.ts';
import { prisma } from '../prisma.ts';
import { fixtureUsers } from './00-users.seeder.ts';

const ALL_SLOTS: Prisma.adsCreateManyInput['slots'] = ['FEED', 'DETAIL', 'REUNITED', 'SIDEBAR'];
const id = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;

// PLACEHOLDER COPY: the content strategist replaces titles, bodies, CTAs, alt texts and the domain before launch.
export const houseAds: Prisma.adsCreateManyInput[] = [
	{
		id: id(101),
		house_kind: 'supporter',
		locales: ['sl'],
		title: 'Podprite Najdimo',
		body: 'Najdimo je brezplačen za vse. Z majhnim prispevkom pomagate, da tako tudi ostane.',
		cta: 'Podprite nas',
		link_url: 'https://najdimo.si/o-nas',
		image_alt: 'Pes in mačka skupaj na kavču',
	},
	{
		id: id(102),
		house_kind: 'supporter',
		locales: ['en'],
		title: 'Support Najdimo',
		body: 'Najdimo is free for everyone. A small contribution helps keep it that way.',
		cta: 'Support us',
		link_url: 'https://najdimo.si/en/about',
		image_alt: 'A dog and a cat together on a sofa',
	},
	{
		id: id(103),
		house_kind: 'partner',
		locales: ['sl'],
		title: 'Oglašujte pri nas',
		body: 'Dosezite lastnike psov in mačk v svoji regiji.',
		cta: 'Več o oglaševanju',
		link_url: 'https://najdimo.si/oglasevanje',
		image_alt: 'Lastnica s psom pred veterinarsko ambulanto',
	},
	{
		id: id(104),
		house_kind: 'partner',
		locales: ['en'],
		title: 'Advertise with us',
		body: 'Reach dog and cat owners in your region.',
		cta: 'Learn more',
		link_url: 'https://najdimo.si/en/advertise',
		image_alt: 'A woman with her dog outside a vet clinic',
	},
	{
		id: id(105),
		house_kind: 'adopt',
		locales: ['sl'],
		title: 'Posvojite žival iz zavetišča',
		body: 'V zavetiščih po Sloveniji psi in mačke čakajo na nov dom.',
		cta: 'Poiščite zavetišče',
		link_url: 'https://najdimo.si/zavetisca',
		image_alt: 'Mačka v zavetišču gleda v kamero',
	},
	{
		id: id(106),
		house_kind: 'adopt',
		locales: ['en'],
		title: 'Adopt from a shelter',
		body: 'Dogs and cats in shelters across Slovenia are waiting for a new home.',
		cta: 'Find a shelter',
		link_url: 'https://najdimo.si/en/shelters',
		image_alt: 'A shelter cat looking at the camera',
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
}
