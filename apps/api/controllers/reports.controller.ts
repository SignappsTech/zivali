// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { ReportsDomain, ReportsMapper } from '../domains/reports/index.ts';
import { userCtx } from '../lib/ctx.ts';

export async function getReport(req: Request, res: Response): Promise<void> {
	const ctx = userCtx(req);
	// params.code passed CodeParams (base58, 8 chars) in the route.
	const view = await ReportsDomain.getReport({ code: String(req.params.code) }, ctx);
	// The owner view holds the stored point, chip and contact settings: no browser or shared cache may keep it.
	if (view.manager_role) res.set('Cache-Control', 'private, no-store');
	res.json(ReportsMapper.toDto(view, ctx.locale));
}

export default { getReport };
