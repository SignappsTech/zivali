// Submission guard (C7): createReport calls it before any other rule. Anonymous callers only: limits per IP and per
// device hash (app_config rate.anon_report_per_hour / _per_day) → RATE_LIMITED; holds ('held', the finder still gets
// the manage link) when the device sent more than 10 reports in 7 days or a photo matches a held or removed report.
import { z } from 'zod';

import type { ModerationState } from '@zivali/types';
import type { CreateReportInput } from '@zivali/validation';

import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { consumeRateLimit } from '../platform/index.ts';
import ReportsDao from './reports.dao.ts';

export type HoldReason = 'device_volume' | 'photo_match';
export type SubmissionVerdict = {
	moderation_state: Extract<ModerationState, 'visible' | 'held'>;
	hold_reasons: HoldReason[];
};

const HOUR_S = 3600;
const DAY_S = 86_400;
/** Hold when the device already sent this many reports in HOLD_WINDOW_MS (this one makes it more than 10). */
const HOLD_DEVICE_REPORTS = 10;
export const HOLD_WINDOW_MS = 7 * DAY_S * 1000;
const Limit = z.number().int().positive();

export async function submissionGuard(input: z.infer<typeof CreateReportInput>, ctx: Ctx): Promise<SubmissionVerdict> {
	if (!ctx.actor?.is_anonymous) return { moderation_state: 'visible', hold_reasons: [] };

	const perHour = Limit.catch(5).parse(await configStore.get('rate.anon_report_per_hour'));
	const perDay = Limit.catch(20).parse(await configStore.get('rate.anon_report_per_day'));
	// Without x-device-id only the IP counts.
	for (const key of [ctx.ip_hash ?? 'unknown-ip', ...(ctx.device_hash ? [ctx.device_hash] : [])]) {
		await consumeRateLimit({ name: 'anon_report.hour', key, limit: perHour, window_s: HOUR_S }, ctx.now);
		await consumeRateLimit({ name: 'anon_report.day', key, limit: perDay, window_s: DAY_S }, ctx.now);
	}

	const hold_reasons: HoldReason[] = [];
	const since = new Date(ctx.now.getTime() - HOLD_WINDOW_MS);
	if (ctx.device_hash && (await ReportsDao.countByDevice(ctx.device_hash, since, ctx.tx)) >= HOLD_DEVICE_REPORTS)
		hold_reasons.push('device_volume');
	if (await ReportsDao.photosMatchHeld(input.photo_ids, ctx.tx)) hold_reasons.push('photo_match');
	return { moderation_state: hold_reasons.length ? 'held' : 'visible', hold_reasons };
}

export default { submissionGuard };
