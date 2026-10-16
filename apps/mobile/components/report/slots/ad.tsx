import { AdSlot } from '@/components/ads/ad-slot';
import type { ReportSlotProps } from '@/components/report/slots/types';

/**
 * P9 ad slot: the one labelled ad unit ("Oglas", P21 Detail), after "Kaj se je zgodilo". Until it loads it keeps the
 * reserved box; no ad, a failure or the saved copy (offline) collapse it with no gap and no message.
 */
export function Ad({ report, offline, className }: ReportSlotProps) {
	if (offline) return null;
	return <AdSlot slot="detail" species={report.species} region={report.region_slug} className={className} />;
}
