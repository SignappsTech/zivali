// Seeder 00-users against the local Supabase Auth (C1 §Seed): fixed ids, confirmed emails, roles, TOTP for staff.
import { describe, expect, it } from 'vitest';

import seedUsers, { fixtureUsers } from '../../prisma/seeders/00-users.seeder.ts';
import { prisma } from '../../prisma/prisma.ts';

const ids = fixtureUsers.map((user) => user.id);

describe('seeder 00-users', () => {
	it('creates the fixture users in Auth with profiles and roles, idempotently', async () => {
		await seedUsers();
		await seedUsers();

		const profiles = await prisma.profiles.findMany({
			where: { id: { in: ids } },
			select: { id: true, role: true },
		});
		expect(profiles.sort((a, b) => a.id.localeCompare(b.id))).toEqual(
			fixtureUsers.map(({ id, role }) => ({ id, role }))
		);

		const auth = await prisma.$queryRaw<{ id: string; email: string; confirmed: boolean; totp: number }[]>`
			select u.id::text, u.email, u.email_confirmed_at is not null as confirmed,
				count(f.id) filter (where f.factor_type = 'totp' and f.status = 'verified')::int as totp
			from auth.users u left join auth.mfa_factors f on f.user_id = u.id
			where u.id = any(${ids}::uuid[]) group by u.id order by u.id`;
		expect(auth).toEqual(
			fixtureUsers.map(({ id, email, totp }) => ({ id, email, confirmed: true, totp: totp ? 1 : 0 }))
		);
	});
});
