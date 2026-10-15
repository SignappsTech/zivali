import * as React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** Flat card (system §10.6): card surface, radius 24, padding 24, no border, no shadow, never nested. */
function Card({ className, ...props }: React.ComponentProps<typeof View>) {
	return <View className={cn('rounded-card bg-card p-6', className)} {...props} />;
}

/** h3 role (title 20/28, Display 600). */
function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
	return (
		<Text
			role="heading"
			className={cn('font-display-semibold text-xl tracking-[-0.2px] text-card-foreground', className)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<typeof View>) {
	return <View className={cn('mt-2', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<typeof View>) {
	return <View className={cn('mt-5 flex-row flex-wrap gap-3', className)} {...props} />;
}

export { Card, CardContent, CardFooter, CardTitle };
