// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { HealthDomain, HealthMapper } from '../domains/health/index.ts';
import { requestCtx } from '../lib/ctx.ts';

export async function ready(req: Request, res: Response): Promise<void> {
	const readiness = await HealthDomain.getReadiness(undefined, requestCtx(req));
	res.status(readiness.ok ? 200 : 503).json(HealthMapper.toReadyDto(readiness));
}

export default { ready };
