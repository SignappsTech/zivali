import { render } from '@testing-library/react-native';
import * as React from 'react';

import RootLayout from '@/app/_layout';
import { useOfflineCache } from '@/lib/offline/use-offline-cache';

// The root layout with its providers; every screen, sheet and service behind it is a stand-in.
jest.mock('@/global.css', () => ({}));
jest.mock('@/lib/env', () => ({ env: {} }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('expo-router', () => ({
	Stack: () => null,
	ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
	ErrorBoundary: () => null,
}));
jest.mock('@/components/anonymous/captcha-sheet', () => ({ CaptchaSheet: () => null }));
jest.mock('@/components/photos/prepare-photo', () => ({ filePut: jest.fn() }));
jest.mock('@/components/shell/consent', () => ({ ConsentSheet: () => null }));
// The session-ended notice (TASK-87.6) reads the offline store; its own suite covers it.
jest.mock('@/components/shell/session-ended', () => ({ SessionEndedNotice: () => null }));
jest.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
jest.mock('@/lib/analytics', () => ({ setupAnalytics: jest.fn(), useScreenTracking: jest.fn() }));
jest.mock('@/lib/anonymous', () => ({ ensureSession: jest.fn() }));
jest.mock('@/lib/offline/outbox', () => ({ startOutbox: jest.fn(() => () => {}) }));
jest.mock('@/lib/offline/use-offline-cache', () => ({ useOfflineCache: jest.fn() }));
jest.mock('@/lib/push', () => ({ usePushNotifications: jest.fn() }));
jest.mock('@/lib/store', () => ({
	apiClient: {},
	store: jest.requireActual<typeof import('@reduxjs/toolkit')>('@reduxjs/toolkit').configureStore({
		reducer: () => ({}),
	}),
}));
jest.mock('@/lib/profile-i18n', () => {
	const { IntlProvider } = jest.requireActual<typeof import('use-intl')>('use-intl');
	const sl = jest.requireActual<typeof import('@zivali/i18n/dist/sl.json')>('@zivali/i18n/dist/sl.json');
	return {
		ProfileI18n: ({ children }: { children: React.ReactNode }) => (
			<IntlProvider locale="sl" messages={sl}>
				{children}
			</IntlProvider>
		),
	};
});

test('mounts the offline cache hook (C17 triggers and the profile home area, TASK-85.2)', async () => {
	await render(<RootLayout />);

	expect(useOfflineCache).toHaveBeenCalled();
});
