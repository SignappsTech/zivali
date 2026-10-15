// C4 reports (create, read, search, map, transitions, offline sync) and C7 manage link.
import { COLOURS } from '@zivali/types';

import { BreedCode, isBreedOf } from './breeds.ts';
import {
	BBoxQuery,
	csv,
	Cursor,
	IsoDateTime,
	Lat,
	LatLng,
	limit,
	Lng,
	Location,
	nullOr,
	page,
	text,
	Uuid,
} from './common.schema.ts';
import {
	ChipStatus,
	CloseReason,
	Colour,
	ContactPref,
	Lifestyle,
	ModerationState,
	Pattern,
	ReportManagerRole,
	ReportSort,
	ReportStatus,
	ReportTransitionAction,
	ReportType,
	ReportWarning,
	Sex,
	Size,
	Species,
} from './enums.ts';
import { PublicArea } from './geo.schema.ts';
import { PhotoIds, PublicPhoto } from './photos.schema.ts';
import { containsContactData } from './text.ts';
import { z } from './zod.ts';

/** Display-only reward (brief v1.1: no escrow, no payment): lost reports only. */
export const RewardEur = z.number().int().min(1).max(10_000);
export const RewardNote = text(80)
	.refine((s) => !/[\r\n]/.test(s), 'Single line only')
	.refine((s) => !containsContactData(s), 'CONTACT_DATA');

const ReportFields = z.object({
	type: ReportType,
	pet_id: Uuid.optional(),
	species: Species,
	name: text(60).optional(),
	breed_codes: z.array(BreedCode).max(5).optional(),
	colours: z.array(Colour).max(COLOURS.length).optional(),
	pattern: Pattern.optional(),
	size: Size.optional(),
	sex: Sex.optional(),
	chip: z.string().max(40).optional(),
	collar: text(200).optional(),
	ear_tip: z.boolean().optional(),
	lifestyle: Lifestyle.optional(),
	location: Location,
	requested_radius_m: z.number().int().min(200).max(20_000).optional(),
	event_at: IsoDateTime,
	circumstances: text(1000).optional(),
	contact_pref: ContactPref.optional(),
	reward_eur: RewardEur.nullable().optional(),
	reward_note: RewardNote.nullable().optional(),
	linked_report_id: Uuid.optional(),
	photo_ids: PhotoIds,
	finder_email: z.email().max(254).optional(),
});

/** POST /v1/reports. Domain rules (future event_at, duplicates, anonymous lost) stay in ReportsDomain. */
export const CreateReportInput = ReportFields.superRefine((r, ctx) => {
	if (r.type !== 'sighted' && r.photo_ids.length < 1)
		ctx.addIssue({ code: 'custom', path: ['photo_ids'], message: 'At least one photo' });
	if (r.type !== 'lost')
		for (const key of ['reward_eur', 'reward_note'] as const)
			if (r[key] != null) ctx.addIssue({ code: 'custom', path: [key], message: 'Lost reports only' });
	r.breed_codes?.forEach((code, i) => {
		if (!isBreedOf(code, r.species))
			ctx.addIssue({ code: 'custom', path: ['breed_codes', i], message: 'Breed of another species' });
	});
}).openapi('CreateReportInput', {
	example: {
		type: 'found',
		species: 'cat',
		location: { lat: 46.05, lng: 14.5 },
		event_at: '2026-10-15T07:42:10Z',
		photo_ids: ['9b0e6c1a-3f2d-4c5e-8a7b-1d2e3f4a5b6c'],
	},
});
/** PATCH /v1/reports/:code: partial, without `type` (the domain checks lost-only fields against the report). */
export const UpdateReportInput = ReportFields.omit({ type: true }).partial().openapi('UpdateReportInput');
export const CreateReportResponse = z
	.object({
		id: Uuid,
		short_code: z.string(),
		moderation_state: ModerationState,
		manage_token: z.string().optional(),
		warnings: z.array(ReportWarning),
	})
	.openapi('CreateReportResponse', {
		example: {
			id: '7c1e2a4b-5d6f-4a8b-9c0d-1e2f3a4b5c6d',
			short_code: 'Hk3vT9qP',
			moderation_state: 'visible',
			warnings: [],
		},
	});

/** Public whitelist; parsing a row with it strips everything else (exact point, chip number, creator, …). */
export const PublicReport = z
	.object({
		id: Uuid,
		short_code: z.string(),
		type: ReportType,
		status: ReportStatus,
		species: Species,
		name: z.string().optional(),
		breed_codes: z.array(BreedCode),
		colours: z.array(Colour),
		pattern: nullOr(Pattern),
		size: nullOr(Size),
		sex: nullOr(Sex),
		has_chip: z.boolean(),
		collar_described: z.boolean(),
		event_at: IsoDateTime,
		circumstances: z.string().optional(),
		reward: z.object({ eur: z.number().int().nullable(), note: z.string().nullable() }).optional(),
		area: PublicArea,
		municipality_slug: z.string().optional(),
		region_slug: z.string().optional(),
		in_slovenia: z.boolean(),
		photos: z.array(PublicPhoto),
		boosted: z.boolean(),
		linked_report_code: z.string().optional(),
		created_at: IsoDateTime,
		updated_at: IsoDateTime,
		is_mine: z.boolean(),
	})
	.openapi('PublicReport', { description: 'Public read model of a report (fuzzed area, no contact or chip data).' });
export const ReportOwnerView = PublicReport.extend({
	manager_role: ReportManagerRole,
	moderation_state: ModerationState,
	close_reason: nullOr(CloseReason),
	pet_id: Uuid.nullable(),
	chip_number: z.string().nullable(),
	chip_status: ChipStatus,
	collar: z.string().nullable(),
	location: LatLng,
	requested_radius_m: z.number().int().nullable(),
	contact_pref: ContactPref,
	reward_eur: z.number().int().nullable(),
	reward_note: z.string().nullable(),
	first_match_at: IsoDateTime.nullable(),
	reunited_at: IsoDateTime.nullable(),
	closed_at: IsoDateTime.nullable(),
	last_owner_update_at: IsoDateTime.nullable(),
}).openapi('ReportOwnerView', { description: 'PublicReport plus the fields only a manager of the report sees.' });

const filters = {
	types: csv(ReportType).optional(),
	species: csv(Species).optional(),
	colours: csv(Colour).optional(),
	sizes: csv(Size).optional(),
	from: IsoDateTime.optional(),
	to: IsoDateTime.optional(),
	include_closed: z.stringbool().optional(),
};
/** `near=lat,lng,km` → { lat, lng, km } (km ≤ 100) */
const NearQuery = z
	.string()
	.transform((s) => {
		const [lat, lng, km] = s.split(',').map((n) => (n.trim() === '' ? NaN : Number(n)));
		return { lat, lng, km };
	})
	.pipe(z.object({ lat: Lat, lng: Lng, km: z.number().positive().max(100) }));

/** GET /v1/reports */
export const ReportSearch = z.object({
	...filters,
	bbox: BBoxQuery.optional(),
	near: NearQuery.optional(),
	sort: ReportSort.optional(),
	cursor: Cursor.optional(),
	limit: limit(50),
});
export const ReportList = page(PublicReport).extend({ total_estimate: z.number().int() }).openapi('ReportList');
/** GET /v1/reports/map */
export const MapReportQuery = z.object({ ...filters, bbox: BBoxQuery, limit: limit(1000) });
export const MapReport = z
	.object({
		id: Uuid,
		short_code: z.string(),
		type: ReportType,
		species: Species,
		area: PublicArea,
		boosted: z.boolean(),
		thumb_url: z.string().nullable(),
	})
	.openapi('MapReport');
export const MapReportList = z.object({ items: z.array(MapReport) }).openapi('MapReportList');
export const MyReportList = page(ReportOwnerView).openapi('MyReportList');

/** POST /v1/reports/:code/transitions */
export const ReportTransitionInput = z
	.object({ action: ReportTransitionAction, reason: CloseReason.optional() })
	.openapi('ReportTransitionInput');

/** GET /v1/sync/reports: `areas` is JSON, ≤ 3 circles of ≤ 25 km. */
export const SyncArea = z.object({ lat: Lat, lng: Lng, radius_km: z.number().positive().max(25) }).openapi('SyncArea');
export const SyncReportsQuery = z.object({
	areas: z
		.string()
		.transform((s, ctx) => {
			try {
				return JSON.parse(s) as unknown;
			} catch {
				ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
				return z.NEVER;
			}
		})
		.pipe(z.array(SyncArea).min(1).max(3)),
	since: IsoDateTime.optional(),
	limit: limit(1000),
});
export const CachedReport = PublicReport.pick({
	id: true,
	short_code: true,
	type: true,
	status: true,
	species: true,
	name: true,
	breed_codes: true,
	colours: true,
	pattern: true,
	size: true,
	sex: true,
	has_chip: true,
	event_at: true,
	area: true,
	municipality_slug: true,
	region_slug: true,
	boosted: true,
	updated_at: true,
})
	.extend({ thumb_url: z.string().nullable() })
	.openapi('CachedReport', { description: 'Report fields the mobile offline cache keeps (C17).' });
export const SyncReportsResponse = z
	.object({
		upserts: z.array(CachedReport),
		removed_ids: z.array(Uuid),
		server_time: IsoDateTime,
		has_more: z.boolean(),
	})
	.openapi('SyncReportsResponse');

/** C7 POST /v1/manage/claim: token = 32 random bytes, base64url. */
export const ManageClaimInput = z
	.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Invalid token') })
	.openapi('ManageClaimInput');
export const ManageClaimResponse = z.object({ report_id: Uuid, short_code: z.string() }).openapi('ManageClaimResponse');
