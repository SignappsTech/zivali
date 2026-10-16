import '../global.css';
import '@/lib/env';
import '@/lib/plural-rules';

import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_600SemiBold } from '@expo-google-fonts/atkinson-hyperlegible-next/600SemiBold';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PortalHost } from '@rn-primitives/portal';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { useTranslations } from 'use-intl';

import { CaptchaSheet } from '@/components/anonymous/captcha-sheet';
import { filePut } from '@/components/photos/prepare-photo';
import { ConsentSheet } from '@/components/shell/consent';
import { SessionEndedNotice } from '@/components/shell/session-ended';
import { Toaster } from '@/components/ui/sonner';
import { setupAnalytics, useScreenTracking } from '@/lib/analytics';
import { ensureSession } from '@/lib/anonymous';
import { startOutbox } from '@/lib/offline/outbox';
import { useOfflineCache } from '@/lib/offline/use-offline-cache';
import { ProfileI18n } from '@/lib/profile-i18n';
import { usePushNotifications } from '@/lib/push';
import { apiClient, store } from '@/lib/store';
import { NAV_THEME } from '@/lib/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();
setupAnalytics();

export default function RootLayout() {
	const { colorScheme } = useColorScheme();
	const [fontsLoaded, fontError] = useFonts({
		BricolageGrotesque_600SemiBold,
		BricolageGrotesque_700Bold,
		AtkinsonHyperlegibleNext_400Regular,
		AtkinsonHyperlegibleNext_600SemiBold,
		AtkinsonHyperlegibleNext_700Bold,
	});
	const ready = fontsLoaded || fontError;
	useScreenTracking();
	// Queued found and sighted reports (C17): sent on launch, resume and reconnect; the captcha sheet below serves it.
	useEffect(() => startOutbox({ api: apiClient, ensureSession, put: filePut }), []);

	useEffect(() => {
		if (ready) SplashScreen.hideAsync();
	}, [ready]);

	if (!ready) return null;

	// Data fetching is RTK Query (@zivali/api). Order: gestures -> Redux Provider -> ProfileI18n (profile locale) ->
	// Theme -> sheets (the kit's Sheet and Select) -> screens, toasts and the dialog portal.
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<Provider store={store}>
				<ProfileI18n>
					<ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
						<BottomSheetModalProvider>
							<StatusBar style="auto" />
							<Stack screenOptions={{ headerShown: false }} />
							<ConsentSheet />
							<CaptchaSheet />
							<PushNotifications />
							<OfflineCache />
							<SessionEndedNotice />
							<AppToaster />
							<PortalHost />
						</BottomSheetModalProvider>
					</ThemeProvider>
				</ProfileI18n>
			</Provider>
		</GestureHandlerRootView>
	);
}

// 12 px above the bottom navigation (68 px plus the safe area, which the Toaster adds itself).
const TOAST_OFFSET = 80;

/** Push token per session and the tap on a push or proximity alert (C10); after the Stack, so taps can navigate. */
function PushNotifications() {
	usePushNotifications();
	return null;
}

/**
 * The C17 cache triggers and the home area from the profile (null signed out), under the Provider for the session.
 * The background task itself is defined in lib/offline/sync.ts and imported by index.ts, before the router, for a headless launch.
 */
function OfflineCache() {
	useOfflineCache();
	return null;
}

function AppToaster() {
	const t = useTranslations('common');
	return <Toaster closeLabel={t('close')} offset={TOAST_OFFSET} />;
}
