'use client';

import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import type * as React from 'react';

import { Button } from '@/components/ui/button';

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
