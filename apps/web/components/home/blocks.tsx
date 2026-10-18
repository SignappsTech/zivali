import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useLocale, useTranslations } from 'next-intl';

import { createApiClient, type Locale } from '@zivali/api/client';
import { formatRelative } from '@zivali/i18n/format';
import type { PublicReport, PublicStats, ReportList } from '@zivali/types';
import { reportStatus, reportTitle } from '@/components/browse/report-row';
import { ringClass, SpotIllustration } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusLabel } from '@/components/ui/status-label';
import { Link } from '@/i18n/navigation';
import { env } from '@/lib/env';
import { getPlace } from '@/lib/report';
import { cn } from '@/lib/utils';

// T1 Home layout A (TASK-115.1): the latest reports and the live numbers, server-rendered. The page renders per request
// (CSP nonce), so the public GETs go through Next's data cache: one API call per window for every visitor.

/** A visitor's client (no session) whose GETs are cached for `seconds`. */
const cachedApi = (locale: Locale, seconds: number) =>
	createApiClient({
		baseUrl: env.NEXT_PUBLIC_API_URL,
		locale,
		fetch: (input, init) => fetch(input, { ...init, next: { revalidate: seconds } }),
	});

/** Mobile: a snap strip of 78 % cards bleeding into the gutters; from lg three columns (two rows of three). */
const strip =
	'-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 *:shrink-0 *:basis-[78%] *:snap-start md:-mx-12 md:scroll-px-12 md:px-12 md:*:basis-[44%] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:p-0';

/**
 * GET /v1/reports?sort=recent&limit=6 (public, C4), cached a minute, with each card's place from the reverse lookup of
 * its fuzzed point. Error and empty states as P3 §2: an error never shows the empty copy.
 */
export async function RecentReports({ locale }: { locale: Locale }) {
	let reports: PublicReport[];
	try {
		reports = (
			await cachedApi(locale, 60).request<ReportList>('GET', '/v1/reports', {
				query: { sort: 'recent', limit: 6 },
				signal: AbortSignal.timeout(3000),
			})
		).items;
	} catch {
		return <RecentError />;
	}
	if (!reports.length) return <RecentEmpty />;

	const places = await Promise.all(reports.map(({ area }) => getPlace(locale, area.lat, area.lng)));
	return (
		<ul className={strip}>
			{reports.map((report, i) => (
				<li key={report.id}>
					<ReportCard report={report} place={places[i]?.label} />
				</li>
			))}
		</ul>
	);
}

/**
 * Card: photo 4:3, status word · relative time, "Izgubljen pes", the rough area. Never the pet's name, the exact place
 * or a distance (P3 §2). The link's name reads like a P4 row, with the area in place of the distance.
 */
function ReportCard({ report, place }: { report: PublicReport; place?: string }) {
	const t = useTranslations('browse');
	const locale = useLocale() as Locale;
	const title = reportTitle(t, { type: report.type, species: report.species });
	const { status, word } = reportStatus(t, report);
	const time = formatRelative(report.event_at, locale);
	const photo = report.photos[0];

	return (
		<Link
			href={{ pathname: '/r/[code]', params: { code: report.short_code } }}
			aria-label={t('row_a11y', { title, status: word, time, distance: place ?? '' }).replace(/, $/, '')}
			className={cn('group block h-full overflow-hidden rounded-card bg-card text-card-foreground', ringClass)}
		>
			{photo ? (
				// eslint-disable-next-line @next/next/no-img-element -- a thumbnail from the media host, like the P4 rows
				<img
					src={photo.thumb_url}
					alt={photo.alt}
					width={photo.width}
					height={photo.height}
					loading="lazy"
					decoding="async"
					className="aspect-[4/3] w-full bg-muted object-cover"
				/>
			) : (
				<span aria-hidden="true" className="block aspect-[4/3] bg-muted" />
			)}
			<span className="grid gap-1 px-5 pt-4 pb-5">
				<span className="flex flex-wrap items-center gap-x-2 text-sm">
					<StatusLabel status={status}>{word}</StatusLabel>
					<span aria-hidden="true" className="text-muted-foreground">
						·
					</span>
					<span className="text-muted-foreground tabular-nums">{time}</span>
				</span>
				<span className="font-display text-xl leading-7 font-semibold tracking-[-0.01em] group-hover:underline">
					{title}
				</span>
				{place && (
					<span className="flex items-center gap-1.5 text-muted-foreground">
						<MapPinIcon weight="bold" aria-hidden="true" className="size-[18px] shrink-0" />
						{place}
					</span>
				)}
			</span>
		</Link>
	);
}

/** Loading: the cards' shape, announced once (system §10.9). */
export function RecentReportsSkeleton() {
	const t = useTranslations('common');

	return (
		<div aria-busy="true">
			<p role="status" className="sr-only">
				{t('loading')}
			</p>
			<div className={strip}>
				{[1, 2, 3].map((card) => (
					<div key={card} className="overflow-hidden rounded-card bg-card">
						<Skeleton className="aspect-[4/3] rounded-none" />
						<div className="grid gap-2 px-5 pt-4 pb-5">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-7 w-48" />
							<Skeleton className="h-6 w-32" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/** No location is known on the home page, so only the body and the action (P3 §2), never "No open reports near you". */
function RecentEmpty() {
	const t = useTranslations('pages.home');

	return (
		<div className="grid max-w-[560px] gap-5">
			<SpotIllustration className="max-w-[360px]" />
			<p className="max-w-[58ch]">{t('near_empty_body')}</p>
			<Button asChild variant="secondary" className="justify-self-start">
				<Link href="/account/alerts">{t('near_empty_action')}</Link>
			</Button>
		</div>
	);
}

/** P1 inline error with the slice's sentence; retry reloads the page (a failed answer is not cached). */
function RecentError() {
	const t = useTranslations('pages.home');
	const tCommon = useTranslations('common');

	return (
		<div
			role="alert"
			className="flex flex-wrap items-center gap-3 rounded-row bg-muted py-4 pr-2 pl-[18px] text-control leading-[22px]"
		>
			<WarningCircleIcon weight="fill" aria-hidden="true" className="size-[22px] shrink-0 text-destructive" />
			<p className="flex-1">{t('near_error')}</p>
			<Button asChild variant="text" size="sm">
				<Link href="/">
					<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
					{tCommon('try_again')}
				</Link>
			</Button>
		</div>
	);
}

/**
 * GET /v1/stats/public (getPublicStats, TASK-115.4), cached 5 minutes like the API. The block shows only when all three
 * counts are set (the API sends null under 50); on any error it stays hidden. No heading (P3 §3).
 */
export async function LiveNumbers({ locale }: { locale: Locale }) {
	const stats = await cachedApi(locale, 300)
		.request<PublicStats>('GET', '/v1/stats/public', { signal: AbortSignal.timeout(1500) })
		.catch(() => null);
	if (stats?.reunited_total == null || stats.open_reports == null || stats.alert_subscribers == null) return null;

	return (
		<Numbers
			counts={[
				['stat_reunited', stats.reunited_total],
				['stat_open', stats.open_reports],
				['stat_alerts', stats.alert_subscribers],
			]}
		/>
	);
}

function Numbers({ counts }: { counts: [key: 'stat_reunited' | 'stat_open' | 'stat_alerts', count: number][] }) {
	const t = useTranslations('pages.home');
	// "1.350" in SL as the slice asks (plain `sl` grouping starts at five digits), "1,350" in EN.
	const number = new Intl.NumberFormat(useLocale(), { useGrouping: 'always' });

	return (
		<ul className="mt-12 grid gap-5 rounded-card bg-card p-6 text-card-foreground lg:mt-24 lg:grid-cols-3 lg:px-12 lg:py-10">
			{counts.map(([key, count]) => (
				<li key={key}>
					<span className="block font-display text-[44px] leading-none font-bold tracking-[-0.03em] tabular-nums lg:text-[64px]">
						{number.format(count)}
					</span>
					<span className="mt-2 block text-muted-foreground">{t(key)}</span>
				</li>
			))}
		</ul>
	);
}
