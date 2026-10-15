// Ad serving (C14, FR-029): the best live sponsor ad for the slot and context (weighted random; an exclusive ad
// owns its slot), else a house ad for the locale, so a slot is never empty. Impressions are aggregates only (no user
// ids, no cookies). Content rule: no ad may sell, give away or rehome animals; checked on save (TASK-37.2 calls
// assertAdWritable) and again on every serve, so a term added later also stops ads saved before it.
import { z } from 'zod';

import type { AdSlot, Locale, Species } from '@zivali/types';
import type { AdInput } from '@zivali/validation';

import type { AD_SLOT } from '../../generated/enums.ts';
import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import AdsDao, { type AdRow } from './ads.dao.ts';

export type { AdRow };

/**
 * Category blocklist: selling, giving away or rehoming animals, SL and EN. Matched as whole words or phrases, case and
 * diacritics ignored; app_config `ads.blocked_terms` (string[]) adds keywords without a deploy.
 */
export const BLOCKED_CATEGORIES = {
	sale: ['prodam', 'prodamo', 'naprodaj', 'na prodaj', 'za prodajo', 'for sale', 'sell', 'selling'],
	giveaway: ['oddam', 'oddamo', 'podarim', 'podarimo', 'zastonj oddam', 'give away', 'giving away', 'giveaway'],
	rehoming: ['rehome', 'rehoming', 'iščemo nov dom', 'išče nov dom', 'looking for a new home', 'free to good home'],
} as const;

const BlockedTerms = z.array(z.string());
const CONTENT_FIELDS = ['title', 'body', 'cta', 'image_alt', 'link_url'] as const;
type AdText = Record<(typeof CONTENT_FIELDS)[number], string>;

/** Lower case, no diacritics, words separated by single spaces and padded, so phrases match on word boundaries. */
const normalize = (text: string) =>
	` ${text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()} `;

export async function blockedTerms(): Promise<string[]> {
	const extra = BlockedTerms.safeParse(await configStore.get('ads.blocked_terms')).data ?? [];
	return [...Object.values(BLOCKED_CATEGORIES).flat(), ...extra].map(normalize).filter((term) => term.trim());
}

/** The fields of an ad that contain a blocked term (terms from blockedTerms()). */
export function blockedFields(ad: AdText, terms: string[]): (typeof CONTENT_FIELDS)[number][] {
	return CONTENT_FIELDS.filter((field) => {
		const text = normalize(ad[field]);
		return terms.some((term) => text.includes(term));
	});
}

/** Weighted random pick (weight ≤ 0 never wins); undefined when nothing can win. */
export function pickWeighted<T extends { weight: number }>(items: T[], random: () => number = Math.random) {
	const weight = (item: T) => Math.max(item.weight, 0);
	let left = random() * items.reduce((sum, item) => sum + weight(item), 0);
	for (const item of items) {
		left -= weight(item);
		if (weight(item) > 0 && left < 0) return item;
	}
	return undefined;
}

const LJUBLJANA_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Ljubljana' });

/** The stats day (YYYY-MM-DD) of an instant in Europe/Ljubljana. */
export const statsDay = (now: Date): string => LJUBLJANA_DAY.format(now);

const dbSlot = (slot: AdSlot) => slot.toUpperCase() as AD_SLOT;

export type AdContext = {
	slot: AdSlot;
	region_id?: number;
	municipality_id?: number;
	species?: Species;
	locale?: Locale;
};
export type ServedAd = { ad: AdRow; slot: AdSlot; locale: Locale; region_id: number };

/** GET /v1/ads/slot/:slot. null only when not even a house ad fits the slot and locale. */
export async function getAdForSlot(input: AdContext, ctx: Ctx): Promise<ServedAd | null> {
	// Ad-free users (C14): an active Premium entitlement (M4) returns null here. Entitlements do not exist yet, so
	// nobody is ad-free; Podpornik supporters never are.
	const locale = input.locale ?? ctx.locale;
	const region_id =
		input.region_id ??
		(input.municipality_id === undefined
			? undefined
			: await AdsDao.regionOfMunicipality(input.municipality_id, ctx.tx));
	const [rows, terms] = await Promise.all([
		AdsDao.listLive(
			{
				slot: dbSlot(input.slot),
				locale,
				now: ctx.now,
				region_id,
				municipality_id: input.municipality_id,
				species: input.species,
			},
			ctx.tx
		),
		blockedTerms(),
	]);
	const allowed = rows.filter((ad) => blockedFields(ad, terms).length === 0);
	const sponsors = allowed.filter((ad) => !ad.is_house);
	const exclusive = sponsors.filter((ad) => ad.exclusive);
	const ad =
		pickWeighted(exclusive.length ? exclusive : sponsors) ?? pickWeighted(allowed.filter((row) => row.is_house));
	return ad ? { ad, slot: input.slot, locale, region_id: region_id ?? 0 } : null;
}

/** POST /v1/ads/:id/impressions: +1 for (day in Europe/Ljubljana, ad, slot, region). */
export async function recordImpression(
	input: { ad_id: string; slot: AdSlot; region_id?: number },
	ctx: Ctx
): Promise<void> {
	const count = await AdsDao.addImpression(
		{ day: statsDay(ctx.now), ad_id: input.ad_id, slot: dbSlot(input.slot), region_id: input.region_id ?? 0 },
		ctx.tx
	);
	if (!count) throw new AppError('NOT_FOUND', 'Ad not found');
}

/**
 * GET /v1/ads/:id/click: +1 click for (day in Europe/Ljubljana, ad, slot, region), then the ad's stored link, the
 * only redirect target (never a URL from the request). NOT_FOUND: unknown, deleted or inactive ad, or a slot the ad
 * does not run in.
 */
export async function recordClick(
	input: { ad_id: string; slot: AdSlot; region_id?: number },
	ctx: Ctx
): Promise<string> {
	const link = await AdsDao.addClick(
		{ day: statsDay(ctx.now), ad_id: input.ad_id, slot: dbSlot(input.slot), region_id: input.region_id ?? 0 },
		ctx.tx
	);
	// https only (validated on save, checked by the database); re-checked here because this is a redirect.
	if (!link?.startsWith('https://')) throw new AppError('NOT_FOUND', 'Ad not found');
	return link;
}

type AdWrite = z.infer<typeof AdInput> & { id?: string };

/**
 * Every ad save (TASK-37.2): admins with aal2 only; no animal sale, giveaway or rehoming; an exclusive ad may not
 * overlap another exclusive ad in dates for a shared slot and region. Throws VALIDATION with one issue per field.
 */
export async function assertAdWritable(ad: AdWrite, ctx: Ctx): Promise<void> {
	if (!ctx.actor || ctx.actor.is_anonymous) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	if (ctx.actor.role !== 'ADMIN') throw new AppError('FORBIDDEN', 'Not allowed');
	if (ctx.actor.aal !== 'aal2') throw new AppError('AAL2_REQUIRED', 'Two-factor verification required');

	const issues: { path: string; message: string }[] = blockedFields(ad, await blockedTerms()).map((path) => ({
		path,
		message: 'Ads may not sell, give away or rehome animals',
	}));
	if (ad.exclusive) {
		const other = await AdsDao.findExclusiveOverlap(
			{
				id: ad.id,
				slots: ad.slots.map(dbSlot),
				region_ids: ad.region_ids,
				starts_at: ad.starts_at ? new Date(ad.starts_at) : null,
				ends_at: ad.ends_at ? new Date(ad.ends_at) : null,
			},
			ctx.tx
		);
		if (other)
			issues.push({
				path: 'exclusive',
				message: `Overlaps the exclusive ad "${other.title}" (${other.id}) in a shared slot and region`,
			});
	}
	if (issues.length) throw new AppError('VALIDATION', 'Ad not allowed', undefined, issues);
}

export default {
	getAdForSlot,
	recordImpression,
	recordClick,
	assertAdWritable,
	blockedTerms,
	blockedFields,
	pickWeighted,
	statsDay,
};
