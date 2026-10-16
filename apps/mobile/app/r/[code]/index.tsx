import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { GiftIcon } from 'phosphor-react-native/src/icons/Gift';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { WifiSlashIcon } from 'phosphor-react-native/src/icons/WifiSlash';
import * as React from 'react';
import {
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	ScrollView,
	type StyleProp,
	View,
	type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFormatter, useLocale, useNow, useTranslations } from 'use-intl';

import type { CachedReport } from '@zivali/api/sync';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { formatDate, formatDayMonth } from '@zivali/i18n/format';
import type { PublicReport } from '@zivali/types';
import { AreaMap } from '@/components/report/area-map';
import { Note, StatusWord } from '@/components/report/parts';
import { PHOTO_HEIGHT, PhotoCarousel } from '@/components/report/photo-carousel';
import { type DetailReport, isActive, ReportSlot } from '@/components/report/slots';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useReport } from '@/lib/data/reports';
import { env } from '@/lib/env';
import { shadow } from '@/lib/theme';
import { cn } from '@/lib/utils';

const TOP_BAR = 56;
// The floating buttons over the photo: 44 px `card` circles at 88 % with `shadow-md` (P9 M1).
const FAB = 'absolute top-0 z-10 bg-card/[.88] active:bg-card';

/** The offline cache keeps the public subset (C17): no circumstances, reward or full photos, never manager fields. */
const fromCache = (r: CachedReport): DetailReport => ({
	...r,
	collar_described: false,
	in_slovenia: true,
	is_mine: false,
	created_at: r.updated_at,
	photos: r.thumb_url ? [{ url: r.thumb_url, thumb_url: r.thumb_url, alt: '', width: 0, height: 0 }] : [],
});
const toDetail = (r: PublicReport | CachedReport): DetailReport => ('photos' in r ? r : fromCache(r));

function useBack() {
	const router = useRouter();
	// A deep link opens this screen first, so there may be nothing to go back to.
	return () => (router.canGoBack() ? router.back() : router.replace('/'));
}

function BackButton({ className, style }: { className?: string; style?: StyleProp<ViewStyle> }) {
	const t = useTranslations('report');
	const back = useBack();
	return (
		<Button
			variant="ghost"
			size="icon"
			aria-label={t('mobile_back')}
			className={className}
			style={style}
			onPress={back}
		>
			<Icon as={CaretLeftIcon} size={22} />
		</Button>
	);
}

/** Loading, gone, not found and failures: back on top, the message under it (P1 410 and states). */
function StatePage({ children }: { children: React.ReactNode }) {
	const insets = useSafeAreaInsets();
	return (
		<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
			<View className="h-14 justify-center px-3">
				<BackButton />
			</View>
			{children}
		</View>
	);
}

function Gone({ kind }: { kind: 'gone' | 'not_found' | 'offline' }) {
	const t = useTranslations('errors');
	const tc = useTranslations('common');
	const router = useRouter();
	const [title, body] = {
		gone: [t('page_410_title'), t('page_410_body')],
		not_found: [t('page_404_title'), t('page_404_body')],
		offline: [t('offline_title'), t('offline_body')],
	}[kind];
	return (
		<StatePage>
			<EmptyState
				className="px-5 pt-6"
				title={title}
				description={body}
				action={
					<Button variant="secondary" onPress={() => router.replace('/')}>
						{tc('go_to_map')}
					</Button>
				}
			/>
		</StatePage>
	);
}

/** P9 loading skeleton: the photo block, title and facts; announced once as "Nalaganje …". */
function Loading() {
	const tc = useTranslations('common');
	const insets = useSafeAreaInsets();
	return (
		<View accessible aria-label={tc('loading')} aria-busy className="flex-1 bg-background">
			<Skeleton className="rounded-b-[32px] rounded-t-none" style={{ height: PHOTO_HEIGHT }} />
			<View className="gap-3 px-5 pt-6">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-10 w-48" />
				<Skeleton className="h-6 w-56" />
				<View className="mt-4 flex-row flex-wrap gap-y-4">
					{[0, 1, 2, 3].map((i) => (
						<View key={i} className="w-1/2 gap-1 pr-6">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-6 w-24" />
						</View>
					))}
				</View>
			</View>
			<View className="absolute left-4" style={{ top: insets.top + 12 }}>
				<BackButton className="bg-card/[.88]" style={shadow('md')} />
			</View>
		</View>
	);
}

/** Facts in two columns: label 14 muted over a 16 semibold value; the chip as "Čip vpisan", never the number. */
function Facts({ report }: { report: DetailReport }) {
	const t = useTranslations('report');
	const ta = useTranslations('attributes');
	const locale = useLocale();
	const lower = (s: string) => s.toLocaleLowerCase(locale);
	const colour = [
		...report.colours.map((c) => ta(`colours.${c}`)),
		...(report.pattern && report.pattern !== 'solid' ? [ta(`patterns.${report.pattern}`)] : []),
	];
	const facts = [
		colour.length ? [t('fact_colour'), lower(colour.join(', '))] : null,
		report.size ? [t('fact_size'), lower(ta(`size.${report.size}`))] : null,
		// The collar text is a manager field; the public view only knows that one was described.
		report.is_mine && report.collar ? [t('fact_collar'), report.collar] : null,
		[t('fact_chip'), report.has_chip ? t('chip_on_file') : t('chip_unknown')],
	].filter((fact): fact is [string, string] => fact !== null);
	return (
		<View className="mt-6 flex-row flex-wrap gap-y-4">
			{facts.map(([label, value]) => (
				<View key={label} accessible aria-label={`${label}: ${value}`} className="w-1/2 pr-6">
					<Text className="text-sm text-muted-foreground">{label}</Text>
					<Text className="mt-0.5 font-sans-semibold">{value}</Text>
				</View>
			))}
		</View>
	);
}

/** Reward line (display only, gift icon) and the one safety note right under it (P9 web 6–7, content §3). */
function Safety({ report }: { report: DetailReport }) {
	const t = useTranslations('report');
	const format = useFormatter();
	const locale = useLocale();
	const { reward } = report;
	const amount =
		reward?.eur != null
			? format.number(reward.eur, {
					style: 'currency',
					currency: 'EUR',
					minimumFractionDigits: 0,
					maximumFractionDigits: 0,
				})
			: undefined;
	const tips = `${env.EXPO_PUBLIC_APP_URL}${locale === 'en' ? '/en/safety' : '/varnost'}`;
	return (
		<View className="mt-6">
			{reward && (
				<View className="mb-3 flex-row items-center gap-3">
					<Icon as={GiftIcon} weight="fill" size={22} className="text-status-reunited" />
					<Text className="min-w-0 flex-1 font-sans-semibold tabular-nums">
						{amount ? t('reward_line_amount', { amount }) : t('reward_line')}
						{/* The owner's note is user text: never translated, never a link. */}
						{reward.note ? ` · ${reward.note}` : ''}
					</Text>
				</View>
			)}
			{reward && report.is_mine ? (
				<Text>{t('owner_reward_note')}</Text>
			) : (
				<Note icon={ShieldCheckIcon}>
					{reward ? t('safety_note_reward') : t('safety_note')}{' '}
					<Text
						role="link"
						className="font-sans-bold text-control leading-[22px] text-primary underline"
						onPress={() => void WebBrowser.openBrowserAsync(tips).catch(() => undefined)}
					>
						{t('safety_link')}
					</Text>
				</Note>
			)}
		</View>
	);
}

function Detail({ report, cachedAt }: { report: DetailReport; cachedAt: number | null | undefined }) {
	const t = useTranslations('report');
	const tb = useTranslations('browse');
	const ta = useTranslations('attributes');
	const tbr = useTranslations('breeds');
	const locale = useLocale();
	const format = useFormatter();
	const insets = useSafeAreaInsets();
	const [compact, setCompact] = React.useState(false);
	const [bar, setBar] = React.useState(0);
	const offline = cachedAt !== undefined;
	const active = isActive(report);
	const { data: place } = useReversePlaceQuery(
		{ lat: report.area.lat, lng: report.area.lng },
		{ skip: offline || !active }
	);

	const title = report.name
		? t('title_named', { name: report.name })
		: tb(`row_title_${report.type}`, { species: report.species });
	const species = ta(`species.${report.species}`);
	const breed = report.breed_codes
		.filter((code) => !code.endsWith('.unknown'))
		.map((code) => tbr(code))
		.join(', ');
	const subtitle = [
		breed ? t('subtitle', { species, breed }) : species,
		report.sex && report.sex !== 'unknown' ? ta(`sex.${report.sex}`).toLocaleLowerCase(locale) : null,
	]
		.filter(Boolean)
		.join(' · ');
	const now = useNow();
	const date = formatDayMonth(report.event_at, locale, now);
	const photos = report.photos.map((p) => ({ url: p.url, alt: p.alt || title }));
	// When the saved copy is from: the time today, else the day and time ("14.05", "12. 10., 14.05").
	const savedAt = cachedAt ?? Date.parse(report.updated_at);
	const savedTime = format.dateTime(savedAt, {
		hour: '2-digit',
		minute: '2-digit',
		...(formatDate(savedAt, locale) !== formatDate(now, locale) && { day: 'numeric', month: 'numeric' }),
	});

	const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
		setCompact(event.nativeEvent.contentOffset.y > PHOTO_HEIGHT - TOP_BAR - insets.top);

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				onScroll={onScroll}
				scrollEventThrottle={32}
				contentContainerStyle={{ paddingBottom: (active ? bar : insets.bottom) + 40 }}
			>
				<View>
					{/* Before the photo in reading order, drawn over it. */}
					{/* Only while the compact bar is not up: two copies would be two "Nazaj" and two "Deli" for TalkBack. */}
					{!compact && (
						<>
							<BackButton
								className={cn(FAB, 'left-4')}
								style={[shadow('md'), { marginTop: insets.top + 12 }]}
							/>
							<ReportSlot
								name="slot-b"
								report={report}
								offline={offline}
								className={cn(FAB, 'right-4')}
								style={[shadow('md'), { marginTop: insets.top + 12 }]}
							/>
						</>
					)}
					<PhotoCarousel photos={photos} />
				</View>

				<View className="px-5 pt-1">
					{offline && (
						<Note role="status" icon={WifiSlashIcon} iconClassName="text-foreground" className="mb-6">
							{t('offline_cached', { time: savedTime })}
						</Note>
					)}
					<ReportSlot name="matches-note" report={report} offline={offline} className="mb-6" />

					<View className="flex-row flex-wrap items-center gap-x-3">
						<StatusWord report={report} />
						{active && (
							<Text className="text-sm text-muted-foreground">{t(`since_${report.type}`, { date })}</Text>
						)}
					</View>
					<Text role="heading" className="mt-2 font-display text-[34px] leading-[40px] tracking-[-0.68px]">
						{title}
					</Text>
					<Text className="mt-1 text-lg text-muted-foreground">{subtitle}</Text>
					{report.status === 'reunited' && (
						<Text className="mt-6 text-xl leading-8">
							{report.name ? t('reunited_named', { name: report.name }) : t('reunited')}
						</Text>
					)}
					{report.status === 'closed' && <Text className="mt-6 text-xl leading-8">{t('closed')}</Text>}

					<Facts report={report} />

					{active && (
						<>
							<View className="mt-6">
								<AreaMap report={report} label={title} place={place?.label} offline={offline} />
							</View>
							<Safety report={report} />
							{report.circumstances ? (
								<>
									<Text role="heading" className="mt-10 font-display text-2xl tracking-[-0.36px]">
										{report.type === 'lost' ? t('about_lost') : t('about_other')}
									</Text>
									<Text className="mt-3">{report.circumstances}</Text>
								</>
							) : null}
						</>
					)}
					<ReportSlot name="ad" report={report} offline={offline} className="mt-10" />
					<ReportSlot name="near-here" report={report} offline={offline} className="mt-10" />
				</View>
			</ScrollView>

			{compact && (
				<View className="absolute inset-x-0 top-0 bg-background" style={{ paddingTop: insets.top }}>
					<View className="flex-row items-center gap-2 px-3" style={{ height: TOP_BAR }}>
						<BackButton />
						<Text numberOfLines={1} aria-hidden className="flex-1 font-display-semibold text-lg">
							{title}
						</Text>
						<ReportSlot name="slot-b" report={report} offline={offline} />
					</View>
				</View>
			)}

			{active && (
				// P9 sticky action bar: `card`, 20 px padding, shadow-lg; slot A with the slot C overflow beside it.
				<View
					onLayout={(event) => setBar(event.nativeEvent.layout.height)}
					className="absolute inset-x-0 bottom-0 bg-card px-5 pt-5"
					style={[shadow('lg'), { paddingBottom: 20 + insets.bottom }]}
				>
					<ReportSlot name="slot-a" report={report} offline={offline}>
						<ReportSlot name="slot-c" report={report} offline={offline} />
					</ReportSlot>
				</View>
			)}
		</View>
	);
}

/**
 * P9 report detail (`/r/[code]`, also from universal links and `zivali://r/<code>`, C15). The report comes through
 * lib/data/reports.ts: the public view online (plus the manager fields for the owner), the cached copy offline.
 * Removed, expired and hidden reports are the 410 page; an unknown code the 404 page.
 */
export default function ReportScreen() {
	const params = useLocalSearchParams<{ code?: string | string[] }>();
	const code = (Array.isArray(params.code) ? params.code[0] : params.code) ?? '';
	const { data, source, lastSyncAt, isLoading, error, refetch } = useReport(code);
	const t = useTranslations('common');

	if (!code) return <Gone kind="not_found" />;
	if (isLoading) return <Loading />;
	if (error?.data?.code === 'GONE') return <Gone kind="gone" />;
	if (error?.data?.code === 'NOT_FOUND') return <Gone kind="not_found" />;
	if (error)
		return (
			<StatePage>
				<View className="px-5 pt-6">
					<Note
						role="alert"
						icon={WarningCircleIcon}
						iconClassName="text-destructive"
						action={
							<Button variant="text" size="sm" onPress={() => void refetch()}>
								<Icon as={ArrowClockwiseIcon} />
								{t('try_again')}
							</Button>
						}
					>
						{t('inline_error')}
					</Note>
				</View>
			</StatePage>
		);
	if (!data) return <Gone kind={source === 'cache' ? 'offline' : 'not_found'} />;
	return <Detail report={toDetail(data)} cachedAt={source === 'cache' ? lastSyncAt : undefined} />;
}
