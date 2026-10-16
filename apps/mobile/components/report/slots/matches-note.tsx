import { useRouter } from 'expo-router';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { HourglassMediumIcon } from 'phosphor-react-native/src/icons/HourglassMedium';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { useNow, useTranslations } from 'use-intl';

import { useListMatchesQuery } from '@zivali/api/matches';
import { LIST_STATES } from '@/components/matches/parts';
import { canReopen } from '@/components/report/lifecycle';
import { Note } from '@/components/report/parts';
import type { ReportSlotProps } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

/**
 * P9 matches-note slot: the owner's one note at the top of the content, one variant at a time (P9 mockup S7). Held
 * and hidden reports say why others cannot see them; a lost search closed by the 90-day expiry says so while it can
 * be reopened; an open lost report with suggestions says "N možnih ujemanj" with "Poglej" to the P11 list. The "finder
 * marked it returned" note waits for the API to say which side reunited the report. Public: nothing.
 */
export function MatchesNote({ report, offline, className }: ReportSlotProps) {
	const t = useTranslations('report');
	const tl = useTranslations('lifecycle');
	const now = useNow();
	const router = useRouter();
	const lost =
		!!report.is_mine && report.type === 'lost' && (report.status === 'open' || report.status === 'matched');
	// The same query as the P11 list, so opening it shows the rows at once.
	const { data } = useListMatchesQuery({ code: report.short_code, state: LIST_STATES }, { skip: !lost || offline });
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
	const count = lost && !offline ? (data?.items.filter((m) => m.state === 'suggested').length ?? 0) : 0;
	if (count === 0) return null;
	return (
		<Note
			role="status"
			icon={SparkleIcon}
			className={className}
			action={
				<Button variant="text" size="sm" onPress={() => router.push(`/r/${report.short_code}/matches`)}>
					{t('owner_matches_link')}
					<Icon as={ArrowRightIcon} />
				</Button>
			}
		>
			<Text className="font-sans-semibold tabular-nums">{t('owner_matches', { count })}</Text>
		</Note>
	);
}
