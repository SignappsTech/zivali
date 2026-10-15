// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { PhotosDomain, PhotosMapper } from '../domains/photos/index.ts';
import { userCtx } from '../lib/ctx.ts';

// params.id passed IdParams (uuid) in the route.
const id = (req: Request) => ({ id: String(req.params.id) });

export async function create(req: Request, res: Response): Promise<void> {
	const result = await PhotosDomain.createPhoto(req.body, userCtx(req));
	res.status('upload' in result ? 201 : 200).json(PhotosMapper.toCreateDto(result));
}

export async function complete(req: Request, res: Response): Promise<void> {
	res.status(202).json(await PhotosDomain.completePhoto(id(req), userCtx(req)));
}

export async function get(req: Request, res: Response): Promise<void> {
	const view = await PhotosDomain.getPhoto(id(req), userCtx(req));
	// A presigned URL of a private photo: no shared cache may keep it.
	res.set('Cache-Control', 'private, no-store').json(PhotosMapper.toPhotoView(view));
}

export async function remove(req: Request, res: Response): Promise<void> {
	await PhotosDomain.deletePhoto(id(req), userCtx(req));
	res.status(204).end();
}

export default { create, complete, get, remove };
