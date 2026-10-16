import { useRouter } from 'expo-router';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { HourglassMediumIcon } from 'phosphor-react-native/src/icons/HourglassMedium';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { useTranslations } from 'use-intl';

import { useListMatchesQuery } from '@zivali/api/matches';
import { LIST_STATES } from '@/components/matches/parts';
import { Note } from '@/components/report/parts';
import type { ReportSlotProps } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

/**
 * P9 matches-note slot: the owner's one note at the top of the content, one variant at a time (P9 mockup S7). Held
 * and hidden reports say why others cannot see them; an open lost report with suggestions says "N možnih ujemanj"
 * with "Poglej" to the P11 list. The "finder marked it returned" note joins with the lifecycle task. Public: nothing.
 */
export function MatchesNote({ report, offline, className }: ReportSlotProps) {
	const t = useTranslations('report');
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
