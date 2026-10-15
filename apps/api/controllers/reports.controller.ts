// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import {
	ManageDomain,
	ReportsDomain,
	ReportsMapper,
	SearchDomain,
	type MapInput,
	type SearchInput,
} from '../domains/reports/index.ts';
import { userCtx } from '../lib/ctx.ts';

// Owner views hold the stored point, chip and contact settings: no browser or shared cache may keep them.
const PRIVATE = 'private, no-store';

export async function getReport(req: Request, res: Response): Promise<void> {
	const ctx = userCtx(req);
	// params.code passed CodeParams (base58, 8 chars) in the route.
	const view = await ReportsDomain.getReport({ code: String(req.params.code) }, ctx);
	if (view.manager_role) res.set('Cache-Control', PRIVATE);
	res.json(ReportsMapper.toDto(view, ctx.locale));
}

export async function createReport(req: Request, res: Response): Promise<void> {
	const created = await ReportsDomain.createReport(req.body, userCtx(req));
	res.status(201).set('Cache-Control', PRIVATE).json(ReportsMapper.toCreated(created));
}

export async function updateReport(req: Request, res: Response): Promise<void> {
	const ctx = userCtx(req);
	const view = await ReportsDomain.updateReport({ ...req.body, code: String(req.params.code) }, ctx);
	res.set('Cache-Control', PRIVATE).json(ReportsMapper.toOwnerView(view, ctx.locale));
}

export async function claimManage(req: Request, res: Response): Promise<void> {
	res.set('Cache-Control', PRIVATE).json(await ManageDomain.claimManage(req.body, userCtx(req)));
}

export async function resendManageLink(req: Request, res: Response): Promise<void> {
	await ManageDomain.resendManageLink({ code: String(req.params.code) }, userCtx(req));
	res.status(204).end();
}

export async function listMyReports(req: Request, res: Response): Promise<void> {
	const ctx = userCtx(req);
	const page = await ReportsDomain.listMyReports(req.query as { cursor?: string; limit?: number }, ctx);
	res.set('Cache-Control', PRIVATE).json({
		...page,
		items: page.items.map((view) => ReportsMapper.toOwnerView(view, ctx.locale)),
	});
}

// Search answers depend on a location query and on the caller (is_mine): never cached (C4 §Query encoding).
export async function searchReports(req: Request, res: Response): Promise<void> {
	const ctx = userCtx(req);
	const page = await SearchDomain.searchReports(req.query as unknown as SearchInput, ctx);
	res.set('Cache-Control', PRIVATE).json({
		...page,
		items: page.items.map((view) => ReportsMapper.toPublicReport(view, ctx.locale)),
	});
}

export async function mapReports(req: Request, res: Response): Promise<void> {
	const rows = await SearchDomain.mapReports(req.query as unknown as MapInput, userCtx(req));
	res.set('Cache-Control', PRIVATE).json({ items: rows.map(ReportsMapper.toMapReport) });
}

export default {
	getReport,
	createReport,
	updateReport,
	claimManage,
	resendManageLink,
	listMyReports,
	searchReports,
	mapReports,
};
