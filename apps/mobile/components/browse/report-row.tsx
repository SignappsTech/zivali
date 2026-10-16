import { RocketLaunchIcon } from 'phosphor-react-native/src/icons/RocketLaunch';
import * as React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';

import type { CachedReport } from '@zivali/api/sync';
import { formatDistanceBand, formatRelative } from '@zivali/i18n/format';
import { distanceBand } from '@/components/browse/filters';
import { Badge } from '@/components/ui/badge';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { type Status, StatusLabel } from '@/components/ui/status-label';
import { Text } from '@/components/ui/text';
import { distanceKm, type Point } from '@/lib/geo';

type Translate = ReturnType<typeof useTranslations<'browse'>>;

/** Row title: the pet's name, else "Izgubljen pes", "Najdena mačka" … (content slice §2). */
/** Map pins carry no name, so it is optional. */
export const reportTitle = (
	t: Translate,
	r: Pick<CachedReport, 'type' | 'species'> & { name?: string | null }
): string => (r.name ? t('row_title_named', { name: r.name }) : t(`row_title_${r.type}`, { species: r.species }));

/** Status word and its icon: the report type while open, "Spet doma" or "Zaključeno" once it ends. */
export function reportStatus(t: Translate, r: Pick<CachedReport, 'type' | 'status'>): { status: Status; word: string } {
	if (r.status === 'reunited') return { status: 'reunited', word: t('status_reunited') };
	return { status: r.type, word: r.status === 'closed' ? t('status_closed') : t(`status_${r.type}`) };
}

/**
 * P4 pet row (system §10.6): photo 64 radius 20, title 20/28, status word · time, the `premium` pill under it when
 * boosted, distance band on the right (only with a centre). A link whose name carries title, status, time, distance.
 */
export function ReportRow({
	report,
	center,
	onPress,
}: {
	report: CachedReport;
	center: Point | null;
	onPress(): void;
}) {
	const t = useTranslations('browse');
	const locale = useLocale();
	const focus = useFocusRing();
	const title = reportTitle(t, report);
	const { status, word } = reportStatus(t, report);
	const time = formatRelative(report.event_at, locale);
	const distance = center
		? t('row_distance', { band: formatDistanceBand(distanceBand(distanceKm(center, report.area)), locale) })
		: '';
	return (
		<Pressable
			role="link"
			// Without a centre there is no distance, so its separator goes too.
			aria-label={t('row_a11y', { title, status: word, time, distance }).replace(/, $/, '')}
			onPress={onPress}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			style={focus.ringStyle}
			className="flex-row items-center gap-4 rounded-row active:bg-accent"
		>
			{report.thumb_url ? (
				<Image source={{ uri: report.thumb_url }} accessible={false} className="size-16 rounded-row bg-muted" />
			) : (
				<View className="size-16 rounded-row bg-muted" />
			)}
			<View className="min-w-0 flex-1">
				<Text className="font-display-semibold text-xl tracking-[-0.2px]">{title}</Text>
				<View className="flex-row flex-wrap items-center gap-x-2">
					<StatusLabel status={status}>{word}</StatusLabel>
					<Text className="text-sm text-muted-foreground">·</Text>
					<Text className="text-sm text-muted-foreground">{time}</Text>
				</View>
				{report.boosted && (
					<Badge variant="premium" className="mt-2">
						<Icon as={RocketLaunchIcon} weight="fill" size={17} />
						{t('boosted')}
					</Badge>
				)}
			</View>
			{distance ? <Text className="shrink-0 text-sm text-muted-foreground">{distance}</Text> : null}
		</Pressable>
	);
}
