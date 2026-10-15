import * as React from 'react';
import type { NativeSyntheticEvent, TargetedEvent, ViewStyle } from 'react-native';

import { useColors } from '@/lib/theme';

type FocusHandler = ((event: NativeSyntheticEvent<TargetedEvent>) => void) | null | undefined;

/** The focus ring (system §6): 3 px `ring`, 2 px offset, drawn with the New Architecture outline style props. */
function useRingStyle(): ViewStyle {
	const { ring } = useColors();
	return { outlineColor: ring, outlineStyle: 'solid', outlineWidth: 3, outlineOffset: 2 };
}

/**
 * Shows the ring while a control has keyboard focus (hardware keyboard, D-pad, switch access); touch never focuses
 * a Pressable, so it stays hidden for touch users. Spread the handlers on the Pressable and put `ringStyle` in its style.
 */
function useFocusRing(onFocus?: FocusHandler, onBlur?: FocusHandler) {
	const [focused, setFocused] = React.useState(false);
	const ring = useRingStyle();
	return {
		focused,
		onFocus: (event: NativeSyntheticEvent<TargetedEvent>) => {
			setFocused(true);
			onFocus?.(event);
		},
		onBlur: (event: NativeSyntheticEvent<TargetedEvent>) => {
			setFocused(false);
			onBlur?.(event);
		},
		ringStyle: focused ? ring : undefined,
	};
}

export { useFocusRing, useRingStyle };
