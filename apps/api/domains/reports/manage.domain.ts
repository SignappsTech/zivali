// Manage link of anonymous reports (C7): the token (32 random bytes, base64url; only its SHA-256 is stored), claiming
// it on another device (POST /v1/manage/claim) and resending the link to the finder email on file.
import { createHash, randomBytes } from 'node:crypto';

import type { ReportType, Species } from '@zivali/types';

import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma } from '../../prisma/prisma.ts';
import { NotificationsDomain } from '../notifications/index.ts';
import ReportsDao from './reports.dao.ts';
import { consumeRateLimit } from './submission-guard.ts';

/** reunited and closed reports can be reopened this long (C4 status machine); later a manage link is GONE. */
const REOPEN_WINDOW_MS = 7 * 24 * 3600 * 1000;
const RESEND_PER_DAY = 3;

export const hashManageToken = (token: string) => new Uint8Array(createHash('sha256').update(token).digest());

export function newManageToken(): { token: string; hash: Uint8Array<ArrayBuffer> } {
	const token = randomBytes(32).toString('base64url');
	return { token, hash: hashManageToken(token) };
}

function assertManageable(
	report: { status: string; moderation_state: string; closed_at: Date | null; reunited_at: Date | null },
	now: Date
): void {
	if (report.moderation_state === 'removed')
		throw new AppError('GONE', 'Report is no longer available', { reason: 'removed' });
	const endedAt =
		report.status === 'closed' ? report.closed_at : report.status === 'reunited' ? report.reunited_at : null;
	if (endedAt && now.getTime() - endedAt.getTime() > REOPEN_WINDOW_MS)
		throw new AppError('GONE', 'Report is closed', { reason: 'closed' });
}

/**
 * Emails the manage link. Callers send it after their write committed and a failed email never fails the request
 * (the outbox row records it): for createReport a 5xx would free the Idempotency-Key and a retry would duplicate the
 * report. Anonymous reports are found or sighted, never lost (FORBIDDEN in createReport).
 */
export async function mailManageLink(
	input: { to: string; short_code: string; type: ReportType; species: Species; token: string },
	ctx: Ctx
): Promise<void> {
	try {
		await NotificationsDomain.sendManageLink(
			{
				to: input.to,
				report_code: input.short_code,
				report_type: input.type as 'found' | 'sighted',
				species: input.species,
				manage_token: input.token,
			},
			ctx
		);
	} catch (err) {
		ctx.logger.warn({ err }, 'manage link email failed');
	}
}

/**
 * POST /v1/manage/claim: the caller (anonymous or signed in) becomes a finder manager of the report the token
 * belongs to. Claiming again is a no-op. Unknown token → NOT_FOUND; removed, or closed beyond the reopen window → GONE.
 */
export async function claimManage(
	input: { token: string },
	ctx: Ctx
): Promise<{ report_id: string; short_code: string }> {
	if (!ctx.actor) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	const report = await ReportsDao.findByManageToken(hashManageToken(input.token), ctx.tx);
	if (!report) throw new AppError('NOT_FOUND', 'Unknown manage link');
	assertManageable(report, ctx.now);
	await ReportsDao.addManager({ report_id: report.id, user_id: ctx.actor.user_id, role: 'finder' }, ctx.tx);
	return { report_id: report.id, short_code: report.short_code };
}

/**
 * POST /v1/reports/:code/manage-link/resend (managers): a new token replaces the old one (only its hash is stored,
 * so the old link stops working) and goes to the finder email on file. No email → CONFLICT; 3 per report per day.
 */
export async function resendManageLink(input: { code: string }, ctx: Ctx): Promise<void> {
	const actor = ctx.actor;
	if (!actor) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	const run = async (tx: NonNullable<Ctx['tx']>) => {
		const found = await ReportsDao.findWithRole(input.code, actor.user_id, tx);
		if (!found) throw new AppError('NOT_FOUND', 'Report not found');
		if (!found.role) throw new AppError('FORBIDDEN', 'Not a manager of this report');
		const { report } = found;
		assertManageable(report, ctx.now);
		const to = await ReportsDao.getContactEmail(report.id, tx);
		if (!to) throw new AppError('CONFLICT', 'No finder email on file');
		await consumeRateLimit(
			{ name: 'manage_link.resend', key: report.id, limit: RESEND_PER_DAY, window_s: 86_400 },
			ctx.now
		);
		const { token, hash } = newManageToken();
		await ReportsDao.updateReport(report.id, { manage_token_hash: hash }, tx);
		return { to, short_code: report.short_code, type: report.type, species: report.species, token };
	};
	const link = await (ctx.tx ? run(ctx.tx) : prisma.$transaction(run));
	await mailManageLink(link, ctx);
}

export default { hashManageToken, newManageToken, mailManageLink, claimManage, resendManageLink };
