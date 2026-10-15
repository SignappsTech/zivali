'use client';

import type { VariantProps } from 'class-variance-authority';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import * as React from 'react';

import { buttonVariants } from '@/components/ui/button';
import { dialogClass, dialogFooterClass, dialogTitleClass, overlayClass } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function AlertDialog(props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
	return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger(props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
	return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

/** Confirmation dialog: focus starts on the cancel button (Radix), Escape closes, no close icon. */
function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
	return (
		<AlertDialogPrimitive.Portal>
			<AlertDialogPrimitive.Overlay data-slot="alert-dialog-overlay" className={overlayClass} />
			<AlertDialogPrimitive.Content
				data-slot="alert-dialog-content"
				className={cn(dialogClass, className)}
				{...props}
			/>
		</AlertDialogPrimitive.Portal>
	);
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
	return (
		<AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn(dialogTitleClass, className)} {...props} />
	);
}

function AlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
	return (
		<AlertDialogPrimitive.Description
			data-slot="alert-dialog-description"
			className={cn('mt-2', className)}
			{...props}
		/>
	);
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot="alert-dialog-footer" className={cn(dialogFooterClass, className)} {...props} />;
}

/** The main action; destructive by default, so it takes the primary's place (§10.2). */
function AlertDialogAction({
	className,
	variant = 'destructive',
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & Pick<VariantProps<typeof buttonVariants>, 'variant'>) {
	return (
		<AlertDialogPrimitive.Action
			data-slot="alert-dialog-action"
			className={cn(buttonVariants({ variant }), className)}
			{...props}
		/>
	);
}

function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
	return (
		<AlertDialogPrimitive.Cancel
			data-slot="alert-dialog-cancel"
			className={cn(buttonVariants({ variant: 'text' }), className)}
			{...props}
		/>
	);
}

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogTrigger,
};
