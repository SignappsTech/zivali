// Reports (C4): short codes, the location write path every report write goes through (C6, ADR-006) and the public
// read model. createReport/updateReport (TASK-29.2) build on insertReport and updateReportLocation.
import { randomBytes, randomUUID } from 'node:crypto';

import type {
	Colour,
	ContactPref,
	Lifestyle,
	Pattern,
	ReportManagerRole,
	ReportSource,
	ReportType,
	Sex,
	Size,
	Species,
} from '@zivali/types';
import { coarsenPoint, LatLng, normalizeChip } from '@zivali/validation';

import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { fuzzArea, fuzzSettings, publicRadius, type Point } from '../../lib/fuzz.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { GeoDomain } from '../geo/index.ts';
import ReportsDao, { type LocationColumns, type ReportRow } from './reports.dao.ts';

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const SHORT_CODE_ATTEMPTS = 5;
/** Closed or reunited reports stay public this long (C4 ReportSearch include_closed: closed ≤ 30 days). */
const CLOSED_PUBLIC_MS = 30 * 24 * 3600 * 1000;

/** 8 characters base58 from crypto bytes; bytes ≥ 232 (4 × 58) are skipped so every character is equally likely. */
export function newShortCode(): string {
	let code = '';
	while (code.length < 8) {
		for (const byte of randomBytes(16)) if (byte < 232 && code.length < 8) code += BASE58[byte % 58];
	}
	return code;
}

function inTransaction<T>(ctx: Ctx, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	return ctx.tx ? fn(ctx.tx) : prisma.$transaction(fn);
}

/**
 * Public circle and geo reference for a stored (already coarsened) point. Municipality, region and in_slovenia are
 * public (PublicReport), so they come from the circle's centre: the stored point's municipality could narrow it down.
 */
async function locationColumns(
	report: { id: string; type: ReportType; requested_radius_m: number | null },
	exact: Point,
	ctx: Ctx
): Promise<LocationColumns> {
	const { id: report_id, type, requested_radius_m } = report;
	const area = fuzzArea({ report_id, type, point: exact, requested_radius_m }, await fuzzSettings());
	const geo = await GeoDomain.lookup(area, ctx, ctx.tx);
	return {
		exact,
		area,
		requested_radius_m,
		municipality_id: geo.municipality_id,
		region_id: geo.region_id,
		in_slovenia: geo.in_slovenia,
	};
}

export type NewReport = {
	/** Fixed ids for seeders only; otherwise a new uuid. */
	id?: string;
	type: ReportType;
	species: Species;
	pet_id?: string | null;
	name?: string | null;
	breed_codes?: string[];
	colours?: Colour[];
	pattern?: Pattern | null;
	size?: Size | null;
	sex?: Sex | null;
	chip?: string | null;
	collar?: string | null;
	ear_tip?: boolean | null;
	lifestyle?: Lifestyle | null;
	/** The received point (raw or client-coarsened); only its coarsened copy is stored. */
	location: Point;
	requested_radius_m?: number | null;
	event_at: Date;
	circumstances?: string | null;
	contact_pref?: ContactPref;
	reward_eur?: number | null;
	reward_note?: string | null;
	linked_report_id?: string | null;
	source?: ReportSource;
};

/**
 * Inserts a report for ctx.actor and makes them its manager (owner for lost, finder for found and sighted, staff for
 * organisations). The location is coarsened once here (20–30 m, random), the public circle derives from that stored
 * point and the received point is never written anywhere. Input is already validated (CreateReportInput or a seeder).
 */
export async function insertReport(input: NewReport, ctx: Ctx): Promise<{ id: string; short_code: string }> {
	const actor = ctx.actor;
	if (!actor) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	const { id = randomUUID(), type, species, event_at, location, requested_radius_m = null, chip, ...rest } = input;
	const source = rest.source ?? 'user';
	const exact = coarsenPoint(LatLng.parse(location));
	const cols = await locationColumns({ id, type, requested_radius_m }, exact, ctx);
	const { chip: chip_number, status: chip_status } = normalizeChip(chip);
	const role: ReportManagerRole = source === 'organisation' ? 'staff' : type === 'lost' ? 'owner' : 'finder';

	return inTransaction(ctx, async (tx) => {
		let short_code = '';
		for (let attempt = 0; !short_code && attempt < SHORT_CODE_ATTEMPTS; attempt++) {
			const candidate = newShortCode();
			if (await ReportsDao.insertReport({ id, short_code: candidate, type, species, event_at, ...cols }, tx))
				short_code = candidate;
		}
		if (!short_code) throw new Error('reports: no free short code');
		await ReportsDao.updateReport(id, { ...rest, chip_number, chip_status, created_by: actor.user_id }, tx);
		await ReportsDao.addManager({ report_id: id, user_id: actor.user_id, role }, tx);
		return { id, short_code };
	});
}

const samePoint = (a: Point, b: Point) => Math.abs(a.lat - b.lat) < 5e-7 && Math.abs(a.lng - b.lng) < 5e-7;

/**
 * Location part of a report update. No location, or the stored point sent back unchanged, keeps the stored point
 * (never re-randomised); a different point is coarsened anew with a new public circle. A radius-only change keeps
 * public_point and sets public_radius_m only, so two circles never share a stored point with different centres.
 * Ownership is checked by the caller (TASK-29.2 PATCH).
 */
export async function updateReportLocation(
	input: { id: string; location?: Point; requested_radius_m?: number | null },
	ctx: Ctx
): Promise<void> {
	const stored = await ReportsDao.getLocation(input.id, ctx.tx);
	if (!stored) throw new AppError('NOT_FOUND', 'Report not found');
	const moved = input.location !== undefined && !samePoint(input.location, stored.exact);
	const requested_radius_m =
		input.requested_radius_m === undefined ? stored.requested_radius_m : input.requested_radius_m;
	if (!moved) {
		if (requested_radius_m === stored.requested_radius_m) return;
		const public_radius_m = publicRadius(stored.type, requested_radius_m, await fuzzSettings());
		await ReportsDao.updateReport(input.id, { requested_radius_m, public_radius_m }, ctx.tx);
		return;
	}
	const exact = coarsenPoint(LatLng.parse(input.location));
	const cols = await locationColumns({ id: input.id, type: stored.type, requested_radius_m }, exact, ctx);
	await ReportsDao.setLocation(input.id, cols, ctx.tx);
}

export type ReportView = {
	report: ReportRow;
	exact: Point;
	area: Point & { radius_m: number };
	manager_role: ReportManagerRole | null;
	now: Date;
};

/** Signed-out callers and non-managers: held reads as unknown, hidden/removed and long-closed as gone. */
function assertPublic(report: ReportRow, now: Date): void {
	if (report.moderation_state === 'held') throw new AppError('NOT_FOUND', 'Report not found');
	if (report.moderation_state === 'hidden' || report.moderation_state === 'removed')
		throw new AppError('GONE', 'Report is no longer available', { reason: report.moderation_state });
	const endedAt =
		report.status === 'closed' ? report.closed_at : report.status === 'reunited' ? report.reunited_at : null;
	if (endedAt && now.getTime() - endedAt.getTime() > CLOSED_PUBLIC_MS)
		throw new AppError('GONE', 'Report is closed', { reason: 'closed' });
}

/** GET /v1/reports/:code. Managers always see their report; everyone else only while it is public. */
export async function getReport(input: { code: string }, ctx: Ctx): Promise<ReportView> {
	const report = await ReportsDao.findByCode(input.code, ctx.actor?.user_id, ctx.tx);
	if (!report) throw new AppError('NOT_FOUND', 'Report not found');
	const manager_role = (report.managers[0]?.role as ReportManagerRole | undefined) ?? null;
	if (!manager_role) assertPublic(report, ctx.now);
	const location = (await ReportsDao.getLocation(report.id, ctx.tx))!;
	return {
		report,
		exact: location.exact,
		area: { ...location.public, radius_m: location.public_radius_m },
		manager_role,
		now: ctx.now,
	};
}

export default { newShortCode, insertReport, updateReportLocation, getReport };
