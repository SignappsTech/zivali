import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { useTranslations } from 'next-intl';

import type { ReportSlotProps } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * P9 action slot A, type dependent: lost "Sporoči opažanje" with the text button "Pošlji sporočilo"; found "To je moja
 * žival" with "Sporoči opažanje"; sighted "Pošlji sporočilo" with "To je moja žival". The owner (`is_mine`) gets
 * "Žival je spet doma", "Uredi" and "Plakat" instead (TASK-26.4). The layout renders it only while the report is open
 * or matched. The sighting (TASK-30.2) opens the P7 flow: on a lost report the short one linked to it (the API links
 * sightings to lost reports only), on a found report the plain sighting. Contact comes with TASK-21.3.
 */
export function SlotA({ report, className }: ReportSlotProps) {
	const t = useTranslations('report');
	if (report.is_mine || report.type === 'sighted') return null;
	const lost = report.type === 'lost';
	const query = lost
		? { type: 'sighted', linked_report_id: report.id, code: report.short_code, species: report.species }
		: { type: 'sighted' };
	return (
		<div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
			<Button asChild size="lg" variant={lost ? 'default' : 'text'}>
				<Link href={{ pathname: '/report/found', query }}>
					<EyeIcon weight="bold" aria-hidden="true" />
					{t('action_sighting')}
				</Link>
			</Button>
		</div>
	);
}
