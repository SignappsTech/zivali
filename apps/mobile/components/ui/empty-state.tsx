import * as React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
	/** Decorative spot illustration (flat geometry); hidden from assistive tech. */
	illustration?: React.ReactNode;
	title: React.ReactNode;
	/** One sentence. */
	description: React.ReactNode;
	/** One secondary Button. */
	action?: React.ReactNode;
	className?: string;
};

/** Spot illustration, h3, one sentence, one secondary button; no container (system §10.6). */
function EmptyState({ illustration, title, description, action, className }: EmptyStateProps) {
	return (
		<View className={cn('max-w-[360px]', className)}>
			{illustration && (
				<View aria-hidden className="mb-6 aspect-[32/21] overflow-hidden rounded-card bg-accent">
					{illustration}
				</View>
			)}
			<Text role="heading" className="font-display-semibold text-xl tracking-[-0.2px]">
				{title}
			</Text>
			<Text className="mt-2">{description}</Text>
			{action && <View className="mt-5 self-start">{action}</View>}
		</View>
	);
}

export { EmptyState };
