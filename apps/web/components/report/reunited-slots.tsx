'use client';

import type { ReactNode } from 'react';

import { AdSlot } from '@/components/ads/ad-slot';
import { useAnswer } from '@/components/payments/answers';
import { SupportTip, usePaymentsOn } from '@/components/payments/support';
import type { DetailReport } from '@/components/report/slots/types';

/** "Končano": takes focus when Preskoči removes the tip. */
export const DONE_ID = 'reunited-done';

type ReunitedSlotProps = { report: DetailReport; className?: string };

/**
 * P14 support moment (P15 `support.tip_*`): h3, three amount pills, custom amount, Pay and Skip of equal size, between
 * the story switch and "Končano"; gone once skipped, a thank-you line once paid (SupportTip, TASK-33.2). The owner's
 * page renders it for a real account only. `testMode` (outside production) adds the test-payment note.
 */
export function ReunitedTip({ report, testMode, className }: ReunitedSlotProps & { testMode: boolean }) {
	return (
		<SupportTip
			reportId={report.id}
			code={report.short_code}
			testMode={testMode}
			skipFocusId={DONE_ID}
			className={className}
		/>
	);
}

/**
 * P14 ad slot: the one labelled ad (P21 `reunited`, "Oglas", 200 px reserved, 176 from lg), below the support moment.
 * Never beside the ask (P15): the web tip (TASK-33.2) hides it while the tip asks, as on mobile; with payments off
 * there is no ask. Until it loads it keeps its box; no ad or a failure collapse it with no gap.
 */
export function ReunitedAd({ report, tip, className }: ReunitedSlotProps & { tip: boolean }) {
	const ad = <AdSlot slot="reunited" species={report.species} region={report.region_slug} className={className} />;
	return tip ? <AfterTip code={report.short_code}>{ad}</AfterTip> : ad;
}

/** The ad waits while the tip asks; only then does it need the public config (payments on or off). */
function AfterTip({ code, children }: { code: string; children: ReactNode }) {
	const [answer] = useAnswer(`tip:${code}`);
	const paymentsOn = usePaymentsOn();
	return paymentsOn && answer === null ? null : children;
}
