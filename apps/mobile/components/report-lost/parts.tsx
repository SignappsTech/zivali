import { useAccessibilityFocus } from '@rn-primitives/hooks';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { type Text as RNText, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** The view's note (system `note`): muted surface, icon and words, never colour alone. */
export function Note({
	icon,
	alert,
	className,
	children,
}: {
	icon: PhosphorIcon;
	alert?: boolean;
	className?: string;
	children: string;
}) {
	return (
		<View
			role={alert ? 'alert' : 'status'}
			aria-live="polite"
			accessible
			className={cn('flex-row gap-3 rounded-row bg-muted px-[18px] py-4', className)}
		>
			<Icon
				as={icon}
				weight={alert ? 'fill' : undefined}
				size={22}
				className={cn('mt-0.5', alert && 'text-destructive')}
			/>
			<Text className="min-w-0 flex-1 text-control leading-[22px]">{children}</Text>
		</View>
	);
}

/** The screen's h1 (34/40); it takes screen reader focus when it mounts. */
export function Heading({ children }: { children: string }) {
	const ref = useAccessibilityFocus<RNText>();
	return (
		<Text ref={ref} role="heading" className="font-display text-[34px] leading-[40px] tracking-[-0.68px]">
			{children}
		</Text>
	);
}
