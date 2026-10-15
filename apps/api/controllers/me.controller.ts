// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { UsersDomain, UsersMapper } from '../domains/users/index.ts';
import { userCtx } from '../lib/ctx.ts';
import { invalidateProfile } from '../middleware/auth.middleware.ts';

export async function getMe(req: Request, res: Response): Promise<void> {
	const row = await UsersDomain.getMe(undefined, userCtx(req));
	res.json(UsersMapper.toMeDto(row, req.user!.aal));
}

export async function updateMe(req: Request, res: Response): Promise<void> {
	const row = await UsersDomain.updateMe(req.body, userCtx(req));
	// req.user.locale is cached for 60 s; the next request must see the new one.
	invalidateProfile(row.id);
	res.json(UsersMapper.toProfileDto(row));
}

export default { getMe, updateMe };
