import type { ReportSlotProps } from '@/components/report/slots';

/**
 * P9 ad slot: the one labelled ad unit ("Oglas", P21 Detail), after "Kaj se je zgodilo". TASK-36.6 renders the
 * AdSlot here; until it loads, fails or is blocked the slot takes no space (collapses with no gap and no message).
 */
export function Ad(_props: ReportSlotProps) {
	return null;
}
