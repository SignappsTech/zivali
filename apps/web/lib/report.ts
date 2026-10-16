import { cache } from 'react';

import { ApiError, createApiClient, type Locale } from '@zivali/api/client';
import type { DetailReport } from '@/components/report/slots/types';
import type { GeoReverseResponse } from '@zivali/types';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/** The report detail page's data: the report, `gone` (GONE: hidden, removed, closed > 30 days), or null (unknown). */
export type ReportResult = { report: DetailReport } | { gone: true } | null;

/**
 * GET /v1/reports/:code (C4) as the viewer: with the session token (signed in, or the anonymous manage-link session
 * from /m) a manager gets the owner view, everyone else the public read model. One call per request (React cache),
 * shared by generateMetadata and the page.
 */
export const getReport = cache(async (locale: Locale, code: string): Promise<ReportResult> => {
	const client = createApiClient({
		baseUrl: env.NEXT_PUBLIC_API_URL,
		locale,
		getAccessToken: async () => (await (await createClient()).auth.getSession()).data.session?.access_token,
	});
	try {
		return { report: await client.request<DetailReport>('GET', `/v1/reports/${encodeURIComponent(code)}`) };
	} catch (error) {
		if (error instanceof ApiError && error.code === 'GONE') return { gone: true };
		// Held reads as unknown to everyone but its managers (C4); a malformed code is unknown too.
		if (error instanceof ApiError && (error.code === 'NOT_FOUND' || error.code === 'VALIDATION')) return null;
		throw error;
	}
});

/** The area's place: `label` "Šiška, Ljubljana", `area` "Šiška", `municipality` "Ljubljana" (a settlement that is its own municipality: all three the same). */
export type ReportPlace = { label: string; area: string; municipality: string };

/**
 * The reverse lookup of the report's public (fuzzed) point (C6 POST /v1/geo/reverse): the district or settlement with
 * its municipality. Undefined outside Slovenia or when the lookup fails (rate limit, outage): the page then shows the
 * approximate-area sentence without a name (P9 "map offline").
 */
export const getPlace = cache(async (locale: Locale, lat: number, lng: number): Promise<ReportPlace | undefined> => {
	try {
		const { place } = await createApiClient({
			baseUrl: env.NEXT_PUBLIC_API_URL,
			locale,
		}).request<GeoReverseResponse>('POST', '/v1/geo/reverse', { body: { lat, lng } });
		if (!place) return undefined;
		const comma = place.label.lastIndexOf(', ');
		return comma < 0
			? { label: place.label, area: place.label, municipality: place.label }
			: { label: place.label, area: place.label.slice(0, comma), municipality: place.label.slice(comma + 2) };
	} catch {
		return undefined;
	}
});
