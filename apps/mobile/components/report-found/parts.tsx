import { useAccessibilityFocus } from '@rn-primitives/hooks';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import * as React from 'react';
import { type Text as RNText, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** The screen's one question (flow h1, 34/40); it takes screen reader focus when the step opens. */
export function Heading({ children, className }: { children: string; className?: string }) {
	const ref = useAccessibilityFocus<RNText>();
	return (
		<Text
			ref={ref}
			role="heading"
			className={cn('font-display text-[34px] leading-[40px] tracking-[-0.68px]', className)}
		>
			{children}
		</Text>
	);
}

/** The quiet line (P7 `lp-line`): a 16 px primary icon and 14/20 muted text. */
export function Line({
	icon,
	weight = 'fill',
	className,
	children,
}: {
	icon: PhosphorIcon;
	weight?: 'fill' | 'bold';
	className?: string;
	children: string;
}) {
	return (
		<View className={cn('flex-row gap-2', className)}>
			<Icon as={icon} weight={weight} size={16} className="mt-0.5 text-primary" />
			<Text className="min-w-0 flex-1 text-sm text-muted-foreground">{children}</Text>
		</View>
	);
}
