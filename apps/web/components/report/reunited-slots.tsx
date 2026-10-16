import { AdSlot } from '@/components/ads/ad-slot';
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
 * P14 ad slot: the one labelled ad (P21 `reunited`, "Oglas", 200 px reserved, 176 from lg), below the support moment.
 * Never beside the ask (P15): the web tip (TASK-33.2) hides it while the tip asks, as on mobile. Until it loads it
 * keeps its box; no ad or a failure collapse it with no gap.
 */
export function ReunitedAd({ report, className }: ReunitedSlotProps) {
	return <AdSlot slot="reunited" species={report.species} region={report.region_slug} className={className} />;
}
