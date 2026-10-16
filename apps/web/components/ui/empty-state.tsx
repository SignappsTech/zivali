import * as React from 'react';

import { cn } from '@/lib/utils';

type EmptyStateProps = {
	/** Decorative spot illustration (flat geometry); hidden from assistive tech. */
	illustration?: React.ReactNode;
	title: React.ReactNode;
	/** One sentence. */
	description: React.ReactNode;
	/** One secondary Button. */
	action?: React.ReactNode;
	/** The title's level: h3 under a section's h2; h2 when the page's h1 is the only heading above it. */
	heading?: 'h2' | 'h3';
	className?: string;
};

/** Spot illustration, h3 (or `heading`), one sentence, one secondary button; no container (system §10.6). */
function EmptyState({ illustration, title, description, action, heading: Heading = 'h3', className }: EmptyStateProps) {
	return (
		<div data-slot="empty-state" className={cn('max-w-[360px]', className)}>
			{illustration && (
				<div
					aria-hidden="true"
					className="relative aspect-[32/21] overflow-hidden rounded-card bg-accent *:absolute *:inset-0 *:size-full"
				>
					{illustration}
				</div>
			)}
			<Heading className="mt-6 font-display text-xl leading-7 font-semibold tracking-[-0.01em] text-balance first:mt-0 lg:text-2xl lg:leading-8">
				{title}
			</Heading>
			<p className="mt-2 max-w-[58ch]">{description}</p>
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

export { EmptyState };
