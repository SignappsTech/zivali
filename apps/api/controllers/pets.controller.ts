// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { PetsDomain, PetsMapper, type PetView } from '../domains/pets/index.ts';
import { userCtx } from '../lib/ctx.ts';

// params.id passed IdParams (uuid) in the route.
const id = (req: Request) => String(req.params.id);
// Chip numbers and presigned photo URLs: no shared cache may keep a pet.
const noStore = (res: Response) => res.set('Cache-Control', 'private, no-store');
const send = (res: Response, view: PetView, status = 200) =>
	noStore(res).status(status).json(PetsMapper.toPetDto(view));

export async function list(req: Request, res: Response): Promise<void> {
	const views = await PetsDomain.listPets(undefined, userCtx(req));
	noStore(res).json({ items: views.map(PetsMapper.toPetDto) });
}

export async function get(req: Request, res: Response): Promise<void> {
	send(res, await PetsDomain.getPet({ id: id(req) }, userCtx(req)));
}

export async function create(req: Request, res: Response): Promise<void> {
	send(res, await PetsDomain.createPet(req.body, userCtx(req)), 201);
}

export async function update(req: Request, res: Response): Promise<void> {
	send(res, await PetsDomain.updatePet({ ...req.body, id: id(req) }, userCtx(req)));
}

export async function archive(req: Request, res: Response): Promise<void> {
	send(res, await PetsDomain.archivePet({ id: id(req) }, userCtx(req)));
}

export async function remove(req: Request, res: Response): Promise<void> {
	await PetsDomain.deletePet({ id: id(req) }, userCtx(req));
	res.status(204).end();
}

export async function setPhotos(req: Request, res: Response): Promise<void> {
	send(res, await PetsDomain.setPetPhotos({ id: id(req), photo_ids: req.body.photo_ids }, userCtx(req)));
}

export default { list, get, create, update, archive, remove, setPhotos };
