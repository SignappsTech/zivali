import * as Location from 'expo-location';
import * as React from 'react';
import { AppState } from 'react-native';

import type { Point } from '@/lib/geo';
import { setCacheArea } from '@/lib/offline/sync';

/** `ask`: the OS can still prompt (show the primer first); `denied`: refused, the place search takes over. */
export type LocationAccess = 'unknown' | 'granted' | 'ask' | 'denied';

const FIX_MAX_AGE_MS = 10 * 60_000;

/**
 * The device's foreground location for the Map tab. Read only while the permission is granted (on mount and each time
 * the app comes back to the foreground); it never prompts by itself. It stays in memory and is never drawn: queries
 * round it to 2 decimals (C4), and each fix becomes the offline cache's `current` area (C17, TASK-85.2).
 */
export function useDeviceLocation() {
	const [here, setHere] = React.useState<Point | null>(null);
	const [access, setAccess] = React.useState<LocationAccess>('unknown');

	const locate = React.useCallback(async () => {
		try {
			const fix =
				(await Location.getLastKnownPositionAsync({ maxAge: FIX_MAX_AGE_MS })) ??
				(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
			const point = { lat: fix.coords.latitude, lng: fix.coords.longitude };
			setHere(point);
			await setCacheArea('current', point).catch(() => {});
		} catch {
			// No fix (location services off): keep the last one.
		}
	}, []);

	/** Re-reads the permission (and the location when granted). */
	const check = React.useCallback(
		(): Promise<LocationAccess> =>
			Location.getForegroundPermissionsAsync()
				.catch(() => null)
				.then(async (permission) => {
					const next: LocationAccess =
						permission?.granted === true ? 'granted' : permission?.canAskAgain === false ? 'denied' : 'ask';
					// After the fix, so `unknown` lasts until the first centre is known (or known to be missing).
					if (next === 'granted') await locate();
					setAccess(next);
					return next;
				}),
		[locate]
	);

	React.useEffect(() => {
		void check();
		const subscription = AppState.addEventListener('change', (state) => {
			if (state === 'active') void check();
		});
		return () => subscription.remove();
	}, [check]);

	return { here, access, check, setAccess };
}
