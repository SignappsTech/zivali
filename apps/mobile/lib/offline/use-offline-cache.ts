import { useEffect } from 'react';

import { useSession } from '@zivali/api/auth';
import { AREA_MAX_KM, setCacheArea, startCacheSync } from '@/lib/offline/sync';

/**
 * Mount once (TASK-85.3 puts it in the root layout): starts the C17 triggers and keeps the `home` area in step with
 * the profile; no area when signed out or anonymous (no home point).
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
}
