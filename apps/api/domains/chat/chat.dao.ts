// Prisma access for chat (C9): conversations, participants, messages, blocks, plus the report reads chat needs
// (managers, type and source for aliases). Messages are read oldest-first by (created_at, id).
import { Prisma } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

export type ParticipantRole = 'owner' | 'finder' | 'contact';
export type ReportSide = { id: string; type: string; source: string };
export type MessageRow = Awaited<ReturnType<typeof insertMessage>>;
export type ConversationRow = NonNullable<Awaited<ReturnType<typeof findConversation>>>;

export async function findReportByCode(short_code: string, tx?: Tx) {
	return (tx ?? prisma).reports.findUnique({
		where: { short_code },
		select: {
			id: true,
			type: true,
			status: true,
			moderation_state: true,
			managers: { select: { user_id: true } },
		},
	});
}

export async function findReportSides(ids: string[], tx?: Tx): Promise<ReportSide[]> {
	return (tx ?? prisma).reports.findMany({ where: { id: { in: ids } }, select: { id: true, type: true, source: true } });
}

export async function findManagers(report_ids: string[], tx?: Tx) {
	return (tx ?? prisma).report_managers.findMany({
		where: { report_id: { in: report_ids } },
		select: { report_id: true, user_id: true },
	});
}

/** Manager of any of `report_ids`, or of any report when omitted. */
export async function isManager(user_id: string, report_ids?: string[], tx?: Tx): Promise<boolean> {
	const row = await (tx ?? prisma).report_managers.findFirst({
		where: { user_id, ...(report_ids && { report_id: { in: report_ids } }) },
		select: { report_id: true },
	});
	return row !== null;
}

export async function findMatch(id: string, tx?: Tx) {
	return (tx ?? prisma).matches.findUnique({
		where: { id },
		select: { id: true, state: true, lost_report_id: true, other_report_id: true },
	});
}

/** Serialises concurrent opens of the same conversation (idempotent POST /v1/conversations). */
export async function lockKey(key: string, tx: Tx): Promise<void> {
	await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${key}))`;
}

export async function findByMatch(match_id: string, tx?: Tx) {
	return (tx ?? prisma).conversations.findUnique({ where: { match_id }, select: { id: true } });
}

/** The caller's own contact conversation about a report (no match). */
export async function findContact(about_report_id: string, user_id: string, tx?: Tx) {
	return (tx ?? prisma).conversations.findFirst({
		where: { about_report_id, match_id: null, participants: { some: { user_id, role: 'contact' } } },
		select: { id: true },
	});
}

export async function createConversation(
	data: { about_report_id: string; lost_report_id?: string; other_report_id?: string; match_id?: string },
	participants: { user_id: string; role: ParticipantRole }[],
	tx?: Tx
) {
	return (tx ?? prisma).conversations.create({
		data: { ...data, participants: { createMany: { data: participants } } },
		select: { id: true },
	});
}

export async function findConversation(id: string, tx?: Tx) {
	return (tx ?? prisma).conversations.findUnique({
		where: { id },
		include: {
			participants: { select: { user_id: true, role: true, alias: true, last_read_at: true, muted: true } },
		},
	});
}

/** True when any of `blockers` has blocked `user_id`. */
export async function isBlockedBy(user_id: string, blockers: string[], tx?: Tx): Promise<boolean> {
	const row = await (tx ?? prisma).blocks.findFirst({
		where: { blocked_id: user_id, blocker_id: { in: blockers } },
		select: { blocker_id: true },
	});
	return row !== null;
}

export async function upsertBlock(blocker_id: string, blocked_id: string, tx?: Tx): Promise<void> {
	await (tx ?? prisma).blocks.upsert({
		where: { blocker_id_blocked_id: { blocker_id, blocked_id } },
		create: { blocker_id, blocked_id },
		update: {},
	});
}

const messageSelect = {
	id: true,
	conversation_id: true,
	sender_id: true,
	kind: true,
	body: true,
	location: true,
	has_link: true,
	created_at: true,
} as const;

export async function insertMessage(
	data: {
		conversation_id: string;
		sender_id: string;
		kind: 'text' | 'location';
		body: string;
		location?: { lat: number; lng: number };
		has_link: boolean;
	},
	tx?: Tx
) {
	return (tx ?? prisma).messages.create({ data, select: messageSelect });
}

export async function findMessage(conversation_id: string, id: string, tx?: Tx) {
	return (tx ?? prisma).messages.findFirst({
		where: { conversation_id, id },
		select: { id: true, created_at: true },
	});
}

type Position = { id: string; created_at: Date };
const newer = (p: Position): Prisma.messagesWhereInput => ({
	OR: [{ created_at: { gt: p.created_at } }, { created_at: p.created_at, id: { gt: p.id } }],
});
const older = (p: Position): Prisma.messagesWhereInput => ({
	OR: [{ created_at: { lt: p.created_at } }, { created_at: p.created_at, id: { lt: p.id } }],
});

/**
 * One page plus one extra row (to tell whether more exist), in query order: forward (oldest-first) after `after`,
 * otherwise backward (newest-first) before `before` or from the latest message.
 */
export async function listMessages(
	conversation_id: string,
	{ after, before, take }: { after?: Position; before?: Position; take: number },
	tx?: Tx
) {
	const forward = after !== undefined;
	const where: Prisma.messagesWhereInput = {
		conversation_id,
		...(after ? newer(after) : before ? older(before) : {}),
	};
	const order = forward ? 'asc' : 'desc';
	return (tx ?? prisma).messages.findMany({
		where,
		orderBy: [{ created_at: order }, { id: order }],
		take,
		select: messageSelect,
	});
}

export async function latestMessageId(conversation_id: string, tx?: Tx): Promise<string | null> {
	const row = await (tx ?? prisma).messages.findFirst({
		where: { conversation_id },
		orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
		select: { id: true },
	});
	return row?.id ?? null;
}

/** Messages from others since the participant last read the conversation. */
export async function unreadCount(conversation_id: string, user_id: string, since: Date | null, tx?: Tx) {
	return (tx ?? prisma).messages.count({
		where: {
			conversation_id,
			OR: [{ sender_id: null }, { sender_id: { not: user_id } }],
			...(since && { created_at: { gt: since } }),
		},
	});
}

export async function setLastRead(conversation_id: string, user_id: string, at: Date, tx?: Tx): Promise<void> {
	await (tx ?? prisma).conversation_participants.update({
		where: { conversation_id_user_id: { conversation_id, user_id } },
		data: { last_read_at: at },
	});
}

/** Active conversations about the report become read-only; returns them with their participants. */
export async function markReadOnly(about_report_id: string, at: Date, tx: Tx) {
	const rows = await tx.conversations.findMany({
		where: { about_report_id, status: 'active' },
		select: { id: true, participants: { select: { user_id: true } } },
	});
	await tx.conversations.updateMany({
		where: { id: { in: rows.map((row) => row.id) } },
		data: { status: 'read_only', closed_at: at },
	});
	return rows;
}

/** Deletes read-only conversations closed before the cutoff (participants and messages cascade). */
export async function deleteClosedBefore(cutoff: Date, tx?: Tx): Promise<number> {
	const { count } = await (tx ?? prisma).conversations.deleteMany({
		where: { status: 'read_only', closed_at: { lt: cutoff } },
	});
	return count;
}

export type ConversationListRow = {
	id: string;
	status: string;
	other_report_id: string | null;
	my_role: ParticipantRole;
	activity_at: Date;
	last_body: string | null;
	short_code: string;
	type: string;
	species: string;
	source: string;
	other_type: string | null;
	other_source: string | null;
	thumb_url: string | null;
	unread: number;
	other_role: ParticipantRole | null;
	other_alias: string | null;
};

/**
 * The caller's conversations, latest activity (last message, else creation) first; keyset on (activity_at, id)
 * after the `cursor` conversation. The other participant is preferably one with a different role than the caller.
 */
export async function listConversations(user_id: string, cursor: string | null, take: number, tx?: Tx) {
	return (tx ?? prisma).$queryRaw<ConversationListRow[]>`
		with mine as (
			select c.id, c.status, c.about_report_id, c.other_report_id, p.role as my_role, p.last_read_at,
				coalesce(last.created_at, c.created_at) as activity_at, last.body as last_body
			from app.conversation_participants p
			join app.conversations c on c.id = p.conversation_id
			left join lateral (
				select m.created_at, m.body from app.messages m where m.conversation_id = c.id
				order by m.created_at desc, m.id desc limit 1
			) last on true
			where p.user_id = ${user_id}::uuid
		)
		select mine.id, mine.status, mine.other_report_id, mine.my_role, mine.activity_at, mine.last_body,
			r.short_code, r.type::text as type, r.species::text as species, r.source::text as source,
			o.type::text as other_type, o.source::text as other_source,
			(select ph.public_thumb_url from app.photos ph
				where ph.report_id = r.id and ph.public_thumb_url is not null
				order by ph.position, ph.id limit 1) as thumb_url,
			(select count(*)::int from app.messages m
				where m.conversation_id = mine.id and m.sender_id is distinct from ${user_id}::uuid
					and (mine.last_read_at is null or m.created_at > mine.last_read_at)) as unread,
			op.role as other_role, op.alias as other_alias
		from mine
		join app.reports r on r.id = mine.about_report_id
		left join app.reports o on o.id = mine.other_report_id
		left join lateral (
			select q.role, q.alias from app.conversation_participants q
			where q.conversation_id = mine.id and q.user_id <> ${user_id}::uuid
			order by (q.role = mine.my_role), q.user_id limit 1
		) op on true
		where ${cursor}::uuid is null
			or (mine.activity_at, mine.id) < (select x.activity_at, x.id from mine x where x.id = ${cursor}::uuid)
		order by mine.activity_at desc, mine.id desc
		limit ${take}`;
}

export default {
	findReportByCode,
	findReportSides,
	findManagers,
	isManager,
	findMatch,
	lockKey,
	findByMatch,
	findContact,
	createConversation,
	findConversation,
	isBlockedBy,
	upsertBlock,
	insertMessage,
	findMessage,
	listMessages,
	latestMessageId,
	unreadCount,
	setLastRead,
	markReadOnly,
	deleteClosedBefore,
	listConversations,
};
