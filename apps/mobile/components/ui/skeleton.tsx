import * as React from 'react';
import { View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withRepeat,
	withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/utils';

/**
 * Muted block with an accent shimmer, static under reduced motion (system §10.9). Give it the final element's shape.
 * Hidden from assistive tech: announce "Nalaganje …" once per region (a Text with `aria-live="polite"`) instead.
 */
function Skeleton({ className, ...props }: React.ComponentProps<typeof View>) {
	const reduceMotion = useReducedMotion();
	const shimmer = useSharedValue(0);
	React.useEffect(() => {
		if (!reduceMotion) shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
	}, [reduceMotion, shimmer]);
	const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

	return (
		<View aria-hidden className={cn('overflow-hidden rounded-xl bg-muted', className)} {...props}>
			<Animated.View style={shimmerStyle} className="absolute inset-0 bg-accent" />
		</View>
	);
}

export { Skeleton };
