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
	className?: string;
};

/** Spot illustration, h3, one sentence, one secondary button; no container (system §10.6). */
function EmptyState({ illustration, title, description, action, className }: EmptyStateProps) {
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
			<h3 className="mt-6 font-display text-xl leading-7 font-semibold tracking-[-0.01em] text-balance first:mt-0 lg:text-2xl lg:leading-8">
				{title}
			</h3>
			<p className="mt-2 max-w-[58ch]">{description}</p>
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

export { EmptyState };
