// Ads → C14 DTOs, parsed with the shared schemas. The served `Ad` never carries targeting, status or link_url.
import type { z } from 'zod';

import { Ad, AdImageUploadResponse, AdminAd, AdStats } from '@zivali/validation';

import type { PresignedPut } from '../../adapters/storage/index.ts';
import { config } from '../../lib/config.ts';
import { PhotosDomain } from '../photos/index.ts';
import type { AdRow, AdStatsRow } from './ads.dao.ts';
import type { ServedAd } from './ads.domain.ts';

const imageUrl = (ad: AdRow) => (ad.image_path ? PhotosDomain.mediaUrl({ bucket: 'media', key: ad.image_path }) : null);
/** NULL and empty targeting arrays both mean "every": null on the wire. */
const every = <T>(list: T[] | null) => (list?.length ? list : null);

export function toAdDto({ ad, slot, locale, region_id }: ServedAd): z.infer<typeof Ad> {
	return Ad.parse({
		id: ad.id,
		title: ad.title,
		body: ad.body,
		cta: ad.cta,
		image_url: imageUrl(ad),
		image_alt: ad.image_alt,
		// Clicks are counted by the API before its 302 to the stored link (TASK-35.2).
		click_url: `${config.API_URL.replace(/\/+$/, '')}/v1/ads/${ad.id}/click?s=${slot}&r=${region_id}`,
		is_house: ad.is_house,
		label: locale === 'sl' ? 'Oglas' : 'Ad',
	});
}

export function toAdminAdDto(ad: AdRow): z.infer<typeof AdminAd> {
	return AdminAd.parse({
		id: ad.id,
		title: ad.title,
		body: ad.body,
		cta: ad.cta,
		link_url: ad.link_url,
		image_url: imageUrl(ad),
		image_alt: ad.image_alt,
		locales: ad.locales,
		slots: ad.slots.map((slot) => slot.toLowerCase()),
		region_ids: every(ad.region_ids),
		municipality_ids: every(ad.municipality_ids),
		species: every(ad.species),
		starts_at: ad.starts_at?.toISOString() ?? null,
		ends_at: ad.ends_at?.toISOString() ?? null,
		status: ad.status,
		is_house: ad.is_house,
		house_kind: ad.house_kind,
		exclusive: ad.exclusive,
		weight: ad.weight,
		created_at: ad.created_at.toISOString(),
		updated_at: ad.updated_at.toISOString(),
	});
}

export function toAdImageUploadDto({ url, method, headers, expiresAt }: PresignedPut) {
	return AdImageUploadResponse.parse({ upload: { url, method, headers, expires_at: expiresAt.toISOString() } });
}

/** CTR = clicks / impressions (0 without impressions). */
export function toAdStatsDto(rows: AdStatsRow[]): z.infer<typeof AdStats> {
	return AdStats.parse({
		items: rows.map((row) => ({ ...row, ctr: row.impressions ? row.clicks / row.impressions : 0 })),
	});
}

export default { toAdDto, toAdminAdDto, toAdImageUploadDto, toAdStatsDto };
