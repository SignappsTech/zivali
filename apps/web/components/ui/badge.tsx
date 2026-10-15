import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

// Tonal pill only (system §10.5): 30 px, 14 bold, subtle fill, fill icon first. One per page at most.
const badgeVariants = cva(
	'inline-flex h-7.5 w-fit shrink-0 items-center gap-1.25 rounded-full pr-3 pl-2.5 text-sm font-bold whitespace-nowrap [&>svg]:size-4.25 [&>svg]:shrink-0',
	{
		variants: {
			variant: {
				muted: 'bg-muted text-muted-foreground',
				lost: 'bg-status-lost-subtle text-status-lost-subtle-foreground',
				found: 'bg-status-found-subtle text-status-found-subtle-foreground',
				sighted: 'bg-status-sighted-subtle text-status-sighted-subtle-foreground',
				reunited: 'bg-status-reunited-subtle text-status-reunited-subtle-foreground',
				premium: 'bg-premium-subtle text-premium-subtle-foreground',
				verified: 'bg-verified-subtle text-verified-subtle-foreground',
			},
		},
		defaultVariants: { variant: 'muted' },
	}
);

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
	return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
