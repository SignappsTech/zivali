// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { ReportsMapper, SyncDomain } from '../domains/reports/index.ts';
import { userCtx } from '../lib/ctx.ts';

type SyncQuery = Parameters<typeof SyncDomain.syncReports>[0];

export async function syncReports(req: Request, res: Response): Promise<void> {
	const ctx = userCtx(req);
	// query passed SyncReportsQuery in the route.
	const feed = await SyncDomain.syncReports(req.query as unknown as SyncQuery, ctx);
	// Location in the query (C4 CH-19): never kept by a browser or shared cache.
	res.set('Cache-Control', 'private, no-store').json(ReportsMapper.toSyncFeed(feed, ctx.locale));
}

export default { syncReports };
