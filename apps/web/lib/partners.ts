import { cache } from 'react';

import { ApiError, createApiClient, type Locale } from '@zivali/api/client';
import type { PartnerStats } from '@zivali/types';
import { env } from '@/lib/env';

// C14 partner stats for the P22 server page: no session token, one call per request (React cache). The API serves
// the newest hourly snapshot, already masked (1 to 4 → '<5', totals next to a masked region rounded to 10).

/** null when the API cannot answer: the audience section shows its error note, the rest of the page is unaffected. */
export const getPartnerStats = cache(async (locale: Locale): Promise<PartnerStats | null> => {
	try {
		return await createApiClient({ baseUrl: env.NEXT_PUBLIC_API_URL, locale }).request<PartnerStats>(
			'GET',
			'/v1/partners/stats'
		);
	} catch (error) {
		if (error instanceof ApiError) return null;
		throw error;
	}
});

/** The 12 GURS statistical regions (supabase/seed/geo/regions.geojson): the API's `region_slug` and our names. */
export const REGIONS: Record<string, Record<Locale, string>> = {
	pomurska: { sl: 'Pomurska', en: 'Mura' },
	podravska: { sl: 'Podravska', en: 'Drava' },
	koroska: { sl: 'Koroška', en: 'Carinthia' },
	savinjska: { sl: 'Savinjska', en: 'Savinja' },
	zasavska: { sl: 'Zasavska', en: 'Central Sava' },
	posavska: { sl: 'Posavska', en: 'Lower Sava' },
	'jugovzhodna-slovenija': { sl: 'Jugovzhodna Slovenija', en: 'Southeast Slovenia' },
	osrednjeslovenska: { sl: 'Osrednjeslovenska', en: 'Central Slovenia' },
	gorenjska: { sl: 'Gorenjska', en: 'Upper Carniola' },
	'primorsko-notranjska': { sl: 'Primorsko-notranjska', en: 'Littoral–Inner Carniola' },
	goriska: { sl: 'Goriška', en: 'Gorizia' },
	'obalno-kraska': { sl: 'Obalno-kraška', en: 'Coastal–Karst' },
};

/** Region options for a select, sorted by name in the page's language. */
export const regionOptions = (locale: Locale, slugs: string[] = Object.keys(REGIONS)) =>
	slugs
		.filter((slug) => REGIONS[slug])
		.map((slug) => ({ slug, name: REGIONS[slug]![locale] }))
		.sort((a, b) => a.name.localeCompare(b.name, locale));

/** Data state of the loaded GURS geodata (supabase/seed/geo/LICENSE.md), for `common.geo_attribution`. */
export const GEO_DATA_DATE = '2026-10-15';
