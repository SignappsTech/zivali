// Prisma access for matching (C8): the engine and the managers' review. Candidate pairs are parameterised $queryRaw
// (TypedSQL needs a live database at build time, CH-117) over the GiST indexes on reports.exact_point and public_point.
import { MATCH_ALGO_VERSION } from '@zivali/validation/matching';

import { Prisma } from '../../generated/client.ts';
import type { MATCH_STATE } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';

/** One lost report and one found or sighted report, with what scoreMatch needs. */
export type PairRow = {
	lost_id: string;
	other_id: string;
	other_type: 'found' | 'sighted';
	chip_match: boolean;
	distance_km: number;
	delta_hours: number;
	lost_size: string | null;
	lost_sex: string | null;
	lost_colours: string[];
	lost_pattern: string | null;
	other_size: string | null;
	other_sex: string | null;
	other_colours: string[];
	other_pattern: string | null;
};

// The lost side's stored point against the other side's public circle centre: the lost report's managers see the
// distance band, and for them the other report's stored point must stay private (CH-148).
const PAIR_COLUMNS = Prisma.sql`
	l.id as lost_id, o.id as other_id, o.type::text as other_type,
	(l.chip_status = 'valid' and o.chip_status = 'valid' and l.chip_number = o.chip_number) as chip_match,
	extensions.st_distance(l.exact_point, o.public_point) / 1000 as distance_km,
	(extract(epoch from o.event_at - l.event_at) / 3600)::float8 as delta_hours,
	l.size::text as lost_size, l.sex::text as lost_sex, l.colours::text[] as lost_colours, l.pattern::text as lost_pattern,
	o.size::text as other_size, o.sex::text as other_sex, o.colours::text[] as other_colours,
	o.pattern::text as other_pattern`;

// Both sides open or matched, visible or held for an organisation, and never a pair a manager rejected.
const ELIGIBLE = Prisma.sql`
	l.type = 'lost' and o.type in ('found', 'sighted')
	and l.status in ('open', 'matched') and o.status in ('open', 'matched')
	and (l.moderation_state = 'visible' or (l.moderation_state = 'held' and l.source = 'organisation'))
	and (o.moderation_state = 'visible' or (o.moderation_state = 'held' and o.source = 'organisation'))
	and not exists (select 1 from app.matches m
		where m.lost_report_id = l.id and m.other_report_id = o.id and m.state = 'rejected')`;

const CHIP = Prisma.sql`l.chip_status = 'valid' and o.chip_status = 'valid' and l.chip_number = o.chip_number`;

/**
 * Every eligible pair for one report, whichever side it is on: equal valid chips anywhere, or the same species within
 * maxKm, seen between 12 h before the loss and maxDays after it, without a sex conflict (both known and different).
 */
export async function candidatePairs(
	reportId: string,
	limits: { max_distance_km: number; max_days: number },
	tx?: Prisma.TransactionClient
): Promise<PairRow[]> {
	const geo = Prisma.sql`
		l.species = o.species
		and extensions.st_dwithin(l.exact_point, o.public_point, ${limits.max_distance_km * 1000})
		and o.event_at between l.event_at - interval '12 hours' and l.event_at + make_interval(days => ${limits.max_days}::int)
		and (l.sex is null or o.sex is null or l.sex = 'unknown' or o.sex = 'unknown' or l.sex = o.sex)`;
	// One branch per anchor side and join, so each fixes one row by primary key and probes the other side's index.
	const branches = [Prisma.sql`l.id = ${reportId}::uuid`, Prisma.sql`o.id = ${reportId}::uuid`].flatMap((anchor) =>
		[geo, CHIP].map(
			(join) => Prisma.sql`
				select ${PAIR_COLUMNS} from app.reports l join app.reports o on ${join} where ${anchor} and ${ELIGIBLE}`
		)
	);
	return (tx ?? prisma).$queryRaw<PairRow[]>(Prisma.join(branches, ' union '));
}

/** Suggested and confirmed matches of these lost reports (they count towards the top N). */
export async function activeMatches(
	lostIds: string[],
	tx?: Prisma.TransactionClient
): Promise<{ lost_report_id: string; other_report_id: string; score: number }[]> {
	const rows = await (tx ?? prisma).matches.findMany({
		where: { lost_report_id: { in: lostIds }, state: { in: ['suggested', 'confirmed'] } },
		select: { lost_report_id: true, other_report_id: true, score: true },
	});
	return rows.map((row) => ({ ...row, score: row.score.toNumber() }));
}

/**
 * Inserts the suggestion or refreshes it while it is still suggested; a rejected, confirmed or closed pair is left as
 * it is and returns null (never resurrected). Either way the row is stamped with today's MATCH_ALGO_VERSION.
 */
export async function upsertSuggestion(
	row: {
		lost_report_id: string;
		other_report_id: string;
		score: number;
		strength: string;
		chip_match: boolean;
		reasons: object[];
		now: Date;
	},
	tx?: Prisma.TransactionClient
): Promise<{ id: string; notified_at: Date | null } | null> {
	const [match] = await (tx ?? prisma).$queryRaw<{ id: string; notified_at: Date | null }[]>`
		insert into app.matches as m
			(id, lost_report_id, other_report_id, score, strength, chip_match, reasons, algo_version, updated_at)
		values (gen_random_uuid(), ${row.lost_report_id}::uuid, ${row.other_report_id}::uuid, ${row.score},
			${row.strength}, ${row.chip_match}, ${JSON.stringify(row.reasons)}::jsonb, ${MATCH_ALGO_VERSION}, ${row.now})
		on conflict (lost_report_id, other_report_id) do update
			set score = excluded.score, strength = excluded.strength, chip_match = excluded.chip_match,
				reasons = excluded.reasons, algo_version = excluded.algo_version, updated_at = excluded.updated_at
			where m.state = 'suggested'
		returning m.id, m.notified_at`;
	return match ?? null;
}

export type SuggestedPair = PairRow & { match_id: string; score: number; strength: string; algo_version: string };

/**
 * Stored suggestions without a chip, with what scoreMatch needs today: those of one report (either side), or every
 * one scored by an older algorithm version.
 */
export async function suggestedPairs(
	only: { report_id: string } | { older: true },
	tx?: Prisma.TransactionClient
): Promise<SuggestedPair[]> {
	const which =
		'report_id' in only
			? Prisma.sql`(m.lost_report_id = ${only.report_id}::uuid or m.other_report_id = ${only.report_id}::uuid)`
			: Prisma.sql`m.algo_version <> ${MATCH_ALGO_VERSION}`;
	return (tx ?? prisma).$queryRaw`
		select m.id as match_id, m.score::float8 as score, m.strength, m.algo_version, ${PAIR_COLUMNS}
		from app.matches m join app.reports l on l.id = m.lost_report_id join app.reports o on o.id = m.other_report_id
		where m.state = 'suggested' and not m.chip_match and ${which}`;
}

/** New score of a suggestion still suggested (a pair confirmed or rejected meanwhile keeps its row). */
export async function rescoreSuggestion(
	id: string,
	data: { score: number; strength: string; chip_match: boolean; reasons: Prisma.InputJsonValue },
	tx?: Prisma.TransactionClient
): Promise<void> {
	await (tx ?? prisma).matches.updateMany({
		where: { id, state: 'suggested' },
		data: { ...data, algo_version: MATCH_ALGO_VERSION },
	});
}

/** Deletes suggestions still suggested, so match.report may store the pair again once it passes. */
export async function removeSuggestions(ids: string[], tx?: Prisma.TransactionClient): Promise<void> {
	if (ids.length) await (tx ?? prisma).matches.deleteMany({ where: { id: { in: ids }, state: 'suggested' } });
}

/** Marks the match notified; false when another run already did (notify once). */
export async function claimNotification(id: string, now: Date, tx?: Prisma.TransactionClient): Promise<boolean> {
	const { count } = await (tx ?? prisma).matches.updateMany({
		where: { id, notified_at: null },
		data: { notified_at: now },
	});
	return count === 1;
}

export async function setFirstMatchAt(reportId: string, now: Date, tx?: Prisma.TransactionClient): Promise<void> {
	await (tx ?? prisma).reports.updateMany({
		where: { id: reportId, first_match_at: null },
		data: { first_match_at: now },
	});
}

/** The open or matched report of the photo, when the photo has a vector for the model (C8 §Visual similarity 5). */
export async function embeddedReport(
	photoId: string,
	model: string,
	tx?: Prisma.TransactionClient
): Promise<string | null> {
	const photo = await (tx ?? prisma).photos.findFirst({
		where: { id: photoId, report: { status: { in: ['open', 'matched'] } }, embeddings: { some: { model } } },
		select: { report_id: true },
	});
	return photo?.report_id ?? null;
}

export async function managerIds(reportId: string, tx?: Prisma.TransactionClient): Promise<string[]> {
	const rows = await (tx ?? prisma).report_managers.findMany({
		where: { report_id: reportId },
		select: { user_id: true },
	});
	return rows.map((row) => row.user_id);
}

/**
 * What a match notification needs, for one manager of the lost report (null when the match is not open, the manager is
 * not one, or a report is gone or closed). Codes, type, species and the lost pet's name only: no points, no chip number.
 */
export async function notificationData(matchId: string, reportId: string, userId: string) {
	const match = await prisma.matches.findUnique({
		where: { id: matchId },
		select: { lost_report_id: true, other_report_id: true, strength: true, state: true },
	});
	if (!match || match.lost_report_id !== reportId || !['suggested', 'confirmed'].includes(match.state)) return null;
	const [lost, other, manager] = await Promise.all([
		prisma.reports.findUnique({
			where: { id: match.lost_report_id },
			select: { short_code: true, species: true, name: true, status: true },
		}),
		prisma.reports.findUnique({
			where: { id: match.other_report_id },
			select: { short_code: true, type: true, status: true },
		}),
		prisma.report_managers.findFirst({
			where: { report_id: reportId, user_id: userId },
			select: { user_id: true },
		}),
	]);
	const live = (r: { status: string } | null) => r && ['open', 'matched'].includes(r.status);
	if (!live(lost) || !live(other) || !manager) return null;
	return { match, lost: lost!, other: other! };
}

/**
 * What match_confirmed needs, for one manager of the other report (null unless the match is confirmed with this
 * conversation, the recipient manages the other report and it is still open or matched).
 */
export async function confirmedData(matchId: string, conversationId: string, userId: string) {
	const match = await prisma.matches.findUnique({
		where: { id: matchId },
		select: {
			state: true,
			conversation: { select: { id: true } },
			other_report: {
				select: {
					short_code: true,
					type: true,
					species: true,
					status: true,
					managers: { where: { user_id: userId }, select: { user_id: true } },
				},
			},
		},
	});
	if (match?.state !== 'confirmed' || match.conversation?.id !== conversationId) return null;
	const other = match.other_report;
	if (!other.managers.length || !['open', 'matched'].includes(other.status)) return null;
	return other;
}

// --- Review (GET /v1/reports/:code/matches, confirm, reject) ---

/** The report and whether the user manages it (null for an unknown code). */
export async function findReportForManager(short_code: string, user_id: string, tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).reports.findUnique({
		where: { short_code },
		select: { id: true, managers: { where: { user_id }, select: { user_id: true } } },
	});
}

/** Matches of one lost report in these states, best score first (ties: oldest first). */
export async function listForLost(lost_report_id: string, states: MATCH_STATE[], tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).matches.findMany({
		where: { lost_report_id, state: { in: states } },
		orderBy: [{ score: 'desc' }, { created_at: 'asc' }, { id: 'asc' }],
		select: {
			id: true,
			score: true,
			strength: true,
			chip_match: true,
			reasons: true,
			state: true,
			other_report_id: true,
		},
	});
}
export type MatchRow = Awaited<ReturnType<typeof listForLost>>[number];

/** The match row-locked until the transaction ends (one verdict at a time), with the lost report's code. */
export async function lockMatch(id: string, tx: Prisma.TransactionClient) {
	await tx.$executeRaw`select 1 from app.matches where id = ${id}::uuid for update`;
	return tx.matches.findUnique({
		where: { id },
		select: {
			id: true,
			state: true,
			lost_report_id: true,
			other_report_id: true,
			lost_report: { select: { short_code: true } },
		},
	});
}

export async function isManager(report_id: string, user_id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
	const row = await (tx ?? prisma).report_managers.findUnique({
		where: { report_id_user_id: { report_id, user_id } },
		select: { user_id: true },
	});
	return row !== null;
}

export async function setState(
	id: string,
	data: { state: 'confirmed' } | { state: 'rejected'; rejected_reason: string | null },
	tx?: Prisma.TransactionClient
): Promise<void> {
	await (tx ?? prisma).matches.update({ where: { id }, data, select: { id: true } });
}

/** One verdict per manager per match (the latest wins). */
export async function saveFeedback(
	row: { match_id: string; user_id: string; verdict: 'confirm' | 'reject'; reason: string | null },
	tx?: Prisma.TransactionClient
): Promise<void> {
	const { match_id, user_id, verdict, reason } = row;
	await (tx ?? prisma).match_feedback.upsert({
		where: { match_id_user_id: { match_id, user_id } },
		create: row,
		update: { verdict, reason },
		select: { match_id: true },
	});
}

/** open → matched (a lost report already matched, closed or reunited keeps its status). */
export async function markMatched(report_id: string, tx?: Prisma.TransactionClient): Promise<void> {
	await (tx ?? prisma).reports.updateMany({ where: { id: report_id, status: 'open' }, data: { status: 'matched' } });
}

/** Closes the report's suggested and confirmed matches (either side); returns the other report of each confirmed one. */
export async function closeForReport(report_id: string, tx?: Prisma.TransactionClient): Promise<string[]> {
	const db = tx ?? prisma;
	const either = { OR: [{ lost_report_id: report_id }, { other_report_id: report_id }] };
	const confirmed = await db.matches.findMany({
		where: { ...either, state: 'confirmed' },
		select: { lost_report_id: true, other_report_id: true },
	});
	await db.matches.updateMany({
		where: { ...either, state: { in: ['suggested', 'confirmed'] } },
		data: { state: 'closed' },
	});
	return confirmed.map((m) => (m.lost_report_id === report_id ? m.other_report_id : m.lost_report_id));
}

export default {
	closeForReport,
	notificationData,
	confirmedData,
	findReportForManager,
	listForLost,
	lockMatch,
	isManager,
	setState,
	saveFeedback,
	markMatched,
	candidatePairs,
	activeMatches,
	upsertSuggestion,
	suggestedPairs,
	rescoreSuggestion,
	removeSuggestions,
	claimNotification,
	setFirstMatchAt,
	embeddedReport,
	managerIds,
};
