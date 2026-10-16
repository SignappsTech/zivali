import BottomSheet, { type BottomSheetBackgroundProps, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { ArrowsDownUpIcon } from 'phosphor-react-native/src/icons/ArrowsDownUp';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { WifiSlashIcon } from 'phosphor-react-native/src/icons/WifiSlash';
import * as React from 'react';
import { AccessibilityInfo, Platform, Pressable, View } from 'react-native';
import { useFormatter, useLocale, useNow, useTranslations } from 'use-intl';

import type { CachedReport } from '@zivali/api/sync';
import { formatDate, type Locale } from '@zivali/i18n/format';
import { type AdSlot, AD_EVERY, type ListItem, type Sort, withAdSlots } from '@/components/browse/filters';
import { ReportRow } from '@/components/browse/report-row';
import { Button, Spinner } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { Point } from '@/lib/geo';
import { shadow } from '@/lib/theme';

/** Peek about 40 %, half, full (up to `topInset`, under the area pill), P4 and system §10.7. */
const SNAP_POINTS = ['40%', '60%', '100%'];
export const SNAP_FRACTIONS = [0.4, 0.6, 1];

export type ListSheetProps = {
	/** Rows in display order (boosted first); undefined until the first load. */
	reports: CachedReport[] | undefined;
	count: number;
	center: Point | null;
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
	/** Offline, the rows come from the cache: its last update, null before the first; undefined online. */
	cachedAt?: number | null;
	/** Filters differ from the defaults: an empty list is "no match", not "empty region". */
	filtered: boolean;
	onResetFilters: () => void;
	sort: Sort;
	/** Absent without a centre (nearest means nothing then). */
	onSortChange?: (sort: Sort) => void;
	includeClosed: boolean;
	onIncludeClosedChange: (includeClosed: boolean) => void;
	hasNextPage: boolean;
	onEndReached: () => void;
	onOpenReport: (shortCode: string) => void;
	onReport: () => void;
	onSetAlert: () => void;
	/** P21 insertion point (TASK-36.6): renders the ad row placed after every 8 report rows; no ads without it. */
	renderAd?: (slot: AdSlot) => React.ReactElement | null;
	/** Above the rows, scrolling with them (the outbox group, P7 C6). */
	header?: React.ReactElement;
	/** px kept free at the top at full snap (the area pill). */
	topInset: number;
	onSnapChange?: (index: number) => void;
};

function Background({ style }: BottomSheetBackgroundProps) {
	return <View style={[style, shadow('lg')]} className="rounded-t-sheet bg-card" />;
}

/** When the offline cache was last updated: the time today, else the day and time ("14:20", "12. 10., 14:20"). */
export function useUpdatedTime(at: number): string {
	const format = useFormatter();
	const locale = useLocale() as Locale;
	const otherDay = formatDate(at, locale) !== formatDate(useNow(), locale);
	return format.dateTime(at, {
		hour: '2-digit',
		minute: '2-digit',
		...(otherDay && { day: 'numeric', month: 'numeric' }),
	});
}

/** iOS has no live regions, so an offline state is announced when it appears; Android reads its polite region. */
function useAnnounced(text: string) {
	React.useEffect(() => {
		if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text);
	}, [text]);
}

/** P4 offline: one calm note above the cached rows, "Brez povezave, zadnja posodobitev …" (P2 offline state). */
function OfflineNote({ at }: { at: number | null }) {
	const t = useTranslations('browse');
	const time = useUpdatedTime(at ?? 0);
	const text = at === null ? t('offline_note_saved') : t('offline_note', { time });
	useAnnounced(text);
	return (
		<View
			accessible
			role="status"
			aria-live="polite"
			className="mb-5 flex-row gap-3 rounded-row bg-muted px-[18px] py-4"
		>
			<Icon as={WifiSlashIcon} weight="fill" size={22} className="mt-px" />
			<Text className="min-w-0 flex-1 text-control leading-[22px]">{text}</Text>
		</View>
	);
}

/** Offline before the first sync: nothing is cached yet, so say why the list is empty (no network actions). */
function OfflineEmpty() {
	const t = useTranslations();
	const body = t('browse.offline_empty_body');
	useAnnounced(`${t('errors.offline_title')}. ${body}`);
	return (
		<View role="status" aria-live="polite" className="pt-3">
			<EmptyState title={t('errors.offline_title')} description={body} />
		</View>
	);
}

/**
 * The Map tab's list sheet (P4, FR-007): the accessible alternative to the map, never behind it. Grabber (a button
 * that steps through the snap points), h2 "V bližini" with the count, the sort text button; then the rows (20 px
 * apart, paging 20 at a time), the loading, error, empty and offline states, and "Pokaži zaključene …" at the end.
 */
export function ListSheet({
	reports,
	count,
	center,
	isLoading,
	isError,
	onRetry,
	cachedAt,
	filtered,
	onResetFilters,
	sort,
	onSortChange,
	includeClosed,
	onIncludeClosedChange,
	hasNextPage,
	onEndReached,
	onOpenReport,
	onReport,
	onSetAlert,
	renderAd,
	header,
	topInset,
	onSnapChange,
}: ListSheetProps) {
	const t = useTranslations('browse');
	const sheet = React.useRef<BottomSheet>(null);
	const [snap, setSnap] = React.useState(0);
	const items = React.useMemo(() => withAdSlots(reports ?? [], renderAd ? AD_EVERY : null), [reports, renderAd]);
	const loading = isLoading && !reports?.length;
	const offline = cachedAt !== undefined;
	// Offline before the first sync with nothing from earlier browsing either.
	const nothingCached = offline && cachedAt === null && !loading && items.length === 0;
	const sortWord = t(sort === 'distance' ? 'sort_nearest' : 'sort_newest');

	const renderItem = ({ item }: { item: ListItem }) =>
		item.kind === 'ad' ? (
			(renderAd?.(item) ?? null)
		) : (
			<ReportRow report={item.report} center={center} onPress={() => onOpenReport(item.report.short_code)} />
		);

	const empty = loading ? (
		<View>
			<View className="flex-row items-center gap-2 pb-5">
				<Spinner />
				<Text aria-live="polite" className="text-sm text-muted-foreground">
					{t('loading')}
				</Text>
			</View>
			<View className="gap-5">
				{[0, 1, 2, 3].map((i) => (
					<View key={i} className="flex-row items-center gap-4">
						<Skeleton className="size-16 rounded-row" />
						<View className="flex-1 gap-2">
							<Skeleton className="h-5 w-[55%]" />
							<Skeleton className="h-4 w-3/4" />
						</View>
						<Skeleton className="h-4 w-12" />
					</View>
				))}
			</View>
		</View>
	) : nothingCached ? (
		<OfflineEmpty />
	) : isError ? null : filtered ? (
		<View className="pt-3">
			<Text>{t('no_match')}</Text>
			<Button variant="text" className="-ml-3 mt-2 self-start" onPress={onResetFilters}>
				{t('no_match_action')}
			</Button>
		</View>
	) : (
		<View className="items-center pt-1">
			{/* Spot illustration (TASK-31.1 delivers assets/empty-no-reports.png); decorative. */}
			<View aria-hidden className="aspect-[32/21] w-60 rounded-card bg-accent" />
			<Text role="heading" className="mt-5 text-center font-display-semibold text-2xl tracking-[-0.24px]">
				{t('empty_title')}
			</Text>
			<Text className="mt-2 text-center">{t('empty_body')}</Text>
			<View className="mt-5 w-full gap-1">
				<Button size="lg" onPress={onReport}>
					{t('empty_primary')}
				</Button>
				<Button variant="text" onPress={onSetAlert}>
					{t('empty_secondary')}
				</Button>
			</View>
		</View>
	);

	const footer = hasNextPage ? (
		<View className="items-center py-5">
			<Spinner />
		</View>
	) : !loading && (items.length > 0 || includeClosed) ? (
		<Button variant="text" className="-ml-3 mt-5 self-start" onPress={() => onIncludeClosedChange(!includeClosed)}>
			{t(includeClosed ? 'hide_closed' : 'show_closed')}
		</Button>
	) : null;

	return (
		<BottomSheet
			ref={sheet}
			index={0}
			snapPoints={SNAP_POINTS}
			enableDynamicSizing={false}
			topInset={topInset}
			handleComponent={null}
			backgroundComponent={Background}
			onChange={(index) => {
				setSnap(index);
				onSnapChange?.(index);
			}}
		>
			<Pressable
				role="button"
				aria-label={t('sheet_handle')}
				onPress={() => sheet.current?.snapToIndex((snap + 1) % SNAP_POINTS.length)}
				className="-mb-3 h-11 w-full items-center justify-center rounded-t-sheet"
			>
				<View className="h-[5px] w-10 rounded-[3px] bg-input" />
			</Pressable>
			<View className="flex-row items-center justify-between gap-3 px-5 pt-3">
				<View className="min-w-0 shrink flex-row flex-wrap items-baseline gap-x-3">
					<Text role="heading" className="font-display text-2xl tracking-[-0.36px]">
						{t('sheet_title')}
					</Text>
					{loading ? (
						<Skeleton className="h-4 w-16 self-center" />
					) : (
						<Text className="text-sm text-muted-foreground">{t('count', { count })}</Text>
					)}
				</View>
				{onSortChange && !loading && (
					<Button
						variant="text"
						aria-label={`${t('sort_label')}: ${sortWord}`}
						onPress={() => onSortChange(sort === 'distance' ? 'recent' : 'distance')}
					>
						<Icon as={ArrowsDownUpIcon} />
						{sortWord}
					</Button>
				)}
			</View>
			<BottomSheetFlatList
				data={items}
				keyExtractor={(item: ListItem) => item.key}
				renderItem={renderItem}
				ItemSeparatorComponent={RowGap}
				ListHeaderComponent={
					<View>
						{offline && !loading && !nothingCached && <OfflineNote at={cachedAt} />}
						{header}
						{isError && (
							<View role="alert" className="mb-5 flex-row gap-3 rounded-row bg-muted px-[18px] py-4">
								<Icon
									as={WarningCircleIcon}
									weight="fill"
									size={22}
									className="mt-px text-destructive"
								/>
								<View className="min-w-0 flex-1 items-start">
									<Text className="text-control leading-[22px]">{t('error')}</Text>
									<Button variant="text" className="-ml-3 mt-1" onPress={onRetry}>
										{t('error_action')}
									</Button>
								</View>
							</View>
						)}
					</View>
				}
				ListEmptyComponent={empty}
				ListFooterComponent={footer}
				onEndReached={hasNextPage ? onEndReached : undefined}
				onEndReachedThreshold={0.5}
				contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
			/>
		</BottomSheet>
	);
}

const RowGap = () => <View className="h-5" />;
