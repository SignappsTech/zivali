import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { View } from 'react-native';

import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

// Tonal pill only (system §10.5): 30 px, 14 bold, subtle fill, fill icon first. One per page at most.
const badgeVariants = cva('min-h-[30px] flex-row items-center gap-[5px] self-start rounded-full pl-2.5 pr-3', {
	variants: {
		variant: {
			muted: 'bg-muted',
			lost: 'bg-status-lost-subtle',
			found: 'bg-status-found-subtle',
			sighted: 'bg-status-sighted-subtle',
			reunited: 'bg-status-reunited-subtle',
			premium: 'bg-premium-subtle',
			verified: 'bg-verified-subtle',
		},
	},
	defaultVariants: { variant: 'muted' },
});

const badgeTextVariants = cva('font-sans-bold text-sm', {
	variants: {
		variant: {
			muted: 'text-muted-foreground',
			lost: 'text-status-lost-subtle-foreground',
			found: 'text-status-found-subtle-foreground',
			sighted: 'text-status-sighted-subtle-foreground',
			reunited: 'text-status-reunited-subtle-foreground',
			premium: 'text-premium-subtle-foreground',
			verified: 'text-verified-subtle-foreground',
		},
	},
	defaultVariants: { variant: 'muted' },
});

/** Children: an `<Icon weight="fill" size={17} />` and the word; plain strings become the Text. */
function Badge({
	className,
	variant,
	children,
	...props
}: React.ComponentProps<typeof View> & VariantProps<typeof badgeVariants>) {
	return (
		<TextClassContext.Provider value={badgeTextVariants({ variant })}>
			<View accessible className={cn(badgeVariants({ variant }), className)} {...props}>
				{React.Children.map(children, (child) => (typeof child === 'string' ? <Text>{child}</Text> : child))}
			</View>
		</TextClassContext.Provider>
	);
}

export { Badge, badgeVariants };
