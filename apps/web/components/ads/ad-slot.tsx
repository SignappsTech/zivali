'use client';

import * as React from 'react';

import type { AdSlot as Slot, Species } from '@zivali/types';
import { cn } from '@/lib/utils';

import { RESERVED } from './reserved';

export type AdSlotProps = {
	slot: Slot;
	/** The page's context (the report beside the slot): targeting, and the region and species of the GA events. */
	species?: Species;
	/** C6 region slug, e.g. `osrednjeslovenska`. */
	region?: string;
	/** Spacing from the layout: kept by the reserved box, gone with the slot when it collapses. */
	className?: string;
};

/** Loading (P21 S1): the empty reserved box, no skeleton or text, hidden from screen readers. */
export function ReservedAd({ slot, className }: Pick<AdSlotProps, 'slot' | 'className'>) {
	return <div aria-hidden="true" data-ad-slot={slot} className={cn(RESERVED[slot], className)} />;
}

// The unit (its request, impression count and markup) is its own chunk: pages with a slot load it after their own
// code, and it brings no Redux or RTK Query (TASK-90.5).
const AdUnit = React.lazy(() => import('./ad-unit').then((m) => ({ default: m.AdUnit })));

/**
 * P21 AdSlot (feed, detail, reunited, sidebar), as on mobile (apps/mobile/components/ads/ad-slot.tsx): one labelled
 * "Oglas" unit, the reserved box until it loads, nothing at all when there is no ad or it fails. Never place it in
 * the report flows, manage, chat, sign-in, payments, consent settings, admin or the Partners page (C15; guarded by
 * ad-slot.test.tsx).
 */
export function AdSlot(props: AdSlotProps) {
	return (
		<React.Suspense fallback={<ReservedAd slot={props.slot} className={props.className} />}>
			<AdUnit {...props} />
		</React.Suspense>
	);
}
