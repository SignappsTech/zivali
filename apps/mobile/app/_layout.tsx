import '../global.css';
import '@/lib/env';
import '@/lib/plural-rules';

import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_600SemiBold } from '@expo-google-fonts/atkinson-hyperlegible-next/600SemiBold';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { PortalHost } from '@rn-primitives/portal';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Provider } from 'react-redux';

import { ProfileI18n } from '@/lib/profile-i18n';
import { store } from '@/lib/store';
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

	// Data fetching is RTK Query (@zivali/api). Order: Redux Provider -> ProfileI18n (profile locale) -> Theme.
	return (
		<Provider store={store}>
			<ProfileI18n>
				<ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
					<StatusBar style="auto" />
					<Stack screenOptions={{ headerShown: false }} />
					<PortalHost />
				</ThemeProvider>
			</ProfileI18n>
		</Provider>
	);
}
