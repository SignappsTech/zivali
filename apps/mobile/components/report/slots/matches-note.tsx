import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { HourglassMediumIcon } from 'phosphor-react-native/src/icons/HourglassMedium';
import { useTranslations } from 'use-intl';

import { Note } from '@/components/report/parts';
import type { ReportSlotProps } from '@/components/report/slots/types';

/**
 * P9 matches-note slot: the owner's one note at the top of the content, one variant at a time (P9 mockup S7). Held
 * and hidden reports say why others cannot see them; the "N possible matches" note with "Poglej" (P11) and the
 * "finder marked it returned" note join here with the match review and lifecycle tasks. Public view: nothing.
 */
export function MatchesNote({ report, className }: ReportSlotProps) {
	const t = useTranslations('report');
	if (!report.is_mine) return null;
	if (report.moderation_state === 'held')
		return (
			<Note role="status" icon={HourglassMediumIcon} className={className}>
				{t('owner_held')}
			</Note>
		);
	if (report.moderation_state === 'hidden')
		return (
			<Note role="status" icon={EyeSlashIcon} className={className}>
				{t('owner_hidden')}
			</Note>
		);
	return null;
}
