// Prisma access for the retention.purge windows no other area owns (data-inventory.json), in batches (lib/purge.ts),
// and the idle anonymous accounts.
import { Prisma } from '../../generated/client.ts';
import { purgeWhere } from '../../lib/purge.ts';
import { prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

export const purgeEmailOutbox = (before: Date, tx?: Tx) =>
	purgeWhere(Prisma.sql`app.email_outbox`, Prisma.sql`created_at < ${before}`, tx);

export const purgePartnerStats = (before: Date, tx?: Tx) =>
	purgeWhere(Prisma.sql`app.partner_stats_snapshot`, Prisma.sql`generated_at < ${before}`, tx);

export const purgeLeads = (before: Date, tx?: Tx) =>
	purgeWhere(Prisma.sql`app.leads`, Prisma.sql`created_at < ${before}`, tx);

/** Open and closed alike: privacy policy §14 keeps abuse reports up to 24 months. */
export const purgeAbuseReports = (before: Date, tx?: Tx) =>
	purgeWhere(Prisma.sql`app.abuse_reports`, Prisma.sql`created_at < ${before}`, tx);

/** Resolved before the cutoff, and flags of a report that is gone, open ones too ("delete with the target"). */
export const purgeModerationFlags = (resolvedBefore: Date, tx?: Tx) =>
	purgeWhere(
		Prisma.sql`app.moderation_flags`,
		Prisma.sql`(resolved_at < ${resolvedBefore}
			or (target_type = 'report' and not exists (select 1 from app.reports r where r.id = moderation_flags.target_id)))`,
		tx
	);

/**
 * Reports closed or reunited before `endedBefore` that no conversation refers to any more (each chat goes first, at
 * its own window). Matches, alert deliveries, managers and contacts cascade; photos and sightings are detached.
 */
export const purgeReports = (endedBefore: Date, tx?: Tx) =>
	purgeWhere(
		Prisma.sql`app.reports`,
		Prisma.sql`((status = 'closed' and closed_at < ${endedBefore}) or (status = 'reunited' and reunited_at < ${endedBefore}))
			and not exists (
				select 1 from app.conversations c
				where reports.id in (c.lost_report_id, c.other_report_id, c.about_report_id))`,
		tx
	);

/**
 * An anonymous account idle since before `before` (privacy policy §14, ADR-005): created before it; no report it made
 * or manages is open, or ended after it (the finder's private link works until close, C7); it is in no chat (read
 * only for 6 months after closing, C9: the account waits for the chat purge); it has no open abuse report as reporter
 * (closed ones go with it); and Supabase Auth does not say it was converted to a full account (no auth user left is
 * a retry after a crash).
 */
const idleAnonymous = (before: Date) => Prisma.sql`profiles.is_anonymous and profiles.created_at < ${before}
	and not exists (select 1 from app.conversation_participants cp where cp.user_id = profiles.id)
	and not exists (
		select 1 from app.reports r
		where (r.created_by = profiles.id
			or exists (select 1 from app.report_managers m where m.report_id = r.id and m.user_id = profiles.id))
		and not ((r.status = 'closed' and r.closed_at < ${before}) or (r.status = 'reunited' and r.reunited_at < ${before})))
	and not exists (select 1 from app.abuse_reports a where a.reporter_id = profiles.id and a.status = 'open')
	and not exists (select 1 from auth.users u where u.id = profiles.id and u.is_anonymous is not true)`;

/**
 * Locks up to `limit` idle anonymous accounts (not in `skip`, and skipping rows a request holds) and returns those
 * still idle once locked: the first statement's snapshot predates its locks, and the locks keep new reports, chats and
 * photos off these accounts until commit.
 */
export async function lockIdleAnonymous(before: Date, limit: number, skip: string[], tx: Tx): Promise<string[]> {
	const locked = await tx.$queryRaw<{ id: string }[]>`
		select id from app.profiles where ${idleAnonymous(before)} and not (id = any(${skip}::uuid[]))
		order by created_at limit ${limit} for update skip locked`;
	if (!locked.length) return [];
	const ids = locked.map((r) => r.id);
	const idle = await tx.$queryRaw<{ id: string }[]>`
		select id from app.profiles where id = any(${ids}::uuid[]) and ${idleAnonymous(before)}`;
	return idle.map((r) => r.id);
}

/** The photos of accounts about to go, returned for their storage deletes (the profile cascade would orphan them). */
export const removeOwnedPhotos = (ownerIds: string[], tx: Tx) =>
	tx.$queryRaw<
		{
			id: string;
			owner_id: string;
			report_id: string | null;
			public_display_url: string | null;
			public_thumb_url: string | null;
		}[]
	>`
		delete from app.photos where owner_id = any(${ownerIds}::uuid[])
		returning id, owner_id, report_id, public_display_url, public_thumb_url`;

/** Their reports stay (created_by is set null); managers, alerts, notifications and the rest cascade. */
export const deleteProfiles = async (ids: string[], tx: Tx) =>
	(await tx.profiles.deleteMany({ where: { id: { in: ids } } })).count;

/**
 * Anonymous Supabase Auth users created before `before` that never got a profile (it is created on the first
 * authenticated request, C3), so nothing of theirs is in `app`.
 */
const profilelessAnonymous = (before: Date) => Prisma.sql`u.is_anonymous and u.created_at < ${before}
	and not exists (select 1 from app.profiles p where p.id = u.id)`;

export const listProfilelessAnonymous = async (before: Date, limit: number, skip: string[], tx?: Tx) =>
	(
		await (tx ?? prisma).$queryRaw<{ id: string }[]>`
			select u.id::text as id from auth.users u
			where ${profilelessAnonymous(before)} and not (u.id = any(${skip}::uuid[]))
			order by u.created_at limit ${limit}`
	).map((r) => r.id);

export const countProfilelessAnonymous = async (before: Date, tx?: Tx) =>
	(
		await (tx ?? prisma).$queryRaw<{ n: number }[]>`
			select count(*)::int as n from auth.users u where ${profilelessAnonymous(before)}`
	)[0]!.n;

export default {
	purgeEmailOutbox,
	purgePartnerStats,
	purgeLeads,
	purgeAbuseReports,
	purgeModerationFlags,
	purgeReports,
	lockIdleAnonymous,
	removeOwnedPhotos,
	deleteProfiles,
	listProfilelessAnonymous,
	countProfilelessAnonymous,
};
