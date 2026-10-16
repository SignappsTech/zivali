'use client';

import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import type * as React from 'react';

import { useFormField } from '@/components/ui/form-field';
import { fieldLine } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * The system line field (§10.3) on a native `<select>`, as P22 draws it: no Radix listbox on a public page (JS budget,
 * TASK-90.7), and the OS picker on phones. Takes id, description and state from the surrounding FormField.
 */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
	return (
		<div className="relative">
			<select
				className={cn(fieldLine, 'min-h-14 cursor-pointer appearance-none pr-9', className)}
				{...useFormField()}
				{...props}
			>
				{children}
			</select>
			<CaretDownIcon
				weight="bold"
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 right-1 size-5 -translate-y-1/2 text-muted-foreground"
			/>
		</div>
	);
}
