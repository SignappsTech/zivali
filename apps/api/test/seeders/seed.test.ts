// TASK-5.4: the seed as every staging and production deploy runs it (deploy/remote.sh, after `migrate deploy`), on a
// database that already has the reference data: only the all-environment seeders write, a rerun changes no reference
// data and keeps admin edits.
import { readdirSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { config } from '../../lib/config.ts';
import { prisma } from '../../prisma/prisma.ts';
import { fixtureUsers } from '../../prisma/seeders/00-users.seeder.ts';
import seedDirectory from '../../prisma/seeders/05-directory.seeder.ts';
import { houseAds } from '../../prisma/seeders/30-commerce.seeder.ts';
import { ensureGeoPlaces, geoCounts, SEED_TIMEOUT_MS, SNAPSHOT } from '../helpers/geo.ts';

const dir = new URL('../../prisma/seeders/', import.meta.url);

/** The loop of prisma/seed.ts (a script that disconnects when done): every seeder in file-name order. */
async function seed(): Promise<void> {
	const files = readdirSync(dir).filter((file) => file.endsWith('.seeder.ts'));
	for (const file of files.sort()) {
		const seeder: { default: () => Promise<void> } = await import(new URL(file, dir).href);
		await seeder.default();
	}
}

const ids = fixtureUsers.map((user) => user.id);
const ADMIN = fixtureUsers.find((user) => user.email === 'admin@zivali.test')!.id;
const PHONE = '+38610000000';
const TITLE = 'Edited by an admin';

/** Rows only the local-only fixtures write (10-reports, 20-collab, 30-commerce's sponsor ads and shelter). */
const fixtureRows = async () => ({
	pets: await prisma.pets.count({ where: { owner_id: { in: ids } } }),
	reports: await prisma.report_managers.count({ where: { user_id: { in: ids } } }),
	alerts: await prisma.alert_subscriptions.count({ where: { user_id: { in: ids } } }),
	notifications: await prisma.notifications.count({ where: { user_id: { in: ids } } }),
	conversations: await prisma.conversation_participants.count({ where: { user_id: { in: ids } } }),
	organisations: await prisma.organisation_members.count({ where: { user_id: { in: ids } } }),
	sponsorAds: await prisma.ads.count({ where: { is_house: false, created_by: { in: ids } } }),
});

/** Order-independent checksums of the reference tables: change when a run adds, drops or alters a row. */
async function reference() {
	const [sums] = await prisma.$queryRaw<Record<string, string>[]>`
		select (select sum(hashtext((t.*)::text)::bigint)::text from app.regions t) as regions,
			(select sum(hashtext((t.*)::text)::bigint)::text from app.municipalities t) as municipalities,
			(select sum(hashtext((t.*)::text)::bigint)::text from app.geo_places t) as places,
			(select sum(hashtext((t.*)::text)::bigint)::text from app.geo_addresses t) as addresses,
			(select sum(hashtext((t.*)::text)::bigint)::text from app.shelters t) as shelters,
			(select sum(hashtext((t.*)::text)::bigint)::text from app.municipality_shelters t) as assignments,
			(select sum(hashtext((t.*)::text)::bigint)::text from app.directory_changes t) as changes,
			(select sum(hashtext((t.*)::text)::bigint)::text from app.ads t where is_house) as house_ads`;
	return sums;
}

describe('the seed with APP_ENV=staging, on a database that has the reference data', () => {
	const appEnv = config.APP_ENV;
	let shelter: Awaited<ReturnType<typeof prisma.shelters.findUniqueOrThrow>>;
	let assignment: Awaited<ReturnType<typeof prisma.municipality_shelters.findUniqueOrThrow>>;
	let fetchCalls: unknown[];
	const before = {} as { fixtures: Awaited<ReturnType<typeof fixtureRows>>; reference: Record<string, string> };

	beforeAll(async () => {
		// An earlier deploy's reference data, each part loaded only when it is missing.
		await ensureGeoPlaces();
		await seedDirectory();
		await prisma.ads.createMany({ data: houseAds, skipDuplicates: true });
		// The fixture profiles (rows only), so a fixture seeder without its APP_ENV check would find what it needs.
		for (const { id, display_name, role } of fixtureUsers) {
			await prisma.profiles.upsert({ where: { id }, create: { id, display_name, role }, update: {} });
		}
		// What admin edits leave behind (TASK-89): a new directory version with its change row, an edited house ad.
		shelter = await prisma.shelters.findUniqueOrThrow({ where: { slug: 'zavetisce-ljubljana' } });
		const { id: municipality_id } = await prisma.municipalities.findUniqueOrThrow({ where: { slug: 'ljubljana' } });
		assignment = await prisma.municipality_shelters.findUniqueOrThrow({ where: { municipality_id } });
		await prisma.shelters.update({ where: { id: shelter.id }, data: { phone: PHONE, version: 2 } });
		await prisma.municipality_shelters.update({
			where: { municipality_id },
			data: { status: 'UNCONFIRMED', version: 2 },
		});
		await prisma.directory_changes.create({
			data: {
				entity: 'shelter',
				entity_id: shelter.id,
				version: 2,
				data: { phone: PHONE, version: 2 },
				source: shelter.source,
				actor_id: ADMIN,
			},
		});
		await prisma.ads.update({ where: { id: houseAds[0]!.id! }, data: { title: TITLE } });

		before.fixtures = await fixtureRows();
		before.reference = await reference();
		config.APP_ENV = 'staging';
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		try {
			await seed();
		} finally {
			config.APP_ENV = appEnv;
			fetchCalls = fetchSpy.mock.calls.map(([url]) => String(url));
			fetchSpy.mockRestore();
		}
	}, SEED_TIMEOUT_MS);

	afterAll(async () => {
		await prisma.shelters.update({
			where: { id: shelter.id },
			data: { phone: shelter.phone, version: shelter.version },
		});
		await prisma.municipality_shelters.update({
			where: { municipality_id: assignment.municipality_id },
			data: { status: assignment.status, version: assignment.version },
		});
		await prisma.directory_changes.deleteMany({ where: { entity: 'shelter', entity_id: shelter.id, version: 2 } });
		await prisma.ads.update({ where: { id: houseAds[0]!.id! }, data: { title: houseAds[0]!.title } });
	});

	it('writes no fixture users, reports, collab rows, sponsor ads or shelter organisation', async () => {
		// 00-users creates its users through the Supabase Auth Admin API.
		expect(fetchCalls).toEqual([]);
		expect(await fixtureRows()).toEqual(before.fixtures);
	});

	it('changes no reference data and keeps the admin edits to the directory and the house ads', async () => {
		expect(await reference()).toEqual(before.reference);
		expect(await prisma.shelters.findUniqueOrThrow({ where: { id: shelter.id } })).toMatchObject({
			phone: PHONE,
			version: 2,
		});
		expect(
			await prisma.municipality_shelters.findUniqueOrThrow({
				where: { municipality_id: assignment.municipality_id },
			})
		).toMatchObject({ status: 'UNCONFIRMED', version: 2 });
		expect((await prisma.ads.findUniqueOrThrow({ where: { id: houseAds[0]!.id! } })).title).toBe(TITLE);
	});

	it('leaves the complete reference data in place', async () => {
		const [counts] = await prisma.$queryRaw<Record<string, number>[]>`
			select (select count(*)::int from app.regions) as regions,
				(select count(*)::int from app.municipalities) as municipalities,
				(select count(*)::int from app.shelters where active) as shelters,
				(select count(*)::int from app.municipality_shelters) as assignments`;
		expect(counts).toEqual({ regions: 12, municipalities: 212, shelters: 17, assignments: 212 });
		expect(await geoCounts()).toEqual(SNAPSHOT);
		expect(await prisma.ads.count({ where: { id: { in: houseAds.map((ad) => ad.id!) } } })).toBe(6);
	});
});
