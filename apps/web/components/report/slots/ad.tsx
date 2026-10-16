import { AdSlot } from '@/components/ads/ad-slot';
import type { ReportSlotProps } from '@/components/report/slots/types';

/**
 * P9 ad slot: the one labelled unit ("Oglas", P21 Detail) below "Kje je bila videna", targeted by the report's region
 * and species. It keeps its box while loading and collapses with no gap when there is no ad.
 */
export function Ad({ report, className }: ReportSlotProps) {
	return <AdSlot slot="detail" species={report.species} region={report.region_slug} className={className} />;
}
