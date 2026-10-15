// Report lifecycle (C4 status machine, FR-012): POST /v1/reports/:code/transitions for managers (mark_reunited, close,
// reopen, extend), the hourly report.lifecycle job (LOST reminders, expiry warnings, automatic expiry) and the
// notify.send variables of the report_* notifications they send. Timings come from app_config lifecycle.* only.
// Pending nearby alerts need no cancelling: notify.send drops them once the report is no longer open or matched (C10).
import { z } from 'zod';

import type { CloseReason, Locale, NotificationType, ReportStatus, ReportTransitionAction } from '@zivali/types';

import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { ChatDomain } from '../chat/index.ts';
import { MatchingDomain } from '../matching/index.ts';
import { NotificationsDomain } from '../notifications/index.ts';
import type { Source } from '../notifications/sources.ts';
import { AuditDao } from '../platform/index.ts';
import ReportsDao, { type ExpiredRow } from './reports.dao.ts';
import { getReport, type ManagerView } from './reports.domain.ts';

const DAY_MS = 86_400_000;
/** Reports claimed per job transaction (backend.md: fan-outs in chunks of at most 500). */
const CHUNK = 100;
/** Each claimed report queues a notify.send per manager: more than the 5 s default on a loaded machine. */
const CHUNK_TX = { timeout: 60_000 };
/** Searching states: the ones a manager can close or mark reunited. */
const LIVE: ReportStatus[] = ['open', 'matched'];
/** Close reasons a manager may give; `expired` is the job's and `removed` moderation's. */
const MANAGER_REASONS: CloseReason[] = ['found_elsewhere', 'gave_up', 'returned_to_owner', 'other'];

const Days = z.number().int().positive();
/** app_config lifecycle.* (C4); a missing or malformed value falls back to the contract default. */
const LifecycleConfig = z.object({
	reminder_days: z.array(Days).min(1).catch([7, 14, 30]),
	lost_idle_days: Days.catch(90),
	found_idle_days: Days.catch(30),
	expiry_warning_days: Days.catch(7),
	reopen_days: Days.catch(7),
});
export type LifecycleConfig = z.infer<typeof LifecycleConfig>;

export async function lifecycleConfig(): Promise<LifecycleConfig> {
	const keys = Object.keys(LifecycleConfig.shape) as (keyof LifecycleConfig)[];
	const values = await Promise.all(keys.map((key) => configStore.get(`lifecycle.${key}`)));
	return LifecycleConfig.parse(Object.fromEntries(keys.map((key, i) => [key, values[i]])));
}

type TxCtx = Ctx & { tx: Prisma.TransactionClient };
type Report = NonNullable<Awaited<ReturnType<typeof ReportsDao.lockById>>>;

const seconds = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 1000);

function inTransaction<T>(ctx: Ctx, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	return ctx.tx ? fn(ctx.tx) : prisma.$transaction(fn);
}

const audit = (ctx: TxCtx, report_id: string, action: string, diff: Record<string, unknown>) =>
	AuditDao.write(ctx.tx, {
		actor_id: ctx.actor?.user_id ?? null,
		action: `report.${action}`,
		target_type: 'report',
		target_id: report_id,
		diff,
	});

/** Ids only in the job (C10): notify.send loads the copy variables with the sources below. */
async function notifyManagers(
	report_ids: string[],
	type: NotificationType,
	dedupe: (report_id: string) => string,
	ctx: TxCtx,
	except?: string
): Promise<void> {
	for (const { report_id, user_id } of await ReportsDao.listManagers(report_ids, ctx.tx)) {
		if (user_id === except) continue;
		await NotificationsDomain.enqueueNotification(
			{ user_id, type, payload: { template: type, report_id }, dedupe_key: dedupe(report_id) },
			ctx
		);
	}
}

// --- Transitions (POST /v1/reports/:code/transitions) ---

/**
 * reunited: reunited_at, boost stopped, its matches closed and its conversations read-only. The audit entry records
 * time to reunite and to the first match (seconds since creation) for the reunite-rate metric. Like close, it ends the
 * manage link and deletes the finder email. Returns the reports on the other side of its confirmed matches.
 */
async function markReunited(report: Report, ctx: TxCtx, via?: string): Promise<string[]> {
	await ReportsDao.updateReport(
		report.id,
		{ status: 'reunited', reunited_at: ctx.now, boosted_until: null, manage_token_hash: null },
		ctx.tx
	);
	await ReportsDao.deleteContacts([report.id], ctx.tx);
	const counterparts = await MatchingDomain.closeMatchesOf({ report_id: report.id }, ctx);
	await ChatDomain.closeForReport({ report_id: report.id }, ctx);
	await audit(ctx, report.id, 'mark_reunited', {
		from: report.status,
		time_to_reunite_s: seconds(report.created_at, ctx.now),
		time_to_first_match_s: report.first_match_at && seconds(report.created_at, report.first_match_at),
		...(via && { via_report_id: via }),
	});
	return counterparts;
}

/**
 * mark_reunited (C4): the report and, when it has exactly one confirmed match (the pair both sides know of, C8/C9),
 * the counterpart report while it is still searching. With several confirmed matches (an owner may confirm more than
 * one suggestion) it is unknown which one was the pet, so nothing on the other side is closed; those managers are only
 * notified. The counterpart's managers get report_reunited.
 */
async function reunite(report: Report, ctx: TxCtx): Promise<void> {
	const counterparts = [...new Set(await markReunited(report, ctx))];
	for (const id of counterparts) {
		if (counterparts.length === 1) {
			// skip locked: concurrent reunites from both sides must not deadlock (40P01)
			const other = await ReportsDao.lockById(id, ctx.tx, true);
			if (!other) continue;
			if (LIVE.includes(other.status) && other.moderation_state !== 'removed')
				await markReunited(other, ctx, report.id);
		}
		await notifyManagers(
			[id],
			'report_reunited',
			() => `reunited:${id}:${ctx.now.getTime()}`,
			ctx,
			ctx.actor?.user_id
		);
	}
}

/** close (C4): a manager's reason; the manage link ends (token cleared, finder email deleted), chats go read-only. */
async function close(report: Report, close_reason: CloseReason, ctx: TxCtx): Promise<void> {
	await ReportsDao.updateReport(
		report.id,
		{ status: 'closed', close_reason, closed_at: ctx.now, manage_token_hash: null },
		ctx.tx
	);
	await ReportsDao.deleteContacts([report.id], ctx.tx);
	await ChatDomain.closeForReport({ report_id: report.id }, ctx);
	await audit(ctx, report.id, 'close', { from: report.status, reason: close_reason });
}

/** reopen (C4): reunited or closed → open within lifecycle.reopen_days, later GONE; the idle timer starts again. */
async function reopen(report: Report, settings: LifecycleConfig, ctx: TxCtx): Promise<void> {
	const endedAt =
		report.status === 'closed' ? report.closed_at : report.status === 'reunited' ? report.reunited_at : null;
	if (!endedAt) throw new AppError('CONFLICT', `Report is ${report.status}`);
	if (ctx.now.getTime() - endedAt.getTime() > settings.reopen_days * DAY_MS)
		throw new AppError('GONE', 'Report can no longer be reopened', { reason: 'closed' });
	if (report.type === 'lost' && report.pet_id) {
		const open = await ReportsDao.findOpenLostByPet(report.pet_id, report.id, ctx.tx);
		if (open)
			throw new AppError('DUPLICATE_OPEN_REPORT', 'This pet already has an open lost report', {
				report_id: open.id,
				short_code: open.short_code,
			});
	}
	await ReportsDao.updateReport(
		report.id,
		{
			status: 'open',
			close_reason: null,
			closed_at: null,
			reunited_at: null,
			last_owner_update_at: ctx.now,
			expiry_warned_at: null,
		},
		ctx.tx
	);
	await audit(ctx, report.id, 'reopen', { from: report.status });
}

function invalidReason(message: string): AppError {
	return new AppError('VALIDATION', message, undefined, [{ path: 'reason', message }]);
}

/**
 * POST /v1/reports/:code/transitions (C4): managers only, anonymous manage-link holders included. close needs a
 * manager's reason, the other actions take none. extend works in any status and only resets the idle timer.
 * Removed reports are GONE; a transition the status does not allow is CONFLICT.
 */
export async function transitionReport(
	input: { code: string; action: ReportTransitionAction; reason?: CloseReason },
	ctx: Ctx
): Promise<ManagerView> {
	const actor = ctx.actor;
	if (!actor) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	const { code, action, reason } = input;
	if (action !== 'close' && reason !== undefined) throw invalidReason('Only close takes a reason');
	if (action === 'close' && !MANAGER_REASONS.includes(reason!)) throw invalidReason('Choose why the report closes');
	const settings = await lifecycleConfig();

	await inTransaction(ctx, async (tx) => {
		const found = await ReportsDao.lockWithRole(code, actor.user_id, tx);
		if (!found) throw new AppError('NOT_FOUND', 'Report not found');
		if (!found.role) throw new AppError('FORBIDDEN', 'Not a manager of this report');
		const { report } = found;
		if (report.moderation_state === 'removed')
			throw new AppError('GONE', 'Report is no longer available', { reason: 'removed' });
		const txCtx = { ...ctx, tx };
		if (action === 'extend') return ReportsDao.updateReport(report.id, { last_owner_update_at: ctx.now }, tx);
		if (action === 'reopen') return reopen(report, settings, txCtx);
		if (!LIVE.includes(report.status)) throw new AppError('CONFLICT', `Report is already ${report.status}`);
		return action === 'close' ? close(report, reason!, txCtx) : reunite(report, txCtx);
	});
	return (await getReport({ code }, ctx)) as ManagerView;
}

// --- report.lifecycle (hourly) ---

/** Claims reports in transactions of up to CHUNK, each followed by `then` in the same transaction, until none are left. */
async function inChunks<T>(
	claim: (tx: Prisma.TransactionClient) => Promise<T[]>,
	then: (rows: T[], ctx: TxCtx) => Promise<void>,
	ctx: Ctx
): Promise<T[]> {
	const all: T[] = [];
	for (;;) {
		const rows = await prisma.$transaction(async (tx) => {
			const batch = await claim(tx);
			if (batch.length) await then(batch, { ...ctx, tx });
			return batch;
		}, CHUNK_TX);
		all.push(...rows);
		if (rows.length < CHUNK) return all;
	}
}

const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

/** report_closed copy for an expired report; null once it can no longer be reopened. */
function closedCopy(
	report: Pick<ExpiredRow, 'short_code' | 'type' | 'species' | 'name' | 'last_owner_update_at' | 'closed_at'>,
	settings: LifecycleConfig,
	now: Date
) {
	const reopenUntil = report.closed_at.getTime() + settings.reopen_days * DAY_MS;
	const reopen_days = Math.ceil((reopenUntil - now.getTime()) / DAY_MS);
	if (reopen_days < 1) return null;
	return {
		report_code: report.short_code,
		report_type: report.type,
		idle_days: Math.floor((report.closed_at.getTime() - report.last_owner_update_at.getTime()) / DAY_MS),
		reopen_days,
		pet_name: report.name,
		species: report.species,
	};
}

/**
 * C4 `expire`: open or matched LOST reports idle lost_idle_days, open or matched FOUND and SIGHTED ones (not organisation intakes) idle
 * found_idle_days close as expired, like a manager's close (token cleared, finder email deleted, chats read-only).
 * Managers get report_closed; the finder email on file gets it once, after the commit (transactional, C10).
 */
async function expire(settings: LifecycleConfig, ctx: Ctx): Promise<number> {
	const cutoffs = {
		lostBefore: new Date(ctx.now.getTime() - settings.lost_idle_days * DAY_MS),
		foundBefore: new Date(ctx.now.getTime() - settings.found_idle_days * DAY_MS),
		now: ctx.now,
		take: CHUNK,
	};
	const expired = await inChunks(
		(tx) => ReportsDao.expireIdle(cutoffs, tx),
		async (rows, txCtx) => {
			await ReportsDao.deleteContacts(ids(rows), txCtx.tx);
			for (const row of rows) {
				await ChatDomain.closeForReport({ report_id: row.id }, txCtx);
				await audit(txCtx, row.id, 'expire', { from: row.from_status, reason: 'expired' });
			}
			await notifyManagers(ids(rows), 'report_closed', (id) => `closed:${id}:${ctx.now.getTime()}`, txCtx);
		},
		ctx
	);
	// At most once by design: the address is deleted in the committed expiry transaction, so there is nothing to retry.
	for (const row of expired) {
		const vars = row.email && closedCopy(row, settings, ctx.now);
		if (!row.email || !vars) continue;
		const locale: Locale = row.locale === 'en' ? 'en' : 'sl';
		await NotificationsDomain.emailContact({ to: row.email, type: 'report_closed', vars, locale }, ctx);
	}
	return expired.length;
}

/** report_expiring (C10) expiry_warning_days before the automatic close, once per idle period, with the one-tap extend. */
async function warn(settings: LifecycleConfig, ctx: Ctx): Promise<number> {
	const before = (idleDays: number) =>
		new Date(ctx.now.getTime() - (idleDays - settings.expiry_warning_days) * DAY_MS);
	const cutoffs = {
		lostBefore: before(settings.lost_idle_days),
		foundBefore: before(settings.found_idle_days),
		now: ctx.now,
		take: CHUNK,
	};
	const warned = await inChunks(
		(tx) => ReportsDao.claimExpiryWarnings(cutoffs, tx),
		(rows, txCtx) =>
			notifyManagers(ids(rows), 'report_expiring', (id) => `expiring:${id}:${ctx.now.getTime()}`, txCtx),
		ctx
	);
	return warned.length;
}

/** LOST reminders (C4) at each of lifecycle.reminder_days after creation; a late run sends only the latest one due. */
async function remind(settings: LifecycleConfig, ctx: Ctx): Promise<number> {
	let reminded = 0;
	for (const day of [...settings.reminder_days].sort((a, b) => b - a)) {
		const createdBefore = new Date(ctx.now.getTime() - day * DAY_MS);
		const rows = await inChunks(
			(tx) => ReportsDao.claimReminders({ day, createdBefore, take: CHUNK }, tx),
			(batch, txCtx) => notifyManagers(ids(batch), 'report_reminder', (id) => `reminder:${id}:${day}`, txCtx),
			ctx
		);
		reminded += rows.length;
	}
	return reminded;
}

/** The report.lifecycle job: expiry first (an expired report gets no warning), then warnings, then reminders. */
export async function tick(_input: void, ctx: Ctx): Promise<{ expired: number; warned: number; reminded: number }> {
	const settings = await lifecycleConfig();
	const expired = await expire(settings, ctx);
	const warned = await warn(settings, ctx);
	const reminded = await remind(settings, ctx);
	return { expired, warned, reminded };
}

// --- notify.send variables (notifications/sources.ts); null drops a notification that is moot by now ---

const managed = (report_id: string | undefined, user_id: string, ctx: Ctx) =>
	report_id ? ReportsDao.findManaged(report_id, user_id, ctx.tx) : Promise.resolve(null);

export const reminderVars: Source = async ({ report_id }, { user_id }, ctx) => {
	const report = await managed(report_id, user_id, ctx);
	if (!report || report.type !== 'lost' || !LIVE.includes(report.status) || !report.reminder_day) return null;
	if (report.moderation_state === 'removed') return null;
	return { report_code: report.short_code, day: report.reminder_day, pet_name: report.name, species: report.species };
};

/** Days left until the automatic close; null when the report was extended, updated or closed since the warning. */
export const expiringVars: Source = async ({ report_id }, { user_id }, ctx) => {
	const report = await managed(report_id, user_id, ctx);
	if (!report || !LIVE.includes(report.status) || report.moderation_state === 'removed') return null;
	const settings = await lifecycleConfig();
	const idleDays = report.type === 'lost' ? settings.lost_idle_days : settings.found_idle_days;
	const closesAt = report.last_owner_update_at.getTime() + idleDays * DAY_MS;
	const days_left = Math.ceil((closesAt - ctx.now.getTime()) / DAY_MS);
	if (days_left < 1 || days_left > settings.expiry_warning_days) return null;
	return {
		report_code: report.short_code,
		report_type: report.type,
		days_left,
		pet_name: report.name,
		species: report.species,
	};
};

export const closedVars: Source = async ({ report_id }, { user_id }, ctx) => {
	const report = await managed(report_id, user_id, ctx);
	if (!report || report.status !== 'closed' || report.close_reason !== 'expired' || !report.closed_at) return null;
	return closedCopy({ ...report, closed_at: report.closed_at }, await lifecycleConfig(), ctx.now);
};

/** For the managers of a counterpart report; null when it is searching again (reopened). */
export const reunitedVars: Source = async ({ report_id }, { user_id }, ctx) => {
	const report = await managed(report_id, user_id, ctx);
	if (!report || LIVE.includes(report.status) || report.moderation_state === 'removed') return null;
	return { report_code: report.short_code, species: report.species };
};

export default {
	lifecycleConfig,
	transitionReport,
	tick,
	reminderVars,
	expiringVars,
	closedVars,
	reunitedVars,
};
