// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { AdminDomain, AdminMapper } from '../domains/admin/index.ts';
import { userCtx } from '../lib/ctx.ts';
import { invalidateProfile } from '../middleware/auth.middleware.ts';

export async function listUsers(req: Request, res: Response): Promise<void> {
	const page = await AdminDomain.listUsers(req.query, userCtx(req));
	res.json({ items: page.items.map(AdminMapper.toAdminUserDto), next_cursor: page.next_cursor });
}

export async function setUserRole(req: Request, res: Response): Promise<void> {
	const result = await AdminDomain.setUserRole({ ...req.body, id: req.params.id as string }, userCtx(req));
	// The role is cached for 60 s per user: drop it so the change applies on the target's next request.
	invalidateProfile(result.id);
	res.json(result);
}

export async function listAuditLog(req: Request, res: Response): Promise<void> {
	const page = await AdminDomain.listAuditLog(req.query, userCtx(req));
	res.json({ items: page.items.map(AdminMapper.toAuditLogEntryDto), next_cursor: page.next_cursor });
}

export async function getQueues(req: Request, res: Response): Promise<void> {
	res.json(AdminMapper.toAdminQueuesDto(await AdminDomain.getQueues(undefined, userCtx(req))));
}

export default { listUsers, setUserRole, listAuditLog, getQueues };
