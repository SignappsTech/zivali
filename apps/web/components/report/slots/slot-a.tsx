import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { useTranslations } from 'next-intl';

import { ContactActions } from '@/components/report/slots/contact-actions';
import { OwnerActions } from '@/components/report/slots/owner-lazy';
import type { DetailReport, ReportSlotProps } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * P9 action slot A, type dependent: lost "Sporoči opažanje" with the text button "Pošlji sporočilo"; found "To je moja
 * žival" with "Sporoči opažanje"; sighted "Pošlji sporočilo" with "To je moja žival". The report's managers
 * (`is_mine`) get the owner actions instead (owner-actions.tsx, P14): "Žival je spet doma", "Uredi", "Zaključi
 * iskanje", and "Ponovno odpri" within the reopen window. Visitors get the sighting (TASK-30.2), which opens the P7
 * flow: on a lost report the short one linked to it (the API links sightings to lost reports only), on a found report
 * the plain sighting; and contact (contact-actions.tsx, TASK-21.6), which opens the conversation about the report
 * after the P16 gate. The layout renders the slot while the report is open or matched, and for its managers also once
 * it ended (reopen).
 */
export function SlotA({ report, className }: ReportSlotProps) {
	if (report.is_mine) return <OwnerActions report={report} className={className} />;
	return (
		<div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
			{report.type === 'lost' && <Sighting report={report} />}
			<ContactActions code={report.short_code} type={report.type} />
			{report.type === 'found' && <Sighting report={report} />}
		</div>
	);
}

function Sighting({ report }: { report: DetailReport }) {
	const t = useTranslations('report');
	const lost = report.type === 'lost';
	const query = lost
		? { type: 'sighted', linked_report_id: report.id, code: report.short_code, species: report.species }
		: { type: 'sighted' };
	return (
		<Button asChild size="lg" variant={lost ? 'default' : 'text'}>
			<Link href={{ pathname: '/report/found', query }}>
				<EyeIcon weight="bold" aria-hidden="true" />
				{t('action_sighting')}
			</Link>
		</Button>
	);
}
