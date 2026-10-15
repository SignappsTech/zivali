'use client';

import { Dialog as SheetPrimitive } from 'radix-ui';
import * as React from 'react';

import { overlayClass } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

/**
 * Bottom sheet (system §10.7): card surface, top radius 28, shadow-lg, 20 px sides, up to 92 % of the screen. It
 * slides up (cross-fades under reduced motion). The grabber is a 44 px close button named `closeLabel`, the button
 * alternative to the swipe gesture.
 */
function SheetContent({
	className,
	children,
	closeLabel,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { closeLabel: string }) {
	return (
		<SheetPrimitive.Portal>
			<SheetPrimitive.Overlay data-slot="sheet-overlay" className={overlayClass} />
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(
					'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-y-auto rounded-t-sheet bg-card px-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-card-foreground shadow-lg transition-transform duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] outline-hidden starting:translate-y-full motion-reduce:transition-opacity motion-reduce:duration-[80ms] motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-0',
					className
				)}
				{...props}
			>
				<SheetPrimitive.Close
					aria-label={closeLabel}
					className="-mb-3 flex h-11 w-full shrink-0 cursor-pointer items-center justify-center rounded-t-sheet before:h-[5px] before:w-10 before:rounded-[3px] before:bg-input focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring"
				/>
				{children}
			</SheetPrimitive.Content>
		</SheetPrimitive.Portal>
	);
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn(
				'pt-3 font-display text-2xl leading-[30px] font-bold tracking-[-0.015em] text-balance lg:text-3xl lg:leading-9',
				className
			)}
			{...props}
		/>
	);
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn('mt-2 text-muted-foreground', className)}
			{...props}
		/>
	);
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger };
