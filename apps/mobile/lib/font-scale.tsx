import { Text as RNText, type TextProps } from 'react-native';

// OS text scaling is respected up to 200 % (design system section 12); bottom-nav labels stop at 1.3x so the bar
// grows in height instead of clipping (section 10.7).
export const TEXT_MAX_SCALE = 2;
export const NAV_LABEL_MAX_SCALE = 1.3;

export function Text(props: TextProps) {
	return <RNText maxFontSizeMultiplier={TEXT_MAX_SCALE} {...props} />;
}

export function NavLabel(props: TextProps) {
	return <RNText maxFontSizeMultiplier={NAV_LABEL_MAX_SCALE} {...props} />;
}
