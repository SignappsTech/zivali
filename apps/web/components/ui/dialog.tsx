'use client';

import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Dialog as DialogPrimitive } from 'radix-ui';
import * as React from 'react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Shared with AlertDialog and Sheet (system §10.9): scrim behind modals; enter cross-fades (80 ms under reduced motion).
const overlayClass =
	'fixed inset-0 z-50 bg-[hsl(var(--scrim)/var(--scrim-alpha))] transition-opacity duration-[220ms] starting:opacity-0 motion-reduce:duration-[80ms]';
const dialogClass =
	'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2.5rem)] w-[calc(100%-2.5rem)] max-w-[440px] -translate-1/2 overflow-y-auto rounded-card bg-popover px-6 pt-7 pb-5 text-popover-foreground shadow-pop transition-opacity duration-[220ms] outline-hidden starting:opacity-0 motion-reduce:duration-[80ms]';
const dialogTitleClass = 'font-display text-lg leading-7 font-semibold tracking-[-0.005em] text-balance lg:text-xl';
// Buttons stacked full width: the main action, then the text button.
const dialogFooterClass = 'mt-6 grid gap-2 *:w-full';

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** Focus is trapped and Escape closes. `closeLabel` adds the close icon button top right (content dialogs). */
function DialogContent({
	className,
	children,
	closeLabel,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { closeLabel?: string }) {
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay data-slot="dialog-overlay" className={overlayClass} />
			<DialogPrimitive.Content data-slot="dialog-content" className={cn(dialogClass, className)} {...props}>
				{children}
				{closeLabel && (
					<DialogPrimitive.Close
						aria-label={closeLabel}
						className={buttonVariants({
							variant: 'ghost',
							size: 'icon',
							className: 'absolute top-3 right-3',
						})}
					>
						<XIcon weight="bold" aria-hidden="true" />
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	);
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return <DialogPrimitive.Title data-slot="dialog-title" className={cn(dialogTitleClass, className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return <DialogPrimitive.Description data-slot="dialog-description" className={cn('mt-2', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot="dialog-footer" className={cn(dialogFooterClass, className)} {...props} />;
}

export {
	Dialog,
	DialogClose,
	dialogClass,
	DialogContent,
	DialogDescription,
	DialogFooter,
	dialogFooterClass,
	DialogTitle,
	dialogTitleClass,
	DialogTrigger,
	overlayClass,
};
