// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { LifecycleDomain, ManageDomain, ReportsDomain, ReportsMapper } from '../domains/reports/index.ts';
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

export async function transitionReport(req: Request, res: Response): Promise<void> {
	const ctx = userCtx(req);
	const view = await LifecycleDomain.transitionReport({ ...req.body, code: String(req.params.code) }, ctx);
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

export default {
	getReport,
	createReport,
	updateReport,
	transitionReport,
	claimManage,
	resendManageLink,
	listMyReports,
};
