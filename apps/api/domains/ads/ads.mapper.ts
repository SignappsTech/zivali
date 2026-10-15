// Served ad → C14 `Ad` DTO, parsed with the shared schema (targeting, status and link_url never reach a client).
import type { z } from 'zod';

import { Ad } from '@zivali/validation';

import { config } from '../../lib/config.ts';
import { PhotosDomain } from '../photos/index.ts';
import type { ServedAd } from './ads.domain.ts';

export function toAdDto({ ad, slot, locale, region_id }: ServedAd): z.infer<typeof Ad> {
	return Ad.parse({
		id: ad.id,
		title: ad.title,
		body: ad.body,
		cta: ad.cta,
		image_url: ad.image_path ? PhotosDomain.mediaUrl({ bucket: 'media', key: ad.image_path }) : null,
		image_alt: ad.image_alt,
		// Clicks are counted by the API before its 302 to the stored link (TASK-35.2).
		click_url: `${config.API_URL.replace(/\/+$/, '')}/v1/ads/${ad.id}/click?s=${slot}&r=${region_id}`,
		is_house: ad.is_house,
		label: locale === 'sl' ? 'Oglas' : 'Ad',
	});
}

export default { toAdDto };
