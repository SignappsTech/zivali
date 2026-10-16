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
		// A slow API ends in the error page ("Poskusi znova") after 3 s rather than a hanging page.
		const path = `/v1/reports/${encodeURIComponent(code)}`;
		return { report: await client.request<DetailReport>('GET', path, { signal: AbortSignal.timeout(3000) }) };
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
 * Reverse lookups that worked, by `locale|lat|lng`, least recently used first. Every server-side lookup comes from the
 * web server's one IP and /v1/geo/reverse allows 60 a minute per IP (C6); a report's fuzzed point and its place never
 * change, so the name is asked for once per point. Failures are not kept.
 */
const places = new Map<string, ReportPlace>();
const PLACES_MAX = 2000;

/**
 * The reverse lookup of the report's public (fuzzed) point (C6 POST /v1/geo/reverse): the district or settlement with
 * its municipality. Undefined outside Slovenia or when the lookup fails (rate limit, outage, 1.5 s timeout): the page
 * then shows the approximate-area sentence without a name (P9 "map offline").
 */
export const getPlace = cache(async (locale: Locale, lat: number, lng: number): Promise<ReportPlace | undefined> => {
	const key = `${locale}|${lat}|${lng}`;
	const kept = places.get(key);
	if (kept) {
		places.delete(key);
		places.set(key, kept);
		return kept;
	}
	try {
		const { place } = await createApiClient({
			baseUrl: env.NEXT_PUBLIC_API_URL,
			locale,
		}).request<GeoReverseResponse>('POST', '/v1/geo/reverse', {
			body: { lat, lng },
			signal: AbortSignal.timeout(1500),
		});
		if (!place) return undefined;
		const comma = place.label.lastIndexOf(', ');
		const found =
			comma < 0
				? { label: place.label, area: place.label, municipality: place.label }
				: { label: place.label, area: place.label.slice(0, comma), municipality: place.label.slice(comma + 2) };
		places.set(key, found);
		if (places.size > PLACES_MAX) places.delete(places.keys().next().value!);
		return found;
	} catch {
		return undefined;
	}
});
