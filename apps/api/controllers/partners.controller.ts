// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import type { CursorQuery, LeadInput } from '@zivali/types';

import { PartnersDomain, PartnersMapper } from '../domains/partners/index.ts';
import { userCtx } from '../lib/ctx.ts';

export async function stats(req: Request, res: Response): Promise<void> {
	const data = await PartnersDomain.getStats(undefined, userCtx(req));
	// Aggregates only, the same for everyone; refreshed hourly.
	res.set('Cache-Control', 'public, max-age=3600').json(PartnersMapper.toPartnerStatsDto(data));
}

export async function createLead(req: Request, res: Response): Promise<void> {
	res.status(201).json(await PartnersDomain.createLead(req.body as LeadInput, userCtx(req)));
}

export async function listLeads(req: Request, res: Response): Promise<void> {
	const page = await PartnersDomain.listLeads(req.query as CursorQuery, userCtx(req));
	res.json({ items: page.items.map(PartnersMapper.toAdminLeadDto), next_cursor: page.next_cursor });
}

export default { stats, createLead, listLeads };
