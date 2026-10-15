// C14 ads (serving, admin), partner stats and leads. The "no animal sale or rehoming" rule needs the
// app_config blocklist, so it runs in the API domain, not here.
import { Cursor, IsoDate, IsoDateTime, nullOr, page, queryNumber, text, Uuid } from './common.schema.ts';
import { AdHouseKind, AdLabel, AdSlot, AdStatus, LeadInterest, Locale, Species } from './enums.ts';
import { PresignedUpload, Sha256 } from './photos.schema.ts';
import { z } from './zod.ts';

const SmallIntId = z.number().int().min(1).max(32_767);
const queryId = queryNumber(z.coerce.number().int().min(0).max(32_767)).optional();

export const Ad = z
	.object({
		id: Uuid,
		title: z.string(),
		body: z.string(),
		cta: z.string(),
		// null: no image uploaded yet (the seeded house ads)
		image_url: z.string().nullable(),
		image_alt: z.string(),
		click_url: z.string(),
		is_house: z.boolean(),
		label: AdLabel,
	})
	.openapi('Ad');
export const AdSlotParams = z.object({ slot: AdSlot });
export const AdSlotQuery = z.object({
	region_id: queryId,
	municipality_id: queryId,
	species: Species.optional(),
	locale: Locale.optional(),
});
export const AdImpressionInput = z
	.object({ slot: AdSlot, region_id: z.number().int().min(0).max(32_767).optional() })
	.openapi('AdImpressionInput');
export const AdClickQuery = z.object({ s: AdSlot, r: queryId });

export const AdInput = z
	.object({
		title: text(60),
		body: text(120),
		cta: text(24),
		link_url: z.url({ protocol: /^https$/ }).max(2048),
		image_alt: z.string().trim().min(5).max(140),
		locales: z.array(Locale).min(1).optional(),
		slots: z.array(AdSlot).min(1),
		region_ids: z.array(SmallIntId).nullable().optional(),
		municipality_ids: z.array(SmallIntId).nullable().optional(),
		species: z.array(Species).min(1).nullable().optional(),
		starts_at: IsoDateTime.nullable().optional(),
		ends_at: IsoDateTime.nullable().optional(),
		status: AdStatus.optional(),
		is_house: z.boolean().optional(),
		house_kind: nullOr(AdHouseKind).optional(),
		exclusive: z.boolean().optional(),
		weight: z.number().int().min(1).max(100).optional(),
	})
	.refine((a) => !a.starts_at || !a.ends_at || Date.parse(a.ends_at) > Date.parse(a.starts_at), {
		message: 'Ends before it starts',
		path: ['ends_at'],
	})
	.openapi('AdInput');
export const AdminAd = z
	.object({
		id: Uuid,
		title: z.string(),
		body: z.string(),
		cta: z.string(),
		link_url: z.string(),
		image_url: z.string().nullable(),
		image_alt: z.string(),
		locales: z.array(Locale),
		slots: z.array(AdSlot),
		region_ids: z.array(z.number().int()).nullable(),
		municipality_ids: z.array(z.number().int()).nullable(),
		species: z.array(Species).nullable(),
		starts_at: IsoDateTime.nullable(),
		ends_at: IsoDateTime.nullable(),
		status: AdStatus,
		is_house: z.boolean(),
		house_kind: nullOr(AdHouseKind),
		exclusive: z.boolean(),
		weight: z.number().int(),
		created_at: IsoDateTime,
		updated_at: IsoDateTime,
	})
	.openapi('AdminAd');
export const AdminAdQuery = z.object({ status: AdStatus.optional(), cursor: Cursor.optional() });
export const AdminAdList = page(AdminAd).openapi('AdminAdList');
export const AdStatusInput = z.object({ status: AdStatus }).openapi('AdStatusInput');
export const AdImageInput = z
	.object({
		sha256: Sha256,
		width: z.number().int().min(1200),
		height: z.number().int().min(900),
		bytes: z
			.number()
			.int()
			.positive()
			.lt(500 * 1024),
		content_type: z.enum(['image/jpeg', 'image/png']),
	})
	.refine((i) => Math.abs(i.width / i.height - 4 / 3) <= 0.01, { message: 'Expected 4:3', path: ['width'] })
	.openapi('AdImageInput');
export const AdImageUploadResponse = z.object({ upload: PresignedUpload }).openapi('AdImageUploadResponse');
export const AdStatsQuery = z.object({ from: IsoDate, to: IsoDate });
export const AdStats = z
	.object({
		items: z.array(
			z.object({
				day: IsoDate,
				slot: AdSlot,
				region_slug: z.string().nullable(),
				impressions: z.number().int(),
				clicks: z.number().int(),
				ctr: z.number(),
			})
		),
	})
	.openapi('AdStats');

/** Any value 1–4 is returned as '<5'; 0 stays 0. */
export const CountValue = z.union([z.number().int().min(0), z.literal('<5')]).openapi('CountValue');
const PartnerCounts = z.object({ users: CountValue, active_reports: CountValue, reunions_90d: CountValue });
export const PartnerStats = z
	.object({
		generated_at: IsoDateTime,
		pilot: z.boolean(),
		totals: PartnerCounts,
		by_region: z.array(PartnerCounts.extend({ region_slug: z.string() })),
	})
	.openapi('PartnerStats');

export const LeadInput = z
	.object({
		company: text(120),
		contact_name: text(120),
		email: z.email().max(254),
		phone: text(30).optional(),
		region_interest: text(120).optional(),
		interest: LeadInterest,
		message: text(2000),
		consent: z.literal(true),
		captcha_token: text(4096),
		locale: Locale,
	})
	.openapi('LeadInput');
export const AdminLead = z
	.object({
		id: Uuid,
		company: z.string(),
		contact_name: z.string(),
		email: z.string(),
		phone: z.string().nullable(),
		region_interest: z.string().nullable(),
		interest: LeadInterest,
		message: z.string(),
		consent_at: IsoDateTime,
		status: z.string(),
		created_at: IsoDateTime,
	})
	.openapi('AdminLead');
export const AdminLeadList = page(AdminLead).openapi('AdminLeadList');
