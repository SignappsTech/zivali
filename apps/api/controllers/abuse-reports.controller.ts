// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { AbuseDomain, AbuseMapper } from '../domains/abuse/index.ts';
import { userCtx } from '../lib/ctx.ts';

export async function create(req: Request, res: Response): Promise<void> {
	const result = await AbuseDomain.reportAbuse(req.body, userCtx(req));
	res.status(result.duplicate ? 200 : 201).json(result);
}

export async function listAdmin(req: Request, res: Response): Promise<void> {
	const page = await AbuseDomain.listAbuseReports(req.query, userCtx(req));
	res.json({ items: page.items.map(AbuseMapper.toAdminAbuseReportDto), next_cursor: page.next_cursor });
}

export async function listFlags(req: Request, res: Response): Promise<void> {
	const page = await AbuseDomain.listModerationFlags(req.query, userCtx(req));
	res.json({ items: page.items.map(AbuseMapper.toModerationFlagDto), next_cursor: page.next_cursor });
}

export default { create, listAdmin, listFlags };
