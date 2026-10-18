// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { StatsDomain, StatsMapper } from '../domains/stats/index.ts';
import { userCtx } from '../lib/ctx.ts';

export async function getPublic(req: Request, res: Response): Promise<void> {
	const stats = await StatsDomain.getPublicStats(undefined, userCtx(req));
	res.set('Cache-Control', 'public, max-age=300').json(StatsMapper.toPublicStatsDto(stats));
}

export default { getPublic };
