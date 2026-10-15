// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import type { MatchState } from '@zivali/types';

import { MatchingMapper, MatchReviewDomain } from '../domains/matching/index.ts';
import { userCtx } from '../lib/ctx.ts';

// Suggestions belong to the lost report's managers: no browser or shared cache may keep them.
const PRIVATE = 'private, no-store';

export async function list(req: Request, res: Response): Promise<void> {
	const ctx = userCtx(req);
	const { state } = req.query as { state?: MatchState[] };
	const items = await MatchReviewDomain.listMatches({ code: String(req.params.code), state }, ctx);
	res.set('Cache-Control', PRIVATE).json(MatchingMapper.toMatchList(items, ctx.locale));
}

export async function confirm(req: Request, res: Response): Promise<void> {
	res.set('Cache-Control', PRIVATE).json(
		await MatchReviewDomain.confirmMatch({ id: String(req.params.id) }, userCtx(req))
	);
}

export async function reject(req: Request, res: Response): Promise<void> {
	await MatchReviewDomain.rejectMatch({ ...req.body, id: String(req.params.id) }, userCtx(req));
	res.status(204).end();
}

export default { list, confirm, reject };
