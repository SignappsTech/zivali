// Fixture users (C1 §Seed), local only. Created in Supabase Auth through the Admin API with fixed ids and a
// confirmed email, each with a profile and role; mod and admin also get a verified TOTP factor (README.md here).
import { SignJWT } from 'jose';

import type { USER_ROLE } from '../../generated/enums.ts';
import { config } from '../../lib/config.ts';
import { logger } from '../../lib/logger.ts';
import { prisma } from '../prisma.ts';

export const FIXTURE_PASSWORD = 'zivali-local-only';
export const FIXTURE_TOTP_SECRET = 'ZIVALILOCALONLYZIVALILOCALONLYAA';

type FixtureUser = { id: string; email: string; display_name: string; role: USER_ROLE; totp?: boolean };

export const fixtureUsers: FixtureUser[] = [
	{ id: '00000000-0000-4000-8000-000000000001', email: 'owner@zivali.test', display_name: 'Owner', role: 'USER' },
	{ id: '00000000-0000-4000-8000-000000000002', email: 'owner2@zivali.test', display_name: 'Owner 2', role: 'USER' },
	{ id: '00000000-0000-4000-8000-000000000003', email: 'finder@zivali.test', display_name: 'Finder', role: 'USER' },
	{
		id: '00000000-0000-4000-8000-000000000004',
		email: 'shelter@zivali.test',
		display_name: 'Shelter',
		role: 'SHELTER_MEMBER',
	},
	{
		id: '00000000-0000-4000-8000-000000000005',
		email: 'mod@zivali.test',
		display_name: 'Moderator',
		role: 'MODERATOR',
		totp: true,
	},
	{
		id: '00000000-0000-4000-8000-000000000006',
		email: 'admin@zivali.test',
		display_name: 'Admin',
		role: 'ADMIN',
		totp: true,
	},
];

export default async function seedUsers(): Promise<void> {
	const { APP_ENV, SUPABASE_URL, SUPABASE_JWT_SECRET } = config;
	if (APP_ENV !== 'local' || !SUPABASE_URL || !SUPABASE_JWT_SECRET) {
		logger.warn('fixture users skipped: local only, needs SUPABASE_URL and SUPABASE_JWT_SECRET');
		return;
	}

	// The local stack signs with the shared JWT secret, so this is the local service_role key.
	const token = await new SignJWT({ role: 'service_role' })
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuedAt()
		.setExpirationTime('5m')
		.sign(new TextEncoder().encode(SUPABASE_JWT_SECRET));
	const admin = async <T>(path: string, method = 'GET', body?: object): Promise<T> => {
		const res = await fetch(`${SUPABASE_URL}/auth/v1/admin${path}`, {
			method,
			headers: { apikey: token, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: body && JSON.stringify(body),
		});
		if (!res.ok) throw new Error(`Supabase Admin API ${method} ${path}: ${res.status} ${await res.text()}`);
		return (await res.json()) as T;
	};

	const { users } = await admin<{ users: { id: string; email?: string }[] }>('/users?per_page=1000');
	for (const user of fixtureUsers) {
		const existing = users.find((authUser) => authUser.email === user.email);
		if (existing?.id !== user.id) {
			// Signed up by hand with another id: recreate it so other seeders can rely on the fixed ids.
			if (existing) await admin(`/users/${existing.id}`, 'DELETE');
			await admin('/users', 'POST', {
				id: user.id,
				email: user.email,
				password: FIXTURE_PASSWORD,
				email_confirm: true,
				user_metadata: { locale: 'sl' },
			});
		}
		await prisma.profiles.upsert({
			where: { id: user.id },
			create: { id: user.id, display_name: user.display_name, role: user.role },
			update: { role: user.role },
		});
		// The Admin API cannot enrol a factor with a known secret; Auth reads the plain secret from this row.
		if (user.totp) {
			await prisma.$executeRaw`
				insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, secret, created_at, updated_at)
				values (gen_random_uuid(), ${user.id}::uuid, 'local', 'totp', 'verified', ${FIXTURE_TOTP_SECRET}, now(), now())
				on conflict do nothing`;
		}
	}
	logger.info({ users: fixtureUsers.length }, 'fixture users ready');
}
