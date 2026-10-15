'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Avatar as AvatarPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

// 32, 48 and 72 px, round; initials bold on secondary when there is no photo (system §10.9).
const avatarVariants = cva(
	'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-bold text-secondary-foreground',
	{
		variants: {
			size: { 32: 'size-8 text-sm', 48: 'size-12 text-lg', 72: 'size-[72px] font-display text-[26px]' },
		},
		defaultVariants: { size: 48 },
	}
);

function Avatar({
	className,
	size,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & VariantProps<typeof avatarVariants>) {
	return <AvatarPrimitive.Root data-slot="avatar" className={cn(avatarVariants({ size }), className)} {...props} />;
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	return (
		<AvatarPrimitive.Image
			data-slot="avatar-image"
			className={cn('size-full object-cover', className)}
			{...props}
		/>
	);
}

/** Initials; `label` is the person's name, so the initials avatar has an accessible name. */
function AvatarFallback({
	className,
	label,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback> & { label: string }) {
	return (
		<AvatarPrimitive.Fallback
			data-slot="avatar-fallback"
			role="img"
			aria-label={label}
			className={cn('grid size-full place-items-center', className)}
			{...props}
		/>
	);
}

export { Avatar, AvatarFallback, AvatarImage };
