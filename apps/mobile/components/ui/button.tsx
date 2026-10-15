import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

// System §10.1 and §10.2: full pill, no border, no shadow; pressed uses the -pressed token on filled buttons and lays
// foreground at 10 % under ghost and text buttons; disabled is the muted fill, never an opacity trick.
const buttonVariants = cva('flex-row items-center justify-center gap-2 rounded-button', {
	variants: {
		variant: {
			default: 'bg-primary active:bg-primary-pressed',
			secondary: 'bg-secondary active:bg-secondary-pressed',
			// shadcn's outline variant is not part of the system; it maps to secondary (§10.2).
			outline: 'bg-secondary active:bg-secondary-pressed',
			ghost: 'bg-transparent active:bg-foreground/10',
			text: 'bg-transparent active:bg-foreground/10',
			destructive: 'bg-destructive active:bg-destructive-pressed',
			// Google and Apple only (§10.2): brand-literal fill with a 1 px inside stroke, the same on every surface; RN
			// cannot mix colours, so pressed tints with the label colour at 15 % (the web mixes 14 % into the fill).
			provider: 'border border-provider-border bg-provider active:bg-provider-foreground/15',
		},
		size: {
			sm: 'min-h-11 px-[18px]',
			default: 'min-h-12 px-6',
			lg: 'min-h-14 px-8',
			icon: 'size-11',
		},
	},
	// The quiet text button is always 44 px high with 12 px padding.
	compoundVariants: [{ variant: 'text', size: ['sm', 'default', 'lg'], class: 'min-h-11 px-3' }],
	defaultVariants: { variant: 'default', size: 'default' },
});

// Label 16 bold (17 on lg); it wraps and the button grows at large OS text sizes, it never truncates (§10.2).
const buttonTextVariants = cva('shrink text-center font-sans-bold text-base', {
	variants: {
		variant: {
			default: 'text-primary-foreground',
			secondary: 'text-secondary-foreground',
			outline: 'text-secondary-foreground',
			ghost: 'text-foreground',
			text: 'text-primary',
			destructive: 'text-destructive-foreground',
			provider: 'text-provider-foreground',
		},
		size: { sm: '', default: '', lg: 'text-control-lg', icon: '' },
	},
	compoundVariants: [{ variant: 'text', size: 'lg', class: 'text-base' }],
	defaultVariants: { variant: 'default', size: 'default' },
});

// While loading a press changes nothing, so the pressed fill stays the resting one.
const idleFill = {
	default: 'active:bg-primary',
	secondary: 'active:bg-secondary',
	outline: 'active:bg-secondary',
	ghost: 'active:bg-transparent',
	text: 'active:bg-transparent',
	destructive: 'active:bg-destructive',
	provider: 'active:bg-provider',
};
const ignorePress = () => {};

/** Loading spinner in the parent's text colour. The native spinner keeps turning under reduced motion (§7). */
function Spinner({ className }: { className?: string }) {
	const textClass = React.useContext(TextClassContext);
	return (
		<ActivityIndicator
			testID="spinner"
			size="small"
			aria-hidden
			className={cn('text-foreground', textClass, className)}
		/>
	);
}

type ButtonProps = Omit<React.ComponentProps<typeof Pressable>, 'style'> &
	VariantProps<typeof buttonVariants> & {
		style?: StyleProp<ViewStyle>;
		/** Keeps the label, shows a spinner in place of the leading icon, sets aria-busy and ignores presses. */
		loading?: boolean;
	};

function Button({
	className,
	variant = 'default',
	size = 'default',
	loading = false,
	disabled,
	onPress,
	onFocus,
	onBlur,
	style,
	children,
	...props
}: ButtonProps) {
	const reduceMotion = useReducedMotion();
	const focus = useFocusRing(onFocus, onBlur);
	const content = React.Children.map(children as React.ReactNode, (child) => {
		// Plain strings become the label Text, as `<Button>Label</Button>` on web.
		if (typeof child === 'string' || typeof child === 'number') return <Text>{child}</Text>;
		if (loading && React.isValidElement(child) && child.type === Icon) return null;
		return child;
	});

	return (
		<TextClassContext.Provider
			value={cn(buttonTextVariants({ variant, size }), disabled && 'text-muted-foreground')}
		>
			<Pressable
				role="button"
				className={cn(
					buttonVariants({ variant, size }),
					!disabled && !loading && !reduceMotion && 'active:scale-[0.98]',
					disabled && 'bg-muted active:bg-muted',
					loading && idleFill[variant ?? 'default'],
					className
				)}
				disabled={disabled}
				aria-busy={loading || undefined}
				// A busy button swallows the press here, so it never reaches a parent handler either.
				onPress={loading ? ignorePress : onPress}
				onFocus={focus.onFocus}
				onBlur={focus.onBlur}
				style={[focus.ringStyle, style]}
				{...props}
			>
				{loading && <Spinner />}
				{content}
			</Pressable>
		</TextClassContext.Provider>
	);
}

export { Button, buttonTextVariants, buttonVariants, Spinner };
