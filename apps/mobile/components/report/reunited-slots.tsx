import { AdSlot } from '@/components/ads/ad-slot';
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
 * P14 ad slot: the one labelled ad (P21 `reunited`, "Oglas"). Never next to the support ask (P15): it sits after the
 * screen's actions, below a hairline. Until it loads it keeps the reserved box; no ad, a failure or no network
 * collapse it with its hairline (no gap, no message).
 */
export function ReunitedAd({ report, className }: ReunitedSlotProps) {
	return (
		<AdSlot slot="reunited" species={report.species} region={report.region_slug} divider className={className} />
	);
}
