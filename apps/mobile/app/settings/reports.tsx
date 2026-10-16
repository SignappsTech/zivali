import { type Href, Redirect, Stack, useRouter } from 'expo-router';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { ClipboardTextIcon } from 'phosphor-react-native/src/icons/ClipboardText';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { WifiSlashIcon } from 'phosphor-react-native/src/icons/WifiSlash';
import * as React from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, View } from 'react-native';
import { useLocale, useNow, useTranslations } from 'use-intl';

import { useRequireAuth } from '@zivali/api/auth';
import { formatDayMonth } from '@zivali/i18n/format';
import type { ReportOwnerView } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import { OutboxList } from '@/components/outbox/queue';
import { Note, statusOf, StatusWord } from '@/components/report/parts';
import { Button } from '@/components/ui/button';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useMyReports } from '@/lib/data/reports';

/** P8 report row: photo 48 (radius 16), name over the date line, the status word on the right; opens the report. */
function ReportRow({ report }: { report: ReportOwnerView }) {
	const t = useTranslations();
	const locale = useLocale();
	const now = useNow();
	const router = useRouter();
	const focus = useFocusRing();
	const title = report.name ?? t(`browse.row_title_${report.type}`, { species: report.species });
	const since = t(`report.since_${report.type}`, { date: formatDayMonth(report.event_at, locale, now) });
	const thumb = report.photos[0]?.thumb_url;
	return (
		<Pressable
			role="link"
			aria-label={`${title}, ${since}, ${t(`browse.status_${statusOf(report)}`)}`}
			onPress={() => router.push(`/r/${report.short_code}` as Href)}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			style={focus.ringStyle}
			className="-mx-2 min-h-16 flex-row items-center gap-4 rounded-row px-2 py-2 active:bg-foreground/10"
		>
			{thumb ? (
				<Image source={{ uri: thumb }} alt="" className="size-12 rounded-[16px] bg-muted" />
			) : (
				<View className="size-12 rounded-[16px] bg-muted" />
			)}
			<View className="min-w-0 flex-1">
				<Text className="font-sans-bold">{title}</Text>
				<Text className="text-sm text-muted-foreground">{since}</Text>
			</View>
			<StatusWord report={report} />
		</Pressable>
	);
}

function Loading() {
	const t = useTranslations('common');
	return (
		<View accessible aria-label={t('loading')} aria-busy className="gap-2 px-5 pt-6">
			{[0, 1, 2].map((row) => (
				<View key={row} className="min-h-16 flex-row items-center gap-4">
					<Skeleton className="size-12 rounded-[16px]" />
					<View className="flex-1 gap-2">
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-4 w-1/3" />
					</View>
				</View>
			))}
		</View>
	);
}

/**
 * My reports (P8 "Moje prijave", the Profile row): reports waiting on this device first (C17 outbox), then the
 * account's own, open and past, newest first, paged with the C1 cursor. Network only (C17: no manager data cached).
 */
function MyReports() {
	const t = useTranslations();
	const errorText = useErrorText();
	const { data, error, isLoading, isFetching, isUninitialized, hasNextPage, fetchNextPage, refetch } = useMyReports();
	const reports = React.useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

	const state = isUninitialized ? (
		<Note role="status" icon={WifiSlashIcon} iconClassName="text-foreground">
			{t('errors.offline_body')}
		</Note>
	) : error && !data ? (
		<Note
			role="alert"
			icon={WarningCircleIcon}
			iconClassName="text-destructive"
			action={
				<Button variant="text" size="sm" loading={isFetching} onPress={() => void refetch()}>
					<Icon as={ArrowClockwiseIcon} />
					{t('common.try_again')}
				</Button>
			}
		>
			{errorText(error)}
		</Note>
	) : reports.length === 0 ? (
		<View className="flex-row gap-3">
			<Icon as={ClipboardTextIcon} size={22} className="mt-px text-muted-foreground" />
			<Text className="shrink text-muted-foreground">{t('pets.my_reports_empty')}</Text>
		</View>
	) : null;

	if (isLoading) return <Loading />;
	return (
		<FlatList
			data={reports}
			keyExtractor={(report) => report.id}
			renderItem={({ item }) => <ReportRow report={item} />}
			ListHeaderComponent={
				<>
					<OutboxList recent className="mb-8" />
					{state}
				</>
			}
			ListFooterComponent={
				isFetching && hasNextPage ? (
					<ActivityIndicator aria-label={t('common.loading')} className="py-4" />
				) : null
			}
			onEndReached={() => {
				if (hasNextPage && !isFetching) void fetchNextPage();
			}}
			role="list"
			contentContainerClassName="gap-2 px-5 pb-8 pt-6"
		/>
	);
}

export default function MyReportsSettings() {
	const t = useTranslations('pets');
	const { gate } = useRequireAuth();
	if (gate === 'signin') return <Redirect href="/profile" />;
	return (
		<>
			<Stack.Screen options={{ title: t('my_reports') }} />
			{gate === 'loading' ? <View className="flex-1 bg-background" /> : <MyReports />}
		</>
	);
}
