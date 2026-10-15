import * as React from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/utils';

/**
 * 4 px primary bar on muted (system §10.9); `error` turns it destructive. Give it an accessible name (`aria-label`) and
 * say the label, percentage, done and failed states in words next to it, never colour alone.
 */
function Progress({
	className,
	value = 0,
	error = false,
	...props
}: React.ComponentProps<typeof View> & { value?: number; error?: boolean }) {
	return (
		<View
			role="progressbar"
			accessible
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={value}
			className={cn('h-1 w-full overflow-hidden rounded-[2px] bg-muted', className)}
			{...props}
		>
			<View className={cn('h-full', error ? 'bg-destructive' : 'bg-primary')} style={{ width: `${value}%` }} />
		</View>
	);
}

export { Progress };
