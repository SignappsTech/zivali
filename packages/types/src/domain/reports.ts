// C4 reports (create, read, search, map, transitions, offline sync) and C7 manage link.
import type { BreedCode } from './breeds.ts';
import type { IsoDateTime, LatLng, Location, Page, Uuid } from './common.ts';
import type {
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
import type { PublicArea } from './geo.ts';
import type { PublicPhoto } from './photos.ts';

/** POST /v1/reports (Idempotency-Key required). */
export type CreateReportInput = {
	type: ReportType;
	/** lost: either `pet_id` or inline attributes */
	pet_id?: Uuid;
	species: Species;
	name?: string;
	breed_codes?: BreedCode[];
	colours?: Colour[];
	pattern?: Pattern;
	size?: Size;
	sex?: Sex;
	/** raw input, normalised by the API with normalizeChip() */
	chip?: string;
	collar?: string;
	ear_tip?: boolean;
	lifestyle?: Lifestyle;
	location: Location;
	/** lost: 200–20 000 m */
	requested_radius_m?: number;
	/** ISO; offline queue: original capture time */
	event_at: IsoDateTime;
	circumstances?: string;
	contact_pref?: ContactPref;
	/** lost only, display only (no payment): integer 1–10 000 */
	reward_eur?: number | null;
	/** lost only, display only: one line, ≤ 80 chars, no contact data */
	reward_note?: string | null;
	/** "I saw this pet" */
	linked_report_id?: Uuid;
	/** 1–5 for lost and found, 0–5 sighted; lost with `pet_id` may send none: the pet's photos are taken (still ≥ 1) */
	photo_ids: Uuid[];
	/** anonymous only, for the manage link */
	finder_email?: string;
};
/** PATCH /v1/reports/:code: partial CreateReportInput minus `type`. */
export type UpdateReportInput = Partial<Omit<CreateReportInput, 'type'>>;
export type CreateReportResponse = {
	id: Uuid;
	short_code: string;
	moderation_state: ModerationState;
	/** anonymous callers only; shown once (C7) */
	manage_token?: string;
	warnings: ReportWarning[];
	/** the report's photos in order (the saved pet's when a lost report sent none) */
	photo_ids: Uuid[];
};

/** Public read model: never exact point, chip number, manage token, creator, emails or phones. */
export type PublicReport = {
	id: Uuid;
	short_code: string;
	type: ReportType;
	status: ReportStatus;
	species: Species;
	/** lost only */
	name?: string;
	breed_codes: BreedCode[];
	colours: Colour[];
	pattern: Pattern | null;
	size: Size | null;
	sex: Sex | null;
	has_chip: boolean;
	collar_described: boolean;
	event_at: IsoDateTime;
	circumstances?: string;
	/** lost only, when either field is set */
	reward?: { eur: number | null; note: string | null };
	/** fuzzed */
	area: PublicArea;
	municipality_slug?: string;
	region_slug?: string;
	in_slovenia: boolean;
	photos: PublicPhoto[];
	boosted: boolean;
	linked_report_code?: string;
	created_at: IsoDateTime;
	updated_at: IsoDateTime;
	is_mine: boolean;
};
/** PublicReport plus the fields only a manager of the report sees. */
export type ReportOwnerView = PublicReport & {
	manager_role: ReportManagerRole;
	moderation_state: ModerationState;
	close_reason: CloseReason | null;
	pet_id: Uuid | null;
	chip_number: string | null;
	chip_status: ChipStatus;
	collar: string | null;
	/** exact point */
	location: LatLng;
	requested_radius_m: number | null;
	contact_pref: ContactPref;
	reward_eur: number | null;
	reward_note: string | null;
	first_match_at: IsoDateTime | null;
	reunited_at: IsoDateTime | null;
	closed_at: IsoDateTime | null;
	last_owner_update_at: IsoDateTime | null;
};

type ReportFilters = {
	types?: ReportType[];
	species?: Species[];
	colours?: Colour[];
	sizes?: Size[];
	from?: IsoDateTime;
	to?: IsoDateTime;
	/** closed ≤ 30 days */
	include_closed?: boolean;
};
export type BBox = [w: number, s: number, e: number, n: number];
/** GET /v1/reports query (list, `limit` ≤ 50). */
export type ReportSearch = ReportFilters & {
	bbox?: BBox;
	/** km ≤ 100 */
	near?: { lat: number; lng: number; km: number };
	sort?: ReportSort;
	cursor?: string;
	limit?: number;
};
export type ReportList = Page<PublicReport> & { total_estimate: number };
/** GET /v1/reports/map query (`limit` ≤ 1000). */
export type MapReportQuery = ReportFilters & { bbox: BBox; limit?: number };
export type MapReport = {
	id: Uuid;
	short_code: string;
	type: ReportType;
	species: Species;
	area: PublicArea;
	boosted: boolean;
	thumb_url: string | null;
};
export type MapReportList = { items: MapReport[] };
export type MyReportList = Page<ReportOwnerView>;

/** POST /v1/reports/:code/transitions */
export type ReportTransitionInput = { action: ReportTransitionAction; reason?: CloseReason };

/** GET /v1/sync/reports (C4, C17): ≤ 3 circles of ≤ 25 km. */
export type SyncArea = { lat: number; lng: number; radius_km: number };
/** `since` = the previous response's `server_time` (an opaque cursor, C4 CH-142); none on the first sync. */
export type SyncReportsQuery = { areas: SyncArea[]; since?: string; limit?: number };
/** The PublicReport fields the mobile cache keeps (C17 reports_cache) plus `thumb_url`. */
export type CachedReport = Pick<
	PublicReport,
	| 'id'
	| 'short_code'
	| 'type'
	| 'status'
	| 'species'
	| 'name'
	| 'breed_codes'
	| 'colours'
	| 'pattern'
	| 'size'
	| 'sex'
	| 'has_chip'
	| 'event_at'
	| 'area'
	| 'municipality_slug'
	| 'region_slug'
	| 'boosted'
	| 'updated_at'
> & { thumb_url: string | null };
export type SyncReportsResponse = {
	upserts: CachedReport[];
	removed_ids: Uuid[];
	/** Opaque cursor: stored and sent back as `since`, never parsed by the client. */
	server_time: string;
	has_more: boolean;
};

/** C7 POST /v1/manage/claim */
export type ManageClaimInput = { token: string };
export type ManageClaimResponse = { report_id: Uuid; short_code: string };

/** GET /v1/stats/public: each count rounded down to a multiple of 10, null while under 50 (no small numbers). */
export type PublicStats = {
	reunited_total: number | null;
	open_reports: number | null;
	alert_subscribers: number | null;
};
