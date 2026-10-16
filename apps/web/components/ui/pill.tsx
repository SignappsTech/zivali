'use client';

import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import type * as React from 'react';

import { Button } from '@/components/ui/button';

// System §10.4 pill: 44 px, secondary fill; selected primary plus a check (radio pills and toggle pills). Disabled is
// the muted fill (§10.2). For Radix RadioGroup and ToggleGroup items, with PillCheck inside.
export const pillClass =
	'group/pill inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-chip bg-secondary px-4.5 text-control font-bold whitespace-nowrap text-secondary-foreground transition-transform duration-[80ms] hover:bg-secondary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:active:scale-100 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:hover:bg-primary-hover data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary-hover motion-reduce:transition-none motion-reduce:active:scale-100';

/** The check of a `pillClass` item, shown only while it is selected. */
export function PillCheck() {
	return (
		<CheckIcon
			weight="bold"
			aria-hidden="true"
			className="hidden size-4.5 group-data-[state=checked]/pill:inline group-data-[state=on]/pill:inline"
		/>
	);
}

/** Filter pill (system §10.4): secondary, selected primary with a check; `aria-pressed` carries the state. */
export function Pill({
	pressed,
	onPressedChange,
	children,
}: {
	pressed: boolean;
	onPressedChange: (next: boolean) => void;
	children: React.ReactNode;
}) {
	return (
		<Button
			type="button"
			size="sm"
			variant={pressed ? 'default' : 'secondary'}
			aria-pressed={pressed}
			className="rounded-chip text-control"
			onClick={() => onPressedChange(!pressed)}
		>
			{pressed && <CheckIcon weight="bold" aria-hidden="true" className="size-4.5" />}
			{children}
		</Button>
	);
}
