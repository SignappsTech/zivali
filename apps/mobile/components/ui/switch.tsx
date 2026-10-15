import { useControllableState } from '@rn-primitives/hooks';
import * as SwitchPrimitive from '@rn-primitives/switch';
import * as React from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import { useFocusRing } from '@/components/ui/focus-ring';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type SwitchProps = Omit<SwitchPrimitive.RootProps, 'checked' | 'onCheckedChange' | 'style'> & {
	checked?: boolean;
	defaultChecked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	/** Visible label on the left; makes the whole row (56 px) the target (system §10.3). */
	label?: React.ReactNode;
	style?: StyleProp<ViewStyle>;
};

/**
 * 56 x 32 switch: track input (off) or primary (on), thumb card; the thumb position carries the state (§10.3).
 * Disabled: muted track with a 2 px input inset line and a muted-foreground thumb that keeps its position.
 */
function Switch({
	className,
	checked: checkedProp,
	defaultChecked,
	onCheckedChange,
	label,
	disabled,
	style,
	onFocus,
	onBlur,
	...props
}: SwitchProps) {
	const [checked = false, setChecked] = useControllableState({
		prop: checkedProp,
		defaultProp: defaultChecked,
		onChange: onCheckedChange,
	});
	const focus = useFocusRing(onFocus, onBlur);

	return (
		<SwitchPrimitive.Root
			checked={checked}
			onCheckedChange={setChecked}
			disabled={disabled}
			// The OS reads the on/off state in the user's language; the primitive's English value text would repeat it.
			aria-valuetext=""
			hitSlop={label ? undefined : 6}
			className={cn(label ? 'min-h-14 flex-row items-center justify-between gap-4' : 'rounded-full', className)}
			style={[focus.ringStyle, style]}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			{...props}
		>
			{label ? (
				<Text className={cn('shrink font-sans-bold', disabled && 'text-muted-foreground')}>{label}</Text>
			) : null}
			<View
				className={cn(
					'h-8 w-14 shrink-0 justify-center rounded-full bg-input p-1',
					checked && 'bg-primary',
					disabled && 'border-2 border-input bg-muted p-0.5'
				)}
			>
				<SwitchPrimitive.Thumb
					className={cn(
						'size-6 rounded-full bg-card',
						checked && 'translate-x-6',
						disabled && 'bg-muted-foreground'
					)}
				/>
			</View>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
