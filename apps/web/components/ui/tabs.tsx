'use client';

import { Tabs as TabsPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return <TabsPrimitive.Root data-slot="tabs" className={cn('grid gap-4', className)} {...props} />;
}

/** Segmented control (system §10.4): muted track; only for 2 or 3 views of the same content, never navigation. */
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn('flex w-full max-w-[280px] gap-1 rounded-full bg-muted p-1', className)}
			{...props}
		/>
	);
}

/** Selected = the raised card segment; disabled keeps a 2 px input inset line on the selected one. */
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			className={cn(
				'min-h-11 flex-1 cursor-pointer rounded-full px-3 text-[15px] font-bold whitespace-nowrap text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=active]:bg-card data-[state=active]:text-foreground disabled:cursor-not-allowed disabled:bg-transparent disabled:text-muted-foreground disabled:data-[state=active]:bg-transparent disabled:data-[state=active]:text-muted-foreground disabled:data-[state=active]:shadow-[inset_0_0_0_2px_hsl(var(--input))]',
				className
			)}
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			className={cn(
				'rounded-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring',
				className
			)}
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
