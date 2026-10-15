import * as CheckboxPrimitive from '@rn-primitives/checkbox';
import { useControllableState } from '@rn-primitives/hooks';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import * as React from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type CheckboxProps = Omit<CheckboxPrimitive.RootProps, 'checked' | 'onCheckedChange' | 'style'> & {
	checked?: boolean;
	defaultChecked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	/** Visible label; makes the whole row (44 px or more) the target, the native form of the web `label` row. */
	label?: React.ReactNode;
	'aria-invalid'?: boolean;
	style?: StyleProp<ViewStyle>;
};

/**
 * 24 px box (radius 6) with a 16 px bold check (system §10.3). Unchecked is a 2 px input line, checked the primary fill,
 * invalid a destructive line, disabled the muted fill. Without `label` the box gets a 44 px hit area.
 */
function Checkbox({
	className,
	checked: checkedProp,
	defaultChecked,
	onCheckedChange,
	label,
	disabled,
	'aria-invalid': invalid,
	style,
	onFocus,
	onBlur,
	...props
}: CheckboxProps) {
	const [checked = false, setChecked] = useControllableState({
		prop: checkedProp,
		defaultProp: defaultChecked,
		onChange: onCheckedChange,
	});
	const focus = useFocusRing(onFocus, onBlur);

	return (
		<CheckboxPrimitive.Root
			checked={checked}
			onCheckedChange={setChecked}
			disabled={disabled}
			hitSlop={label ? undefined : 10}
			className={cn(label ? 'min-h-11 flex-row items-start gap-3 py-2.5' : 'rounded-[6px]', className)}
			style={[focus.ringStyle, style]}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			{...props}
		>
			<View
				className={cn(
					'size-6 shrink-0 items-center justify-center rounded-[6px] border-2 border-input',
					invalid && 'border-destructive',
					checked && 'border-primary bg-primary',
					disabled && 'border-input bg-muted'
				)}
			>
				<CheckboxPrimitive.Indicator>
					<Icon
						as={CheckIcon}
						size={16}
						className={disabled ? 'text-muted-foreground' : 'text-primary-foreground'}
					/>
				</CheckboxPrimitive.Indicator>
			</View>
			{label ? <Text className={cn('shrink', disabled && 'text-muted-foreground')}>{label}</Text> : null}
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
