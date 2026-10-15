// C14 ads (serving, admin), partner stats and leads.
import type { IsoDate, IsoDateTime, Page, Uuid } from './common.ts';
import type { AdHouseKind, AdLabel, AdSlot, AdStatus, LeadInterest, Locale, Species } from './enums.ts';
import type { PresignedUpload } from './photos.ts';

/** GET /v1/ads/slot/:slot → Ad | null */
export type Ad = {
	id: Uuid;
	title: string;
	body: string;
	cta: string;
	/** null: no image uploaded yet (the seeded house ads) */
	image_url: string | null;
	image_alt: string;
	/** API_URL/v1/ads/<id>/click?s=<slot>&r=<region_id> */
	click_url: string;
	is_house: boolean;
	label: AdLabel;
};
export type AdSlotQuery = { region_id?: number; municipality_id?: number; species?: Species; locale?: Locale };
export type AdImpressionInput = { slot: AdSlot; region_id?: number };
export type AdClickQuery = { s: AdSlot; r?: number };

/** POST /v1/admin/ads, PUT /v1/admin/ads/:id */
export type AdInput = {
	title: string;
	body: string;
	cta: string;
	/** https only */
	link_url: string;
	image_alt: string;
	locales?: Locale[];
	slots: AdSlot[];
	region_ids?: number[] | null;
	municipality_ids?: number[] | null;
	species?: Species[] | null;
	starts_at?: IsoDateTime | null;
	ends_at?: IsoDateTime | null;
	status?: AdStatus;
	is_house?: boolean;
	house_kind?: AdHouseKind | null;
	exclusive?: boolean;
	weight?: number;
};
export type AdminAd = {
	id: Uuid;
	title: string;
	body: string;
	cta: string;
	link_url: string;
	image_url: string | null;
	image_alt: string;
	locales: Locale[];
	slots: AdSlot[];
	region_ids: number[] | null;
	municipality_ids: number[] | null;
	species: Species[] | null;
	starts_at: IsoDateTime | null;
	ends_at: IsoDateTime | null;
	status: AdStatus;
	is_house: boolean;
	house_kind: AdHouseKind | null;
	exclusive: boolean;
	weight: number;
	created_at: IsoDateTime;
	updated_at: IsoDateTime;
};
export type AdminAdQuery = { status?: AdStatus; cursor?: string };
export type AdminAdList = Page<AdminAd>;
export type AdStatusInput = { status: AdStatus };
/** POST /v1/admin/ads/:id/image: 4:3, at least 1200×900, JPG or PNG under 500 KB. */
export type AdImageInput = {
	sha256: string;
	width: number;
	height: number;
	bytes: number;
	content_type: 'image/jpeg' | 'image/png';
};
export type AdImageUploadResponse = { upload: PresignedUpload };
export type AdStatsQuery = { from: IsoDate; to: IsoDate };
export type AdStats = {
	items: {
		day: IsoDate;
		slot: AdSlot;
		region_slug: string | null;
		impressions: number;
		clicks: number;
		ctr: number;
	}[];
};

/** Any value 1–4 is returned as '<5'; 0 stays 0. */
export type CountValue = number | '<5';
type PartnerCounts = { users: CountValue; active_reports: CountValue; reunions_90d: CountValue };
export type PartnerStats = {
	generated_at: IsoDateTime;
	pilot: boolean;
	totals: PartnerCounts;
	by_region: (PartnerCounts & { region_slug: string })[];
};

/** POST /v1/leads (captcha, 3/hour per IP) */
export type LeadInput = {
	company: string;
	contact_name: string;
	email: string;
	phone?: string;
	region_interest?: string;
	interest: LeadInterest;
	message: string;
	consent: true;
	captcha_token: string;
	locale: Locale;
};
export type AdminLead = {
	id: Uuid;
	company: string;
	contact_name: string;
	email: string;
	phone: string | null;
	region_interest: string | null;
	interest: LeadInterest;
	message: string;
	consent_at: IsoDateTime;
	status: string;
	created_at: IsoDateTime;
};
export type AdminLeadList = Page<AdminLead>;
