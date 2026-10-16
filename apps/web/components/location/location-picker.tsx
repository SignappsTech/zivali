'use client';

import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { ArrowsOutCardinalIcon } from '@phosphor-icons/react/dist/ssr/ArrowsOutCardinal';
import { ArrowUpIcon } from '@phosphor-icons/react/dist/ssr/ArrowUp';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretUpIcon } from '@phosphor-icons/react/dist/ssr/CaretUp';
import { CrosshairIcon } from '@phosphor-icons/react/dist/ssr/Crosshair';
import { GlobeHemisphereEastIcon } from '@phosphor-icons/react/dist/ssr/GlobeHemisphereEast';
import { GpsSlashIcon } from '@phosphor-icons/react/dist/ssr/GpsSlash';
import { HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { ImageSquareIcon } from '@phosphor-icons/react/dist/ssr/ImageSquare';
import { KeyboardIcon } from '@phosphor-icons/react/dist/ssr/Keyboard';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { MapPinSimpleIcon } from '@phosphor-icons/react/dist/ssr/MapPinSimple';
import { MinusIcon } from '@phosphor-icons/react/dist/ssr/Minus';
import { PawPrintIcon } from '@phosphor-icons/react/dist/ssr/PawPrint';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { PLACE_SEARCH_MIN_CHARS, usePlaceSearch, useReversePlaceQuery } from '@zivali/api/geocode';
import { formatDate, type Locale } from '@zivali/i18n/format';
import type { Place } from '@zivali/types';
import { coarsenPoint } from '@zivali/validation/geo';
import { type CameraState, type LatLng, MapView, type MapViewHandle } from '@/components/map/map-view';
import { Button, Spinner } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Mode = 'lost' | 'found' | 'sighted' | 'alert';
type Source = 'gps' | 'pin' | 'search' | 'exif';
type Pick = { point: LatLng; source: Source; label?: string };
export type LocationValue = { point: LatLng; radiusM?: number };

export type LocationPickerProps = {
	/** The stored (already coarsened) point and radius, e.g. from a draft: the map opens there with the own-pin label. */
	value?: LocationValue;
	mode: Mode;
	/** A point to offer: EXIF from a photo ("Uporabi kraj s fotografije"), or a GPS fix the map opens on. */
	suggested?: LatLng & { source: 'exif' | 'gps' };
	/**
	 * Confirm: the point coarsened once here (C6), never the raw one, or the stored `value` point as is when it was not
	 * moved; with the radius for lost and alert.
	 */
	onChange(value: LocationValue & { source: Source }): void;
	/** Location access is blocked: the explanation replaces "Uporabi mojo lokacijo"; pin and search work. */
	permissionDenied?: boolean;
	/** `dialog` (P5 E2): inside the caller's `DialogContent`, the question is its title and the map 300 px. */
	variant?: 'inline' | 'dialog';
};

// P5 stops: lost 200 m to 5 km (default 500 m), alert area 1 to 25 km (default 5 km). Same as the mobile picker.
export const RADII = {
	lost: {
		stops: [200, 300, 400, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
		initial: 500,
		step: 50,
	},
	alert: { stops: [1, 2, 3, 4, 5, 7, 10, 15, 20, 25].map((km) => km * 1000), initial: 5000, step: 1000 },
};
const LARGE_RADIUS_M = 3000; // from here the help line becomes the warning
const LJUBLJANA: LatLng = { lat: 46.0514, lng: 14.5058 }; // the map opens here without a value
const PIN_ZOOM = 15;
const SAME_M = 1; // a camera stop this close to the chosen point keeps that choice (and its source)
const NUDGE_M = 100;
const NUDGES = [
	['north', 1, 0, ArrowUpIcon, 'col-start-2 row-start-1'],
	['west', 0, -1, ArrowLeftIcon, 'col-start-1 row-start-2'],
	['east', 0, 1, ArrowRightIcon, 'col-start-3 row-start-2'],
	['south', -1, 0, ArrowDownIcon, 'col-start-2 row-start-3'],
] as const;
const NUDGE_PAD = 3 * 44 + 2 * 4; // 3 × 44 px buttons, 4 px gaps
const MAP_HEIGHT = { inline: 400, dialog: 300 };
const GPS_TIMEOUT_MS = 15_000;
const GEO_DATA_DATE = '2026-10-15'; // data state of the GURS geocoder snapshot (supabase/seed/geo/LICENSE.md)
const PIN = 'M27 62 L15 47.78 A24 24 0 1 1 39 47.78 Z'; // 54 × 66, the tail tip (27, 62) is the point
const M_PER_DEG = 111_320;
const EARTH_M = 40_075_016.686;

/** Metres per CSS px on MapLibre's 512 px tiles. */
const metresPerPx = (lat: number, zoom: number) => (EARTH_M * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
/** The zoom at which `radiusM` is `px` long. */
const zoomFor = (lat: number, radiusM: number, px: number) =>
	Math.log2((EARTH_M * Math.cos((lat * Math.PI) / 180) * px) / (512 * radiusM));
/** Equirectangular distance: accurate to centimetres at this scale. */
const metres = (a: LatLng, b: LatLng) =>
	Math.hypot((b.lng - a.lng) * Math.cos(((a.lat + b.lat) * Math.PI) / 360), b.lat - a.lat) * M_PER_DEG;
export const nearest = (stops: number[], m: number) =>
	stops.reduce((best, stop, i) => (Math.abs(stop - m) < Math.abs(stops[best]! - m) ? i : best), 0);

function firstPick(value?: LocationValue, suggested?: LocationPickerProps['suggested']): Pick {
	if (value) return { point: value.point, source: 'pin' };
	if (suggested?.source === 'gps') return { point: { lat: suggested.lat, lng: suggested.lng }, source: 'gps' };
	return { point: LJUBLJANA, source: 'pin' };
}

const searchErrorKey = (error: unknown) => {
	const code = (error as { data?: { code?: string } }).data?.code;
	return code === 'RATE_LIMITED' ? 'RATE_LIMITED_generic' : code === 'NETWORK' ? 'NETWORK' : 'INTERNAL';
};

// System §10.6 note: muted surface, radius 20, icon 22 + text 15/22.
const noteClass = 'flex gap-3 rounded-row bg-muted px-[18px] py-4 text-control leading-[22px]';
const floatClass = 'bg-card text-card-foreground shadow-md';
const floatButton = cn(floatClass, 'hover:bg-[color-mix(in_srgb,hsl(var(--card))_90%,hsl(var(--foreground)))]');
// P5 radius slider: 44 px target, 6 px `input` track with the `primary` fill to the thumb (`--f`), 28 px `primary`
// thumb on a 3 px `background` ring, the focus ring around it.
const rangeClass = cn(
	'block h-11 w-full cursor-pointer appearance-none bg-transparent focus:outline-none',
	'[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,hsl(var(--primary))_0_calc(14px_+_(100%_-_28px)_*_var(--f)),hsl(var(--input))_0)]',
	'[&::-webkit-slider-thumb]:-mt-[11px] [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_hsl(var(--background))]',
	'focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_5px_hsl(var(--ring))]',
	'[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-input',
	'[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-primary',
	'[&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-[0_0_0_3px_hsl(var(--background))]',
	'focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_5px_hsl(var(--ring))]'
);

/**
 * P5 LocationPicker (C6, web) on the TASK-15.2 MapView: the question, place search (a combobox), the map with the pin
 * fixed at its centre (drag or key the map under it; zoom buttons and an on-demand 100 m move pad), the address, "Uporabi
 * mojo lokacijo" through the P2 primer, the radius for lost and alert (slider and a number in metres), the privacy line
 * and Confirm. The raw GPS, pin, search or EXIF point stays in this component; Confirm hands `onChange` that point
 * coarsened once (`coarsenPoint`, 20–30 m), so forms, drafts and requests only ever see that. Never log the raw point
 * or send it to analytics. Needs a StoreProvider above it (place search and reverse lookup).
 */
export function LocationPicker({
	value,
	mode,
	suggested,
	onChange,
	permissionDenied,
	variant = 'inline',
}: LocationPickerProps) {
	const t = useTranslations('location');
	const tp = useTranslations('permissions');
	const tc = useTranslations('common');
	const te = useTranslations('errors');
	const format = useFormatter();
	const id = React.useId().replace(/[^\w-]/g, '');
	const map = React.useRef<MapViewHandle>(null);
	const box = React.useRef<HTMLDivElement>(null);
	const field = React.useRef<HTMLInputElement>(null);
	const dialog = variant === 'dialog';
	const mapHeight = MAP_HEIGHT[variant];

	const area = mode === 'lost' || mode === 'alert' ? RADII[mode] : undefined;
	const [radiusIndex, setRadiusIndex] = React.useState(() =>
		area ? nearest(area.stops, value?.radiusM ?? area.initial) : 0
	);
	const radiusM = area?.stops[radiusIndex];
	// The number field's text while it is edited; it snaps to the nearest stop on blur or Enter.
	const [radiusText, setRadiusText] = React.useState<string>();

	// The raw point lives only here (C6): it is coarsened on Confirm and never logged or sent to analytics.
	const [pick, setPick] = React.useState(() => firstPick(value, suggested));
	// The smaller side of the map: its height, unless laid out narrower (a phone). Read in handlers only.
	const side = () => Math.min(box.current?.clientWidth || mapHeight, mapHeight);
	const fitZoom = (point: LatLng, px = mapHeight) =>
		radiusM ? Math.min(PIN_ZOOM, zoomFor(point.lat, radiusM, 0.3 * px)) : PIN_ZOOM;
	const [camera, setCamera] = React.useState(() => ({ zoom: fitZoom(pick.point), moving: false }));

	const onCameraChange = ({ center, zoom, moving }: CameraState) => {
		setCamera((prev) => (prev.moving === moving && Math.abs(prev.zoom - zoom) < 0.01 ? prev : { zoom, moving }));
		if (!moving) setPick((prev) => (metres(prev.point, center) < SAME_M ? prev : { point: center, source: 'pin' }));
	};
	const choose = (next: Pick) => {
		setPick(next);
		map.current?.moveTo(next.point, fitZoom(next.point, side()));
	};
	const changeRadius = (index: number) => {
		setRadiusIndex(index);
		setRadiusText(undefined);
		// Keep the whole disc in view: zoom out when it would be wider than 90 % of the map.
		const max = zoomFor(pick.point.lat, area!.stops[index]!, 0.45 * side());
		if (camera.zoom > max) map.current?.moveTo(pick.point, max);
	};
	const commitRadius = () => {
		if (radiusText === undefined || !area) return;
		const typed = Number(radiusText);
		if (radiusText.trim() && Number.isFinite(typed)) changeRadius(nearest(area.stops, typed));
		else setRadiusText(undefined);
	};

	// Use my location: the P2 primer while the browser can still ask, then one fix (C6: never stored raw).
	const [primer, setPrimer] = React.useState(false);
	const [locating, setLocating] = React.useState(false);
	const [gps, setGps] = React.useState<'ok' | 'denied' | 'failed'>('ok');
	const denied = permissionDenied || gps === 'denied';
	// A fix can arrive after the picker closed: then nothing is set.
	const mounted = React.useRef(true);
	React.useEffect(() => {
		mounted.current = true;
		return () => void (mounted.current = false);
	}, []);
	const locate = () => {
		setLocating(true);
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				if (!mounted.current) return;
				setLocating(false);
				setGps('ok');
				choose({ point: { lat: coords.latitude, lng: coords.longitude }, source: 'gps' });
			},
			(error) => {
				if (!mounted.current) return;
				setLocating(false);
				// No fix in time (indoors, location off) leaves the button to retry; a refusal replaces it.
				setGps(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed');
			},
			{ enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS }
		);
	};
	const locateMe = async () => {
		if (!('geolocation' in navigator)) return setGps('failed');
		let state: PermissionState | undefined;
		try {
			state = (await navigator.permissions?.query({ name: 'geolocation' }))?.state;
		} catch {
			// No Permissions API answer: the primer, then the browser's own prompt decides.
		}
		if (state === 'granted') return locate();
		if (state === 'denied') return setGps('denied');
		setPrimer(true);
	};

	const [query, setQuery] = React.useState('');
	const [open, setOpen] = React.useState(false);
	const [row, setRow] = React.useState(0);
	const search = usePlaceSearch(query, pick.point);
	const typed = query.trim().length >= PLACE_SEARCH_MIN_CHARS;
	const options = search.isFetching ? [] : search.places;
	const expanded = open && options.length > 0;
	// A new answer (the map moved under the same text) can be shorter than the row the keyboard was on.
	const active = row < options.length ? row : 0;
	const popover = open && typed && (search.isFetching || search.searched || Boolean(search.error));
	const choosePlace = (place: Place) => {
		setQuery('');
		setOpen(false);
		choose({ point: { lat: place.lat, lng: place.lng }, source: 'search', label: place.label });
	};
	const onSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!options.length) return;
			const step = event.key === 'ArrowDown' ? 1 : -1;
			setRow(expanded ? (active + step + options.length) % options.length : 0);
			setOpen(true);
		} else if (event.key === 'Enter' && expanded) {
			event.preventDefault();
			choosePlace(options[active]!);
		} else if (event.key === 'Escape') {
			setOpen(false);
		}
	};

	// Reverse lookup once the map stops (search results bring their own label); null means outside Slovenia.
	const lookup = !camera.moving && !pick.label;
	const reverse = useReversePlaceQuery(pick.point, { skip: !lookup });
	const outside = lookup && reverse.currentData === null;
	const addressLoading = camera.moving || (lookup && reverse.currentData === undefined && !reverse.isError);
	const address = pick.label ?? reverse.currentData?.label ?? t('address_unknown');

	const own = value !== undefined && metres(pick.point, value.point) < SAME_M;
	// The stored point is coarsened already: confirmed unmoved it goes back as is, so re-saving never random-walks it.
	const confirm = () =>
		onChange({
			point: own ? value.point : coarsenPoint(pick.point),
			...(radiusM !== undefined && { radiusM }),
			source: pick.source,
		});

	const zoomBy = (delta: number) => map.current?.moveTo(pick.point, camera.zoom + delta);
	const nudge = (north: number, east: number) => {
		const { lat, lng } = pick.point;
		choose({
			point: {
				lat: lat + (north * NUDGE_M) / M_PER_DEG,
				lng: lng + (east * NUDGE_M) / (M_PER_DEG * Math.cos((lat * Math.PI) / 180)),
			},
			source: 'pin',
		});
	};
	const [nudging, setNudging] = React.useState(false);

	const radiusValue = (m: number) =>
		mode === 'alert'
			? t('alert_radius_value', { km: m / 1000 })
			: t('radius_value', {
					value: m < 1000 ? `${m} m` : `${format.number(m / 1000, { maximumFractionDigits: 1 })} km`,
				});
	const privacy = t(mode === 'lost' ? 'privacy_lost' : mode === 'alert' ? 'privacy_alert' : 'privacy_found');
	const PrivacyIcon = mode === 'alert' ? LockSimpleIcon : ShieldCheckIcon;
	const large = mode === 'lost' && radiusM !== undefined && radiusM >= LARGE_RADIUS_M;
	const discPx = radiusM ? (2 * radiusM) / metresPerPx(pick.point.lat, camera.zoom) : 0;
	const PinIcon = mode === 'alert' ? HouseIcon : PawPrintIcon;
	const heading = dialog ? (
		<DialogTitle className="text-[30px] leading-9 font-bold tracking-[-0.015em] lg:text-[30px]">
			{t(`title_${mode}`)}
		</DialogTitle>
	) : (
		<h1 className="font-display text-[34px] leading-10 font-bold tracking-[-0.02em] lg:text-5xl lg:leading-[56px]">
			{t(`title_${mode}`)}
		</h1>
	);

	return (
		<div data-slot="location-picker">
			{heading}

			<div
				className={cn('relative', dialog ? 'mt-6' : 'mt-8')}
				onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}
			>
				<FormField label={t('search_label')} id={`${id}-q`}>
					<div className="relative">
						<MapPinIcon
							weight="bold"
							aria-hidden="true"
							className="pointer-events-none absolute top-1/2 left-0.5 size-[22px] -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							ref={field}
							type="search"
							role="combobox"
							aria-autocomplete="list"
							aria-expanded={expanded}
							aria-controls={`${id}-listbox`}
							aria-activedescendant={expanded ? `${id}-option-${active}` : undefined}
							autoComplete="off"
							placeholder={t('search_placeholder')}
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
								setRow(0);
								setOpen(true);
							}}
							onFocus={() => setOpen(true)}
							onKeyDown={onSearchKey}
							className="pr-12 pl-[34px] [&::-webkit-search-cancel-button]:hidden"
						/>
						<span className="absolute top-1/2 right-0 -translate-y-1/2">
							{search.isFetching ? (
								<span className="grid size-11 place-items-center">
									<Spinner className="text-primary" />
								</span>
							) : query ? (
								<Button
									variant="ghost"
									size="icon"
									aria-label={t('search_clear')}
									onClick={() => {
										setQuery('');
										// The button goes away with the text: focus back to the field.
										field.current?.focus();
									}}
								>
									<XCircleIcon
										weight="fill"
										aria-hidden="true"
										className="size-[22px] text-muted-foreground"
									/>
								</Button>
							) : null}
						</span>
					</div>
				</FormField>
				{/* Results drop over the map; mousedown keeps focus in the field, so a click is not lost to its blur. */}
				<div
					hidden={!popover}
					onMouseDown={(event) => event.preventDefault()}
					className="absolute inset-x-0 top-full z-30 mt-2 rounded-row bg-popover p-2 text-popover-foreground shadow-pop"
				>
					{search.isFetching ? (
						<>
							<p role="status" className="px-3 pt-1 text-sm text-muted-foreground">
								{t('searching')}
							</p>
							{[62, 48, 70].map((width) => (
								<div
									key={width}
									aria-hidden="true"
									className="flex min-h-[52px] items-center gap-3 px-3"
								>
									<Skeleton className="size-5 rounded-full" />
									<Skeleton className="h-4" style={{ width: `${width}%` }} />
								</div>
							))}
						</>
					) : search.error ? (
						<p role="status" className="px-3 py-2">
							{te(searchErrorKey(search.error))}
						</p>
					) : options.length === 0 ? (
						<p role="status" className="flex gap-3 px-3 py-2">
							<MagnifyingGlassIcon
								weight="bold"
								aria-hidden="true"
								className="mt-0.5 size-5 shrink-0 text-muted-foreground"
							/>
							<span>{t('no_results')}</span>
						</p>
					) : null}
					<ul id={`${id}-listbox`} role="listbox" aria-label={t('search_label')} hidden={!expanded}>
						{options.map((place, index) => {
							const [head, ...tail] = place.label.split(', ');
							return (
								<li
									key={`${place.lat},${place.lng}`}
									id={`${id}-option-${index}`}
									role="option"
									aria-selected={index === active}
									onMouseDown={() => choosePlace(place)}
									className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-sm px-3 hover:bg-foreground/10 aria-selected:shadow-[inset_0_0_0_3px_hsl(var(--ring))]"
								>
									<MapPinIcon
										weight="bold"
										aria-hidden="true"
										className="size-5 shrink-0 text-muted-foreground"
									/>
									<span>
										<b>{head}</b>
										{tail.length ? `, ${tail.join(', ')}` : null}
									</span>
								</li>
							);
						})}
					</ul>
					{!search.isFetching && !search.error && <Attribution />}
				</div>
			</div>

			<div
				ref={box}
				className={cn(
					'relative',
					dialog ? 'mt-4 *:data-[slot=map-view]:rounded-row' : 'mt-6 *:data-[slot=map-view]:rounded-card'
				)}
			>
				<MapView
					ref={map}
					height={mapHeight}
					detail
					initialView={{ center: pick.point, zoom: camera.zoom }}
					onCameraChange={onCameraChange}
					label={own ? `${t('pin_a11y')} ${t('exact_own')}` : t('pin_a11y')}
					hint={t('keyboard_hint')}
					textAlternative={
						<>
							<p className="mt-3 flex gap-2 text-sm text-muted-foreground">
								<KeyboardIcon weight="bold" aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
								<span>{t('keyboard_hint')}</span>
							</p>
							<Button
								variant="text"
								className="mt-1 -ml-3"
								aria-expanded={nudging}
								aria-controls={`${id}-nudge`}
								onClick={() => setNudging(!nudging)}
							>
								<ArrowsOutCardinalIcon weight="bold" aria-hidden="true" />
								{t('nudge_show')}
								{nudging ? (
									<CaretUpIcon weight="bold" aria-hidden="true" />
								) : (
									<CaretDownIcon weight="bold" aria-hidden="true" />
								)}
							</Button>
							{/* After its disclosure in the tab order, drawn over the map's bottom-left corner. */}
							<div
								id={`${id}-nudge`}
								hidden={!nudging}
								className="absolute left-4 z-10 grid grid-cols-[repeat(3,44px)] grid-rows-[repeat(3,44px)] gap-1"
								style={{ top: mapHeight - 16 - NUDGE_PAD }}
							>
								{NUDGES.map(([direction, north, east, Arrow, cell]) => (
									<Button
										key={direction}
										variant="ghost"
										size="icon"
										aria-label={t(`nudge_${direction}`)}
										className={cn(floatButton, cell)}
										onClick={() => nudge(north, east)}
									>
										<Arrow weight="bold" aria-hidden="true" className="size-5" />
									</Button>
								))}
							</div>
						</>
					}
				>
					<div aria-hidden="true" className="pointer-events-none absolute inset-0">
						{discPx > 0 && (
							<span
								data-testid="picker-disc"
								className={cn(
									'absolute top-1/2 left-1/2 -translate-1/2 rounded-full',
									mode === 'alert'
										? 'bg-[hsl(var(--primary)/var(--marker-area-alpha))] shadow-[inset_0_0_0_2px_hsl(var(--primary))]'
										: 'bg-marker-area shadow-[inset_0_0_0_2px_hsl(var(--marker-lost))]'
								)}
								style={{ width: discPx, height: discPx }}
							/>
						)}
						{camera.moving && (
							<span className="absolute top-1/2 left-1/2 -mt-1 -ml-1 size-2 rounded-full bg-primary shadow-[0_0_0_2px_hsl(var(--marker-ring))]" />
						)}
						<span
							data-testid="picker-pin"
							data-lifted={camera.moving || undefined}
							className="absolute top-1/2 left-1/2 -mt-[62px] -ml-[27px] h-[66px] w-[54px] transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] data-lifted:-translate-y-3.5 motion-reduce:transition-none"
						>
							<svg viewBox="0 0 54 66" width="54" height="66" className="block overflow-visible">
								<path
									d={PIN}
									className="fill-primary stroke-marker-ring stroke-6 [paint-order:stroke]"
									strokeLinejoin="round"
								/>
							</svg>
							<PinIcon
								weight="fill"
								className="absolute top-[27px] left-[27px] size-6 -translate-1/2 text-primary-foreground"
							/>
						</span>
					</div>
					{own && (
						<span className="pointer-events-none absolute top-1/2 left-1/2 z-10 mt-2 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full pr-3 pl-2.5 text-sm font-bold whitespace-nowrap shadow-md bg-card text-card-foreground">
							<LockSimpleIcon weight="fill" aria-hidden="true" className="size-4 text-primary" />
							{t('exact_own')}
						</span>
					)}
					<div className={cn('absolute top-4 right-4 z-10 flex flex-col rounded-full', floatClass)}>
						<Button variant="ghost" size="icon" aria-label={t('zoom_in')} onClick={() => zoomBy(1)}>
							<PlusIcon weight="bold" aria-hidden="true" className="size-5" />
						</Button>
						<Button variant="ghost" size="icon" aria-label={t('zoom_out')} onClick={() => zoomBy(-1)}>
							<MinusIcon weight="bold" aria-hidden="true" className="size-5" />
						</Button>
					</div>
				</MapView>
			</div>

			<div className={cn('flex flex-wrap items-center justify-between gap-x-4', dialog ? 'mt-4' : 'mt-6')}>
				<p
					aria-live="polite"
					className={cn(
						'flex min-h-11 min-w-0 items-center gap-2',
						addressLoading ? 'font-semibold text-muted-foreground' : 'font-bold'
					)}
				>
					{addressLoading ? (
						<Spinner className="mx-0.5 size-4 border-2" />
					) : (
						<MapPinSimpleIcon weight="fill" aria-hidden="true" className="size-5 shrink-0 text-primary" />
					)}
					<span className="min-w-0">{addressLoading ? t('address_loading') : address}</span>
				</p>
				{/* Denied: the note takes the button's place below (a click would only fail again). */}
				{!denied && (
					<Button variant="text" className="-mr-3" loading={locating} onClick={() => void locateMe()}>
						<CrosshairIcon weight="bold" aria-hidden="true" />
						{locating ? t('locating') : t('use_my_location')}
					</Button>
				)}
			</div>
			{(denied || gps === 'failed') && (
				<p role="status" className={cn(noteClass, 'mt-3')}>
					<GpsSlashIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
					<span>{t('gps_denied')}</span>
				</p>
			)}
			{suggested?.source === 'exif' && (
				<Button
					variant="text"
					className="mt-1 -ml-3"
					onClick={() => choose({ point: { lat: suggested.lat, lng: suggested.lng }, source: 'exif' })}
				>
					<ImageSquareIcon weight="bold" aria-hidden="true" />
					{t('use_photo_location')}
				</Button>
			)}
			{outside && (
				<p role="status" className={cn(noteClass, 'mt-3')}>
					<GlobeHemisphereEastIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
					<span>{t('outside_si')}</span>
				</p>
			)}

			{area && radiusM !== undefined && (
				<div className={dialog ? 'mt-6' : 'mt-8'}>
					<div className="flex flex-wrap items-end gap-x-8 gap-y-4">
						<div className="min-w-[200px] flex-1">
							<div className="flex items-baseline justify-between gap-3">
								<label htmlFor={`${id}-r`} className="text-control font-bold">
									{t(mode === 'alert' ? 'alert_radius_label' : 'radius_label')}
								</label>
								<span aria-hidden="true" className="text-[15px] leading-5 font-bold tabular-nums">
									{radiusValue(radiusM)}
								</span>
							</div>
							<input
								id={`${id}-r`}
								type="range"
								min={0}
								max={area.stops.length - 1}
								step={1}
								value={radiusIndex}
								aria-valuetext={radiusValue(radiusM)}
								aria-describedby={`${id}-rh`}
								onChange={(event) => changeRadius(Number(event.target.value))}
								className={cn(rangeClass, 'mb-1.5')}
								style={{ '--f': radiusIndex / (area.stops.length - 1) } as React.CSSProperties}
							/>
						</div>
						<FormField label={t('radius_number_label')} id={`${id}-n`} className="w-40 flex-none">
							<div className="relative">
								<Input
									type="number"
									inputMode="numeric"
									min={area.stops[0]}
									max={area.stops.at(-1)}
									step={area.step}
									value={radiusText ?? radiusM}
									onChange={(event) => setRadiusText(event.target.value)}
									onBlur={commitRadius}
									onKeyDown={(event) => event.key === 'Enter' && commitRadius()}
									className="pr-7 pl-0.5 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
								/>
								<span
									aria-hidden="true"
									className="pointer-events-none absolute top-1/2 right-0.5 -translate-y-1/2 text-lg text-muted-foreground"
								>
									m
								</span>
							</div>
						</FormField>
					</div>
					{large ? (
						<p
							id={`${id}-rh`}
							aria-live="polite"
							className="mt-2 flex gap-2 text-sm font-semibold text-foreground"
						>
							<WarningIcon weight="bold" aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
							<span>{t('radius_large_warning')}</span>
						</p>
					) : (
						<p id={`${id}-rh`} className="mt-2 text-sm text-muted-foreground">
							{t(mode === 'alert' ? 'alert_radius_help' : 'radius_help')}
						</p>
					)}
				</div>
			)}

			<p className={cn('flex gap-2 text-sm text-muted-foreground', dialog ? 'mt-4' : 'mt-6')}>
				<PrivacyIcon weight="fill" aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
				<span>{privacy}</span>
			</p>
			<Button size="lg" className={cn('w-full', dialog ? 'mt-6' : 'mt-10')} onClick={confirm}>
				{t(mode === 'alert' ? 'save_area' : 'confirm')}
			</Button>

			{/* P2 location primer before the browser's prompt; "Ne zdaj", Escape and the scrim leave search and the pin. */}
			<Dialog
				open={primer}
				onOpenChange={(next) => {
					if (next) return;
					setPrimer(false);
					setGps('denied');
				}}
			>
				<DialogContent closeLabel={tc('close')}>
					<span aria-hidden="true" className="grid size-[88px] place-items-center rounded-full bg-secondary">
						<MapPinIcon weight="fill" className="size-10 text-primary" />
					</span>
					<DialogTitle className="mt-8">{tp('location_title')}</DialogTitle>
					<DialogDescription className="text-lg">{tp('location_body')}</DialogDescription>
					<DialogFooter>
						<Button
							size="lg"
							onClick={() => {
								setPrimer(false);
								locate();
							}}
						>
							{tp('location_allow')}
						</Button>
						<Button
							variant="text"
							onClick={() => {
								setPrimer(false);
								setGps('denied');
							}}
						>
							{tp('not_now')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

/** GURS source line under the results (content `location.search_attribution`); links open in a new tab. */
function Attribution() {
	const t = useTranslations('location');
	const tc = useTranslations('common');
	const locale = useLocale() as Locale;
	const en = locale === 'en';
	const link = 'underline underline-offset-3 hover:text-foreground';
	const newTab = <span className="sr-only"> {tc('opens_new_tab')}</span>;
	return (
		<p className="px-3 pt-2 pb-1 text-sm text-muted-foreground">
			{t.rich('search_attribution', {
				// Content P5: "15. 10. 2026" in SL, "15 October 2026" in EN.
				data_date: formatDate(GEO_DATA_DATE, locale, en ? 'long' : 'short'),
				source: (chunks) => (
					<Link href="/imprint" target="_blank" className={link}>
						{chunks}
						{newTab}
					</Link>
				),
				licence: (chunks) => (
					<a
						href={`https://creativecommons.org/licenses/by/4.0/${en ? '' : 'deed.sl'}`}
						target="_blank"
						rel="noopener noreferrer"
						className={link}
					>
						{chunks}
						{newTab}
					</a>
				),
			})}
		</p>
	);
}
