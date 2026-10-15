'use client';

import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
	return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn('grid', className)} {...props} />;
}

/**
 * 24 px round radio with a 10 px dot when selected (system §10.3). Put it in a `label` row of at least 44 px, like
 * the checkbox. Prefer ChoiceRow for 2 to 4 options.
 */
function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
	return (
		<RadioGroupPrimitive.Item
			data-slot="radio-group-item"
			className={cn(
				'grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-input text-primary-foreground transition-[background-color,border-color] duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:enabled:in-[label:hover]:border-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:data-[state=checked]:border-input disabled:data-[state=checked]:bg-muted motion-reduce:transition-none',
				className
			)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-current" />
		</RadioGroupPrimitive.Item>
	);
}

type ChoiceRowProps = Omit<React.ComponentProps<typeof RadioGroupPrimitive.Item>, 'title'> & {
	title: React.ReactNode;
	description?: React.ReactNode;
	/** 24 px icon on the left; it takes the row's text colour when selected or disabled. */
	icon?: React.ReactNode;
};

/**
 * Full-width radio row inside a RadioGroup (system §10.4): card on background, radius 20, 64 px minimum, title
 * 17 bold, description 14. Selected = primary fill plus the check on the right, never colour alone.
 */
function ChoiceRow({ className, title, description, icon, ...props }: ChoiceRowProps) {
	return (
		<RadioGroupPrimitive.Item
			data-slot="choice-row"
			className={cn(
				'group/row flex min-h-16 w-full cursor-pointer items-center gap-3.5 rounded-row bg-card px-5 py-3 text-left text-foreground transition-transform duration-[80ms] hover:bg-[linear-gradient(hsl(var(--foreground)/0.1),hsl(var(--foreground)/0.1))] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] active:bg-accent active:text-accent-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:bg-none disabled:text-muted-foreground disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100 [&>svg]:size-6 [&>svg]:shrink-0 data-[state=checked]:[&>svg]:text-inherit disabled:[&>svg]:text-inherit',
				className
			)}
			{...props}
		>
			{icon}
			<span className="min-w-0 flex-1">
				<span className="block text-[17px] leading-6 font-bold">{title}</span>
				{description && (
					<span className="block text-sm text-muted-foreground group-disabled/row:text-muted-foreground group-data-[state=checked]/row:text-primary-foreground/85">
						{description}
					</span>
				)}
			</span>
			<CheckIcon
				weight="bold"
				aria-hidden="true"
				className="invisible size-[22px] group-data-[state=checked]/row:visible"
			/>
		</RadioGroupPrimitive.Item>
	);
}

export { ChoiceRow, RadioGroup, RadioGroupItem };
