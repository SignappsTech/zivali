import type * as React from 'react';

import { Ad } from '@/components/report/slots/ad';
import { MatchesNote } from '@/components/report/slots/matches-note';
import { NearHere } from '@/components/report/slots/near-here';
import { SlotA } from '@/components/report/slots/slot-a';
import { SlotB } from '@/components/report/slots/slot-b';
import { SlotC } from '@/components/report/slots/slot-c';
import type { DetailReport, ReportSlotProps } from '@/components/report/slots/types';

export type { DetailReport, ReportSlotProps };

/**
 * The P9 slots (named as in docs/design/pages/P9-report-detail.md). The detail screen owns the layout and renders
 * each slot in its place; feature tasks fill a slot in its own file, so the layout never changes.
 * - `slot-a`: action slot A, type dependent (sighting, contact) or the owner actions; the sticky action bar.
 * - `slot-b`: share and poster; the share button over the photo and in the compact top bar.
 * - `slot-c`: "Več možnosti" (report abuse; close search for owners); the overflow beside slot A.
 * - `matches-note`: the owner's one note (matches, held, hidden) at the top of the content.
 * - `ad`: the one labelled ad, after "Kaj se je zgodilo".
 * - `near-here`: "V bližini" tiles at the end.
 */
const slots = {
	'slot-a': SlotA,
	'slot-b': SlotB,
	'slot-c': SlotC,
	'matches-note': MatchesNote,
	ad: Ad,
	'near-here': NearHere,
} satisfies Record<string, React.ComponentType<ReportSlotProps>>;

export type ReportSlotName = keyof typeof slots;

export function ReportSlot({ name, ...props }: ReportSlotProps & { name: ReportSlotName }) {
	const Slot: React.ComponentType<ReportSlotProps> = slots[name];
	return <Slot {...props} />;
}

/** Open or matched: the report still takes actions. Reunited keeps only share; closed has none. */
export const isActive = (report: DetailReport) => report.status === 'open' || report.status === 'matched';
