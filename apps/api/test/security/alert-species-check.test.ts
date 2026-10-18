// alert_subscriptions.species check (TASK-6.7): non-null subset of {dog, cat}; empty means no alerts (TASK-114.14).
import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '../../prisma/prisma.ts';

const USER = randomUUID();

const insert = (species: string) =>
	prisma.$executeRawUnsafe(
		`insert into app.alert_subscriptions (id, user_id, center_point, radius_km, species, updated_at)
		 values (gen_random_uuid(), $1::uuid, 'POINT(14.5 46.05)'::extensions.geography, 5, ${species}, now())`,
		USER
	);

describe('alert_subscriptions species check', () => {
	afterAll(async () => {
		await prisma.profiles.deleteMany({ where: { id: USER } });
	});

	it('rejects NULL and unknown species; accepts dog/cat and an empty list', async () => {
		await prisma.profiles.create({ data: { id: USER } });
		await expect(insert('null')).rejects.toThrow(/alert_subscriptions_species_check/);
		await expect(insert(`array['dog','bird']::text[]`)).rejects.toThrow(/alert_subscriptions_species_check/);
		await expect(insert(`array['dog']::text[]`)).resolves.toBe(1);
		await prisma.alert_subscriptions.deleteMany({ where: { user_id: USER } });
		await expect(insert(`'{}'::text[]`)).resolves.toBe(1);
	});
});
