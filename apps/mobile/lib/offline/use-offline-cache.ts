import { skipToken } from '@reduxjs/toolkit/query';
import { useEffect } from 'react';

import { useSession } from '@zivali/api/auth';
import { flattenPages } from '@zivali/api/pagination';
import { useListMyReportsInfiniteQuery } from '@zivali/api/reports';
import { cacheOwnReports, cacheQuietHours } from '@/lib/offline/geofence';
import { AREA_MAX_KM, setCacheArea, startCacheSync } from '@/lib/offline/sync';

/**
 * Mount once (TASK-85.3 puts it in the root layout, under the store): starts the C17 triggers and keeps the `home`
 * area in step with the profile; no area when signed out or anonymous (no home point). Also caches the profile's quiet
 * hours and the account's own report ids for the offline geofence handler; without a loaded profile (offline start)
 * the cached ones stay.
 */
export function useOfflineCache(): void {
	const { me } = useSession();
	useEffect(() => startCacheSync(), []);
	const home = me?.home;
	const lat = home?.lat;
	const lng = home?.lng;
	const radius = me?.home_radius_km;
	useEffect(() => {
		const point = lat === undefined || lng === undefined ? null : { lat, lng };
		void setCacheArea('home', point, radius ?? AREA_MAX_KM).catch(() => {});
	}, [lat, lng, radius]);
	const quietFrom = me?.quiet_from;
	const quietTo = me?.quiet_to;
	useEffect(() => {
		if (quietFrom !== undefined && quietTo !== undefined)
			cacheQuietHours({ quiet_from: quietFrom, quiet_to: quietTo });
	}, [quietFrom, quietTo]);
	// The first page (newest first) is enough for the reports an owner still searches with; anonymous reports are
	// known by their manage tokens. Refetched when a report is made or changed (the Reports tag).
	const { data: mine } = useListMyReportsInfiniteQuery(me && !me.is_anonymous ? undefined : skipToken);
	const own = mine && flattenPages(mine).map((report) => report.id);
	const ownKey = own?.join(',');
	useEffect(() => {
		if (ownKey !== undefined) cacheOwnReports(ownKey ? ownKey.split(',') : []);
	}, [ownKey]);
}
