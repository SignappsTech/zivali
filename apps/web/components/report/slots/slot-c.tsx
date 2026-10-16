import { useTranslations } from 'next-intl';

import { MoreMenu } from '@/components/report/slots/more-menu';
import type { ReportSlotProps } from '@/components/report/slots/types';

/**
 * P9 slot C, "Več možnosti": the overflow menu beside slot B. Visitors get "Prijavi zlorabo" (P10); "Kopiraj
 * povezavo" and the owners' "Zaključi iskanje" (TASK-26.4) join it later. An own report shows no report entry, so
 * the slot stays empty for its managers until then.
 */
export function SlotC({ report }: ReportSlotProps) {
	const t = useTranslations('browse');
	if (report.is_mine) return null;
	// The page's h1: the name, else the P4 row title. Only the id and the title go to the client.
	const title = report.name ?? t(`row_title_${report.type}`, { species: report.species });
	return <MoreMenu target={{ type: 'report', id: report.id, title }} />;
}
