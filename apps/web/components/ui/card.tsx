import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Flat card (system §10.6): card surface, radius 24, padding 24, no border, no shadow, never nested. */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot="card" className={cn('rounded-card bg-card p-6 text-card-foreground', className)} {...props} />;
}

/** h3 by default; pass `asChild` with another heading level when the outline needs it. */
function CardTitle({ className, asChild, ...props }: React.ComponentProps<'h3'> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : 'h3';
	return (
		<Comp
			data-slot="card-title"
			className={cn(
				'font-display text-xl leading-7 font-semibold tracking-[-0.01em] text-balance lg:text-2xl lg:leading-8',
				className
			)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot="card-content" className={cn('mt-2', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot="card-footer" className={cn('mt-5 flex flex-wrap gap-3', className)} {...props} />;
}

export { Card, CardContent, CardFooter, CardTitle };
