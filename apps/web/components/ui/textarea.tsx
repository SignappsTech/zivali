'use client';

import * as React from 'react';

import { useFormField } from '@/components/ui/form-field';
import { fieldLine } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(fieldLine, 'min-h-24 resize-none leading-7', className)}
			{...useFormField()}
			{...props}
		/>
	);
}

export { Textarea };
