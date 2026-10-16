import type { DetailReport } from '@/components/report/slots/types';

type ReunitedSlotProps = { report: DetailReport; className?: string };

/**
 * P14 support moment (P15 `support.tip_*`): h3, three amount pills, custom amount, Pay and Skip of equal size, between
 * the story switch and "Končano"; gone once skipped, a thank-you line once paid. Empty until the web support ask
 * (TASK-33.2) fills it, as on mobile (components/report/reunited-slots.tsx).
 */
export function ReunitedTip(_props: ReunitedSlotProps) {
	return null;
}

/**
 * P14 ad slot: the one labelled ad (P21 `reunited`, "Oglas", 176 px reserved on web), below the support moment and
 * never beside the ask (P15): hidden while the tip asks. Until it loads it keeps its box; no ad, a failure or no network
 * collapse it with no gap. Empty until the web AdSlot (TASK-36.5) fills it.
 */
export function ReunitedAd(_props: ReunitedSlotProps) {
	return null;
}
