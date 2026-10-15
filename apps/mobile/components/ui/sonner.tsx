import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';
import { Toaster as Sonner, toast as sonnerToast, type ToasterProps } from 'sonner-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { shadow } from '@/lib/theme';

const CloseLabelContext = React.createContext('');

type Variant = 'default' | 'success' | 'info' | 'warning' | 'error';

const icons: Record<Exclude<Variant, 'default'>, [PhosphorIcon, string]> = {
	success: [CheckCircleIcon, 'text-primary'],
	info: [InfoIcon, 'text-primary'],
	warning: [WarningCircleIcon, 'text-destructive'],
	error: [WarningCircleIcon, 'text-destructive'],
};

/** Toast (system §10.9): popover surface, radius 20, one shadow (shadow-pop), 15/22, status icon, 44 px close button. */
function ToastView({ id, variant, message }: { id: string | number; variant: Variant; message: string }) {
	const closeLabel = React.useContext(CloseLabelContext);
	const [StatusIcon, color] = variant === 'default' ? [] : icons[variant];
	return (
		<View
			className="mx-3 min-h-14 flex-row items-center gap-3 rounded-row bg-popover py-1.5 pl-4 pr-1.5"
			style={shadow('pop')}
		>
			{StatusIcon && <Icon as={StatusIcon} weight="fill" size={22} className={color} />}
			<Text className="flex-1 text-control leading-[22px] text-popover-foreground">{message}</Text>
			<Button variant="ghost" size="icon" aria-label={closeLabel} onPress={() => sonnerToast.dismiss(id)}>
				<Icon as={XIcon} size={24} />
			</Button>
		</View>
	);
}

type Options = Parameters<typeof sonnerToast.custom>[1];
let lastId = 0;

const show =
	(variant: Variant) =>
	(message: string, options?: Options): string | number => {
		const id = options?.id ?? `toast-${++lastId}`;
		// Android reads the toast through sonner's polite live region; iOS has none, so it is announced.
		if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
		return sonnerToast.custom(<ToastView id={id} variant={variant} message={message} />, { ...options, id });
	};

/** Same calls as `toast` from sonner on web: `toast(message)`, `toast.success(...)`, `toast.dismiss(id)`. */
const toast = Object.assign(show('default'), {
	success: show('success'),
	info: show('info'),
	warning: show('warning'),
	error: show('error'),
	dismiss: sonnerToast.dismiss,
});

/**
 * Bottom centre, 5 s, swipe or the close button dismisses, announced politely. Mount once in the root layout;
 * `closeLabel` names each toast's close button (`common.close`). Pass `offset` to sit 12 px above the bottom navigation.
 */
function Toaster({ closeLabel, ...props }: ToasterProps & { closeLabel: string }) {
	return (
		<CloseLabelContext.Provider value={closeLabel}>
			<Sonner position="bottom-center" duration={5000} offset={12} {...props} />
		</CloseLabelContext.Provider>
	);
}

export { toast, Toaster };
