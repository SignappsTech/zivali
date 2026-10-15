'use client';

import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * 24 px box (radius 6) with a 16 px bold check (system §10.3). Put it in a `label` row of at least 44 px
 * (`flex min-h-11 items-start gap-3 py-2.5`) so the whole label is the target; hovering the label darkens the line.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				'grid size-6 shrink-0 cursor-pointer place-items-center rounded-[6px] border-2 border-input text-primary-foreground transition-[background-color,border-color] duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:enabled:in-[label:hover]:border-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:data-[state=checked]:border-input disabled:data-[state=checked]:bg-muted motion-reduce:transition-none',
				className
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
				<CheckIcon weight="bold" aria-hidden="true" className="size-4" />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
