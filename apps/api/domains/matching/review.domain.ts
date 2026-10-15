// Match review (C8 §REST, FR-008): the lost report's managers list its suggestions, confirm one (the match conversation
// opens through ChatDomain and the other side is notified) or reject one for good (match_feedback keeps the verdict).
// Verdicts per state: confirm on confirmed and reject on rejected repeat the first answer; every other change is CONFLICT.
import type { MatchState } from '@zivali/types';

import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { ChatDomain } from '../chat/index.ts';
import { NotificationsDomain } from '../notifications/index.ts';
import { ReportsDomain, type ReportView } from '../reports/index.ts';
import MatchingDao, { type MatchRow } from './matching.dao.ts';

const DEFAULT_STATES: MatchState[] = ['suggested', 'confirmed'];

function actorId(ctx: Ctx): string {
	if (!ctx.actor) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	return ctx.actor.user_id;
}

function inTransaction<T>(ctx: Ctx, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	return ctx.tx ? fn(ctx.tx) : prisma.$transaction(fn);
}

/** Shown to the lost side only while the engine could still pair it: public, or held for an organisation (C8). */
function shown(view: ReportView): boolean {
	const reason = ReportsDomain.notPublicReason(view.report, view.now);
	return reason === null || (reason === 'held' && view.report.source === 'organisation');
}

/**
 * GET /v1/reports/:code/matches: the report's matches in the requested states (default suggested and confirmed), best
 * first, each with the other report's public view. Rejected pairs are never listed (FR-008), nor pairs whose other
 * report is hidden, removed or long closed. A report that is not lost has none.
 */
export async function listMatches(
	input: { code: string; state?: MatchState[] },
	ctx: Ctx
): Promise<{ match: MatchRow; other: ReportView }[]> {
	const report = await MatchingDao.findReportForManager(input.code, actorId(ctx), ctx.tx);
	if (!report) throw new AppError('NOT_FOUND', 'Report not found');
	if (!report.managers.length) throw new AppError('FORBIDDEN', 'Not a manager of this report');
	const states = (input.state ?? DEFAULT_STATES).filter((state) => state !== 'rejected');
	const matches = await MatchingDao.listForLost(report.id, states, ctx.tx);
	const views = await ReportsDomain.publicViews(
		matches.map((match) => match.other_report_id),
		ctx
	);
	const others = new Map(views.filter(shown).map((view) => [view.report.id, view]));
	return matches.flatMap((match) => {
		const other = others.get(match.other_report_id);
		return other ? [{ match, other }] : [];
	});
}

/** The match locked for this verdict; NOT_FOUND for an unknown id, FORBIDDEN unless the caller manages the lost side. */
async function lockForVerdict(id: string, user_id: string, tx: Prisma.TransactionClient) {
	const match = await MatchingDao.lockMatch(id, tx);
	if (!match) throw new AppError('NOT_FOUND', 'Match not found');
	if (!(await MatchingDao.isManager(match.lost_report_id, user_id, tx)))
		throw new AppError('FORBIDDEN', 'Not a manager of the lost report');
	return match;
}

/**
 * POST /v1/matches/:id/confirm: suggested → confirmed, the lost report open → matched, the match conversation opened
 * (C9) and the other report's managers notified (match_confirmed). Idempotent: a confirmed match returns its
 * conversation again without a second notification. Rejected or closed matches are CONFLICT; a closed lost report GONE.
 */
export async function confirmMatch(input: { id: string }, ctx: Ctx): Promise<{ conversation_id: string }> {
	const user_id = actorId(ctx);
	return inTransaction(ctx, async (tx) => {
		const match = await lockForVerdict(input.id, user_id, tx);
		if (match.state !== 'suggested' && match.state !== 'confirmed')
			throw new AppError('CONFLICT', `Match is already ${match.state}`);
		const first = match.state === 'suggested';
		if (first) {
			await MatchingDao.setState(match.id, { state: 'confirmed' }, tx);
			await MatchingDao.markMatched(match.lost_report_id, tx);
		}
		await MatchingDao.saveFeedback({ match_id: match.id, user_id, verdict: 'confirm', reason: null }, tx);
		const txCtx = { ...ctx, tx };
		const { id: conversation_id } = await ChatDomain.openConversation(
			{ about_report_code: match.lost_report.short_code, match_id: match.id },
			txCtx
		);
		if (first) {
			// Ids only (C10, TASK-6.17): notify.send loads the other report's code, type and species at send time.
			for (const manager of await MatchingDao.managerIds(match.other_report_id, tx)) {
				if (manager === user_id) continue;
				await NotificationsDomain.enqueueNotification(
					{
						user_id: manager,
						type: 'match_confirmed',
						payload: { template: 'match_confirmed', match_id: match.id, thread_id: conversation_id },
						dedupe_key: `match_confirmed:${match.id}`,
					},
					txCtx
				);
			}
		}
		return { conversation_id };
	});
}

/**
 * POST /v1/matches/:id/reject: suggested → rejected with the optional reason, kept in match_feedback too. The engine
 * never suggests the pair again and the list never shows it. Repeating it is a no-op; a confirmed or closed match is
 * CONFLICT.
 */
export async function rejectMatch(input: { id: string; reason?: string }, ctx: Ctx): Promise<void> {
	const user_id = actorId(ctx);
	await inTransaction(ctx, async (tx) => {
		const match = await lockForVerdict(input.id, user_id, tx);
		if (match.state === 'rejected') return;
		if (match.state !== 'suggested') throw new AppError('CONFLICT', `Match is already ${match.state}`);
		const reason = input.reason ?? null;
		await MatchingDao.setState(match.id, { state: 'rejected', rejected_reason: reason }, tx);
		await MatchingDao.saveFeedback({ match_id: match.id, user_id, verdict: 'reject', reason }, tx);
	});
}

export default { listMatches, confirmMatch, rejectMatch };
