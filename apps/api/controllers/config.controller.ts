// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { ConfigDomain, ConfigMapper } from '../domains/config/index.ts';
import { userCtx } from '../lib/ctx.ts';

export async function getPublic(req: Request, res: Response): Promise<void> {
	const flags = await ConfigDomain.getPublicConfig(undefined, userCtx(req));
	res.set('Cache-Control', 'public, max-age=300').json(ConfigMapper.toPublicDto(flags));
}

export default { getPublic };
