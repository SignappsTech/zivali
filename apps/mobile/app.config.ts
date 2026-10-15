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

// Working name until Q-001 is decided (design system §14). Splash marks are docs/design/brand/najdimo-mark*.svg as PNG.
const config: ExpoConfig = {
	name: 'Najdimo',
	owner: 'zivali',
	slug: 'zivali',
	scheme: 'zivali',
	version: '0.1.0',
	orientation: 'portrait',
	userInterfaceStyle: 'automatic',
	ios: { bundleIdentifier: 'si.signapps.zivali', supportsTablet: false, googleServicesFile: googleServiceInfoPlist },
	android: { package: 'si.signapps.zivali', allowBackup: false, googleServicesFile },
	plugins: [
		'expo-router',
		'expo-dev-client',
		// iOS BGTaskScheduler identifier and the `processing` background mode for the offline cache refresh (C17).
		'expo-background-task',
		[
			'expo-splash-screen',
			{
				image: './assets/splash.png',
				backgroundColor: colors.light.background,
				dark: { image: './assets/splash-dark.png', backgroundColor: colors.dark.background },
			},
		],
	],
	experiments: { typedRoutes: true },
	// EXPO_PUBLIC_* (API and app URLs, Supabase) come from the eas.json profile env; only the environment name is surfaced here.
	extra: {
		appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'local',
		eas: { projectId: '0b3c27cb-3512-4f5c-bb56-4b609f160e02' },
	},
};

export default config;
