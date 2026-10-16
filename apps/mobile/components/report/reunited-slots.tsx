import { AdSlot } from '@/components/ads/ad-slot';
import { SupportTip, useSupportTipState } from '@/components/payments/support';
import type { DetailReport } from '@/components/report/slots/types';

type ReunitedSlotProps = { report: DetailReport; className?: string };

/**
 * P14 support moment (P15 `support.tip_*`): h3, three amount pills, custom amount, Pay and Skip of equal size, between
 * the story switch and "Končano". Gone once skipped; a thank-you line once paid.
 */
export function ReunitedTip({ report, className }: ReunitedSlotProps) {
	return <SupportTip reportId={report.id} code={report.short_code} className={className} />;
}

/**
 * P14 ad slot: the one labelled ad (P21 `reunited`, "Oglas"), below the support moment. Never beside the ask (P15):
 * hidden while the tip asks, it shows once the ask is skipped or paid, or when there is none (signed out). Until it
 * loads it keeps the reserved box; no ad, a failure or no network collapse it (no gap, no message).
 */
export function ReunitedAd({ report, className }: ReunitedSlotProps) {
	const tip = useSupportTipState(report.short_code);
	if (tip === 'asking') return null;
	return <AdSlot slot="reunited" species={report.species} region={report.region_slug} className={className} />;
}
