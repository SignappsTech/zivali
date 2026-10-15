import { useControllableState } from '@rn-primitives/hooks';
import * as RadioGroupPrimitive from '@rn-primitives/radio-group';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import * as React from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

// The group's value and state, so items can draw their selected and disabled look.
const GroupContext = React.createContext<{ value?: string; disabled?: boolean }>({});

type RadioGroupProps = Omit<RadioGroupPrimitive.RootProps, 'value' | 'onValueChange'> & {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
};

function RadioGroup({ value: valueProp, defaultValue, onValueChange, disabled, ...props }: RadioGroupProps) {
	const [value, setValue] = useControllableState({
		prop: valueProp,
		defaultProp: defaultValue,
		onChange: onValueChange,
	});
	return (
		<GroupContext.Provider value={{ value, disabled }}>
			<RadioGroupPrimitive.Root value={value} onValueChange={setValue} disabled={disabled} {...props} />
		</GroupContext.Provider>
	);
}

type ItemProps = Omit<RadioGroupPrimitive.ItemProps, 'style'> & { style?: StyleProp<ViewStyle> };

function useItemState(value: string, disabledProp?: boolean | null) {
	const group = React.useContext(GroupContext);
	return { selected: group.value === value, disabled: Boolean(group.disabled || disabledProp) };
}

/**
 * 24 px round radio with a 10 px dot when selected (system §10.3). With `label` the whole row (44 px or more) is the
 * target, the native form of the web `label` row; without it the 24 px mark gets a 44 px hit area. Prefer ChoiceRow
 * for 2 to 4 options.
 */
function RadioGroupItem({
	className,
	label,
	disabled: disabledProp,
	style,
	onFocus,
	onBlur,
	...props
}: ItemProps & { label?: React.ReactNode }) {
	const { selected, disabled } = useItemState(props.value, disabledProp);
	const focus = useFocusRing(onFocus, onBlur);
	return (
		<RadioGroupPrimitive.Item
			disabled={disabledProp}
			hitSlop={label ? undefined : 10}
			className={cn(label ? 'min-h-11 flex-row items-start gap-3 py-2.5' : 'rounded-full', className)}
			style={[focus.ringStyle, style]}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			{...props}
		>
			<View
				className={cn(
					'size-6 shrink-0 items-center justify-center rounded-full border-2 border-input',
					selected && 'border-primary bg-primary',
					disabled && 'border-input bg-muted'
				)}
			>
				{selected && (
					<View
						className={cn(
							'size-2.5 rounded-full',
							disabled ? 'bg-muted-foreground' : 'bg-primary-foreground'
						)}
					/>
				)}
			</View>
			{label ? <Text className={cn('shrink', disabled && 'text-muted-foreground')}>{label}</Text> : null}
		</RadioGroupPrimitive.Item>
	);
}

type ChoiceRowProps = Omit<ItemProps, 'children'> & {
	title: React.ReactNode;
	description?: React.ReactNode;
	/** 24 px Icon on the left; it takes the row's text colour when selected or disabled. */
	icon?: React.ReactElement<{ className?: string }>;
};

/**
 * Full-width radio row inside a RadioGroup (system §10.4): card on background, radius 20, 64 px minimum, title 17 bold,
 * description 14. Selected = primary fill plus the check on the right, never colour alone. Pressed = accent and
 * scale 0.98 (no scale under reduced motion). On a card sheet pass `className="bg-background"`.
 */
function ChoiceRow({
	className,
	title,
	description,
	icon,
	disabled: disabledProp,
	style,
	onFocus,
	onBlur,
	...props
}: ChoiceRowProps) {
	const { selected, disabled } = useItemState(props.value, disabledProp);
	const reduceMotion = useReducedMotion();
	const focus = useFocusRing(onFocus, onBlur);
	return (
		<RadioGroupPrimitive.Item
			disabled={disabledProp}
			className={cn(choiceRowClass({ selected, disabled, reduceMotion }), className)}
			style={[focus.ringStyle, style]}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			{...props}
		>
			<ChoiceRowBody
				title={title}
				description={description}
				icon={icon}
				selected={selected}
				disabled={disabled}
			/>
		</RadioGroupPrimitive.Item>
	);
}

function choiceRowClass({
	selected,
	disabled,
	reduceMotion,
}: {
	selected: boolean;
	disabled: boolean;
	reduceMotion: boolean;
}) {
	return cn(
		'min-h-16 w-full flex-row items-center gap-3.5 rounded-row bg-card px-5 py-3',
		!disabled && !selected && 'active:bg-accent',
		!disabled && !reduceMotion && 'active:scale-[0.98]',
		selected && 'bg-primary',
		disabled && 'bg-muted'
	);
}

/** Icon, title and description, and the check on the right; shared with the Select sheet options. */
function ChoiceRowBody({
	title,
	description,
	icon,
	selected,
	disabled,
}: Pick<ChoiceRowProps, 'title' | 'description' | 'icon'> & { selected: boolean; disabled: boolean }) {
	const tone = disabled ? 'text-muted-foreground' : selected ? 'text-primary-foreground' : undefined;
	return (
		<TextClassContext.Provider value={tone ?? 'text-foreground'}>
			{/* The row's tone replaces the icon's own colour (status hue) while selected or disabled. */}
			{icon && tone ? React.cloneElement(icon, { className: cn(icon.props.className, tone) }) : icon}
			<View className="min-w-0 flex-1">
				<Text className="font-sans-bold text-control-lg">{title}</Text>
				{description ? (
					<Text
						className={cn(
							'text-sm',
							tone ? (selected ? 'text-primary-foreground/85' : tone) : 'text-muted-foreground'
						)}
					>
						{description}
					</Text>
				) : null}
			</View>
			<Icon as={CheckIcon} size={22} className={cn(!selected && 'opacity-0')} />
		</TextClassContext.Provider>
	);
}

export { ChoiceRow, ChoiceRowBody, choiceRowClass, RadioGroup, RadioGroupItem };
