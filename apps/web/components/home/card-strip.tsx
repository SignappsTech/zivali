'use client';

import type * as React from 'react';

/**
 * The recent-report snap strip. Browsers do not scroll a focused card that already shows 32 px or more, so below lg a
 * card Tab lands on sits mostly off-screen (TASK-115.8): pull a card that is not fully in the strip to its snap point.
 * Smooth only with motion allowed: scrollIntoView follows the strip's `scroll-behavior`.
 */
export function CardStrip({ className, children }: { className: string; children: React.ReactNode }) {
	const reveal = (event: React.FocusEvent<HTMLUListElement>) => {
		const strip = event.currentTarget.getBoundingClientRect();
		const card = event.target.getBoundingClientRect();
		if (card.left < strip.left || card.right > strip.right)
			event.target.scrollIntoView({ block: 'nearest', inline: 'start' });
	};

	return (
		<ul className={`${className} motion-safe:scroll-smooth`} onFocus={reveal}>
			{children}
		</ul>
	);
}
