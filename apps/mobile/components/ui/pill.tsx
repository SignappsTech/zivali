import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import * as React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type PillProps = Omit<React.ComponentProps<typeof Pressable>, 'style' | 'children' | 'role'> & {
	selected: boolean;
	/** `radio` inside a radiogroup (one of), `checkbox` for a toggle (several of). */
	role?: 'radio' | 'checkbox';
	style?: StyleProp<ViewStyle>;
	/** Decorative element before the label, e.g. a colour swatch (the label still says it). */
	leading?: React.ReactNode;
	children: string;
};

/**
 * Toggle pill (system §10.4): 44 px, full pill, `secondary` fill, 15 bold; selected is the `primary` fill plus a check
 * before the label, never colour alone. Pressed: the -pressed fill and scale 0.98 (none under reduced motion).
 */
function Pill({
	selected,
	role = 'checkbox',
	disabled,
	className,
	style,
	onFocus,
	onBlur,
	leading,
	children,
	...props
}: PillProps) {
	const reduceMotion = useReducedMotion();
	const focus = useFocusRing(onFocus, onBlur);
	const tone = disabled
		? 'text-muted-foreground'
		: selected
			? 'text-primary-foreground'
			: 'text-secondary-foreground';
	return (
		<Pressable
			role={role}
			aria-checked={selected}
			aria-disabled={disabled || undefined}
			disabled={disabled}
			className={cn(
				'min-h-11 flex-row items-center gap-1.5 rounded-full px-[18px]',
				selected ? 'bg-primary active:bg-primary-pressed' : 'bg-secondary active:bg-secondary-pressed',
				!disabled && !reduceMotion && 'active:scale-[0.98]',
				disabled && 'bg-muted active:bg-muted',
				className
			)}
			style={[focus.ringStyle, style]}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			{...props}
		>
			{selected ? <Icon as={CheckIcon} size={18} className={tone} /> : null}
			{leading}
			<Text className={cn('shrink font-sans-bold text-control', tone)}>{children}</Text>
		</Pressable>
	);
}

export { Pill };
