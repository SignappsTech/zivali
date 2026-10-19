// Thin: request → ctx → domain → mapper → response. Public reference data, cacheable for an hour (C18).
import type { Request, Response } from 'express';

import { DirectoryDomain, DirectoryMapper } from '../domains/directory/index.ts';
import { userCtx } from '../lib/ctx.ts';

const CACHE = 'public, max-age=3600';

export async function list(req: Request, res: Response): Promise<void> {
	const items = await DirectoryDomain.listShelters(undefined, userCtx(req));
	// `area` is localised.
	res.set('Cache-Control', CACHE).vary('Accept-Language').json(DirectoryMapper.toShelterListDto(items));
}

export async function get(req: Request, res: Response): Promise<void> {
	const { shelter, municipalities, likely_municipalities } = await DirectoryDomain.getShelter(
		req.params.slug as string,
		userCtx(req)
	);
	res.set('Cache-Control', CACHE).json(
		DirectoryMapper.toShelterDetailDto(shelter, municipalities, likely_municipalities)
	);
}

export async function municipalities(req: Request, res: Response): Promise<void> {
	const items = await DirectoryDomain.listMunicipalities(undefined, userCtx(req));
	res.set('Cache-Control', CACHE).json(DirectoryMapper.toMunicipalityListDto(items));
}

export async function responsible(req: Request, res: Response): Promise<void> {
	const { lat, lng, municipality } = req.query as { lat?: number; lng?: number; municipality?: string };
	const input = municipality !== undefined ? { municipality } : { lat: lat!, lng: lng! };
	const result = await DirectoryDomain.getResponsibleShelter(input, userCtx(req));
	res.set('Cache-Control', CACHE).json(DirectoryMapper.toResponsibleDto(result));
}

export default { list, get, municipalities, responsible };
