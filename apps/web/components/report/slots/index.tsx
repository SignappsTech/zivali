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
 * The P9 slots, named as on mobile (apps/mobile/components/report/slots). The detail page owns the layout and puts
 * each slot in its place; feature tasks fill a slot in its own file, so the layout never changes (C15).
 * - `slot-a`: action slot A, type dependent (sighting, contact) or the owner actions.
 * - `slot-b`: share and poster, "Deli ali natisni plakat".
 * - `slot-c`: "Več možnosti" (report abuse, copy link; close search for owners), beside slot B.
 * - `matches-note`: the owner's one note (held, hidden, matches) at the top of the info column.
 * - `ad`: the one labelled ad, below "Kje je bila videna".
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
