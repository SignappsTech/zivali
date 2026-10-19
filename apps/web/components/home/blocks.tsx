import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PawPrintIcon } from '@phosphor-icons/react/dist/ssr/PawPrint';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useLocale, useTranslations } from 'next-intl';

import { createApiClient, type Locale } from '@zivali/api/client';
import { formatRelative } from '@zivali/i18n/format';
import type { PublicReport, PublicStats, ReportList } from '@zivali/types';
import { reportStatus, reportTitle } from '@/components/browse/report-row';
import { listOf } from '@/components/report/seo';
import { ringClass } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { type Status, StatusLabel } from '@/components/ui/status-label';
import { Link } from '@/i18n/navigation';
import { env } from '@/lib/env';
import { getPlace } from '@/lib/report';
import { photoCrop } from '@/lib/photo';
import { cn } from '@/lib/utils';

import { OUTLINE, onTile, type Point, project, TOWNS, type View, zoomFor } from './teaser-map';

// T1 Home layout B (TASK-115.10): the latest reports next to a static map teaser, and the live numbers band,
// server-rendered. The page renders per request (CSP nonce), so the public GETs go through Next's data cache: one API
// call per window for every visitor.

/** A visitor's client (no session) whose GETs are cached for `seconds`. */
const cachedApi = (locale: Locale, seconds: number) =>
	createApiClient({
		baseUrl: env.NEXT_PUBLIC_API_URL,
		locale,
		fetch: (input, init) => fetch(input, { ...init, next: { revalidate: seconds } }),
	});

/** Mobile: the map teaser (2:1) above the rows; from lg the rows (5/12) next to the teaser (7/12, 420 px at least). */
const split = 'grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]';
const listSide = 'grid content-start gap-1 lg:order-first';
const teaserBox = 'relative block aspect-[2/1] overflow-hidden rounded-card lg:aspect-auto lg:min-h-[420px]';

/**
 * GET /v1/reports?sort=recent&limit=6 (public, C4), cached a minute, with each row's place from the reverse lookup of
 * its fuzzed point. Error and empty states as P3 §2: an error never shows the empty copy. A list has only full rows,
 * and the browser scrolls a row Tab lands on into view by itself.
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
	if (!reports.length)
		return (
			<div className={split}>
				<MapTeaser reports={[]} />
				<RecentEmpty />
			</div>
		);

	const places = await Promise.all(reports.map(({ area }) => getPlace(locale, area.lat, area.lng)));
	return (
		<>
			<div className={split}>
				<MapTeaser reports={reports} />
				<ul className={listSide}>
					{reports.map((report, i) => (
						<li key={report.id}>
							<ReportRow report={report} place={places[i]?.label} />
						</li>
					))}
				</ul>
			</div>
			<OpenMapBelow />
		</>
	);
}

/** Below lg the heading row has no map link: a visible one under the rows (wireframe B, mobile 390). */
function OpenMapBelow() {
	const t = useTranslations('pages.home');

	return (
		<Button asChild variant="text" className="mt-2 -ml-3 lg:hidden">
			<Link href="/map">
				{t('near_open_map')}
				<ArrowRightIcon weight="bold" aria-hidden="true" />
			</Link>
		</Button>
	);
}

const PIN: Record<Status, string> = {
	lost: 'fill-marker-lost',
	found: 'fill-marker-found',
	sighted: 'fill-marker-sighted',
	reunited: 'fill-marker-reunited',
};
const clamp = (value: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, value)));
/** A pin's halo radius in tile units; the cluster disc's is 16 (its 26-unit disc is about 40 px from lg, system §9). */
const PIN_R = 13;
const CLUSTER_R = 16;
/**
 * A report's pin on the tile, clamped to x 63-337, y 63-237: the `slice` crop shows at least y 50-250 (2:1 below lg)
 * and x 50-350 (about 1:1 near 1024 px), so a 13-unit pin always stays whole. The points are the public, fuzzed areas
 * the map shows too, never exact ones.
 */
const pinAt = (point: Point, view: View) => {
	const { x, y } = onTile(point, view);
	return { x: clamp(x, 63, 337), y: clamp(y, 63, 237) };
};

type Pin = ReturnType<typeof pinAt> & { id: string; status: Status };
/**
 * Pins closer than a pin plus a disc join one group, transitively, in the order the reports came: a pin that would
 * touch the cluster disc goes into it rather than under it.
 */
function groupPins(pins: Pin[]) {
	const groups: Pin[][] = [];
	for (const pin of pins) {
		const [first, ...rest] = groups.filter((group) =>
			group.some((other) => Math.hypot(other.x - pin.x, other.y - pin.y) < PIN_R + CLUSTER_R)
		);
		if (!first) groups.push([pin]);
		else {
			first.push(pin, ...rest.flat());
			for (const group of rest) groups.splice(groups.indexOf(group), 1);
		}
	}
	return groups;
}

type Marker = Point & { count: number };
type Box = { left: number; right: number; top: number; bottom: number };
const SIDE = {
	right: [1, 0, 'start'],
	left: [-1, 0, 'end'],
	below: [0, 1, 'middle'],
	above: [0, -1, 'middle'],
} as const;
const covers = (marker: Marker, box: Box) =>
	Math.hypot(
		marker.x - Math.min(Math.max(marker.x, box.left), box.right),
		marker.y - Math.min(Math.max(marker.y, box.top), box.bottom)
	) < (marker.count > 1 ? CLUSTER_R : PIN_R);
const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * The towns in view, each named beside its dot; a marker within 24 units of a town (its nearest) takes that name
 * beside it instead, so a disc reads "6 Ljubljana" rather than a bare 6 over a hidden label. A label takes its town's
 * side, else the first of right, left, below, above that stays in every crop (x 50-350, y 50-250) and clear of the
 * markers and the labels before it (about 0.55 em a letter).
 */
function townLabels(view: View, markers: Marker[]) {
	const towns = TOWNS.map((town) => ({ ...town, ...onTile(town, view) })).filter(
		({ x, y }) => x >= 55 && x <= 345 && y >= 58 && y <= 242
	);
	const beside = new Map<string, Marker>();
	for (const marker of markers) {
		const away = (town: Point) => Math.hypot(town.x - marker.x, town.y - marker.y);
		const [town] = towns.filter((near) => away(near) < CLUSTER_R + 8).sort((a, b) => away(a) - away(b));
		if (town && !beside.has(town.name)) beside.set(town.name, marker);
	}
	const placed: Box[] = [];
	return towns.map(({ name, side, x, y }) => {
		const marker = beside.get(name);
		const at = marker ?? { x, y };
		const gap = (marker ? (marker.count > 1 ? CLUSTER_R : PIN_R) : 2) + 4;
		const spots = ([side, 'right', 'left', 'below', 'above'] as const).map((spot) => {
			const [dx, dy, anchor] = SIDE[spot];
			const [lx, ly, width] = [Math.round(at.x + dx * gap), Math.round(at.y + dy * (gap + 6)), name.length * 6.5];
			const left = lx - (anchor === 'start' ? 0 : anchor === 'end' ? width : width / 2);
			return { x: lx, y: ly, anchor, box: { left, right: left + width, top: ly - 6, bottom: ly + 6 } };
		});
		const label =
			spots.find(
				({ box }) =>
					box.left >= 50 &&
					box.right <= 350 &&
					box.top >= 50 &&
					box.bottom <= 250 &&
					!markers.some((other) => covers(other, box)) &&
					!placed.some((other) => overlaps(other, box))
			) ?? spots[0]!;
		placed.push(label.box);
		return { name, x: Math.round(x), y: Math.round(y), label };
	});
}

/**
 * The map teaser: Slovenia's outline with a few towns and a pin per report at its rough place, drawn in the map tokens,
 * so the home page loads no map library (TASK-115.10 AC #3, TASK-115.12). Overlapping pins become one cluster disc with
 * the count, at their centre (TASK-115.11); a set that overlaps in one area zooms in on it (`zoomFor`). The whole tile
 * opens /map; the rows next to it are its list alternative, so the drawing is hidden.
 */
function MapTeaser({ reports }: { reports: PublicReport[] }) {
	const t = useTranslations('pages.home');
	const tBrowse = useTranslations('browse');
	const points = reports.map(({ area }) => project(area));
	const view = zoomFor(points, PIN_R + CLUSTER_R);
	// The disc is 3 units wider than a pin: its centre stays 3 units further in, so the crops never cut it either.
	const mean = (group: Pin[], axis: 'x' | 'y') =>
		clamp(group.reduce((sum, pin) => sum + pin[axis], 0) / group.length, 66, axis === 'x' ? 334 : 234);
	const markers = groupPins(
		reports.map((report, i) => ({
			...pinAt(points[i]!, view),
			id: report.id,
			status: reportStatus(tBrowse, report).status,
		}))
	).map((group) => ({
		...group[0]!,
		count: group.length,
		...(group.length > 1 && { x: mean(group, 'x'), y: mean(group, 'y') }),
	}));

	return (
		<Link href="/map" aria-label={t('near_open_map')} className={cn(teaserBox, ringClass)}>
			<svg
				viewBox="0 0 400 300"
				preserveAspectRatio="xMidYMid slice"
				aria-hidden="true"
				className="absolute inset-0 size-full"
			>
				<rect width="400" height="300" className="fill-map-water" />
				<path
					d={OUTLINE}
					transform={
						view.k > 1
							? `translate(${200 - view.k * view.x} ${150 - view.k * view.y}) scale(${view.k})`
							: undefined
					}
					className="fill-map-road"
				/>
				<g className="fill-map-label font-sans text-[12px] font-medium">
					{townLabels(view, markers).map(({ name, x, y, label }) => (
						<g key={name} data-town={name}>
							<circle cx={x} cy={y} r="2" />
							<text
								x={label.x}
								y={label.y}
								textAnchor={label.anchor}
								dominantBaseline="central"
								paintOrder="stroke"
								strokeWidth="3"
								strokeLinejoin="round"
								className="stroke-map-road"
							>
								{name}
							</text>
						</g>
					))}
				</g>
				{markers.map(({ id, x, y, status, count }) =>
					count === 1 ? (
						<g key={id} transform={`translate(${x} ${y})`} data-pin={status}>
							<circle r={PIN_R} className="fill-marker-ring" />
							<circle r="9" className={PIN[status]} />
						</g>
					) : (
						<g key={id} transform={`translate(${x} ${y})`} data-cluster={count}>
							<circle r={CLUSTER_R} className="fill-marker-ring" />
							<circle r={CLUSTER_R - 3} className="fill-marker-cluster" />
							<text
								textAnchor="middle"
								dominantBaseline="central"
								className="fill-marker-cluster-foreground font-sans text-[13px] font-bold tabular-nums"
							>
								{count}
							</text>
						</g>
					)
				)}
			</svg>
		</Link>
	);
}

/**
 * Row: photo 72, "Izgubljen pes", status word · relative time, the rough area, a caret. Never the pet's name, the exact
 * place or a distance (P3 §2). The link's name reads like a P4 row, with the area in place of the distance. The photo
 * alt is built here, not the API's (that one starts with the name): "Izgubljen pes, rjave barve" (P3 §Home alt text,
 * P9 §11).
 */
function ReportRow({ report, place }: { report: PublicReport; place?: string }) {
	const t = useTranslations('browse');
	const tReport = useTranslations('report');
	const locale = useLocale() as Locale;
	const title = reportTitle(t, { type: report.type, species: report.species });
	const { status, word } = reportStatus(t, report);
	const time = formatRelative(report.event_at, locale);
	const photo = report.photos[0];
	const colours = report.colours.map((code) => tReport(`seo_colour.${code}`));
	const alt = colours.length ? `${title}, ${tReport('seo_colours', { colours: listOf(colours, locale) })}` : title;

	return (
		<Link
			href={{ pathname: '/r/[code]', params: { code: report.short_code } }}
			aria-label={t('row_a11y', { title, status: word, time, distance: place ?? '' }).replace(/, $/, '')}
			className={cn(
				'-mx-2 flex min-h-20 items-center gap-3.5 rounded-row p-2 text-foreground hover:bg-foreground/10 active:bg-accent active:text-accent-foreground',
				ringClass
			)}
		>
			{photo ? (
				// eslint-disable-next-line @next/next/no-img-element -- a thumbnail from the media host, like the P4 rows
				<img
					src={photo.thumb_url}
					alt={alt}
					width={72}
					height={72}
					loading="lazy"
					decoding="async"
					className={cn('size-[72px] shrink-0 rounded-photo bg-muted', photoCrop)}
				/>
			) : (
				// No photo: the muted tile with a paw print, never an empty tile (P3 §2).
				<span
					aria-hidden="true"
					className="grid size-[72px] shrink-0 place-items-center rounded-photo bg-muted"
				>
					<PawPrintIcon weight="fill" className="size-8 text-muted-foreground" />
				</span>
			)}
			<span className="grid min-w-0 flex-1">
				<span className="font-display text-lg leading-7 font-semibold tracking-[-0.01em]">{title}</span>
				<span className="flex flex-wrap items-center gap-x-2 text-sm">
					<StatusLabel status={status}>{word}</StatusLabel>
					<span aria-hidden="true" className="text-muted-foreground">
						·
					</span>
					<span className="text-muted-foreground tabular-nums">{time}</span>
				</span>
				{place && (
					<span className="flex items-center gap-1 text-control text-muted-foreground">
						<MapPinIcon weight="bold" aria-hidden="true" className="size-4 shrink-0" />
						{place}
					</span>
				)}
			</span>
			<CaretRightIcon weight="bold" aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
		</Link>
	);
}

/** Loading: the teaser's and the rows' shape, announced once (system §10.9). */
export function RecentReportsSkeleton() {
	const t = useTranslations('common');

	return (
		<div aria-busy="true">
			<p role="status" className="sr-only">
				{t('loading')}
			</p>
			<div className={split}>
				<Skeleton className={teaserBox} />
				<div className={listSide}>
					{[1, 2, 3, 4, 5].map((row) => (
						<div key={row} className="flex min-h-20 items-center gap-3.5 py-2">
							<Skeleton className="size-[72px] shrink-0 rounded-photo" />
							<div className="grid flex-1 gap-2">
								<Skeleton className="h-6 w-40" />
								<Skeleton className="h-5 w-32" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/**
 * Next to the empty teaser. No location is known on the home page, so only the body and the action (P3 §2), never
 * "No open reports near you".
 */
function RecentEmpty() {
	const t = useTranslations('pages.home');

	return (
		<div className={cn(listSide, 'max-w-[560px] justify-items-start gap-5')}>
			<p className="max-w-[58ch]">{t('near_empty_body')}</p>
			<Button asChild variant="secondary">
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

/** Layout B: a dark band on the `sidebar` fill, three columns from lg. */
function Numbers({ counts }: { counts: [key: 'stat_reunited' | 'stat_open' | 'stat_alerts', count: number][] }) {
	const t = useTranslations('pages.home');
	// "1.350" in SL as the slice asks (plain `sl` grouping starts at five digits), "1,350" in EN.
	const number = new Intl.NumberFormat(useLocale(), { useGrouping: 'always' });

	return (
		<ul className="mt-12 grid gap-5 rounded-card bg-sidebar px-6 py-7 text-sidebar-foreground lg:mt-24 lg:grid-cols-3 lg:gap-12 lg:px-16 lg:py-14">
			{counts.map(([key, count]) => (
				<li key={key}>
					<span className="block font-display text-[44px] leading-none font-bold tracking-[-0.03em] tabular-nums lg:text-[64px]">
						{number.format(count)}
					</span>
					<span className="mt-2 block">{t(key)}</span>
				</li>
			))}
		</ul>
	);
}
