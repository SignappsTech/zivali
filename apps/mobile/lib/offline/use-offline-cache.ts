import { useEffect } from 'react';

import { useSession } from '@zivali/api/auth';
import { cacheQuietHours } from '@/lib/offline/geofence';
import { AREA_MAX_KM, setCacheArea, startCacheSync } from '@/lib/offline/sync';

/**
 * Mount once (TASK-85.3 puts it in the root layout): starts the C17 triggers and keeps the `home` area in step with
 * the profile; no area when signed out or anonymous (no home point). Also caches the profile's quiet hours for the
 * offline geofence handler; without a loaded profile (offline start) the cached ones stay.
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
}
