import {
	BottomSheetBackdrop,
	type BottomSheetBackdropProps,
	type BottomSheetBackgroundProps,
	BottomSheetModal,
	BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useAccessibilityFocus, useControllableState, useRestoreAccessibilityFocus } from '@rn-primitives/hooks';
import { Slot } from '@rn-primitives/slot';
import * as React from 'react';
import { BackHandler, type GestureResponderEvent, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { shadow } from '@/lib/theme';
import { cn } from '@/lib/utils';

type SheetContextValue = { open: boolean; onOpenChange: (open: boolean) => void };

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
	const sheet = React.useContext(SheetContext);
	if (!sheet) throw new Error('Sheet parts must be inside <Sheet>');
	return sheet;
}

type SheetProps = {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
};

/** Bottom sheet on @gorhom/bottom-sheet; needs a BottomSheetModalProvider above it (root layout). */
function Sheet({ open: openProp, defaultOpen, onOpenChange: onOpenChangeProp, children }: SheetProps) {
	const [open = false, onOpenChange] = useControllableState({
		prop: openProp,
		defaultProp: defaultOpen,
		onChange: onOpenChangeProp,
	});
	return <SheetContext.Provider value={{ open, onOpenChange }}>{children}</SheetContext.Provider>;
}

type PressableProps = React.ComponentProps<typeof Pressable> & { asChild?: boolean };

/** Opens the sheet; screen reader focus returns here when it closes. */
function SheetTrigger({ asChild, onPress, ...props }: PressableProps) {
	const { open, onOpenChange } = useSheet();
	const ref = React.useRef<View>(null);
	useRestoreAccessibilityFocus(open, ref);
	const Comp = asChild ? Slot : Pressable;
	return (
		<Comp
			ref={ref}
			role="button"
			aria-expanded={open}
			onPress={(event: GestureResponderEvent) => {
				onOpenChange(true);
				onPress?.(event);
			}}
			{...props}
		/>
	);
}

function SheetClose({ asChild, onPress, ...props }: PressableProps) {
	const { onOpenChange } = useSheet();
	const Comp = asChild ? Slot : Pressable;
	return (
		<Comp
			role="button"
			onPress={(event: GestureResponderEvent) => {
				onOpenChange(false);
				onPress?.(event);
			}}
			{...props}
		/>
	);
}

// The scrim fades in with the sheet; it is not a screen reader target, the grabber button closes the sheet instead.
function Backdrop(props: BottomSheetBackdropProps) {
	return (
		<BottomSheetBackdrop
			{...props}
			appearsOnIndex={0}
			disappearsOnIndex={-1}
			opacity={1}
			pressBehavior="close"
			accessible={false}
			style={[props.style, { backgroundColor: 'transparent' }]}
		>
			<View className="flex-1 bg-scrim" />
		</BottomSheetBackdrop>
	);
}

function Background({ style }: BottomSheetBackgroundProps) {
	return <View style={[style, shadow('lg')]} className="rounded-t-sheet bg-card" />;
}

/**
 * Bottom sheet (system §10.7): card surface, top radius 28, shadow-lg, 20 px sides, up to 92 % of the screen, sized to
 * its content. Slides up (no movement under reduced motion, gorhom follows the OS). The grabber is a 44 px close button
 * named `closeLabel`, the button alternative to the swipe; Android back closes it too.
 */
function SheetContent({
	className,
	children,
	closeLabel,
}: {
	className?: string;
	children: React.ReactNode;
	closeLabel: string;
}) {
	const { open, onOpenChange } = useSheet();
	const ref = React.useRef<BottomSheetModal>(null);
	const { height } = useWindowDimensions();
	const insets = useSafeAreaInsets();

	React.useEffect(() => {
		if (open) ref.current?.present();
		else ref.current?.dismiss();
	}, [open]);

	React.useEffect(() => {
		if (!open) return;
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			onOpenChange(false);
			return true;
		});
		return () => subscription.remove();
	}, [open, onOpenChange]);

	return (
		<BottomSheetModal
			ref={ref}
			onDismiss={() => onOpenChange(false)}
			maxDynamicContentSize={height * 0.92}
			backdropComponent={Backdrop}
			backgroundComponent={Background}
			// The grabber lives in the content, inside the modal view, so VoiceOver can reach it; the content pans too.
			handleComponent={null}
			accessible={false}
		>
			<BottomSheetView>
				<View
					aria-modal={open}
					className={cn('px-5', className)}
					style={{ paddingBottom: Math.max(32, insets.bottom) }}
				>
					<Grabber label={closeLabel} onPress={() => onOpenChange(false)} />
					{children}
				</View>
			</BottomSheetView>
		</BottomSheetModal>
	);
}

function Grabber({ label, onPress }: { label: string; onPress: () => void }) {
	const ref = useAccessibilityFocus<View>();
	return (
		<Pressable
			ref={ref}
			role="button"
			aria-label={label}
			onPress={onPress}
			className="-mb-3 h-11 w-full items-center justify-center rounded-t-sheet"
		>
			<View className="h-[5px] w-10 rounded-[3px] bg-input" />
		</Pressable>
	);
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
	return (
		<Text
			role="heading"
			className={cn('pt-3 font-display text-2xl tracking-[-0.36px] text-foreground', className)}
			{...props}
		/>
	);
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
	return <Text className={cn('mt-2 text-muted-foreground', className)} {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger };
