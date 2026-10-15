import * as DialogPrimitive from '@rn-primitives/dialog';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { shadow } from '@/lib/theme';
import { cn } from '@/lib/utils';

// Shared with AlertDialog (system §10.9): scrim behind modals, a 220 ms cross-fade (none under reduced motion, Reanimated
// follows the OS); the surface is popover, radius 24, at most 440 px wide, padding 28/24/20, shadow-pop.
const overlayClass = 'absolute inset-0 items-center justify-center bg-scrim px-5';
const dialogClass = 'w-full max-w-[440px] rounded-card bg-popover px-6 pb-5 pt-7';
const dialogTitleClass = 'font-display-semibold text-lg tracking-[-0.09px] text-popover-foreground';
// Buttons stacked full width: the main action, then the text button.
const dialogFooterClass = 'mt-6 gap-2';
const fadeIn = FadeIn.duration(220);

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

/**
 * Screen reader focus moves into the dialog and back to the trigger on close; Android back and the scrim close it.
 * `closeLabel` adds the close icon button top right (content dialogs). Needs the PortalHost in the root layout.
 */
function DialogContent({
	className,
	children,
	closeLabel,
	...props
}: DialogPrimitive.ContentProps & { closeLabel?: string }) {
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay className={overlayClass}>
				<Animated.View entering={fadeIn} className="w-full items-center">
					<DialogPrimitive.Content className={cn(dialogClass, className)} style={shadow('pop')} {...props}>
						{children}
						{closeLabel && (
							<DialogPrimitive.Close asChild>
								<Button
									variant="ghost"
									size="icon"
									aria-label={closeLabel}
									className="absolute right-3 top-3"
								>
									<Icon as={XIcon} size={24} />
								</Button>
							</DialogPrimitive.Close>
						)}
					</DialogPrimitive.Content>
				</Animated.View>
			</DialogPrimitive.Overlay>
		</DialogPrimitive.Portal>
	);
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
	return <Text role="heading" className={cn(dialogTitleClass, className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
	return <Text className={cn('mt-2 text-popover-foreground', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<typeof View>) {
	return <View className={cn(dialogFooterClass, className)} {...props} />;
}

export {
	Dialog,
	DialogClose,
	dialogClass,
	DialogContent,
	DialogDescription,
	DialogFooter,
	dialogFooterClass,
	DialogTitle,
	dialogTitleClass,
	DialogTrigger,
	fadeIn,
	overlayClass,
};
