import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Muted block with an accent shimmer, static under reduced motion (system §10.9). Give it the final element's shape.
 * Hidden from assistive tech: announce "Nalaganje …" once per region in a `role="status"` element instead.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="skeleton"
			aria-hidden="true"
			className={cn(
				'animate-shimmer rounded-xl bg-muted bg-[linear-gradient(100deg,hsl(var(--muted))_30%,hsl(var(--accent))_50%,hsl(var(--muted))_70%)] bg-[length:200%_100%] motion-reduce:animate-none',
				className
			)}
			{...props}
		/>
	);
}

export { Skeleton };
