// Prisma access for profiles (C3). Every function takes an optional transaction client (ADR-020).
import { prisma, type Prisma } from '../../prisma/prisma.ts';

const AUTH_SELECT = { role: true, locale: true, is_anonymous: true } as const;
export type AuthProfile = Prisma.profilesGetPayload<{ select: typeof AUTH_SELECT }>;

export async function getAuthProfile(id: string, tx?: Prisma.TransactionClient): Promise<AuthProfile | null> {
	const db = tx ?? prisma;
	return db.profiles.findUnique({ where: { id }, select: AUTH_SELECT });
}

/** Insert or flip is_anonymous in one statement (native upsert, safe against two first requests at once). */
export async function upsertAuthProfile(
	data: { id: string; locale: string; is_anonymous: boolean },
	tx?: Prisma.TransactionClient
): Promise<AuthProfile> {
	const db = tx ?? prisma;
	return db.profiles.upsert({
		where: { id: data.id },
		create: data,
		update: { is_anonymous: data.is_anonymous },
		select: AUTH_SELECT,
	});
}

export default { getAuthProfile, upsertAuthProfile };
