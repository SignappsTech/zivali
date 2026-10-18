import { type Href, useRouter } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import * as React from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { ChoiceRowBody, choiceRowClass } from '@/components/ui/radio-group';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type MenuRowProps = Omit<React.ComponentProps<typeof Pressable>, 'children' | 'style'> & {
	style?: StyleProp<ViewStyle>;
	title: string;
	description?: string;
	/** 24 px icon on the left; pass `<Icon … />` for a status hue. */
	icon?: React.ReactElement<{ className?: string }>;
	/** The choice made earlier, on a step whose rows move on: the selected look and the check instead of the caret. */
	current?: boolean;
};

/**
 * Choice row used as a menu item (system §10.4): card on background (pass `bg-background` on a card sheet), radius 20,
 * 64 px, title 17 bold, optional description 14 muted, caret on the right instead of a check.
 */
function MenuRow({
	title,
	description,
	icon,
	current = false,
	className,
	style,
	onFocus,
	onBlur,
	...props
}: MenuRowProps) {
	const reduceMotion = useReducedMotion();
	const focus = useFocusRing(onFocus, onBlur);
	return (
		<Pressable
			role="button"
			aria-label={description ? `${title}, ${description}` : title}
			aria-selected={current || undefined}
			className={cn(choiceRowClass({ selected: current, disabled: false, reduceMotion }), className)}
			style={[focus.ringStyle, style]}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			{...props}
		>
			{current ? (
				<ChoiceRowBody title={title} description={description} icon={icon} selected disabled={false} />
			) : (
				<>
					{icon}
					<View className="min-w-0 flex-1">
						<Text className="font-sans-bold text-control-lg">{title}</Text>
						{description ? <Text className="text-sm text-muted-foreground">{description}</Text> : null}
					</View>
					<Icon as={CaretRightIcon} className="text-muted-foreground" />
				</>
			)}
		</Pressable>
	);
}

/** Signed-out actions: `lg` primary "Vpis" with the text button "Ustvari račun" under it (P2 A3, A4). */
function SignInButtons({ signIn, create, className }: { signIn: string; create: string; className?: string }) {
	const router = useRouter();
	// The auth screens come with TASK-9.4.
	return (
		<View className={cn('gap-1', className)}>
			<Button size="lg" onPress={() => router.push('/auth/sign-in' as Href)}>
				{signIn}
			</Button>
			<Button variant="text" onPress={() => router.push('/auth/sign-up' as Href)}>
				{create}
			</Button>
		</View>
	);
}

/** 88 px spot icon: `primary` icon in a `secondary` circle, decorative. */
function Spot({ icon }: { icon: PhosphorIcon }) {
	return (
		<View aria-hidden className="size-[88px] items-center justify-center rounded-full bg-secondary">
			<Icon as={icon} size={40} className="text-primary" />
		</View>
	);
}

export { MenuRow, SignInButtons, Spot };
