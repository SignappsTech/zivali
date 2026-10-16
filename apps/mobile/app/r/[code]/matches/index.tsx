import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { PrinterIcon } from 'phosphor-react-native/src/icons/Printer';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import * as React from 'react';
import { Image, Pressable, RefreshControl, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { useListMatchesQuery } from '@zivali/api/matches';
import type { MatchSuggestion } from '@zivali/types';
import {
	ForbiddenState,
	LIST_STATES,
	errorCodeOf,
	Strength,
	isWithdrawn,
	sortMatches,
	useBack,
	useBands,
	usePlaceLabel,
} from '@/components/matches/parts';
import { Note } from '@/components/report/parts';
import { reportLink } from '@/lib/share';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusLabel } from '@/components/ui/status-label';
import { Text } from '@/components/ui/text';
import { useReport } from '@/lib/data/reports';

/** Back, the pet's photo 32 and name (P11 M1). */
function TopBar({ code }: { code: string }) {
	const t = useTranslations('report');
	const { data: report } = useReport(code);
	const back = useBack(`/r/${code}`);
	const thumb = report && ('photos' in report ? report.photos[0]?.thumb_url : report.thumb_url);
	return (
		<View className="h-14 flex-row items-center gap-2 px-3">
			<Button variant="ghost" size="icon" aria-label={t('mobile_back')} onPress={back}>
				<Icon as={CaretLeftIcon} size={22} />
			</Button>
			{thumb ? <Image source={{ uri: thumb }} aria-hidden className="size-8 rounded-full bg-muted" /> : null}
			{report?.name ? <Text className="font-sans-bold">{report.name}</Text> : null}
		</View>
	);
}

/** One row (no card): photo 64, place and distance, status word with the strength (or "confirmed"), the time gap. */
function MatchRow({ match, code }: { match: MatchSuggestion; code: string }) {
	const t = useTranslations('matches');
	const router = useRouter();
	const { distance, gap } = useBands(match);
	const area = usePlaceLabel(match.other.area)?.split(',')[0];
	const place = area && distance ? t('row_place', { area, distance }) : (area ?? distance);
	const status = match.other.type === 'sighted' ? 'sighted' : 'found';
	const confirmed = match.state === 'confirmed';
	const word = t(`strength_${match.strength}`);
	const gapLine = gap ? t('row_gap', { gap }) : undefined;
	const label = [
		match.chip_match ? t('chip_row') : null,
		place,
		t(`row_${status}`),
		confirmed ? t('confirmed') : t('strength_a11y', { strength: word }),
		gapLine,
	]
		.filter(Boolean)
		.join(', ');
	return (
		<View>
			{match.chip_match && (
				<View aria-hidden className="mb-3 flex-row items-center gap-2">
					<Icon as={ShieldCheckIcon} weight="fill" size={18} className="text-primary" />
					<Text className="font-sans-bold text-[15px] leading-5">{t('chip_row')}</Text>
				</View>
			)}
			<Pressable
				role="link"
				aria-label={label}
				onPress={() => router.push(`/r/${code}/matches/${match.id}`)}
				className="-m-2 flex-row items-center gap-4 rounded-row p-2 active:bg-accent"
			>
				<View className="size-16 overflow-hidden rounded-[20px] bg-muted">
					{match.other.photos[0] ? (
						<Image source={{ uri: match.other.photos[0].thumb_url }} className="size-16" />
					) : null}
				</View>
				<View className="min-w-0 flex-1 gap-1">
					{place ? <Text className="font-sans-bold text-[17px] leading-6">{place}</Text> : null}
					<View className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1">
						<StatusLabel status={status}>{t(`row_${status}`)}</StatusLabel>
						{confirmed ? (
							<View className="flex-row items-center gap-[5px]">
								<Icon as={CheckCircleIcon} weight="fill" size={16} className="text-primary" />
								<Text className="font-sans-bold text-sm text-primary">{t('confirmed')}</Text>
							</View>
						) : (
							<Strength strength={match.strength} />
						)}
					</View>
					{gapLine ? <Text className="text-sm leading-5 text-muted-foreground">{gapLine}</Text> : null}
				</View>
				<Icon as={CaretRightIcon} size={20} className="text-muted-foreground" />
			</Pressable>
		</View>
	);
}

/** P11 M7: rows in their final shape (photo 64, three lines), one "Nalaganje …". */
function LoadingRows() {
	const tc = useTranslations('common');
	return (
		<View aria-busy>
			<Text role="status" aria-live="polite" className="mt-6 text-sm text-muted-foreground">
				{tc('loading')}
			</Text>
			<View aria-hidden className="mt-3 gap-5">
				{[0, 1, 2, 3].map((i) => (
					<View key={i} className="flex-row items-center gap-4">
						<Skeleton className="size-16 rounded-[20px]" />
						<View className="flex-1 gap-2">
							<Skeleton className="h-6 w-3/5" />
							<Skeleton className="h-5 w-4/5" />
							<Skeleton className="h-5 w-2/5" />
						</View>
					</View>
				))}
			</View>
		</View>
	);
}

/**
 * P11 matches list (`/r/[code]/matches`; push, inbox and the P9 matches note open it). For the managers of a lost
 * report: ranked suggestions with the chip match first, pull to refresh, an empty state that says the search keeps
 * running. Matches live in memory only (C17); offline the list already loaded stays readable.
 */
export default function MatchesScreen() {
	const { code = '' } = useLocalSearchParams<{ code: string }>();
	const t = useTranslations('matches');
	const tc = useTranslations('common');
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { data, isLoading, isFetching, error, refetch } = useListMatchesQuery({ code, state: LIST_STATES });
	const items = React.useMemo(() => sortMatches(data?.items ?? []), [data]);
	const withdrawn = data ? isWithdrawn(code, data.items) : false;

	return (
		<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
			<TopBar code={code} />
			<ScrollView
				contentContainerClassName="px-5 pt-3"
				contentContainerStyle={{ paddingBottom: insets.bottom + 40, flexGrow: 1 }}
				refreshControl={
					<RefreshControl
						refreshing={isFetching && !isLoading}
						onRefresh={() => void refetch()}
						title={t('refresh')}
					/>
				}
			>
				<Text role="heading" className="font-display text-[30px] leading-9 tracking-[-0.6px]">
					{t('title')}
				</Text>
				{data && <Text className="mt-1 text-muted-foreground">{t('count', { count: items.length })}</Text>}

				{isLoading ? (
					<LoadingRows />
				) : error && !data && errorCodeOf(error) === 'FORBIDDEN' ? (
					<ForbiddenState code={code} className="mt-6" />
				) : error && !data ? (
					<Note
						role="alert"
						icon={WarningCircleIcon}
						iconClassName="text-destructive"
						className="mt-6"
						action={
							<Button variant="text" size="sm" onPress={() => void refetch()}>
								<Icon as={ArrowClockwiseIcon} />
								{tc('try_again')}
							</Button>
						}
					>
						{tc('inline_error')}
					</Note>
				) : items.length === 0 ? (
					<View className="flex-1 justify-center pb-10 pt-6">
						<EmptyState
							title={t('empty_title')}
							description={t('empty_body')}
							action={
								<View className="gap-3">
									<Button
										variant="secondary"
										onPress={() =>
											void Share.share({ message: reportLink(code) }).catch(() => undefined)
										}
									>
										<Icon as={ShareNetworkIcon} />
										{t('empty_share')}
									</Button>
									<Button
										variant="secondary"
										onPress={() => router.push(`/r/${code}/poster` as Href)}
									>
										<Icon as={PrinterIcon} />
										{t('empty_poster')}
									</Button>
									<Button variant="secondary" onPress={() => router.push('/settings/alerts' as Href)}>
										<Icon as={BellIcon} />
										{t('empty_alerts')}
									</Button>
								</View>
							}
						/>
					</View>
				) : (
					<View className="mt-6 gap-5">
						{items.map((match) => (
							<MatchRow key={match.id} match={match} code={code} />
						))}
					</View>
				)}

				{withdrawn && (
					<Note role="status" icon={InfoIcon} iconClassName="text-foreground" className="mt-8">
						{t('withdrawn')}
					</Note>
				)}
			</ScrollView>
		</View>
	);
}
