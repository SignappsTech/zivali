'use client';

import * as React from 'react';

import { useFormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';

// System §10.3 line field: no box, 2 px input underline; hover foreground, focus ring + 2 px, error destructive,
// disabled dashed (so it is not colour only).
const fieldLine =
	'w-full min-w-0 rounded-none border-0 border-b-2 border-input bg-transparent px-0.5 pt-2 pb-1.5 text-lg text-foreground transition-[border-color] duration-150 placeholder:text-muted-foreground hover:border-foreground focus:border-ring focus:shadow-[0_2px_0_0_hsl(var(--ring))] focus:outline-hidden aria-invalid:border-destructive aria-invalid:shadow-[0_2px_0_0_hsl(var(--destructive))] disabled:cursor-not-allowed disabled:border-dashed disabled:border-input disabled:text-muted-foreground disabled:shadow-none motion-reduce:transition-none';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(fieldLine, 'min-h-14', className)}
			{...useFormField()}
			{...props}
		/>
	);
}

export { fieldLine, Input };
