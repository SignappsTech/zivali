// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { AlertsDomain, AlertsMapper } from '../domains/alerts/index.ts';
import { userCtx } from '../lib/ctx.ts';

export async function get(req: Request, res: Response): Promise<void> {
	const row = await AlertsDomain.getSubscription(undefined, userCtx(req));
	res.json(row && AlertsMapper.toSubscriptionDto(row));
}

export async function save(req: Request, res: Response): Promise<void> {
	const row = await AlertsDomain.saveSubscription(req.body, userCtx(req));
	res.json(AlertsMapper.toSubscriptionDto(row));
}

export async function remove(req: Request, res: Response): Promise<void> {
	await AlertsDomain.deleteSubscription(undefined, userCtx(req));
	res.status(204).end();
}

export default { get, save, remove };
