import type { DetailReport } from '@/components/report/slots/types';

type ReunitedSlotProps = { report: DetailReport; className?: string };

/**
 * P14 support moment (P15 `support.tip_*`): h3, three amount pills, custom amount, Pay and Skip of equal size, between
 * the story switch and "Končano". TASK-33.3 renders it here; until then it takes no space.
 */
export function ReunitedTip(_props: ReunitedSlotProps) {
	return null;
}

/**
 * P14 ad slot: the one labelled ad (P21 `reunited`, "Oglas"), below the support moment. TASK-36.6 renders the AdSlot
 * here; until it loads, fails or is blocked the slot takes no space (no gap, no message).
 */
export function ReunitedAd(_props: ReunitedSlotProps) {
	return null;
}
