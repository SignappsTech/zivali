// Public homepage numbers (TASK-115.4, C4 §REST GET /v1/stats/public). No personal data: three totals, each rounded
// down to a multiple of 10 and null while under 50, so a small count points at no one (the web then hides the block).
import type { PublicStats } from '@zivali/types';

import type { Ctx } from '../../lib/ctx.ts';
import StatsDao, { type RawStats } from './stats.dao.ts';

export const MIN_COUNT = 50;
export const CACHE_MS = 5 * 60_000;

let cache: { expires: number; stats: Promise<PublicStats> } | undefined;

/** Under MIN_COUNT → null; otherwise rounded down to a multiple of 10 (no one-by-one changes to read). */
export function publishCount(n: number): number | null {
	return n < MIN_COUNT ? null : Math.floor(n / 10) * 10;
}

function publish(raw: RawStats): PublicStats {
	return {
		reunited_total: publishCount(raw.reunited_total),
		open_reports: publishCount(raw.open_reports),
		alert_subscribers: publishCount(raw.alert_subscribers),
	};
}

/** One query per CACHE_MS per process; concurrent callers share it, and a failed query is retried on the next call. */
export function getPublicStats(_input: void, ctx: Ctx): Promise<PublicStats> {
	const now = ctx.now.getTime();
	if (!cache || cache.expires <= now) {
		const entry = { expires: now + CACHE_MS, stats: StatsDao.countPublic().then(publish) };
		entry.stats.catch(() => {
			if (cache === entry) cache = undefined;
		});
		cache = entry;
	}
	return cache.stats;
}

export default { getPublicStats, publishCount };
