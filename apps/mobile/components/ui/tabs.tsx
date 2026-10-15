import { useControllableState } from '@rn-primitives/hooks';
import * as TabsPrimitive from '@rn-primitives/tabs';
import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { useFocusRing } from '@/components/ui/focus-ring';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type TabsProps = Omit<TabsPrimitive.RootProps, 'value' | 'onValueChange'> & {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
};

function Tabs({ value: valueProp, defaultValue, onValueChange, className, ...props }: TabsProps) {
	const [value = '', setValue] = useControllableState({
		prop: valueProp,
		defaultProp: defaultValue,
		onChange: onValueChange,
	});
	return <TabsPrimitive.Root value={value} onValueChange={setValue} className={cn('gap-4', className)} {...props} />;
}

/** Segmented control (system §10.4): muted track; only for 2 or 3 views of the same content, never navigation. */
function TabsList({ className, ...props }: TabsPrimitive.ListProps) {
	return (
		<TabsPrimitive.List
			className={cn('w-full max-w-[280px] flex-row gap-1 rounded-full bg-muted p-1', className)}
			{...props}
		/>
	);
}

/** Selected = the raised card segment; disabled keeps a 2 px input inset line on the selected one. */
function TabsTrigger({
	className,
	disabled,
	style,
	onFocus,
	onBlur,
	children,
	...props
}: Omit<TabsPrimitive.TriggerProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
	const { value } = TabsPrimitive.useRootContext();
	const selected = value === props.value;
	const focus = useFocusRing(onFocus, onBlur);
	return (
		<TextClassContext.Provider
			value={cn(
				'font-sans-bold text-control',
				selected && !disabled ? 'text-foreground' : 'text-muted-foreground'
			)}
		>
			<TabsPrimitive.Trigger
				disabled={disabled}
				className={cn(
					'min-h-11 flex-1 items-center justify-center rounded-full px-3',
					selected && 'bg-card',
					!selected && !disabled && 'active:bg-foreground/10',
					disabled && selected && 'border-2 border-input bg-transparent',
					className
				)}
				style={[focus.ringStyle, style]}
				onFocus={focus.onFocus}
				onBlur={focus.onBlur}
				{...props}
			>
				{typeof children === 'string' ? <Text>{children}</Text> : children}
			</TabsPrimitive.Trigger>
		</TextClassContext.Provider>
	);
}

function TabsContent({ className, ...props }: TabsPrimitive.ContentProps) {
	return <TabsPrimitive.Content className={cn('rounded-xl', className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
