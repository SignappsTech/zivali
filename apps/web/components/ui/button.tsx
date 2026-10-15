import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

// System §10.1 and §10.2: full pill, no border, no shadow; hover mixes 14 % foreground into filled buttons and
// lays foreground at 10 % under ghost and text buttons; disabled is the muted fill, never an opacity trick.
const buttonVariants = cva(
	'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-button text-center font-sans text-base font-bold whitespace-nowrap no-underline transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:active:scale-100 aria-busy:cursor-progress aria-busy:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-5 aria-busy:[&>svg]:hidden',
	{
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,hsl(var(--primary))_86%,hsl(var(--foreground)))]',
				secondary:
					'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_srgb,hsl(var(--secondary))_86%,hsl(var(--foreground)))]',
				// shadcn's outline variant is not part of the system; it maps to secondary (§10.2).
				outline:
					'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_srgb,hsl(var(--secondary))_86%,hsl(var(--foreground)))]',
				ghost: 'bg-transparent text-foreground hover:bg-foreground/10',
				text: 'bg-transparent text-primary hover:bg-foreground/10',
				destructive:
					'bg-destructive text-destructive-foreground hover:bg-[color-mix(in_srgb,hsl(var(--destructive))_86%,hsl(var(--foreground)))]',
			},
			size: {
				sm: 'min-h-11 px-4.5',
				default: 'min-h-12 px-6',
				lg: 'min-h-14 px-8 text-[17px]',
				icon: 'size-11 [&_svg:not([class*=size-])]:size-6',
			},
		},
		// The quiet text button is always 44 px high with 12 px padding.
		compoundVariants: [{ variant: 'text', size: ['sm', 'default', 'lg'], class: 'min-h-11 px-3 text-base' }],
		defaultVariants: { variant: 'default', size: 'default' },
	}
);

/** Loading spinner; keeps turning under reduced motion, slowed to 2.4 s per turn (§7). */
function Spinner({ className }: { className?: string }) {
	return (
		<span
			data-slot="spinner"
			aria-hidden="true"
			className={cn(
				'inline-block size-4.5 shrink-0 animate-spin rounded-full border-[2.5px] border-current border-r-transparent motion-reduce:[animation-duration:2.4s]',
				className
			)}
		/>
	);
}

type ButtonProps = React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		/** Keeps the label, shows a spinner in place of the leading icon, sets aria-busy and ignores presses. */
		loading?: boolean;
	};

function Button({
	className,
	variant = 'default',
	size = 'default',
	asChild = false,
	loading = false,
	onClick,
	children,
	...props
}: ButtonProps) {
	const Comp = asChild ? Slot.Root : 'button';

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			aria-busy={loading || undefined}
			onClick={loading ? (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault() : onClick}
			{...props}
		>
			{loading && !asChild ? (
				<>
					<Spinner />
					{children}
				</>
			) : (
				children
			)}
		</Comp>
	);
}

export { Button, buttonVariants, Spinner };
