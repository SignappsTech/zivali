import type { ExpoConfig } from 'expo/config';

import { colors } from '@zivali/tokens/values';

// Working name until Q-001 is decided (design system §14). Splash marks are docs/design/brand/najdimo-mark*.svg as PNG.
const config: ExpoConfig = {
	name: 'Najdimo',
	owner: 'zivali',
	slug: 'zivali',
	scheme: 'zivali',
	version: '0.1.0',
	orientation: 'portrait',
	userInterfaceStyle: 'automatic',
	ios: { bundleIdentifier: 'si.signapps.zivali', supportsTablet: false },
	android: { package: 'si.signapps.zivali', allowBackup: false },
	plugins: [
		'expo-router',
		'expo-dev-client',
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
	extra: { eas: { projectId: '0b3c27cb-3512-4f5c-bb56-4b609f160e02' } },
};

export default config;
