// C4 GET /v1/sync/reports (sync_public_reports, TASK-85.1): the feed of the mobile offline cache (C17). A plain
// client call rather than an RTK endpoint, so the background task runs it without a store or React.
import type { CachedReport, SyncArea, SyncReportsQuery, SyncReportsResponse } from '@zivali/types';

import type { ApiClient } from './client.ts';

export type { CachedReport, SyncArea, SyncReportsResponse };

// Location in URLs (C4 §REST, CH-19): area centres go out rounded to 2 decimals (about 1 km).
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Upserts, removed ids and `server_time` (the next `since`) for up to 3 areas; first sync without `since`. */
export function syncReports(
	client: ApiClient,
	{ areas, since, limit }: SyncReportsQuery
): Promise<SyncReportsResponse> {
	const rounded = areas.map(({ lat, lng, radius_km }) => ({ lat: round2(lat), lng: round2(lng), radius_km }));
	return client.request('GET', '/v1/sync/reports', { query: { areas: JSON.stringify(rounded), since, limit } });
}
