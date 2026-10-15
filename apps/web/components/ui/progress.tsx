'use client';

import { Progress as ProgressPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * 4 px primary bar on muted (system §10.9); `error` turns it destructive. Give it an accessible name and say the
 * label, percentage, done and failed states in words next to it, never colour alone.
 */
function Progress({
	className,
	value,
	error = false,
	...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { error?: boolean }) {
	return (
		<ProgressPrimitive.Root
			data-slot="progress"
			data-error={error || undefined}
			value={value}
			className={cn('relative h-1 w-full overflow-hidden rounded-[2px] bg-muted', className)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				data-slot="progress-indicator"
				className={cn(
					'h-full w-full transition-transform duration-[220ms] motion-reduce:transition-none',
					error ? 'bg-destructive' : 'bg-primary'
				)}
				style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
			/>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
