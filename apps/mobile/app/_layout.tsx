import '../global.css';
import '@/lib/env';

import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_600SemiBold } from '@expo-google-fonts/atkinson-hyperlegible-next/600SemiBold';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { IntlProvider } from 'use-intl';

import { locale, messages } from '@/lib/messages';
import { queryClient } from '@/lib/query';
import { NAV_THEME } from '@/lib/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

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

	useEffect(() => {
		if (ready) SplashScreen.hideAsync();
	}, [ready]);

	if (!ready) return null;

	return (
		<QueryClientProvider client={queryClient}>
			<IntlProvider locale={locale} messages={messages} timeZone="Europe/Ljubljana">
				<ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
					<StatusBar style="auto" />
					<Stack screenOptions={{ headerShown: false }} />
					<PortalHost />
				</ThemeProvider>
			</IntlProvider>
		</QueryClientProvider>
	);
}
