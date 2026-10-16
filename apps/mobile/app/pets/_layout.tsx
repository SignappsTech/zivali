import { Stack } from 'expo-router';

import { useColors } from '@/lib/theme';

/**
 * My pets stack under Profil: the list and the detail have a top bar with back only (the h1 is in the page); add and
 * edit draw their own bar (back, steps, close) and confirm leaving with changes, so the swipe back is off there.
 */
export default function PetsLayout() {
	const colors = useColors();
	return (
		<Stack
			screenOptions={{
				headerTitle: '',
				headerShadowVisible: false,
				headerBackButtonDisplayMode: 'minimal',
				headerStyle: { backgroundColor: colors.background },
				headerTintColor: colors.foreground,
				contentStyle: { backgroundColor: colors.background },
			}}
		>
			<Stack.Screen name="new" options={{ headerShown: false, gestureEnabled: false }} />
			<Stack.Screen name="[id]/edit" options={{ headerShown: false, gestureEnabled: false }} />
		</Stack>
	);
}
