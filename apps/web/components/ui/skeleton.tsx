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
				'animate-shimmer rounded-xl bg-linear-100 from-muted from-30% via-accent via-50% to-muted to-70% bg-[length:200%_100%] motion-reduce:animate-none',
				className
			)}
			{...props}
		/>
	);
}

export { Skeleton };
