import { Stack } from 'expo-router';

import { useColors } from '@/lib/theme';

/** Settings stack under Profil: standard top bar (back, title) on the background, no hairline. */
export default function SettingsLayout() {
	const colors = useColors();
	return (
		<Stack
			screenOptions={{
				headerShadowVisible: false,
				headerBackButtonDisplayMode: 'minimal',
				headerStyle: { backgroundColor: colors.background },
				headerTintColor: colors.foreground,
				headerTitleStyle: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 20 },
				contentStyle: { backgroundColor: colors.background },
			}}
		/>
	);
}
