import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import * as React from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type FieldContextValue = {
	labelId: string;
	label?: string;
	description?: string;
	invalid: boolean;
	disabled?: boolean;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

const plain = (node: React.ReactNode) =>
	typeof node === 'string' || typeof node === 'number' ? String(node) : undefined;

/**
 * Props that Input, Textarea and SelectTrigger take from the surrounding FormField. The label names the control and the
 * help and error text describe it (read after the label), the native stand-ins for aria-labelledby and aria-describedby.
 */
function useFormField() {
	const field = React.useContext(FieldContext);
	if (!field) return {};
	return {
		// A string label is the accessible name on both platforms; other nodes are referenced (Android only).
		accessibilityLabel: field.label,
		'aria-labelledby': field.label ? undefined : field.labelId,
		accessibilityHint: field.description,
		invalid: field.invalid,
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

/**
 * Announces an error that appears or changes after the first render (a submit); one present on mount is read with the
 * field instead, so a screen that opens with errors does not talk over itself.
 */
function useAnnounceError(errorText: string | undefined) {
	const mounted = React.useRef(false);
	React.useEffect(() => {
		if (mounted.current && errorText) AccessibilityInfo.announceForAccessibility(errorText);
		mounted.current = true;
	}, [errorText]);
}

/** Label above, the control, help and error below (system §10.3, §12). */
function FormField({ label, hint, error, disabled, id, className, children }: FormFieldProps) {
	const autoId = React.useId();
	const labelId = `${id ?? autoId}-label`;
	const description = [plain(hint), plain(error)].filter(Boolean).join(' ') || undefined;
	useAnnounceError(plain(error));

	return (
		<View className={cn('gap-1.5', className)}>
			<Label nativeID={labelId} className={cn(disabled && 'text-muted-foreground')}>
				{label}
			</Label>
			<FieldContext.Provider
				value={{ labelId, label: plain(label), description, invalid: Boolean(error), disabled }}
			>
				{children}
			</FieldContext.Provider>
			{hint ? <Text className="text-sm text-muted-foreground">{hint}</Text> : null}
			{error ? <FieldError>{error}</FieldError> : null}
		</View>
	);
}

/** Error line: fill warning icon and text in destructive, never colour alone. */
function FieldError({ className, children }: { className?: string; children: React.ReactNode }) {
	return (
		<View role="alert" accessible className={cn('flex-row items-start gap-1.5', className)}>
			<Icon as={WarningCircleIcon} weight="fill" size={18} className="mt-px text-destructive" />
			<Text className="shrink font-sans-semibold text-sm text-destructive">{children}</Text>
		</View>
	);
}

export { FieldError, FormField, useAnnounceError, useFormField };
