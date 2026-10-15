// Prisma access for matching (C8). Candidate pairs are parameterised $queryRaw (TypedSQL needs a live database at build
// time, CH-117) over the GiST indexes on reports.exact_point and reports.public_point.
import { Prisma } from '../../generated/client.ts';
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
 * it is and returns null (never resurrected).
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
		insert into app.matches as m (id, lost_report_id, other_report_id, score, strength, chip_match, reasons, updated_at)
		values (gen_random_uuid(), ${row.lost_report_id}::uuid, ${row.other_report_id}::uuid, ${row.score},
			${row.strength}, ${row.chip_match}, ${JSON.stringify(row.reasons)}::jsonb, ${row.now})
		on conflict (lost_report_id, other_report_id) do update
			set score = excluded.score, strength = excluded.strength, chip_match = excluded.chip_match,
				reasons = excluded.reasons, updated_at = excluded.updated_at
			where m.state = 'suggested'
		returning m.id, m.notified_at`;
	return match ?? null;
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

export default {
	notificationData,
	candidatePairs,
	activeMatches,
	upsertSuggestion,
	claimNotification,
	setFirstMatchAt,
	managerIds,
};
