// Reports (C4): short codes, the location write path every report write goes through (C6, ADR-006), the write API
// (createReport, updateReport, releaseReport) with its jobs, and the read model.
import { randomBytes, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import type { z } from 'zod';

import type {
	Colour,
	ContactPref,
	Lifestyle,
	ModerationState,
	Pattern,
	ReportManagerRole,
	ReportSource,
	ReportType,
	ReportWarning,
	Sex,
	Size,
	Species,
} from '@zivali/types';
import {
	coarsenPoint,
	isBreedOf,
	LatLng,
	normalizeChip,
	type CreateReportInput,
	type UpdateReportInput,
} from '@zivali/validation';

import type { Actor, Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { distanceM, fuzzArea, fuzzSettings, publicRadius, type Point } from '../../lib/fuzz.ts';
import type { QueueName } from '../../lib/jobs.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { GeoDomain } from '../geo/index.ts';
import ReportsDao, { type LocationColumns, type ReportRow, type StoredLocation } from './reports.dao.ts';
import { submissionGuard } from './submission-guard.ts';

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const SHORT_CODE_ATTEMPTS = 5;
const DAY_MS = 24 * 3600 * 1000;
/** Closed or reunited reports stay public this long (C4 ReportSearch include_closed: closed ≤ 30 days). */
const CLOSED_PUBLIC_MS = 30 * DAY_MS;
/** event_at may run this far ahead of the server clock; older than OLD_EVENT_MS is accepted with OLD_EVENT (C4). */
const FUTURE_SKEW_MS = 10 * 60 * 1000;
const OLD_EVENT_MS = 30 * DAY_MS;
const PAGE = 20;
/** Fields only lost reports carry (C4, C6); found and sighted reports with a value → VALIDATION. */
const LOST_ONLY = ['pet_id', 'requested_radius_m', 'reward_eur', 'reward_note'] as const;
/** Report columns the matching engine reads (C8): a PATCH that changes one re-runs match.report. */
const MATCH_INPUTS = ['event_at', 'species', 'sex', 'size', 'colours', 'pattern', 'chip_number'] as const;

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
	moderation_state?: ModerationState;
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
 * Ownership is checked by the caller (updateReport). Returns whether the point moved.
 */
export async function updateReportLocation(
	input: { id: string; location?: Point; requested_radius_m?: number | null },
	ctx: Ctx
): Promise<boolean> {
	const stored = await ReportsDao.getLocation(input.id, ctx.tx);
	if (!stored) throw new AppError('NOT_FOUND', 'Report not found');
	const moved = input.location !== undefined && !samePoint(input.location, stored.exact);
	const requested_radius_m =
		input.requested_radius_m === undefined ? stored.requested_radius_m : input.requested_radius_m;
	if (!moved) {
		if (requested_radius_m === stored.requested_radius_m) return false;
		// The kept centre stays put, so the radius never drops below it (admin may have lowered fuzz.*_min_radius_m).
		const public_radius_m = Math.max(
			publicRadius(stored.type, requested_radius_m, await fuzzSettings()),
			Math.ceil(distanceM(stored.exact, stored.public))
		);
		await ReportsDao.updateReport(input.id, { requested_radius_m, public_radius_m }, ctx.tx);
		return false;
	}
	const exact = coarsenPoint(LatLng.parse(input.location));
	const cols = await locationColumns({ id: input.id, type: stored.type, requested_radius_m }, exact, ctx);
	await ReportsDao.setLocation(input.id, cols, ctx.tx);
	return true;
}

type CreateInput = z.infer<typeof CreateReportInput>;
type UpdateInput = z.infer<typeof UpdateReportInput> & { code: string };

function invalid(path: string, message: string): AppError {
	return new AppError('VALIDATION', message, undefined, [{ path, message }]);
}

function signedIn(ctx: Ctx): Actor {
	if (!ctx.actor) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	return ctx.actor;
}

/** Rules shared by create and PATCH: lost-only fields, event_at not in the future, breeds of the species. */
function checkFields(
	type: ReportType,
	species: Species,
	input: Omit<Partial<CreateInput>, 'breed_codes'> & { breed_codes?: string[] },
	now: Date
): void {
	if (type !== 'lost') for (const key of LOST_ONLY) if (input[key] != null) throw invalid(key, 'Lost reports only');
	if (input.event_at && Date.parse(input.event_at) > now.getTime() + FUTURE_SKEW_MS)
		throw invalid('event_at', 'Cannot be in the future');
	input.breed_codes?.forEach((code, i) => {
		if (!isBreedOf(code, species)) throw invalid(`breed_codes.${i}`, 'Breed of another species');
	});
}

/** "I saw this pet": only found and sighted reports link, and only to a lost report. */
async function checkLinked(type: ReportType, linked_report_id: string, tx: Prisma.TransactionClient): Promise<void> {
	if (type === 'lost' || (await ReportsDao.findType(linked_report_id, tx)) !== 'lost')
		throw invalid('linked_report_id', 'Not a lost report');
}

/** The caller's own pet of the same species, without another open lost report (locked until the commit). */
async function checkPet(
	input: { pet_id: string; species: Species; report_id?: string },
	actor: Actor,
	tx: Prisma.TransactionClient
) {
	const pet = await ReportsDao.lockOwnPet(input.pet_id, actor.user_id, tx);
	if (!pet) throw invalid('pet_id', 'Unknown pet');
	if (pet.species !== input.species) throw invalid('species', 'Does not match the pet');
	const open = await ReportsDao.findOpenLostByPet(input.pet_id, input.report_id, tx);
	if (open)
		throw new AppError('DUPLICATE_OPEN_REPORT', 'This pet already has an open lost report', {
			report_id: open.id,
			short_code: open.short_code,
		});
	return pet;
}

async function setPhotos(
	report: { id: string; type: ReportType },
	photo_ids: string[],
	actor: Actor,
	tx: Prisma.TransactionClient
) {
	if (report.type !== 'sighted' && photo_ids.length < 1) throw invalid('photo_ids', 'At least one photo');
	const attached = await ReportsDao.setPhotos({ report_id: report.id, owner_id: actor.user_id, photo_ids }, tx);
	if (attached !== photo_ids.length) throw invalid('photo_ids', 'Unknown or foreign photo');
}

/**
 * Jobs with ids-only payloads, sent with the transaction so they exist only if the write commits. match.report and
 * alerts.fanout are idempotent, so a repeat (release, a moved point) is safe. Nearby alerts only for visible lost reports.
 */
async function sendJobs(
	report: { id: string; type: ReportType; moderation_state: ModerationState },
	queues: QueueName[],
	ctx: Ctx,
	tx: Prisma.TransactionClient
): Promise<void> {
	const fanout = report.type === 'lost' && report.moderation_state === 'visible';
	for (const queue of queues)
		if (queue !== 'alerts.fanout' || fanout) await ctx.jobs.send(queue, { report_id: report.id }, { tx });
}

export type CreatedReport = {
	id: string;
	short_code: string;
	moderation_state: ModerationState;
	warnings: ReportWarning[];
};

/**
 * POST /v1/reports (C4). Lost reports need a real account; the submission guard runs before the other rules and may
 * hold the report. With pet_id the pet's attributes fill what the input leaves out. One transaction: the report
 * (coarsened point, fuzz, geo lookup), its manager, its photos and the jobs photo.publish, match.report and, for
 * visible lost reports, alerts.fanout.
 */
export async function createReport(input: CreateInput, ctx: Ctx): Promise<CreatedReport> {
	const actor = signedIn(ctx);
	if (input.type === 'lost' && actor.is_anonymous) throw new AppError('FORBIDDEN', 'Lost reports need an account');
	const { moderation_state } = await submissionGuard(input, ctx);
	checkFields(input.type, input.species, input, ctx.now);
	const event_at = new Date(input.event_at);
	const warnings: ReportWarning[] = ctx.now.getTime() - event_at.getTime() > OLD_EVENT_MS ? ['OLD_EVENT'] : [];
	// finder_email (anonymous manage link) is stored by the submission rules of TASK-17.1.
	const { photo_ids, finder_email: _finderEmail, ...fields } = input;

	return inTransaction(ctx, async (tx) => {
		if (fields.linked_report_id) await checkLinked(fields.type, fields.linked_report_id, tx);
		const pet = fields.pet_id
			? await checkPet({ pet_id: fields.pet_id, species: fields.species }, actor, tx)
			: null;
		const fromPet: Partial<NewReport> = pet
			? {
					name: pet.name,
					breed_codes: pet.breed_codes,
					colours: pet.colours,
					pattern: pet.pattern,
					size: pet.size,
					sex: pet.sex,
					chip: pet.chip_number,
					collar: pet.collar,
					ear_tip: pet.ear_tip,
					lifestyle: pet.lifestyle as Lifestyle | null,
				}
			: {};
		const source: ReportSource = actor.is_anonymous ? 'anonymous' : 'user';
		const { id, short_code } = await insertReport(
			{ ...fromPet, ...fields, event_at, moderation_state, source },
			{ ...ctx, tx }
		);
		const report = { id, type: fields.type, moderation_state };
		await setPhotos(report, photo_ids, actor, tx);
		await sendJobs(report, ['photo.publish', 'match.report', 'alerts.fanout'], ctx, tx);
		return { id, short_code, moderation_state, warnings };
	});
}

export type ManagerView = ReportView & { manager_role: ReportManagerRole };

/**
 * PATCH /v1/reports/:code (C4): managers only; removed, closed and reunited reports are GONE. A moved point is
 * coarsened anew (updateReportLocation); a moved point or a changed matching input re-runs match.report, a moved
 * point of a visible lost report alerts.fanout, new photos photo.publish.
 */
export async function updateReport(input: UpdateInput, ctx: Ctx): Promise<ManagerView> {
	const actor = signedIn(ctx);
	const { code, photo_ids, location, requested_radius_m, chip, finder_email: _finderEmail, ...fields } = input;
	await inTransaction(ctx, async (tx) => {
		const report = await ReportsDao.findByCode(code, actor.user_id, tx);
		if (!report) throw new AppError('NOT_FOUND', 'Report not found');
		if (!report.managers.length) throw new AppError('FORBIDDEN', 'Not a manager of this report');
		if (report.moderation_state === 'removed')
			throw new AppError('GONE', 'Report is no longer available', { reason: 'removed' });
		if (report.status === 'closed' || report.status === 'reunited')
			throw new AppError('GONE', 'Report is closed', { reason: 'closed' });
		const species = fields.species ?? report.species;
		checkFields(report.type, species, { ...input, breed_codes: fields.breed_codes ?? report.breed_codes }, ctx.now);
		if (fields.linked_report_id) await checkLinked(report.type, fields.linked_report_id, tx);
		if (fields.pet_id && fields.pet_id !== report.pet_id)
			await checkPet({ pet_id: fields.pet_id, species, report_id: report.id }, actor, tx);
		if (photo_ids) await setPhotos(report, photo_ids, actor, tx);

		const normalized = chip === undefined ? undefined : normalizeChip(chip);
		const data = {
			...fields,
			event_at: fields.event_at === undefined ? undefined : new Date(fields.event_at),
			chip_number: normalized?.chip,
			chip_status: normalized?.status,
			last_owner_update_at: ctx.now,
		};
		const rematch = MATCH_INPUTS.some(
			(key) => data[key] !== undefined && !isDeepStrictEqual(data[key], report[key])
		);
		await ReportsDao.updateReport(report.id, data, tx);
		const moved = await updateReportLocation({ id: report.id, location, requested_radius_m }, { ...ctx, tx });
		const queues: QueueName[] = [
			...(photo_ids ? (['photo.publish'] as const) : []),
			...(moved || rematch ? (['match.report'] as const) : []),
			...(moved ? (['alerts.fanout'] as const) : []),
		];
		await sendJobs(report, queues, ctx, tx);
	});
	return (await getReport({ code }, ctx)) as ManagerView;
}

/**
 * Moderation releases a held report (held → visible; called by the moderation actions with a moderator or system
 * ctx): it goes public now, so photo.publish, match.report and, for lost reports, alerts.fanout run.
 */
export async function releaseReport(input: { id: string }, ctx: Ctx): Promise<void> {
	if (ctx.actor && ctx.actor.role !== 'MODERATOR' && ctx.actor.role !== 'ADMIN')
		throw new AppError('FORBIDDEN', 'Not allowed');
	await inTransaction(ctx, async (tx) => {
		const type = await ReportsDao.releaseHeld(input.id, tx);
		if (!type) throw new AppError('CONFLICT', 'Report is not held');
		const report = { id: input.id, type, moderation_state: 'visible' as const };
		await sendJobs(report, ['photo.publish', 'match.report', 'alerts.fanout'], ctx, tx);
	});
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
	return toView(report, (await ReportsDao.getLocation(report.id, ctx.tx))!, manager_role, ctx);
}

function toView<R extends ReportManagerRole | null>(
	report: ReportRow,
	location: StoredLocation,
	manager_role: R,
	ctx: Ctx
): ReportView & { manager_role: R } {
	const area = { ...location.public, radius_m: location.public_radius_m };
	return { report, exact: location.exact, area, manager_role, now: ctx.now };
}

/** GET /v1/me/reports: every report the caller manages (held, hidden and closed included), newest first. */
export async function listMyReports(
	input: { cursor?: string; limit?: number },
	ctx: Ctx
): Promise<{ items: ManagerView[]; next_cursor: string | null }> {
	const { user_id } = signedIn(ctx);
	const limit = input.limit ?? PAGE;
	const rows = await ReportsDao.listByManager({ user_id, cursor: input.cursor, take: limit + 1 }, ctx.tx);
	const page = rows.slice(0, limit);
	const locations = await ReportsDao.getLocations(
		page.map((report) => report.id),
		ctx.tx
	);
	return {
		items: page.map((report) =>
			toView(report, locations.get(report.id)!, report.managers[0]!.role as ReportManagerRole, ctx)
		),
		next_cursor: rows.length > limit ? page[page.length - 1]!.id : null,
	};
}

export default {
	newShortCode,
	insertReport,
	updateReportLocation,
	createReport,
	updateReport,
	releaseReport,
	getReport,
	listMyReports,
};
