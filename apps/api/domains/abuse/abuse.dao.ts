// Prisma access for abuse reports and moderation flags (C11), and the report rows the auto-hide touches. Staff lists
// are keyset-paginated on (created_at desc, id desc); the cursor is the last item's id.
import type { abuse_reports, moderation_flags, Prisma } from '../../generated/client.ts';
import type { ABUSE_REASON } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

/** When the account was created: auth.users.created_at (the profile may come later, on the first request). */
export async function accountCreatedAt(user_id: string, tx?: Tx): Promise<Date | null> {
	const db = tx ?? prisma;
	const [row] = await db.$queryRaw<{ created_at: Date }[]>`
		select coalesce(u.created_at, p.created_at) as created_at
		from app.profiles p left join auth.users u on u.id = p.id
		where p.id = ${user_id}::uuid`;
	return row?.created_at ?? null;
}

export async function isParticipant(message_id: string, user_id: string, tx?: Tx): Promise<boolean> {
	const db = tx ?? prisma;
	const row = await db.messages.findFirst({
		where: { id: message_id, conversation: { participants: { some: { user_id } } } },
		select: { id: true },
	});
	return row !== null;
}

export async function profileExists(id: string, tx?: Tx): Promise<boolean> {
	const db = tx ?? prisma;
	return (await db.profiles.findUnique({ where: { id }, select: { id: true } })) !== null;
}

/** Any manager role (owner, finder, staff) counts: nobody reports a listing they run. */
export async function isManager(report_id: string, user_id: string, tx?: Tx): Promise<boolean> {
	const db = tx ?? prisma;
	const row = await db.report_managers.findUnique({
		where: { report_id_user_id: { report_id, user_id } },
		select: { user_id: true },
	});
	return row !== null;
}

/** Locks the reported listing until the transaction ends, so concurrent reports are summed (and hide it) once. */
export async function lockReport(id: string, tx: Tx): Promise<{ moderation_state: string } | null> {
	const [row] = await tx.$queryRaw<{ moderation_state: string }[]>`
		select moderation_state::text as moderation_state from app.reports where id = ${id}::uuid for update`;
	return row ?? null;
}

type Target = { reporter_id: string; target_type: string; target_id: string };

export async function findOwn(target: Target, tx?: Tx): Promise<string | null> {
	const db = tx ?? prisma;
	const row = await db.abuse_reports.findUnique({
		where: { reporter_id_target_type_target_id: target },
		select: { id: true },
	});
	return row?.id ?? null;
}

/** false when the reporter already reported the target (a concurrent request won the unique key). */
export async function insertReport(
	row: Target & { id: string; reason: ABUSE_REASON; note: string | null; weight: number },
	tx?: Tx
): Promise<boolean> {
	const db = tx ?? prisma;
	const { count } = await db.abuse_reports.createMany({ data: [row], skipDuplicates: true });
	return count === 1;
}

/** Sum of the weights of the open reports on a target. */
export async function openWeight(target_type: string, target_id: string, tx?: Tx): Promise<number> {
	const db = tx ?? prisma;
	const { _sum } = await db.abuse_reports.aggregate({
		where: { target_type, target_id, status: 'open' },
		_sum: { weight: true },
	});
	return Number(_sum.weight ?? 0);
}

export async function hideReport(id: string, tx?: Tx): Promise<void> {
	const db = tx ?? prisma;
	await db.reports.update({ where: { id }, data: { moderation_state: 'hidden' }, select: { id: true } });
}

/** hidden → visible; false when the report is missing or not hidden. */
export async function unhideReport(id: string, tx?: Tx): Promise<boolean> {
	const db = tx ?? prisma;
	const { count } = await db.reports.updateMany({
		where: { id, moderation_state: 'hidden' },
		data: { moderation_state: 'visible' },
	});
	return count === 1;
}

/** Open reports on a target → dismissed; how many. */
export async function dismissOpen(target_type: string, target_id: string, tx?: Tx): Promise<number> {
	const db = tx ?? prisma;
	const { count } = await db.abuse_reports.updateMany({
		where: { target_type, target_id, status: 'open' },
		data: { status: 'dismissed' },
	});
	return count;
}

export async function resolveFlags(
	flag: { kind: string; target_type: string; target_id: string },
	at: Date,
	tx?: Tx
): Promise<void> {
	const db = tx ?? prisma;
	await db.moderation_flags.updateMany({ where: { ...flag, resolved_at: null }, data: { resolved_at: at } });
}

export async function managerIds(report_id: string, tx?: Tx): Promise<string[]> {
	const db = tx ?? prisma;
	const rows = await db.report_managers.findMany({ where: { report_id }, select: { user_id: true } });
	return rows.map((row) => row.user_id);
}

export async function insertFlag(
	flag: { kind: string; target_type: string; target_id: string; details: Prisma.InputJsonObject },
	tx?: Tx
): Promise<void> {
	const db = tx ?? prisma;
	await db.moderation_flags.create({ data: flag, select: { id: true } });
}

/** report_hidden variables: the report while it is still hidden and the recipient still manages it. */
export async function hiddenReport(report_id: string, user_id: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.reports.findFirst({
		where: { id: report_id, moderation_state: 'hidden', managers: { some: { user_id } } },
		select: { short_code: true, type: true },
	});
}

export async function listReports(
	input: { status?: string; target_type?: string; cursor?: string; take: number },
	tx?: Tx
): Promise<abuse_reports[]> {
	const db = tx ?? prisma;
	const { cursor, take, ...where } = input;
	return db.abuse_reports.findMany({
		where,
		orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
		take,
		...(cursor && { cursor: { id: cursor }, skip: 1 }),
	});
}

/**
 * Short code of the listing behind each target, by target id: the listing itself for `report`, the listing its
 * conversation is about for `message`. Other targets (profiles, pets) have none.
 */
export async function targetCodes(
	targets: { target_type: string; target_id: string }[],
	tx?: Tx
): Promise<Map<string, string>> {
	const db = tx ?? prisma;
	const ids = (type: string) => targets.filter((t) => t.target_type === type).map((t) => t.target_id);
	const [reports, messages] = await Promise.all([
		db.reports.findMany({ where: { id: { in: ids('report') } }, select: { id: true, short_code: true } }),
		db.messages.findMany({
			where: { id: { in: ids('message') } },
			select: { id: true, conversation: { select: { about_report: { select: { short_code: true } } } } },
		}),
	]);
	return new Map([
		...reports.map((r) => [r.id, r.short_code] as const),
		...messages.map((m) => [m.id, m.conversation.about_report.short_code] as const),
	]);
}

export async function listFlags(input: { cursor?: string; take: number }, tx?: Tx): Promise<moderation_flags[]> {
	const db = tx ?? prisma;
	return db.moderation_flags.findMany({
		orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
		take: input.take,
		...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
	});
}

export default {
	accountCreatedAt,
	isParticipant,
	profileExists,
	isManager,
	lockReport,
	findOwn,
	insertReport,
	openWeight,
	hideReport,
	unhideReport,
	dismissOpen,
	resolveFlags,
	managerIds,
	insertFlag,
	hiddenReport,
	listReports,
	targetCodes,
	listFlags,
};
