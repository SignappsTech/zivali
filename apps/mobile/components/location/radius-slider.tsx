import * as React from 'react';
import { type GestureResponderEvent, View } from 'react-native';

const TARGET = 44;
const THUMB = 28;
const RING = 3;

type RadiusSliderProps = {
	/** Accessible name (the visible label above). */
	label: string;
	/** The value as words ("Polmer 500 m"), read by screen readers. */
	valueText: string;
	/** Help or warning line under the slider, read after the value. */
	hint?: string;
	/** Number of stops; the value is the stop index. */
	count: number;
	index: number;
	onChange(index: number): void;
};

/**
 * P5 radius control, stepped: a 44 px target with a 6 px `input` track, the `primary` fill up to the thumb and a 28 px
 * `primary` thumb on a 3 px surface ring. Tap or drag anywhere on it. One adjustable element for screen readers (swipe
 * up or down steps), named by `label` and read as `valueText`.
 */
export function RadiusSlider({ label, valueText, hint, count, index, onChange }: RadiusSliderProps) {
	const [width, setWidth] = React.useState(0);
	const fraction = count > 1 ? index / (count - 1) : 0;
	const travel = Math.max(0, width - THUMB);

	const step = (next: number) => {
		const clamped = Math.max(0, Math.min(count - 1, next));
		if (clamped !== index) onChange(clamped);
	};
	// The children ignore touches, so locationX is always measured from the track's left edge.
	const fromTouch = (event: GestureResponderEvent) => {
		if (travel > 0) step(Math.round(((event.nativeEvent.locationX - THUMB / 2) / travel) * (count - 1)));
	};

	return (
		<View
			accessible
			accessibilityRole="adjustable"
			aria-label={label}
			accessibilityHint={hint}
			accessibilityValue={{ min: 0, max: count - 1, now: index, text: valueText }}
			accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
			onAccessibilityAction={(event) => step(index + (event.nativeEvent.actionName === 'increment' ? 1 : -1))}
			onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
			onStartShouldSetResponder={() => true}
			onMoveShouldSetResponder={() => true}
			onResponderTerminationRequest={() => false}
			onResponderGrant={fromTouch}
			onResponderMove={fromTouch}
			className="h-11 justify-center"
		>
			<View pointerEvents="none" className="h-1.5 overflow-hidden rounded-full bg-input">
				<View className="h-full bg-primary" style={{ width: THUMB / 2 + travel * fraction }} />
			</View>
			<View
				pointerEvents="none"
				className="absolute rounded-full border-card bg-primary"
				style={{
					top: (TARGET - THUMB) / 2 - RING,
					left: travel * fraction - RING,
					width: THUMB + 2 * RING,
					height: THUMB + 2 * RING,
					borderWidth: RING,
				}}
			/>
		</View>
	);
}
