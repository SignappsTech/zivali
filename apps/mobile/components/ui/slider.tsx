import * as React from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useFocusRing } from '@/components/ui/focus-ring';

const THUMB = 28;
const HALO = 3;

type SliderProps = {
	value: number;
	min: number;
	max: number;
	step?: number;
	onValueChange: (value: number) => void;
	/** Accessible name: the visible label's text. */
	label: string;
	/** The value as read out, e.g. "10 km". */
	valueText: string;
	testID?: string;
};

/**
 * Range slider (P4 and P5 recipe): 44 px target, 6 px track in `input` filled with `primary` up to a 28 px `primary`
 * thumb with a 3 px `card` halo. Tap or drag the track (a horizontal pan, so the sheet still scrolls vertically);
 * screen readers change it one step at a time (a slider: swipe up or down).
 */
function Slider({ value, min, max, step = 1, onValueChange, label, valueText, testID }: SliderProps) {
	const [width, setWidth] = React.useState(0);
	const focus = useFocusRing();

	const change = (next: number) => {
		const clamped = Math.min(max, Math.max(min, next));
		if (clamped !== value) onValueChange(clamped);
	};
	// The thumb's centre travels from THUMB / 2 to width - THUMB / 2.
	const atX = (x: number) => {
		if (width > THUMB) change(min + Math.round((((x - THUMB / 2) / (width - THUMB)) * (max - min)) / step) * step);
	};
	const gesture = Gesture.Race(
		Gesture.Pan()
			.runOnJS(true)
			.activeOffsetX([-6, 6])
			.failOffsetY([-10, 10])
			.onUpdate((event) => atX(event.x)),
		Gesture.Tap()
			.runOnJS(true)
			.onEnd((event) => atX(event.x))
	);

	const fraction = max > min ? (Math.min(max, Math.max(min, value)) - min) / (max - min) : 0;
	const offset = fraction * Math.max(0, width - THUMB);

	return (
		<GestureDetector gesture={gesture}>
			<View
				testID={testID}
				accessible
				focusable
				role="slider"
				aria-label={label}
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={value}
				aria-valuetext={valueText}
				accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
				onAccessibilityAction={(event) =>
					change(value + (event.nativeEvent.actionName === 'increment' ? step : -step))
				}
				onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
				onFocus={focus.onFocus}
				onBlur={focus.onBlur}
				className="h-11 rounded-full"
				style={focus.ringStyle}
			>
				<View className="absolute inset-x-0 top-[19px] h-1.5 rounded-full bg-input" />
				<View
					className="absolute left-0 top-[19px] h-1.5 rounded-full bg-primary"
					style={{ width: offset + THUMB / 2 }}
				/>
				<View
					className="absolute rounded-full border-card bg-primary"
					style={{
						top: (44 - THUMB) / 2 - HALO,
						left: offset - HALO,
						width: THUMB + 2 * HALO,
						height: THUMB + 2 * HALO,
						borderWidth: HALO,
					}}
				/>
			</View>
		</GestureDetector>
	);
}

export { Slider };
