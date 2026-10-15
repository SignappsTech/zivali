// Prisma access for notifications (C10): inbox, prefs, push tokens, alert deliveries, email outbox. Every function
// takes an optional transaction client (ADR-020).
import { Prisma } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

export type RecipientRow = {
	id: string;
	locale: string;
	quiet_from: string | null;
	quiet_to: string | null;
	email: string | null;
	email_verified: boolean;
};

/** Profile fields for delivery; email and its confirmation come from auth.users (never user_metadata). */
export async function getRecipient(id: string, tx?: Tx): Promise<RecipientRow | null> {
	const db = tx ?? prisma;
	const [row] = await db.$queryRaw<RecipientRow[]>`
		select p.id::text as id, p.locale, p.quiet_from, p.quiet_to, u.email, u.email_confirmed_at is not null as email_verified
		from app.profiles p left join auth.users u on u.id = p.id
		where p.id = ${id}::uuid`;
	return row ?? null;
}

export async function getQuietHours(user_id: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.profiles.findUnique({ where: { id: user_id }, select: { quiet_from: true, quiet_to: true } });
}

export async function listPrefs(user_id: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.notification_prefs.findMany({ where: { user_id } });
}

export async function getPref(user_id: string, type: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.notification_prefs.findUnique({ where: { user_id_type: { user_id, type } } });
}

type Channels = { in_app?: boolean; push?: boolean; email?: boolean };

/** Applies `changes`; a new row starts from the type's defaults. */
export async function upsertPref(
	input: { user_id: string; type: string; defaults: Required<Channels>; changes: Channels },
	tx?: Tx
) {
	const db = tx ?? prisma;
	const { user_id, type, defaults, changes } = input;
	return db.notification_prefs.upsert({
		where: { user_id_type: { user_id, type } },
		create: { user_id, type, ...defaults, ...changes },
		update: changes,
	});
}

export type NotificationRow = {
	id: string;
	type: string;
	payload: Prisma.JsonValue;
	read_at: Date | null;
	created_at: Date;
};

/** Inserts the inbox row unless (user_id, dedupe_key) exists; null = duplicate. */
export async function insertNotification(
	row: { user_id: string; type: string; payload: object; dedupe_key?: string },
	tx?: Tx
): Promise<NotificationRow | null> {
	const db = tx ?? prisma;
	const [inserted] = await db.$queryRaw<NotificationRow[]>`
		insert into app.notifications (id, user_id, type, payload, dedupe_key)
		values (gen_random_uuid(), ${row.user_id}::uuid, ${row.type}, ${JSON.stringify(row.payload)}::jsonb, ${row.dedupe_key ?? null})
		on conflict (user_id, dedupe_key) do nothing
		returning id::text as id, type, payload, read_at, created_at`;
	return inserted ?? null;
}

const selectRow = { id: true, type: true, payload: true, read_at: true, created_at: true } as const;

/** Newest first, keyset on (created_at, id); the cursor is the last item's id and must be the caller's own. */
export async function listNotifications(input: { user_id: string; cursor?: string; take: number }, tx?: Tx) {
	const db = tx ?? prisma;
	const { user_id, cursor, take } = input;
	const after = cursor
		? await db.notifications.findFirst({ where: { id: cursor, user_id }, select: { id: true, created_at: true } })
		: null;
	if (cursor && !after) return [];
	return db.notifications.findMany({
		where: {
			user_id,
			...(after && {
				OR: [{ created_at: { lt: after.created_at } }, { created_at: after.created_at, id: { lt: after.id } }],
			}),
		},
		orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
		take,
		select: selectRow,
	});
}

export async function countUnread(user_id: string, tx?: Tx): Promise<number> {
	const db = tx ?? prisma;
	return db.notifications.count({ where: { user_id, read_at: null } });
}

/** Marks the caller's own unread rows (all, or the given ids) as read; other users' ids are ignored. */
export async function markRead(input: { user_id: string; ids?: string[]; now: Date }, tx?: Tx): Promise<number> {
	const db = tx ?? prisma;
	const { count } = await db.notifications.updateMany({
		where: { user_id: input.user_id, read_at: null, ...(input.ids && { id: { in: input.ids } }) },
		data: { read_at: input.now },
	});
	return count;
}

export async function listPushTokens(user_id: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.push_tokens.findMany({ where: { user_id }, select: { token: true } });
}

/** A token belongs to the device's current user: registering it again moves it and refreshes last_seen_at. */
export async function upsertPushToken(input: { user_id: string; token: string; platform: string; now: Date }, tx?: Tx) {
	const db = tx ?? prisma;
	const { token, ...data } = input;
	const row = { user_id: data.user_id, platform: data.platform, last_seen_at: data.now };
	await db.push_tokens.upsert({ where: { token }, create: { token, ...row }, update: row, select: { id: true } });
}

export async function deletePushTokens(input: { tokens: string[]; user_id?: string }, tx?: Tx): Promise<number> {
	const db = tx ?? prisma;
	const { count } = await db.push_tokens.deleteMany({
		where: { token: { in: input.tokens }, ...(input.user_id && { user_id: input.user_id }) },
	});
	return count;
}

export async function insertOutbox(
	row: {
		user_id: string | null;
		template: string;
		locale: string;
		to_address_hash: string;
		status: 'sent' | 'failed' | 'mocked';
		provider_id?: string;
		error?: string;
	},
	tx?: Tx
): Promise<void> {
	const db = tx ?? prisma;
	await db.email_outbox.create({ data: row, select: { id: true } });
}

/** The recipient's read marker in a conversation; undefined when not a participant (C9). */
export async function getLastReadAt(conversation_id: string, user_id: string, tx?: Tx) {
	const db = tx ?? prisma;
	const row = await db.conversation_participants.findUnique({
		where: { conversation_id_user_id: { conversation_id, user_id } },
		select: { last_read_at: true },
	});
	return row ? row.last_read_at : undefined;
}

export default {
	getRecipient,
	getQuietHours,
	listPrefs,
	getPref,
	upsertPref,
	insertNotification,
	listNotifications,
	countUnread,
	markRead,
	listPushTokens,
	upsertPushToken,
	deletePushTokens,
	insertOutbox,
	getLastReadAt,
};
