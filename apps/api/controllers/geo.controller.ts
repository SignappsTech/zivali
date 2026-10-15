// Thin: request → ctx → domain → mapper → response. Lookups are never cached (C6 privacy rules).
import type { Request, Response } from 'express';

import { GeoDomain, GeoMapper } from '../domains/geo/index.ts';
import { userCtx } from '../lib/ctx.ts';

export async function search(req: Request, res: Response): Promise<void> {
	const hits = await GeoDomain.search(req.body, userCtx(req));
	res.set('Cache-Control', 'no-store').json(GeoMapper.toSearchDto(hits));
}

export async function reverse(req: Request, res: Response): Promise<void> {
	const hit = await GeoDomain.reverse(req.body, userCtx(req));
	res.set('Cache-Control', 'no-store').json(GeoMapper.toReverseDto(hit));
}

export default { search, reverse };
