// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import type { AdminAdQuery, AdStatsQuery } from '@zivali/types';

import { AdminDomain, AdminMapper } from '../domains/admin/index.ts';
import { DirectoryAdminDomain, DirectoryMapper } from '../domains/directory/index.ts';
import { AdsAdminDomain, AdsMapper } from '../domains/ads/index.ts';
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

// Shelter directory (C18 §Admin).

export async function listShelters(req: Request, res: Response): Promise<void> {
	res.json(DirectoryMapper.toAdminShelterListDto(await DirectoryAdminDomain.listShelters(undefined, userCtx(req))));
}

export async function listMunicipalityShelters(req: Request, res: Response): Promise<void> {
	const rows = await DirectoryAdminDomain.listAssignments(undefined, userCtx(req));
	res.json(DirectoryMapper.toAdminAssignmentListDto(rows));
}

export async function listShelterChanges(req: Request, res: Response): Promise<void> {
	const rows = await DirectoryAdminDomain.listShelterChanges(req.params.slug as string, userCtx(req));
	res.json(DirectoryMapper.toDirectoryChangeListDto(rows));
}

export async function createShelter(req: Request, res: Response): Promise<void> {
	const shelter = await DirectoryAdminDomain.createShelter(req.body, userCtx(req));
	res.status(201).json(DirectoryMapper.toShelterDto(shelter));
}

export async function updateShelter(req: Request, res: Response): Promise<void> {
	const input = { ...req.body, slug: req.params.slug as string };
	res.json(DirectoryMapper.toShelterDto(await DirectoryAdminDomain.updateShelter(input, userCtx(req))));
}

export async function deleteShelter(req: Request, res: Response): Promise<void> {
	await DirectoryAdminDomain.deleteShelter({ ...req.body, slug: req.params.slug as string }, userCtx(req));
	res.status(204).end();
}

export async function updateMunicipalityShelter(req: Request, res: Response): Promise<void> {
	const input = { ...req.body, municipality: req.params.municipality as string };
	res.json(DirectoryMapper.toAdminAssignmentDto(await DirectoryAdminDomain.updateAssignment(input, userCtx(req))));
}

export async function importDirectory(req: Request, res: Response): Promise<void> {
	const input = { ...req.body, dry_run: req.query.dry_run === 'true' };
	res.json(DirectoryMapper.toImportResultDto(await DirectoryAdminDomain.importDirectory(input, userCtx(req))));
}

// Ads (C14 §Admin, TASK-37.2)
const adId = (req: Request) => req.params.id as string;

export async function listAds(req: Request, res: Response): Promise<void> {
	const page = await AdsAdminDomain.listAds(req.query as AdminAdQuery, userCtx(req));
	res.json({ items: page.items.map(AdsMapper.toAdminAdDto), next_cursor: page.next_cursor });
}

export async function createAd(req: Request, res: Response): Promise<void> {
	res.status(201).json(AdsMapper.toAdminAdDto(await AdsAdminDomain.createAd(req.body, userCtx(req))));
}

export async function updateAd(req: Request, res: Response): Promise<void> {
	res.json(AdsMapper.toAdminAdDto(await AdsAdminDomain.updateAd({ ...req.body, id: adId(req) }, userCtx(req))));
}

export async function requestAdImageUpload(req: Request, res: Response): Promise<void> {
	const upload = await AdsAdminDomain.requestAdImageUpload({ ...req.body, id: adId(req) }, userCtx(req));
	res.json(AdsMapper.toAdImageUploadDto(upload));
}

export async function setAdStatus(req: Request, res: Response): Promise<void> {
	res.json(AdsMapper.toAdminAdDto(await AdsAdminDomain.setAdStatus({ ...req.body, id: adId(req) }, userCtx(req))));
}

export async function deleteAd(req: Request, res: Response): Promise<void> {
	await AdsAdminDomain.deleteAd({ ...req.body, id: adId(req) }, userCtx(req));
	res.status(204).end();
}

export async function getAdStats(req: Request, res: Response): Promise<void> {
	const rows = await AdsAdminDomain.getAdStats({ ...(req.query as AdStatsQuery), id: adId(req) }, userCtx(req));
	res.json(AdsMapper.toAdStatsDto(rows));
}

export default {
	listUsers,
	setUserRole,
	listAuditLog,
	getQueues,
	listShelters,
	listMunicipalityShelters,
	listShelterChanges,
	createShelter,
	updateShelter,
	deleteShelter,
	updateMunicipalityShelter,
	importDirectory,
	listAds,
	createAd,
	updateAd,
	requestAdImageUpload,
	setAdStatus,
	deleteAd,
	getAdStats,
};
