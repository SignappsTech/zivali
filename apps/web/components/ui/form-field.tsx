'use client';

import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import * as React from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type FieldContextValue = { id: string; describedBy?: string; invalid: boolean; disabled?: boolean };

const FieldContext = React.createContext<FieldContextValue | null>(null);

/** Props that Input, Textarea and SelectTrigger take from the surrounding FormField (id, description, state). */
function useFormField() {
	const field = React.useContext(FieldContext);
	if (!field) return {};
	return {
		id: field.id,
		'aria-describedby': field.describedBy,
		'aria-invalid': field.invalid || undefined,
		disabled: field.disabled,
	};
}

type FormFieldProps = {
	label: React.ReactNode;
	/** Help text under the control (14/20 muted); also the place to say why a field is disabled. */
	hint?: React.ReactNode;
	/** Error text; marks the control invalid and is announced when it appears (after submit). */
	error?: React.ReactNode;
	disabled?: boolean;
	id?: string;
	className?: string;
	children: React.ReactNode;
};

/** Label above, the control, help and error below, tied together with aria-describedby (system §10.3, §12). */
function FormField({ label, hint, error, disabled, id, className, children }: FormFieldProps) {
	const autoId = React.useId();
	const fieldId = id ?? autoId;
	const hintId = hint ? `${fieldId}-hint` : undefined;
	const errorId = error ? `${fieldId}-error` : undefined;
	const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

	return (
		<div data-slot="form-field" className={cn('grid content-start gap-1.5', className)}>
			<Label htmlFor={fieldId} className={cn(disabled && 'text-muted-foreground')}>
				{label}
			</Label>
			<FieldContext value={{ id: fieldId, describedBy, invalid: Boolean(error), disabled }}>
				{children}
			</FieldContext>
			{hint && (
				<p id={hintId} className="text-sm text-muted-foreground">
					{hint}
				</p>
			)}
			{error && <FieldError id={errorId}>{error}</FieldError>}
		</div>
	);
}

/** Error line: fill warning icon and text in destructive; role="alert" announces it when it appears. */
function FieldError({ className, children, ...props }: React.ComponentProps<'p'>) {
	return (
		<p
			data-slot="field-error"
			role="alert"
			className={cn('flex items-start gap-1.5 text-sm font-semibold text-destructive', className)}
			{...props}
		>
			<WarningCircleIcon weight="fill" aria-hidden="true" className="size-[18px] shrink-0 translate-y-px" />
			<span>{children}</span>
		</p>
	);
}

export { FieldError, FormField, useFormField };
