// Seeder 00-users against the local Supabase Auth (C1 §Seed): fixed ids, confirmed emails, roles, TOTP for staff.
import { describe, expect, it } from 'vitest';

import seedUsers, { fixtureUsers, isLocalStack } from '../../prisma/seeders/00-users.seeder.ts';
import { prisma } from '../../prisma/prisma.ts';

const ids = fixtureUsers.map((user) => user.id);

describe('seeder 00-users', () => {
	it('refuses unless both URLs are local', () => {
		const db = 'postgresql://postgres:x@127.0.0.1:55322/postgres?schema=app';
		expect(isLocalStack('http://127.0.0.1:55321', db)).toBe(true);
		expect(isLocalStack('http://localhost:55321', 'postgresql://u:p@[::1]:5432/db')).toBe(true);
		expect(isLocalStack('https://abc.supabase.co', db)).toBe(false);
		expect(isLocalStack('http://127.0.0.1:55321', 'postgresql://u:p@db.abc.supabase.co:5432/postgres')).toBe(false);
		expect(isLocalStack(undefined, db)).toBe(false);
	});

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
