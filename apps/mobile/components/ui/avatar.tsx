import * as AvatarPrimitive from '@rn-primitives/avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

// 32, 48 and 72 px, round; initials bold on secondary when there is no photo (system §10.9).
const avatarVariants = cva('shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary', {
	variants: { size: { 32: 'size-8', 48: 'size-12', 72: 'size-[72px]' } },
	defaultVariants: { size: 48 },
});

const initialsClass = {
	32: 'font-sans-bold text-sm',
	48: 'font-sans-bold text-lg',
	72: 'font-display text-[26px] leading-8',
};

/** `alt` is the photo's alt text (species, colour, one mark), read when the photo shows. */
function Avatar({
	className,
	size = 48,
	alt = '',
	...props
}: Omit<AvatarPrimitive.RootProps, 'alt'> & { alt?: string } & VariantProps<typeof avatarVariants>) {
	return (
		<TextClassContext.Provider value={cn(initialsClass[size ?? 48], 'text-secondary-foreground')}>
			<AvatarPrimitive.Root alt={alt} className={cn(avatarVariants({ size }), className)} {...props} />
		</TextClassContext.Provider>
	);
}

function AvatarImage({ className, ...props }: AvatarPrimitive.ImageProps) {
	return <AvatarPrimitive.Image className={cn('size-full', className)} {...props} />;
}

/** Initials; `label` is the person's name, so the initials avatar has an accessible name. */
function AvatarFallback({ className, label, children, ...props }: AvatarPrimitive.FallbackProps & { label: string }) {
	return (
		<AvatarPrimitive.Fallback
			accessible
			aria-label={label}
			className={cn('size-full items-center justify-center', className)}
			{...props}
		>
			{typeof children === 'string' ? <Text>{children}</Text> : children}
		</AvatarPrimitive.Fallback>
	);
}

export { Avatar, AvatarFallback, AvatarImage };
