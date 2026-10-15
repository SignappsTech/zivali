import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import { colors } from '@zivali/tokens/values';

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
