// Abuse reports (C11, FR-018). Anyone signed in, anonymous finders included, reports a listing, a message (only as a
// participant) or a profile, never their own listing or profile; a repeat by the same reporter returns the first
// report. Reports from accounts younger than 24 h weigh 0.5. When the open weight on a visible listing reaches
// abuse.auto_hide_threshold (3) the listing is hidden, flagged `auto_hidden`, its photos unpublished (photo.publish)
// and its managers get report_hidden; restoring it dismisses those reports. Nothing about the reporters (ids, notes,
// count per reporter) ever goes to the managers: the job carries the report id only.
// Staff (aal2, guarded in the routes) list reports and flags; each list writes an audit entry (C1).
import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import type { AbuseReportInput, AbuseReportResponse, AdminAbuseReportQuery, ModerationFlagQuery } from '@zivali/types';

import type { ABUSE_REASON } from '../../generated/enums.ts';
import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { NotificationsDomain } from '../notifications/index.ts';
import { AuditDao } from '../platform/index.ts';
import { ReportsDomain } from '../reports/index.ts';
import AbuseDao from './abuse.dao.ts';

const DAY_MS = 86_400_000;
const PAGE = 50;
const Threshold = z.number().positive().catch(3);

function inTransaction<T>(ctx: Ctx, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	return ctx.tx ? fn(ctx.tx) : prisma.$transaction(fn);
}

/** One page plus whether there is a next one: fetch one row more than asked. */
function pageOf<T extends { id: string }>(rows: T[], limit: number) {
	const items = rows.slice(0, limit);
	return { items, next_cursor: rows.length > limit ? items[items.length - 1]!.id : null };
}

/**
 * The target must exist (VALIDATION otherwise); a message only for a participant of its conversation, a listing or
 * profile only when it is not the reporter's own (FORBIDDEN).
 */
async function assertTarget(
	input: AbuseReportInput,
	reporter_id: string,
	listing: { moderation_state: string } | null,
	tx: Prisma.TransactionClient
): Promise<void> {
	const { target_type, target_id } = input;
	if (target_type === 'message') {
		if (!(await AbuseDao.isParticipant(target_id, reporter_id, tx)))
			throw new AppError('FORBIDDEN', 'Only participants can report a message');
		return;
	}
	const exists = target_type === 'report' ? listing !== null : await AbuseDao.profileExists(target_id, tx);
	if (!exists)
		throw new AppError('VALIDATION', 'Unknown target', undefined, [{ path: 'target_id', message: 'Not found' }]);
	const own =
		target_type === 'report' ? await AbuseDao.isManager(target_id, reporter_id, tx) : target_id === reporter_id;
	if (own) throw new AppError('FORBIDDEN', 'You cannot report your own listing or profile');
}

/** Hides the (locked, visible) listing once its open weight reaches the threshold. */
async function autoHide(report_id: string, ctx: Ctx, tx: Prisma.TransactionClient): Promise<void> {
	const threshold = Threshold.parse(await configStore.get('abuse.auto_hide_threshold'));
	const weight = await AbuseDao.openWeight('report', report_id, tx);
	if (weight < threshold) return;
	await AbuseDao.hideReport(report_id, tx);
	await AbuseDao.insertFlag(
		{ kind: 'auto_hidden', target_type: 'report', target_id: report_id, details: { weight, threshold } },
		tx
	);
	await ReportsDomain.queuePhotoPublish({ report_id }, { ...ctx, tx });
	const payload = { template: 'report_hidden', report_id } as const;
	for (const user_id of await AbuseDao.managerIds(report_id, tx))
		await NotificationsDomain.enqueueNotification({ user_id, type: 'report_hidden', payload }, { ...ctx, tx });
}

/** POST /v1/abuse-reports. `duplicate: true` with the first report's id when the caller already reported the target. */
export async function reportAbuse(input: AbuseReportInput, ctx: Ctx): Promise<AbuseReportResponse> {
	const actor = ctx.actor;
	if (!actor) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	const { target_type, target_id, reason, note } = input;
	const target = { reporter_id: actor.user_id, target_type, target_id };
	return inTransaction(ctx, async (tx) => {
		const listing = target_type === 'report' ? await AbuseDao.lockReport(target_id, tx) : null;
		await assertTarget(input, actor.user_id, listing, tx);
		const existing = await AbuseDao.findOwn(target, tx);
		if (existing) return { id: existing, duplicate: true };

		const created_at = await AbuseDao.accountCreatedAt(actor.user_id, tx);
		const weight = created_at && ctx.now.getTime() - created_at.getTime() >= DAY_MS ? 1 : 0.5;
		const id = randomUUID();
		const row = { ...target, id, reason: reason.toUpperCase() as ABUSE_REASON, note: note ?? null, weight };
		if (!(await AbuseDao.insertReport(row, tx)))
			return { id: (await AbuseDao.findOwn(target, tx))!, duplicate: true };

		if (listing?.moderation_state === 'visible') await autoHide(target_id, ctx, tx);
		return { id, duplicate: false };
	});
}

const actorId = (ctx: Ctx) => ctx.actor?.user_id ?? null;

/**
 * Moderation restores an auto-hidden listing (hidden → visible; called by the moderation actions with a moderator
 * or system ctx): its open reports are dismissed and its auto_hidden flag resolved, so the weight starts again from
 * 0 and the next report does not hide it at once; photo.publish brings its photos back. CONFLICT when not hidden.
 */
export async function restoreReport(input: { id: string; note?: string }, ctx: Ctx): Promise<{ dismissed: number }> {
	if (ctx.actor && ctx.actor.role !== 'MODERATOR' && ctx.actor.role !== 'ADMIN')
		throw new AppError('FORBIDDEN', 'Not allowed');
	return inTransaction(ctx, async (tx) => {
		if (!(await AbuseDao.unhideReport(input.id, tx))) throw new AppError('CONFLICT', 'Report is not hidden');
		const target = { target_type: 'report', target_id: input.id };
		const dismissed = await AbuseDao.dismissOpen(target.target_type, target.target_id, tx);
		await AbuseDao.resolveFlags({ kind: 'auto_hidden', ...target }, ctx.now, tx);
		await ReportsDomain.queuePhotoPublish({ report_id: input.id }, { ...ctx, tx });
		await AuditDao.write(tx, {
			actor_id: actorId(ctx),
			action: 'report.restore',
			...target,
			diff: { from: 'hidden', to: 'visible', dismissed },
			note: input.note,
		});
		return { dismissed };
	});
}

/** Each item with the short code of the listing behind its target (null for profiles and pets), for the links. */
async function withCodes<T extends { target_type: string; target_id: string }>(items: T[], ctx: Ctx) {
	const codes = await AbuseDao.targetCodes(items, ctx.tx);
	return items.map((item) => ({ ...item, target_code: codes.get(item.target_id) ?? null }));
}

export async function listAbuseReports(input: AdminAbuseReportQuery, ctx: Ctx) {
	const { cursor, limit = PAGE, ...filters } = input;
	const rows = await AbuseDao.listReports({ ...filters, cursor, take: limit + 1 }, ctx.tx);
	await AuditDao.write(ctx.tx, {
		actor_id: actorId(ctx),
		action: 'admin.abuse_reports.list',
		target_type: 'abuse_report',
		diff: { filters },
	});
	const page = pageOf(rows, limit);
	return { ...page, items: await withCodes(page.items, ctx) };
}

export async function listModerationFlags(input: ModerationFlagQuery, ctx: Ctx) {
	const limit = input.limit ?? PAGE;
	const rows = await AbuseDao.listFlags({ cursor: input.cursor, take: limit + 1 }, ctx.tx);
	await AuditDao.write(ctx.tx, {
		actor_id: actorId(ctx),
		action: 'admin.moderation_flags.list',
		target_type: 'moderation_flag',
	});
	const page = pageOf(rows, limit);
	return { ...page, items: await withCodes(page.items, ctx) };
}

export default { reportAbuse, restoreReport, listAbuseReports, listModerationFlags };
