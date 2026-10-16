import { ArchiveIcon } from '@phosphor-icons/react/dist/ssr/Archive';
import { useTranslations } from 'next-intl';

import type { DetailReport } from '@/components/report/slots/types';
import { StatusLabel } from '@/components/ui/status-label';

/** P9 large status word (`st-lg`): fill icon 18 and the word 16 bold in the status colour; closed is muted. */
export function StatusWord({ report }: { report: Pick<DetailReport, 'type' | 'status'> }) {
	const t = useTranslations('browse');
	if (report.status === 'closed')
		return (
			<span className="inline-flex items-center gap-[5px] font-bold whitespace-nowrap text-muted-foreground">
				<ArchiveIcon weight="fill" aria-hidden="true" className="size-[18px] shrink-0" />
				{t('status_closed')}
			</span>
		);
	const status = report.status === 'reunited' ? 'reunited' : report.type;
	return (
		<StatusLabel status={status} className="text-base [&>svg]:size-[18px]">
			{t(`status_${status}`)}
		</StatusLabel>
	);
}
