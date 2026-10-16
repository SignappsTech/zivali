import { SupportTip } from '@/components/payments/support';
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
 * P14 ad slot: the one labelled ad (P21 `reunited`, "Oglas"), below the support moment. TASK-36.6 renders the AdSlot
 * here; until it loads, fails or is blocked the slot takes no space (no gap, no message). Hide the ad while
 * `useSupportTipState(report.short_code)` (components/payments/support) is 'asking': the tip ask comes first.
 */
export function ReunitedAd(_props: ReunitedSlotProps) {
	return null;
}
