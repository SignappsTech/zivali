// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { NotificationsDomain, NotificationsMapper, renderUnsubscribed } from '../domains/notifications/index.ts';
import { userCtx } from '../lib/ctx.ts';

export async function list(req: Request, res: Response): Promise<void> {
	const query = req.query as { cursor?: string; limit?: number };
	const page = await NotificationsDomain.listNotifications(query, userCtx(req));
	res.json({ ...page, items: page.items.map(NotificationsMapper.toNotificationDto) });
}

export async function markRead(req: Request, res: Response): Promise<void> {
	await NotificationsDomain.markRead(req.body, userCtx(req));
	res.status(204).end();
}

export async function unsubscribe(req: Request, res: Response): Promise<void> {
	const { locale } = await NotificationsDomain.unsubscribe(req.query as { token: string }, userCtx(req));
	res.type('html').set('Cache-Control', 'no-store').send(renderUnsubscribed(locale));
}

export async function getPrefs(req: Request, res: Response): Promise<void> {
	const prefs = await NotificationsDomain.getPrefs(undefined, userCtx(req));
	res.json({ ...prefs, items: prefs.items.map(NotificationsMapper.toPrefDto) });
}

export async function setPref(req: Request, res: Response): Promise<void> {
	const row = await NotificationsDomain.setPref({ ...req.body, type: req.params.type }, userCtx(req));
	res.json(NotificationsMapper.toPrefDto(row));
}

export async function registerPushToken(req: Request, res: Response): Promise<void> {
	await NotificationsDomain.registerPushToken(req.body, userCtx(req));
	res.status(204).end();
}

export async function unregisterPushToken(req: Request, res: Response): Promise<void> {
	await NotificationsDomain.unregisterPushToken(req.body, userCtx(req));
	res.status(204).end();
}

export default { list, markRead, unsubscribe, getPrefs, setPref, registerPushToken, unregisterPushToken };
