// Prisma access for profiles (C3). Every function takes an optional transaction client (ADR-020).
import type { USER_ROLE } from '../../generated/enums.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';

export type AuthProfile = { role: USER_ROLE; locale: string; is_anonymous: boolean; email_verified: boolean };

/**
 * The profile fields for req.user. email_verified comes from auth.users.email_confirmed_at, which only Supabase Auth
 * writes; user_metadata is writable by the user (updateUser) and never trusted for it. No auth.users row = false.
 */
export async function getAuthProfile(id: string, tx?: Prisma.TransactionClient): Promise<AuthProfile | null> {
	const db = tx ?? prisma;
	const [row] = await db.$queryRaw<AuthProfile[]>`
		select p.role::text as role, p.locale, p.is_anonymous, u.email_confirmed_at is not null as email_verified
		from app.profiles p left join auth.users u on u.id = p.id
		where p.id = ${id}::uuid`;
	return row ?? null;
}

/** Insert or flip is_anonymous in one statement (native upsert, safe against two first requests at once). */
export async function upsertAuthProfile(
	data: { id: string; locale: string; is_anonymous: boolean },
	tx?: Prisma.TransactionClient
): Promise<AuthProfile> {
	const db = tx ?? prisma;
	await db.profiles.upsert({
		where: { id: data.id },
		create: data,
		update: { is_anonymous: data.is_anonymous },
		select: { id: true },
	});
	return (await getAuthProfile(data.id, tx))!;
}

export default { getAuthProfile, upsertAuthProfile };
