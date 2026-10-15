// Prisma access for profiles (C3). Every function takes an optional transaction client (ADR-020).
import { Prisma } from '../../generated/client.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';

export type AuthProfile = { role: USER_ROLE; locale: string; is_anonymous: boolean; email_verified: boolean };

/** The own profile for /v1/me: private fields, home as lat/lng, email and its confirmation from auth.users. */
export type MeRow = {
	id: string;
	display_name: string | null;
	locale: string;
	role: USER_ROLE;
	is_anonymous: boolean;
	home_lat: number | null;
	home_lng: number | null;
	home_radius_km: number;
	phone: string | null;
	quiet_from: string | null;
	quiet_to: string | null;
	supporter_badge_visible: boolean;
	email: string | null;
	email_verified: boolean;
};

export type ProfileFields = Partial<
	Pick<
		MeRow,
		'display_name' | 'locale' | 'home_radius_km' | 'phone' | 'quiet_from' | 'quiet_to' | 'supporter_badge_visible'
	>
>;

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

export async function getMe(id: string, tx?: Prisma.TransactionClient): Promise<MeRow | null> {
	const db = tx ?? prisma;
	const [row] = await db.$queryRaw<MeRow[]>`
		select p.id::text as id, p.display_name, p.locale, p.role::text as role, p.is_anonymous,
			extensions.st_y(p.home_point::extensions.geometry) as home_lat,
			extensions.st_x(p.home_point::extensions.geometry) as home_lng,
			p.home_radius_km, p.phone, p.quiet_from, p.quiet_to, p.supporter_badge_visible,
			u.email, u.email_confirmed_at is not null as email_verified
		from app.profiles p left join auth.users u on u.id = p.id
		where p.id = ${id}::uuid`;
	return row ?? null;
}

export async function updateProfile(id: string, data: ProfileFields, tx?: Prisma.TransactionClient): Promise<void> {
	const db = tx ?? prisma;
	await db.profiles.update({ where: { id }, data, select: { id: true } });
}

/** Only ever called with a point already coarsened by the domain (C6 §Storage), or null to clear it. */
export async function setHomePoint(
	id: string,
	point: { lat: number; lng: number } | null,
	tx?: Prisma.TransactionClient
): Promise<void> {
	const db = tx ?? prisma;
	const value = point
		? Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(${point.lng}, ${point.lat}), 4326)::extensions.geography`
		: Prisma.sql`null`;
	await db.$executeRaw`update app.profiles set home_point = ${value}, updated_at = now() where id = ${id}::uuid`;
}

export default { getAuthProfile, upsertAuthProfile, getMe, updateProfile, setHomePoint };
