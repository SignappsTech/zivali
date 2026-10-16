import { SupportTip } from '@/components/payments/support';
import type { DetailReport } from '@/components/report/slots/types';

type ReunitedSlotProps = { report: DetailReport; className?: string };

/**
 * P14 support moment (P15 `support.tip_*`): h3, three amount pills, custom amount, Pay and Skip of equal size, between
 * the story switch and "Končano"; gone once skipped, a thank-you line once paid (SupportTip, TASK-33.2). The owner's
 * page renders it for a real account only. `testMode` (outside production) adds the test-payment note.
 */
export function ReunitedTip({ report, testMode, className }: ReunitedSlotProps & { testMode: boolean }) {
	return <SupportTip reportId={report.id} code={report.short_code} testMode={testMode} className={className} />;
}

/**
 * P14 ad slot: the one labelled ad (P21 `reunited`, "Oglas", 176 px reserved on web), below the support moment and
 * never beside the ask (P15): hidden while the tip asks. Until it loads it keeps its box; no ad, a failure or no network
 * collapse it with no gap. Empty until the web AdSlot (TASK-36.5) fills it.
 */
export function ReunitedAd(_props: ReunitedSlotProps) {
	return null;
}
