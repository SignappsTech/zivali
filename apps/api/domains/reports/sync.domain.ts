// GET /v1/sync/reports (C4, C17): the feed of the mobile offline cache. Upserts are the public read model of open (or
// matched) visible reports whose public circle meets an area; removed_ids are reports there that stopped being so.
// `server_time` is an opaque cursor (CH-142): base64url JSON [updated_at, id] of the page's last row while has_more,
// else the request time minus OVERLAP_MS, so a transaction that committed after the read is delivered next time.
import { z } from 'zod';

import { IsoDateTime, Uuid, type SyncReportsQuery } from '@zivali/validation';

import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import ReportsDao from './reports.dao.ts';
import { publicViews, type ReportView } from './reports.domain.ts';

const DEFAULT_LIMIT = 500;
const OVERLAP_MS = 60_000;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const Since = z.tuple([IsoDateTime, Uuid]);

export type SyncFeed = { upserts: ReportView[]; removed_ids: string[]; server_time: string; has_more: boolean };

const encode = (at: string, id: string) => Buffer.from(JSON.stringify([at, id])).toString('base64url');

function decode(since: string): { at: string; id: string } {
	let value: unknown = null;
	try {
		value = JSON.parse(Buffer.from(since, 'base64url').toString('utf8'));
	} catch {
		// Not JSON: rejected below like any other malformed cursor.
	}
	const parsed = Since.safeParse(value);
	if (!parsed.success)
		throw new AppError('VALIDATION', 'Validation failed', undefined, [
			{ path: 'since', message: 'Invalid cursor' },
		]);
	return { at: parsed.data[0], id: parsed.data[1] };
}

const isLive = (report: ReportView['report']) =>
	(report.status === 'open' || report.status === 'matched') && report.moderation_state === 'visible';

export async function syncReports(input: z.infer<typeof SyncReportsQuery>, ctx: Ctx): Promise<SyncFeed> {
	const limit = input.limit ?? DEFAULT_LIMIT;
	const areas = input.areas.map(({ lat, lng, radius_km }) => ({ lat, lng, radius_m: radius_km * 1000 }));
	const after = input.since ? decode(input.since) : null;
	const rows = await ReportsDao.syncPage({ areas, after, take: limit + 1 }, ctx.tx);
	const page = rows.slice(0, limit);
	const has_more = rows.length > limit;
	const views = await publicViews(
		page.filter((row) => row.live).map((row) => row.id),
		ctx
	);
	const byId = new Map(views.map((view) => [view.report.id, view]));
	const upserts: ReportView[] = [];
	const removed_ids: string[] = [];
	for (const row of page) {
		// Re-checked on the loaded row: a report hidden or closed between the two reads goes out as a removal.
		const view = row.live ? byId.get(row.id) : undefined;
		if (view && isLive(view.report)) upserts.push(view);
		else removed_ids.push(row.id);
	}
	const last = page.at(-1);
	const server_time =
		has_more && last
			? encode(last.updated_at, last.id)
			: encode(new Date(ctx.now.getTime() - OVERLAP_MS).toISOString(), NIL_UUID);
	return { upserts, removed_ids, server_time, has_more };
}

export default { syncReports };
