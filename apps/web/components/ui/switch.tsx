'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * 56 x 32 switch: track input (off) or primary (on), thumb card; the thumb position carries the state (§10.3).
 * Put it in a `label` row (`flex min-h-14 items-center justify-between gap-4 font-bold`) so the row is the target.
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				'inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full bg-input p-1 transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:bg-muted disabled:data-[state=checked]:bg-muted motion-reduce:transition-none',
				className
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className="block size-6 rounded-full bg-card transition-transform duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] data-[disabled]:bg-muted-foreground data-[state=checked]:translate-x-6 motion-reduce:transition-none"
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
