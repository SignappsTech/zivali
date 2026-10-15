import { useControllableState, useRestoreAccessibilityFocus } from '@rn-primitives/hooks';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import * as React from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useFocusRing } from '@/components/ui/focus-ring';
import { useFormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { DisabledLine, fieldLine, lineFocused, lineInvalid } from '@/components/ui/input';
import { ChoiceRowBody, choiceRowClass } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type SelectContextValue = {
	value?: string;
	onValueChange: (value: string) => void;
	open: boolean;
	setOpen: (open: boolean) => void;
	disabled?: boolean;
	labels: Record<string, React.ReactNode>;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect() {
	const select = React.useContext(SelectContext);
	if (!select) throw new Error('Select parts must be inside <Select>');
	return select;
}

type SelectProps = {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	disabled?: boolean;
	children: React.ReactNode;
};

// The options' labels, read from the SelectItem elements in the tree, so the trigger can show the chosen one before the
// sheet has ever opened (the web listbox gets this from Radix).
function itemLabels(children: React.ReactNode, labels: Record<string, React.ReactNode> = {}) {
	React.Children.forEach(children, (child) => {
		if (!React.isValidElement<{ value?: string; children?: React.ReactNode }>(child)) return;
		if (child.type === SelectItem && child.props.value !== undefined)
			labels[child.props.value] = child.props.children;
		else itemLabels(child.props.children, labels);
	});
	return labels;
}

/** Select (system §10.3): a line field with a caret that opens a bottom sheet of choice rows on mobile. */
function Select({ value: valueProp, defaultValue, onValueChange, disabled, children }: SelectProps) {
	const [value, setValue] = useControllableState({
		prop: valueProp,
		defaultProp: defaultValue,
		onChange: onValueChange,
	});
	const [open, setOpen] = React.useState(false);
	const { disabled: fieldDisabled } = useFormField();
	return (
		<SelectContext.Provider
			value={{
				value,
				onValueChange: setValue,
				open,
				setOpen,
				disabled: disabled || fieldDisabled,
				labels: itemLabels(children),
			}}
		>
			{children}
		</SelectContext.Provider>
	);
}

/** Shows the chosen option's label, else the placeholder (muted). */
function SelectValue({ placeholder, className }: { placeholder?: string; className?: string }) {
	const { value, labels } = useSelect();
	const label = value === undefined ? undefined : labels[value];
	return (
		<Text className={cn('shrink text-lg', label === undefined && 'text-muted-foreground', className)}>
			{label ?? placeholder}
		</Text>
	);
}

type TriggerProps = Omit<React.ComponentProps<typeof Pressable>, 'style' | 'children'> & {
	style?: StyleProp<ViewStyle>;
	children: React.ReactNode;
};

/** Line field with a caret (pointing up while open); named by its FormField label, the chosen option is its value. */
function SelectTrigger({ className, style, onFocus, onBlur, children, ...props }: TriggerProps) {
	const { value, labels, open, setOpen, disabled } = useSelect();
	const field = useFormField();
	const focus = useFocusRing(onFocus, onBlur);
	const ref = React.useRef<View>(null);
	useRestoreAccessibilityFocus(open, ref);
	const chosen = value === undefined ? undefined : labels[value];

	return (
		<View>
			<Pressable
				ref={ref}
				role="combobox"
				aria-expanded={open}
				aria-disabled={disabled || undefined}
				aria-valuetext={typeof chosen === 'string' ? chosen : undefined}
				disabled={disabled}
				onPress={() => setOpen(true)}
				onFocus={focus.onFocus}
				onBlur={focus.onBlur}
				className={cn(
					fieldLine,
					'min-h-14 flex-row items-center justify-between gap-3',
					field.invalid ? lineInvalid : (open || focus.focused) && lineFocused,
					disabled && 'border-b-0 pb-2',
					className
				)}
				style={style}
				accessibilityLabel={field.accessibilityLabel}
				aria-labelledby={field['aria-labelledby']}
				accessibilityHint={field.accessibilityHint}
				{...props}
			>
				<TextClassContext.Provider value={disabled ? 'text-muted-foreground' : undefined}>
					{children}
				</TextClassContext.Provider>
				<Icon as={CaretDownIcon} className={cn('text-muted-foreground', open && 'rotate-180')} />
			</Pressable>
			{disabled && <DisabledLine />}
		</View>
	);
}

/**
 * The options in a bottom sheet titled with the field's label; choosing one closes it. `closeLabel` names the grabber
 * close button (mobile only).
 */
function SelectContent({ closeLabel, children }: { closeLabel: string; children: React.ReactNode }) {
	const { open, setOpen } = useSelect();
	const { accessibilityLabel } = useFormField();
	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetContent closeLabel={closeLabel}>
				{accessibilityLabel ? <SheetTitle>{accessibilityLabel}</SheetTitle> : null}
				<View role="radiogroup" aria-label={accessibilityLabel} className="mt-5 gap-3">
					{children}
				</View>
			</SheetContent>
		</Sheet>
	);
}

/** A choice row on the sheet (background on card); the chosen one has the primary fill and the check. */
function SelectItem({
	value: itemValue,
	disabled,
	children,
}: {
	value: string;
	disabled?: boolean;
	children: React.ReactNode;
}) {
	const { value, onValueChange, setOpen } = useSelect();
	const reduceMotion = useReducedMotion();
	const selected = value === itemValue;
	return (
		<Pressable
			role="radio"
			aria-checked={selected}
			disabled={disabled}
			onPress={() => {
				onValueChange(itemValue);
				setOpen(false);
			}}
			className={cn(
				choiceRowClass({ selected, disabled: Boolean(disabled), reduceMotion }),
				!selected && !disabled && 'bg-background'
			)}
		>
			<ChoiceRowBody title={children} selected={selected} disabled={Boolean(disabled)} />
		</Pressable>
	);
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
