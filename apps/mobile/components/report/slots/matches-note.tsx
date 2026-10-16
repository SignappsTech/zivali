import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { HourglassMediumIcon } from 'phosphor-react-native/src/icons/HourglassMedium';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { useNow, useTranslations } from 'use-intl';

import { canReopen } from '@/components/report/lifecycle';
import { Note } from '@/components/report/parts';
import type { ReportSlotProps } from '@/components/report/slots/types';

/**
 * P9 matches-note slot: the owner's one note at the top of the content, one variant at a time (P9 mockup S7). Held
 * and hidden reports say why others cannot see them; a lost search closed by the 90-day expiry says so while it can
 * be reopened. The "N possible matches" note with "Poglej" (P11) joins with the match review task; the "finder marked
 * it returned" note waits for the API to say which side reunited the report. Public view: nothing.
 */
export function MatchesNote({ report, className }: ReportSlotProps) {
	const t = useTranslations('report');
	const tl = useTranslations('lifecycle');
	const now = useNow();
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
	// P14 S6: a lost search closed after 90 idle days, while it can still be reopened ("Nadaljuj iskanje" in slot A).
	if (report.type === 'lost' && report.close_reason === 'expired' && canReopen(report, now.getTime()))
		return (
			<Note role="status" icon={InfoIcon} className={className}>
				{tl('expired_lost')}
			</Note>
		);
	return null;
}
