// Browse lost and found (FR-007, C4 ReportSearch): the list and the map over public reports. Results are public read
// models only, also for the caller's own reports (is_mine): the fuzzed area, never the stored point or chip data.
import type { BBox, ReportSort } from '@zivali/types';

import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { publicViews, type ReportView } from './reports.domain.ts';
import SearchDao, { type MapRow, type SearchFilters } from './search.dao.ts';

/** Closed and reunited reports stay public this long (as GET /v1/reports/:code). */
const CLOSED_PUBLIC_MS = 30 * 24 * 3600 * 1000;
const PAGE = 20;
const MAP_LIMIT = 500;

export type SearchInput = SearchFilters & { sort?: ReportSort; cursor?: string; limit?: number };
export type MapInput = SearchFilters & { bbox: BBox; limit?: number };

function invalid(path: string, message: string): AppError {
	return new AppError('VALIDATION', message, undefined, [{ path, message }]);
}

/** w < e and s < n (the client rounds the bbox outwards, so a real viewport is never empty). */
function checkBBox(bbox: BBox | undefined): void {
	if (bbox && !(bbox[0] < bbox[2] && bbox[1] < bbox[3]))
		throw invalid('bbox', 'Expected west < east and south < north');
}

const closedSince = (ctx: Ctx) => new Date(ctx.now.getTime() - CLOSED_PUBLIC_MS);

/** GET /v1/reports: one keyset page (cursor = last item id) and the number of matching reports. */
export async function searchReports(
	input: SearchInput,
	ctx: Ctx
): Promise<{ items: ReportView[]; next_cursor: string | null; total_estimate: number }> {
	const sort = input.sort ?? 'recent';
	if (sort === 'distance' && !input.near) throw invalid('sort', 'Sorting by distance needs near');
	checkBBox(input.bbox);
	const limit = input.limit ?? PAGE;
	const since = closedSince(ctx);
	const ids = await SearchDao.searchIds(
		{ ...input, sort, take: limit + 1, now: ctx.now, closedSince: since },
		ctx.tx
	);
	const total_estimate = await SearchDao.countReports(input, since, ctx.tx);
	const pageIds = ids.slice(0, limit);
	const views = new Map((await publicViews(pageIds, ctx)).map((view) => [view.report.id, view]));
	const roles = ctx.actor ? await SearchDao.managerRoles(pageIds, ctx.actor.user_id, ctx.tx) : new Map();
	return {
		// A report deleted between the two reads is skipped.
		items: pageIds.flatMap((id) => {
			const view = views.get(id);
			return view ? [{ ...view, manager_role: roles.get(id) ?? null }] : [];
		}),
		next_cursor: ids.length > limit ? pageIds[pageIds.length - 1]! : null,
		total_estimate,
	};
}

/** GET /v1/reports/map: minimal items in the viewport (limit ≤ 1000, default 500). */
export async function mapReports(input: MapInput, ctx: Ctx): Promise<MapRow[]> {
	checkBBox(input.bbox);
	const take = input.limit ?? MAP_LIMIT;
	return SearchDao.mapReports({ ...input, take, now: ctx.now, closedSince: closedSince(ctx) }, ctx.tx);
}

export default { searchReports, mapReports };
