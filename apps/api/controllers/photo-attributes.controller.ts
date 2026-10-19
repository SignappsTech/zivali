// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { AiDomain, AiMapper } from '../domains/ai/index.ts';
import { userCtx } from '../lib/ctx.ts';

// params.id passed IdParams (uuid) in the route.
export async function get(req: Request, res: Response): Promise<void> {
	const view = await AiDomain.getPhotoAttributes({ id: String(req.params.id) }, userCtx(req));
	// Polled while pending, and private to the owner: no cache may keep it.
	res.set('Cache-Control', 'private, no-store').json(AiMapper.toPhotoAttributes(view));
}

export default { get };
