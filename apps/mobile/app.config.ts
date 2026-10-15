import type { ExpoConfig } from 'expo/config';

import { colors } from '@zivali/tokens/values';

// Firebase files are EAS file secrets (the env var holds their path on the build machine) or, locally, files in .secrets/.
// Absent file: the key is omitted so the build and app still work, and EXPO_PUBLIC_ANALYTICS_PROVIDER stays 'mock'.
// Expo evaluates this file from apps/mobile; the project has no @types/node, hence require().
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { existsSync } = require('node:fs') as { existsSync: (path: string) => boolean };
const firebaseFile = (envName: string, fallback: string) => {
	const path = process.env[envName] || `../../.secrets/${fallback}`;
	return existsSync(path) ? path : undefined;
};
const googleServicesFile = firebaseFile('GOOGLE_SERVICES_JSON', 'google-services.json');
const googleServiceInfoPlist = firebaseFile('GOOGLE_SERVICE_INFO_PLIST', 'GoogleService-Info.plist');

// Native sign-in (P16): Google on iOS needs its reversed client id as a URL scheme (Android needs no config); Apple is
// off until the Apple Developer account exists (EXPO_PUBLIC_APPLE_SIGN_IN, as in lib/env.ts).
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const appleSignIn = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === 'true';

// Deep links (C15): the host of the web app this build belongs to (eas.json profile: staging or production). Unset
// (local dev builds): no associated domains and no https intent filter; the zivali:// scheme still works. The scheme is
// the dev and fallback path; no exp:// redirects. Verification files: apps/web /.well-known (APPLE_TEAM_ID, ANDROID_CERT_SHA256).
const appHost = process.env.EXPO_PUBLIC_APP_URL ? new URL(process.env.EXPO_PUBLIC_APP_URL).host : undefined;
const linkPaths = [
	{ pathPrefix: '/r/' },
	{ pathPrefix: '/en/r/' },
	{ path: '/m' },
	{ path: '/en/m' },
	{ pathPrefix: '/payments/' },
];

// Working name until Q-001 is decided (design system §14). Splash marks are docs/design/brand/najdimo-mark*.svg as PNG.
const config: ExpoConfig = {
	name: 'Najdimo',
	owner: 'zivali',
	slug: 'zivali',
	scheme: 'zivali',
	version: '0.1.0',
	orientation: 'portrait',
	userInterfaceStyle: 'automatic',
	locales: { en: './locales/en.json', sl: './locales/sl.json' },
	ios: {
		bundleIdentifier: 'si.signapps.zivali',
		supportsTablet: false,
		googleServicesFile: googleServiceInfoPlist,
		usesAppleSignIn: appleSignIn,
		associatedDomains: appHost ? [`applinks:${appHost}`] : undefined,
	},
	android: {
		package: 'si.signapps.zivali',
		allowBackup: false,
		googleServicesFile,
		intentFilters: appHost
			? [
					{
						action: 'VIEW',
						autoVerify: true,
						data: linkPaths.map((path) => ({ scheme: 'https', host: appHost, ...path })),
						category: ['BROWSABLE', 'DEFAULT'],
					},
				]
			: undefined,
	},
	plugins: [
		'expo-router',
		'expo-dev-client',
		// Native Firebase needs both Google config files; without them the build skips it and analytics stays on the mock.
		...(googleServicesFile && googleServiceInfoPlist
			? ([
					'@react-native-firebase/app',
					['expo-build-properties', { ios: { useFrameworks: 'static' } }],
				] as NonNullable<ExpoConfig['plugins']>)
			: []),
		// iOS BGTaskScheduler identifier and the `processing` background mode for the offline cache refresh (C17).
		'expo-background-task',
		// Push token + notification permission (primer first, lib/push.ts); the token needs FCM/APNs credentials (Q-007).
		'expo-notifications',
		// Location while in use, and Always for the opt-in local proximity alerts (lib/offline/geofence.ts, TASK-87.2
		// primer first): OS geofencing only, which expo-location runs under the iOS `location` background mode. The
		// Play background-location declaration and Apple's review of Always must match this copy (TASK-75).
		[
			'expo-location',
			{
				locationWhenInUsePermission:
					'Lokacijo uporabimo, da hitreje označite kraj in vidite prijave v bližini. Javno prikažemo le približno območje.',
				locationAlwaysAndWhenInUsePermission:
					'Če vklopite opomnike v bližini, telefon v ozadju preveri, ali ste blizu območja, kjer je bila nazadnje videna izgubljena žival. Vaša lokacija ne zapusti telefona.',
				locationAlwaysPermission: false,
				isIosBackgroundLocationEnabled: true,
				isAndroidBackgroundLocationEnabled: true,
			},
		],
		// MapLibre Native for MapView (components/map); it never shows or reads the device location itself.
		'@maplibre/maplibre-react-native',
		[
			'expo-splash-screen',
			{
				image: './assets/splash.png',
				backgroundColor: colors.light.background,
				dark: { image: './assets/splash-dark.png', backgroundColor: colors.dark.background },
			},
		],
		// Camera for the photo step (P2 primer first, permissions.camera_body); the gallery is the system picker, which
		// needs no photo library permission, and photos only (no microphone).
		[
			'expo-image-picker',
			{
				cameraPermission:
					'Kamero uporabimo samo, ko fotografirate žival. Fotografijo lahko izberete tudi iz galerije.',
				photosPermission: 'Fotografije dostopamo samo, ko izberete sliko živali. Ostalih fotografij ne beremo.',
				microphonePermission: false,
			},
		],
		...(googleIosClientId
			? [
					[
						'@react-native-google-signin/google-signin',
						{ iosUrlScheme: googleIosClientId.split('.').reverse().join('.') },
					] as [string, object],
				]
			: []),
	],
	experiments: { typedRoutes: true },
	// EXPO_PUBLIC_* (API and app URLs, Supabase) come from the eas.json profile env; only the environment name is surfaced here.
	extra: {
		firebase: Boolean(googleServicesFile && googleServiceInfoPlist),
		appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'local',
		eas: { projectId: '0b3c27cb-3512-4f5c-bb56-4b609f160e02' },
	},
};

export default config;
