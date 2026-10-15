import Constants from 'expo-constants';
import { useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';

import { initAnalytics, trackScreen, type ConsentStorage, type FirebaseAnalytics } from '@zivali/analytics';
import { env } from '@/lib/env';

// C12 mobile wiring. Consent record: expo-secure-store key `zz_consent` (sync API, so the shared consent store works as is).
// The consent sheet (TASK-13.3) calls setConsent() from @zivali/analytics; until then nothing is ever granted.
export const consentStorage: ConsentStorage = {
	get: () => SecureStore.getItem('zz_consent'),
	set: (value) => SecureStore.setItem('zz_consent', value),
};

// Firebase only when asked for (EXPO_PUBLIC_ANALYTICS_PROVIDER=firebase), the Google config files were present at build
// time (app.config.ts sets extra.firebase) and the native module is in this binary; else the mock adapter, one dev warning.
function loadFirebase(): FirebaseAnalytics | undefined {
	if (env.EXPO_PUBLIC_ANALYTICS_PROVIDER !== 'firebase') return undefined;
	try {
		if (!Constants.expoConfig?.extra?.firebase)
			throw new Error('no google-services.json / GoogleService-Info.plist');
		// Lazy so builds and Jest without the native module keep working.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		return (require('@react-native-firebase/analytics') as { default: () => FirebaseAnalytics }).default();
	} catch (error) {
		if (__DEV__) console.warn(`Firebase Analytics off, using the mock adapter: ${(error as Error).message}`);
		return undefined;
	}
}

export function setupAnalytics(): void {
	const firebase = loadFirebase();
	initAnalytics({ provider: firebase ? 'firebase' : 'mock', storage: consentStorage, firebase });
}

/** Expo Router segments to a route template: `/r/[code]`, route groups dropped, never the real path. */
export const routeTemplate = (segments: string[]) =>
	'/' + segments.filter((s) => !(s.startsWith('(') && s.endsWith(')'))).join('/');

/** screen_view on every navigation (a no-op without consent). */
export function useScreenTracking(): void {
	const template = routeTemplate(useSegments());
	useEffect(() => trackScreen(template), [template]);
}
