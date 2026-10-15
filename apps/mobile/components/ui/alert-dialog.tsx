import * as AlertDialogPrimitive from '@rn-primitives/alert-dialog';
import * as React from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { dialogClass, dialogFooterClass, dialogTitleClass, fadeIn, overlayClass } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { shadow } from '@/lib/theme';
import { cn } from '@/lib/utils';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

/** Confirmation dialog: the scrim does not close it, Android back does; screen reader focus starts on Cancel. */
function AlertDialogContent({ className, children, ...props }: AlertDialogPrimitive.ContentProps) {
	return (
		<AlertDialogPrimitive.Portal>
			<AlertDialogPrimitive.Overlay className={overlayClass}>
				<Animated.View entering={fadeIn} className="w-full items-center">
					<AlertDialogPrimitive.Content
						className={cn(dialogClass, className)}
						style={shadow('pop')}
						{...props}
					>
						{children}
					</AlertDialogPrimitive.Content>
				</Animated.View>
			</AlertDialogPrimitive.Overlay>
		</AlertDialogPrimitive.Portal>
	);
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
	return <Text role="heading" className={cn(dialogTitleClass, className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
	return <Text className={cn('mt-2 text-popover-foreground', className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<typeof View>) {
	return <View className={cn(dialogFooterClass, className)} {...props} />;
}

type ButtonProps = React.ComponentProps<typeof Button>;

/** The main action; destructive by default, so it takes the primary's place (§10.2). */
function AlertDialogAction({ variant = 'destructive', onPress, ...props }: ButtonProps) {
	return (
		<AlertDialogPrimitive.Action asChild onPress={onPress}>
			<Button variant={variant} {...props} />
		</AlertDialogPrimitive.Action>
	);
}

function AlertDialogCancel({ onPress, ...props }: ButtonProps) {
	const ref = React.useRef<View>(null);
	// The primitive focuses the dialog after 50 ms; the safe action takes focus right after it (system §10.9).
	React.useEffect(() => {
		const timeout = setTimeout(() => {
			if (ref.current) AccessibilityInfo.sendAccessibilityEvent(ref.current, 'focus');
		}, 150);
		return () => clearTimeout(timeout);
	}, []);
	return (
		<AlertDialogPrimitive.Cancel asChild onPress={onPress}>
			<Button ref={ref} variant="text" {...props} />
		</AlertDialogPrimitive.Cancel>
	);
}

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogTrigger,
};
