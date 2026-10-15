// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import type { AdImpressionInput, AdSlot, AdSlotQuery } from '@zivali/types';

import { AdsDomain, AdsMapper } from '../domains/ads/index.ts';
import { userCtx } from '../lib/ctx.ts';

export async function slot(req: Request, res: Response): Promise<void> {
	const { slot: name } = req.params as { slot: AdSlot };
	const served = await AdsDomain.getAdForSlot({ slot: name, ...(req.query as AdSlotQuery) }, userCtx(req));
	// Per viewer (ad-free users, M4) and per language: browser cache only.
	res.set('Cache-Control', 'private, max-age=60')
		.vary('Accept-Language')
		.json(served && AdsMapper.toAdDto(served));
}

export async function impression(req: Request, res: Response): Promise<void> {
	await AdsDomain.recordImpression(
		{ ad_id: String(req.params.id), ...(req.body as AdImpressionInput) },
		userCtx(req)
	);
	res.status(204).end();
}

export default { slot, impression };
