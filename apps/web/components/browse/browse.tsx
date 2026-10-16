'use client';

import { ArrowsDownUpIcon } from '@phosphor-icons/react/dist/ssr/ArrowsDownUp';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { SlidersHorizontalIcon } from '@phosphor-icons/react/dist/ssr/SlidersHorizontal';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { useReversePlaceQuery } from '@zivali/api/geocode';
import { flattenPages } from '@zivali/api/pagination';
import { useGetMapReportsQuery, useSearchReportsInfiniteQuery } from '@zivali/api/reports';
import { formatRelative, type Locale } from '@zivali/i18n/format';
import type { MapReport, PublicReport } from '@zivali/types';
import { MapView, type Marker } from '@/components/map/map-view';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusLabel } from '@/components/ui/status-label';
import { Link, useRouter } from '@/i18n/navigation';

import { FilterDrawer } from './filter-drawer';
import {
	areaBBox,
	type ChosenPlace,
	type Filters,
	filtersSearch,
	inArea,
	isDefault,
	parseFilters,
	type Point,
	resetFilters,
	SLOVENIA,
	SPECIES,
	toMapQuery,
	toSearch,
	TYPES,
} from './filters';
import { ReportList } from './report-list';
import { reportStatus, reportTitle, rowId, useDistance } from './report-row';

type Translate = ReturnType<typeof useTranslations<'browse'>>;
type Access = 'unknown' | 'granted' | 'ask' | 'denied';

const LG = '(min-width: 64rem)';
/** Below lg the list is a sheet over the map: peek, half and full (P4, system §10.7); the grabber steps through them. */
const SNAPS = ['40%', '60%', '92%'];
const COUNT_DEBOUNCE_MS = 300;
// A cached fix up to 10 minutes old is fine for "near you"; no fix within 5 s leaves the list Slovenia-wide.
const FIX: PositionOptions = { maximumAge: 10 * 60_000, timeout: 5000 };
const round2 = (n: number) => Math.round(n * 100) / 100;

function useMedia(query: string): boolean {
	return React.useSyncExternalStore(
		(onChange) => {
			const list = window.matchMedia?.(query);
			list?.addEventListener('change', onChange);
			return () => list?.removeEventListener('change', onChange);
		},
		() => window.matchMedia?.(query).matches ?? false,
		() => false
	);
}

function useDebounced<T>(value: T, ms: number): T {
	const [settled, setSettled] = React.useState(value);
	React.useEffect(() => {
		const timer = setTimeout(() => setSettled(value), ms);
		return () => clearTimeout(timer);
	}, [value, ms]);
	return settled;
}

/**
 * The browser's location for "near you". It never prompts by itself: on load it is read only when the permission is
 * already granted; "Uporabi mojo lokacijo" asks. It stays in memory: never drawn, never in the page URL, and queries
 * round it to 2 decimals (C4, C6).
 */
function useBrowserLocation() {
	const [here, setHere] = React.useState<Point | null>(null);
	const [access, setAccess] = React.useState<Access>('unknown');

	const locate = React.useCallback(
		() =>
			new Promise<Access>((resolve) => {
				const done = (next: Access) => {
					setAccess(next);
					resolve(next);
				};
				if (!navigator.geolocation) return done('denied');
				navigator.geolocation.getCurrentPosition(
					({ coords }) => {
						setHere({ lat: coords.latitude, lng: coords.longitude });
						done('granted');
					},
					(error) => done(error.code === error.PERMISSION_DENIED ? 'denied' : 'ask'),
					FIX
				);
			}),
		[]
	);

	React.useEffect(() => {
		let live = true;
		// Without the Permissions API (older Safari) the button asks.
		(navigator.permissions?.query({ name: 'geolocation' }) ?? Promise.reject(new Error('no Permissions API')))
			.then((status) => {
				if (!live) return;
				if (status.state === 'granted') void locate();
				else setAccess(status.state === 'denied' ? 'denied' : 'ask');
			})
			.catch(() => live && setAccess('ask'));
		return () => {
			live = false;
		};
	}, [locate]);

	return { here, access, locate };
}

/** "Izgubljene in najdene · psi in mačke · zadnjih 7 dni · 10 km" (content slice §1), first letter capital. */
export function filtersSummary(t: Translate, f: Filters): string {
	const types = TYPES.filter((type) => f.types.includes(type)).map((type) => t(`summary_${type}`));
	const text = t('filters_summary', {
		types:
			types.length === TYPES.length
				? t('summary_all_types')
				: types.length === 2
					? t('summary_join_and', { a: types[0], b: types[1] })
					: types[0],
		species:
			f.species.length === SPECIES.length
				? t('summary_both_species')
				: t(f.species[0] === 'cat' ? 'summary_cats' : 'summary_dogs'),
		when: t(`summary_${f.when}`),
		radius: f.km,
	});
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The applied filters live in the URL (shareable; the header's ?type=lost links); the chosen place in memory. */
function useAppliedFilters() {
	const search = useSearchParams().toString();
	const [place, setPlace] = React.useState<ChosenPlace | null>(null);
	const applied = React.useMemo(() => ({ ...parseFilters(new URLSearchParams(search)), place }), [search, place]);
	const apply = React.useCallback((next: Filters) => {
		setPlace(next.place);
		const query = filtersSearch(next);
		// Next.js syncs useSearchParams with history.replaceState, without a server round trip.
		window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
	}, []);
	return [applied, apply] as const;
}

/**
 * P4 web map and list (FR-007). From lg two panes: the list (420 px: h1, count, sort, "Filtri", the summary, rows) and
 * the map; below lg the map with the area pill and the list as a sheet over it, as on mobile. Map and list come from
 * the same filters and centre, so their counts agree. The map draws only public fuzzed areas (C6). The list is the
 * full keyboard and screen-reader alternative: a marker press (mouse and touch) opens the preview of what its row
 * links to.
 */
export function Browse() {
	const t = useTranslations('browse');
	const tm = useTranslations('map');
	const router = useRouter();
	const wide = useMedia(LG);
	const { here, access, locate } = useBrowserLocation();
	const [applied, apply] = useAppliedFilters();
	const [draft, setDraft] = React.useState<Filters>(applied);
	const [filtersOpen, setFiltersOpen] = React.useState(false);
	const [snap, setSnap] = React.useState(0);
	const [active, setActive] = React.useState<string | null>(null);
	const [selected, setSelected] = React.useState<string | null>(null);
	const sheet = React.useRef<HTMLElement>(null);
	const [sheetHeight, setSheetHeight] = React.useState(0);

	// Nothing is asked before the permission (and, when granted, the first fix) is known: no Slovenia-wide detour.
	const skip = access === 'unknown';
	const center = applied.place ?? here;
	const list = useSearchReportsInfiniteQuery(toSearch(applied, center), { skip });
	const mapQuery = toMapQuery(applied, center);
	const map = useGetMapReportsQuery(mapQuery, { skip });
	const pins = React.useMemo(() => inArea(map.data?.items ?? [], center, applied.km), [map.data, center, applied.km]);
	// In the API's order: boosted first (C4), so pages are not re-sorted here.
	const reports = React.useMemo(() => list.data && flattenPages(list.data), [list.data]);
	const count = map.data ? pins.length : (reports?.length ?? 0);

	// The drawer's live count: the draft (debounced while the slider moves); closed, the map's own query.
	const settled = useDebounced(draft, COUNT_DEBOUNCE_MS);
	const draftCenter = settled.place ?? here;
	const counted = useGetMapReportsQuery(filtersOpen ? toMapQuery(settled, draftCenter) : mapQuery, { skip });
	const draftCount = inArea(counted.data?.items ?? [], draftCenter, settled.km).length;

	// The area's place: the chosen one, else the settlement around the browser (asked at 2 decimals), else Slovenia.
	const rounded = here ? { lat: round2(here.lat), lng: round2(here.lng) } : undefined;
	const reverse = useReversePlaceQuery(rounded ?? { lat: 0, lng: 0 }, { skip: !rounded || Boolean(applied.place) });
	const place = applied.place?.label ?? (here && reverse.data?.label) ?? t('area_pill_no_location');

	const markers = React.useMemo(
		(): Marker[] =>
			pins.map((pin) => ({
				id: pin.short_code,
				position: pin.area,
				kind: pin.type,
				label: tm('marker_a11y', { title: reportTitle(t, pin), status: t(`status_${pin.type}`) }),
				boosted: pin.boosted,
				photoUrl: pin.thumb_url ?? undefined,
			})),
		[pins, t, tm]
	);
	const preview = selected ? pins.find((pin) => pin.short_code === selected) : undefined;

	// Below lg the attribution stays above the sheet.
	React.useEffect(() => {
		const element = sheet.current;
		if (!element || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(() => setSheetHeight(element.offsetHeight));
		observer.observe(element);
		return () => observer.disconnect();
	}, []);
	React.useEffect(() => {
		if (!selected) return;
		const close = (event: KeyboardEvent) => event.key === 'Escape' && setSelected(null);
		document.addEventListener('keydown', close);
		return () => document.removeEventListener('keydown', close);
	}, [selected]);

	const pressMarker = (code: string) => {
		// Below lg the map works as on mobile: a marker opens its report.
		if (!wide) return router.push({ pathname: '/r/[code]', params: { code } });
		setSelected(code === selected ? null : code);
		const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		document
			.getElementById(rowId(code))
			?.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
	};
	const openFilters = () => {
		setDraft(applied);
		setFiltersOpen(true);
	};
	const locateMe = async () => {
		if ((await locate()) === 'granted') setDraft((d) => ({ ...d, place: null }));
	};
	const loading = list.isLoading || skip;
	const sortWord = t(applied.sort === 'distance' ? 'sort_nearest' : 'sort_newest');
	const areaKey = center ? `${round2(center.lat)},${round2(center.lng)},${applied.km}` : 'slovenia';

	return (
		<main
			id="main"
			className="relative flex h-[calc(100dvh-4rem)] min-h-[560px] overflow-hidden md:h-[calc(100dvh-88px)]"
		>
			{/* Below lg the area pill is the only control on the map (P4); it opens the filters. */}
			<button
				type="button"
				aria-label={t('area_pill_a11y', { place, radius: applied.km })}
				onClick={openFilters}
				className="absolute top-6 left-5 z-20 flex h-12 max-w-[calc(100%-40px)] cursor-pointer items-center gap-2 rounded-full bg-card pr-2 pl-4 font-bold text-card-foreground shadow-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring md:left-12 lg:hidden"
			>
				<MapPinIcon weight="bold" aria-hidden="true" className="size-[18px] shrink-0" />
				<span className="truncate tabular-nums max-[359px]:hidden">
					{t('area_pill', { place, radius: applied.km })}
				</span>
				<span className="hidden truncate max-[359px]:inline">{place}</span>
				<span
					aria-hidden="true"
					className="ml-1 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"
				>
					<SlidersHorizontalIcon weight="bold" className="size-4" />
				</span>
			</button>

			<section
				ref={sheet}
				aria-labelledby="browse-title"
				className="absolute inset-x-0 bottom-0 z-10 flex h-(--sheet) flex-col rounded-t-sheet bg-card text-card-foreground shadow-lg transition-[height] duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:relative lg:z-auto lg:h-full lg:w-[420px] lg:shrink-0 lg:rounded-none lg:shadow-none"
				style={{ '--sheet': SNAPS[snap] } as React.CSSProperties}
			>
				<button
					type="button"
					aria-label={t('sheet_handle')}
					onClick={() => setSnap((snap + 1) % SNAPS.length)}
					className="-mb-3 flex h-11 w-full shrink-0 cursor-pointer items-center justify-center rounded-t-sheet before:h-[5px] before:w-10 before:rounded-[3px] before:bg-input focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring lg:hidden"
				/>
				<div className="shrink-0 px-5 pt-3 md:px-12 lg:px-6 lg:pt-6">
					<div className="flex items-center justify-between gap-3 lg:items-baseline">
						<div className="flex min-w-0 flex-wrap items-baseline gap-x-3 lg:flex-1 lg:justify-between">
							<h1
								id="browse-title"
								className="font-display text-2xl leading-[30px] font-bold tracking-[-0.015em] lg:text-3xl lg:leading-9 lg:tracking-[-0.02em]"
							>
								<span className="lg:hidden">{t('sheet_title')}</span>
								<span className="hidden lg:inline">{t('web_title')}</span>
							</h1>
							{loading ? (
								<Skeleton className="h-4 w-16 self-center" />
							) : (
								<span className="text-sm text-muted-foreground tabular-nums">
									{t('count', { count })}
								</span>
							)}
						</div>
						{center && !loading && (
							<SortButton
								label={`${t('sort_label')}: ${sortWord}`}
								word={sortWord}
								onClick={() =>
									apply({ ...applied, sort: applied.sort === 'distance' ? 'recent' : 'distance' })
								}
								className="lg:hidden"
							/>
						)}
					</div>
					<div className="mt-3 -ml-3 hidden items-center justify-between lg:flex">
						{center ? (
							<SortButton
								label={`${t('sort_label')}: ${sortWord}`}
								word={sortWord}
								onClick={() =>
									apply({ ...applied, sort: applied.sort === 'distance' ? 'recent' : 'distance' })
								}
							/>
						) : (
							<span />
						)}
						<Button variant="secondary" size="sm" aria-haspopup="dialog" onClick={openFilters}>
							<SlidersHorizontalIcon weight="bold" aria-hidden="true" />
							{t('filters_button')}
						</Button>
					</div>
					<p className="mt-2 hidden text-sm text-muted-foreground lg:block">{filtersSummary(t, applied)}</p>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-8 md:px-12 lg:px-6 lg:pt-6">
					<ReportList
						reports={reports}
						center={center}
						isLoading={loading}
						isError={Boolean(list.error || map.error)}
						onRetry={() => {
							void list.refetch();
							void map.refetch();
						}}
						filtered={!isDefault(applied)}
						onResetFilters={() => apply(resetFilters(applied))}
						includeClosed={applied.includeClosed}
						onIncludeClosedChange={(includeClosed) => apply({ ...applied, includeClosed })}
						hasNextPage={list.hasNextPage}
						isFetchingNextPage={list.isFetchingNextPage}
						onLoadMore={() => void list.fetchNextPage()}
						selected={selected}
						onActiveChange={setActive}
					/>
				</div>
			</section>

			{/* Its own stacking context: the map's overlays stay under the sheet and the pill. */}
			<div className="absolute inset-0 isolate lg:relative lg:inset-auto lg:min-w-0 lg:flex-1">
				{skip ? (
					// P4 loading: the map area in the `map-land` tone until the centre is known.
					<div className="size-full bg-map-land" />
				) : (
					<MapView
						// A new area (place, location or radius) opens the map on it.
						key={areaKey}
						markers={markers}
						cluster
						initialView={{ bbox: center ? areaBBox(center, applied.km) : SLOVENIA }}
						onMarkerPress={pressMarker}
						highlightId={active ?? selected ?? undefined}
						bottomInset={wide ? 0 : sheetHeight}
						textAlternative={<p className="sr-only">{tm('text_alternative', { place })}</p>}
					>
						{wide && preview && (
							<Preview
								pin={preview}
								report={reports?.find((report) => report.short_code === preview.short_code)}
								center={center}
								onClose={() => setSelected(null)}
							/>
						)}
					</MapView>
				)}
			</div>

			<FilterDrawer
				open={filtersOpen}
				onOpenChange={setFiltersOpen}
				draft={draft}
				onDraftChange={setDraft}
				count={draftCount}
				onApply={() => {
					apply(draft);
					setFiltersOpen(false);
				}}
				noLocation={!here}
				locationDenied={access === 'denied'}
				onUseLocation={() => void locateMe()}
				placeLabel={place}
				near={rounded}
			/>
		</main>
	);
}

function SortButton({
	label,
	word,
	onClick,
	className,
}: {
	label: string;
	word: string;
	onClick: () => void;
	className?: string;
}) {
	return (
		<Button variant="text" aria-label={label} onClick={onClick} className={className}>
			<ArrowsDownUpIcon weight="bold" aria-hidden="true" />
			{word}
		</Button>
	);
}

/**
 * P4 marker preview (lg, mouse and touch): photo, title, status, time and distance, "Odpri". Bottom-left of the map,
 * the attribution being bottom-right; Escape or the close button dismiss it. Its row in the list links to the same
 * report, for keyboard and screen-reader users.
 */
function Preview({
	pin,
	report,
	center,
	onClose,
}: {
	pin: MapReport;
	/** The pin's row, once its page is loaded: the name, the status and the time come from it. */
	report?: PublicReport;
	center: Point | null;
	onClose: () => void;
}) {
	const t = useTranslations('browse');
	const tm = useTranslations('map');
	const tc = useTranslations('common');
	const locale = useLocale() as Locale;
	const title = reportTitle(t, report ?? pin);
	const { status, word } = reportStatus(t, report ?? pin);
	const distance = useDistance(center, pin.area);
	const meta = [report && formatRelative(report.event_at, locale), distance].filter(Boolean);
	const photo = report?.photos[0];
	return (
		<div
			role="dialog"
			aria-labelledby="browse-preview"
			className="absolute bottom-6 left-6 z-10 w-[300px] rounded-row bg-popover p-4 text-popover-foreground shadow-pop"
		>
			<div className="flex items-center gap-4 pr-8">
				{pin.thumb_url ? (
					// eslint-disable-next-line @next/next/no-img-element -- a 64 px thumbnail from the media host
					<img
						src={photo?.thumb_url ?? pin.thumb_url}
						alt={photo?.alt ?? ''}
						width={64}
						height={64}
						className="size-16 shrink-0 rounded-row bg-muted object-cover"
					/>
				) : (
					<span aria-hidden="true" className="size-16 shrink-0 rounded-row bg-muted" />
				)}
				<div className="min-w-0">
					<p id="browse-preview" className="font-display text-xl leading-7 font-semibold">
						{title}
					</p>
					<p className="flex flex-wrap items-center gap-x-2 text-sm">
						<StatusLabel status={status}>{word}</StatusLabel>
						{meta.length > 0 && (
							<span className="text-muted-foreground tabular-nums">{meta.join(' · ')}</span>
						)}
					</p>
				</div>
			</div>
			<Button asChild variant="secondary" size="sm" className="mt-4 w-full">
				<Link href={{ pathname: '/r/[code]', params: { code: pin.short_code } }}>{tm('preview_open')}</Link>
			</Button>
			<Button
				variant="ghost"
				size="icon"
				aria-label={tc('close')}
				onClick={onClose}
				className="absolute top-1 right-1"
			>
				<XIcon weight="bold" aria-hidden="true" />
			</Button>
		</div>
	);
}
