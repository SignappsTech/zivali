import { EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import { HourglassMediumIcon } from '@phosphor-icons/react/dist/ssr/HourglassMedium';
import { useTranslations } from 'next-intl';

import type { ReportSlotProps } from '@/components/report/slots/types';
import { noteClass } from '@/components/shelters/classes';
import { cn } from '@/lib/utils';

/**
 * P9 matches-note slot: the owner's one note at the top of the info column (P9 S7), one variant at a time. Held and
 * hidden reports say why others cannot see them; "N možnih ujemanj" with "Poglej" (P11) joins with the web match
 * review (TASK-20.3). Public: nothing.
 */
export function MatchesNote({ report, className }: ReportSlotProps) {
	const t = useTranslations('report');
	if (!report.is_mine) return null;
	const [Icon, text] =
		report.moderation_state === 'held'
			? [HourglassMediumIcon, t('owner_held')]
			: report.moderation_state === 'hidden'
				? [EyeSlashIcon, t('owner_hidden')]
				: [];
	if (!Icon) return null;
	return (
		<div role="status" className={cn(noteClass, className)}>
			<Icon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0 text-primary" />
			<p>{text}</p>
		</div>
	);
}
