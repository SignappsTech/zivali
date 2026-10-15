'use client';

import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Select as SelectPrimitive } from 'radix-ui';
import * as React from 'react';

import { useFormField } from '@/components/ui/form-field';
import { fieldLine } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

/** Line field with a caret (caret-up while open), system §10.3. */
function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			className={cn(
				fieldLine,
				'group/select flex min-h-14 cursor-pointer items-center justify-between gap-3 text-left data-[placeholder]:text-muted-foreground *:data-[slot=select-value]:truncate',
				className
			)}
			{...useFormField()}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<CaretDownIcon
					weight="bold"
					aria-hidden="true"
					className="size-5 shrink-0 text-muted-foreground group-data-[state=open]/select:rotate-180"
				/>
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

/** Listbox popover under the trigger: popover surface, radius 20, 8 px padding, shadow-pop. */
function SelectContent({
	className,
	children,
	position = 'popper',
	sideOffset = 8,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				data-slot="select-content"
				position={position}
				sideOffset={sideOffset}
				className={cn(
					'relative z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-x-hidden overflow-y-auto rounded-xl bg-popover p-2 text-popover-foreground shadow-pop',
					className
				)}
				{...props}
			>
				<SelectPrimitive.Viewport className="grid gap-1">{children}</SelectPrimitive.Viewport>
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

/** 48 px option; hover and keyboard highlight lay foreground at 10 %; selected is bold with a check on the right. */
function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				'relative flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-3 text-base outline-hidden select-none data-[disabled]:cursor-not-allowed data-[disabled]:text-muted-foreground data-[highlighted]:bg-foreground/10 data-[state=checked]:font-bold',
				className
			)}
			{...props}
		>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
			<SelectPrimitive.ItemIndicator>
				<CheckIcon weight="bold" aria-hidden="true" className="size-5" />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	);
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
