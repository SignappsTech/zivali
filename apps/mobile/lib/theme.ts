import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';
import { useColorScheme } from 'nativewind';
import type { ViewStyle } from 'react-native';

import { colors, elevationNative } from '@zivali/tokens/values';

// React Navigation cannot read NativeWind classes, so it takes the resolved token values.
const navTheme = (base: Theme, c: (typeof colors)['light' | 'dark']): Theme => ({
	...base,
	colors: {
		primary: c.primary,
		background: c.background,
		card: c.card,
		text: c.foreground,
		border: c.border,
		notification: c.destructive,
	},
});

export const NAV_THEME = { light: navTheme(DefaultTheme, colors.light), dark: navTheme(DarkTheme, colors.dark) };

/** Resolved token colours for the current mode, for style props that classes cannot reach (outline, SVG stroke). */
export function useColors() {
	const { colorScheme } = useColorScheme();
	return colors[colorScheme ?? 'light'];
}

/** Native shadow for surfaces that float (system §6): `lg` for sheets, `pop` for dialogs, menus and toasts. */
export function shadow(level: 'md' | 'lg' | 'pop'): ViewStyle {
	const { shadowOffsetY, ...rest } = elevationNative[level];
	return { ...rest, shadowOffset: { width: 0, height: shadowOffsetY } };
}
