import { skipToken } from '@reduxjs/toolkit/query';
import { getRandomValues } from 'expo-crypto';
import * as Location from 'expo-location';
import { getNetworkStateAsync, type NetworkState } from 'expo-network';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { CrosshairIcon } from 'phosphor-react-native/src/icons/Crosshair';
import { GlobeHemisphereEastIcon } from 'phosphor-react-native/src/icons/GlobeHemisphereEast';
import { GpsSlashIcon } from 'phosphor-react-native/src/icons/GpsSlash';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { ImageSquareIcon } from 'phosphor-react-native/src/icons/ImageSquare';
import { LockSimpleIcon } from 'phosphor-react-native/src/icons/LockSimple';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { MapPinSimpleIcon } from 'phosphor-react-native/src/icons/MapPinSimple';
import { PawPrintIcon } from 'phosphor-react-native/src/icons/PawPrint';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { WifiSlashIcon } from 'phosphor-react-native/src/icons/WifiSlash';
import { XCircleIcon } from 'phosphor-react-native/src/icons/XCircle';
import * as React from 'react';
import { Keyboard, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
	Easing,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useFormatter, useLocale, useTranslations } from 'use-intl';

import { PLACE_SEARCH_MIN_CHARS, usePlaceSearch, useReversePlaceQuery } from '@zivali/api/geocode';
import { formatDate, type Locale } from '@zivali/i18n/format';
import { motion } from '@zivali/tokens/values';
import type { Place } from '@zivali/types';
import { coarsenPoint } from '@zivali/validation/geo';
import { RadiusSlider } from '@/components/location/radius-slider';
import type { LatLng } from '@/components/map/features';
import { type CameraState, MapView, type MapViewHandle } from '@/components/map/map-view';
import { PermissionPrimer } from '@/components/shell/permission-primer';
import { Button, Spinner } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';
import { distanceKm } from '@/lib/geo';
import { isOnline, useNetworkState } from '@/lib/net';
import { shadow, useColors } from '@/lib/theme';
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
	/** Confirm: the point coarsened once here (C6), never the raw one, with the radius for lost and alert. */
	onChange(value: LocationValue & { source: Source }): void;
	/** The OS location permission is denied: the explanation replaces "Uporabi mojo lokacijo"; pin and search work. */
	permissionDenied?: boolean;
};

// P5 stops: lost 200 m to 5 km (default 500 m), alert area 1 to 25 km (default 5 km).
const RADII = {
	lost: { stops: [200, 300, 400, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000], initial: 500 },
	alert: { stops: [1, 2, 3, 4, 5, 7, 10, 15, 20, 25].map((km) => km * 1000), initial: 5000 },
};
const LARGE_RADIUS_M = 3000; // from here the help line becomes the warning
const LJUBLJANA: LatLng = { lat: 46.0514, lng: 14.5058 }; // the map opens here without a value
const PIN_ZOOM = 15;
const SAME_M = 1; // a camera stop this close to the chosen point keeps that choice (and its source)
const NUDGE_M = 100;
const NUDGES = { north: [1, 0], south: [-1, 0], east: [0, 1], west: [0, -1] } as const;
const PANEL_OVERLAP = 28; // the panel rises over the map's bottom edge
const MIN_MAP = 180; // below this the privacy line folds into a button (P5 responsive)
const GPS_TIMEOUT_MS = 15_000;
const GEO_DATA_DATE = '2026-10-15'; // data state of the GURS geocoder snapshot (supabase/seed/geo/LICENSE.md)
const PIN = 'M27 62 L15 47.78 A24 24 0 1 1 39 47.78 Z'; // 54 × 66, the tail tip (27, 62) is the point
const M_PER_DEG = 111_320;
const EARTH_M = 40_075_016.686;

/** Metres per screen point on MapLibre's 512 px tiles. */
const metresPerPx = (lat: number, zoom: number) => (EARTH_M * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
/** The zoom at which `radiusM` is `px` points long. */
const zoomFor = (lat: number, radiusM: number, px: number) =>
	Math.log2((EARTH_M * Math.cos((lat * Math.PI) / 180) * px) / (512 * radiusM));
const metres = (a: LatLng, b: LatLng) => distanceKm(a, b) * 1000;
const nearest = (stops: number[], m: number) =>
	stops.reduce((best, stop, i) => (Math.abs(stop - m) < Math.abs(stops[best]! - m) ? i : best), 0);
// coarsenPoint's default needs a global crypto, which Hermes lacks; expo-crypto supplies the same random source.
const random = () => getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;

function firstPick(value?: LocationValue, suggested?: LocationPickerProps['suggested']): Pick {
	if (value) return { point: value.point, source: 'pin' };
	if (suggested?.source === 'gps') return { point: { lat: suggested.lat, lng: suggested.lng }, source: 'gps' };
	return { point: LJUBLJANA, source: 'pin' };
}

/** Online state; "Poskusi znova" re-reads it, and a live change from the OS wins over that reading. */
function useOnline() {
	const live = useNetworkState();
	const [checked, setChecked] = React.useState<{ live: NetworkState; state: NetworkState }>();
	const online = isOnline(checked?.live === live ? checked.state : live);
	const retry = () => void getNetworkStateAsync().then((state) => setChecked({ live, state }), () => undefined);
	return { online, retry };
}

/** No fix in time (indoors, GPS off) counts as unavailable. */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const late = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error('timeout')), ms)));
	try {
		return await Promise.race([promise, late]);
	} finally {
		clearTimeout(timer);
	}
}

/**
 * P5 LocationPicker (C6) on the TASK-15.4 MapView: the question, place search, the map with the pin fixed at its centre
 * (drag the map under it), the address, "Uporabi mojo lokacijo" through the P2 primer, the radius for lost and alert,
 * the privacy line and Confirm. The raw GPS, pin, search or EXIF point stays in this component; Confirm hands
 * `onChange` that point coarsened once (`coarsenPoint`, 20–30 m), so forms, drafts and the outbox only ever see that.
 * Fills its parent below the flow's top bar and pads the bottom safe area itself.
 */
export function LocationPicker({ value, mode, suggested, onChange, permissionDenied }: LocationPickerProps) {
	const t = useTranslations('location');
	const tp = useTranslations('permissions');
	const te = useTranslations('errors');
	const format = useFormatter();
	const insets = useSafeAreaInsets();
	const { width: windowWidth } = useWindowDimensions();
	const map = React.useRef<MapViewHandle>(null);
	const { online, retry } = useOnline();

	const area = mode === 'lost' || mode === 'alert' ? RADII[mode] : undefined;
	const [radiusIndex, setRadiusIndex] = React.useState(() =>
		area ? nearest(area.stops, value?.radiusM ?? area.initial) : 0
	);
	const radiusM = area?.stops[radiusIndex];

	// The raw point lives only here (C6): it is coarsened on Confirm and never logged or sent to analytics.
	const [pick, setPick] = React.useState(() => firstPick(value, suggested));
	const [size, setSize] = React.useState({ width: windowWidth, height: 0 });
	// The smaller side of the visible map (the window width until the first layout).
	const side = size.height > PANEL_OVERLAP ? Math.min(size.width, size.height - PANEL_OVERLAP) : size.width;
	const fitZoom = (point: LatLng) =>
		radiusM ? Math.min(PIN_ZOOM, zoomFor(point.lat, radiusM, 0.3 * side)) : PIN_ZOOM;
	const [camera, setCamera] = React.useState(() => ({ zoom: fitZoom(pick.point), moving: false }));

	const onCameraChange = ({ center, zoom, moving }: CameraState) => {
		setCamera((prev) => (prev.moving === moving && Math.abs(prev.zoom - zoom) < 0.01 ? prev : { zoom, moving }));
		if (!moving)
			setPick((prev) => (metres(prev.point, center) < SAME_M ? prev : { point: center, source: 'pin' }));
	};
	const choose = (next: Pick) => {
		setPick(next);
		map.current?.moveTo(next.point, fitZoom(next.point));
	};
	const changeRadius = (index: number) => {
		setRadiusIndex(index);
		// Keep the whole disc in view: zoom out when it would be wider than 90 % of the map.
		const max = zoomFor(pick.point.lat, area!.stops[index]!, 0.45 * side);
		if (camera.zoom > max) map.current?.moveTo(pick.point, max);
	};

	// Use my location: the P2 primer while the OS can still ask, then one fix (C6: never stored raw).
	const [primer, setPrimer] = React.useState(false);
	const [locating, setLocating] = React.useState(false);
	const [gps, setGps] = React.useState<'ok' | 'denied' | 'failed'>('ok');
	const denied = permissionDenied || gps === 'denied';
	const locate = async () => {
		setLocating(true);
		try {
			const { coords } = await withTimeout(
				Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
				GPS_TIMEOUT_MS
			);
			setGps('ok');
			choose({ point: { lat: coords.latitude, lng: coords.longitude }, source: 'gps' });
		} catch {
			setGps('failed');
		} finally {
			setLocating(false);
		}
	};
	const locateMe = async () => {
		try {
			const permission = await Location.getForegroundPermissionsAsync();
			if (permission.granted) return await locate();
			if (permission.canAskAgain) return setPrimer(true);
		} catch {
			// No answer from the OS counts as denied: search and the pin still work.
		}
		setGps('denied');
	};

	const [query, setQuery] = React.useState('');
	const search = usePlaceSearch(query, pick.point);
	const listing = query.trim().length >= PLACE_SEARCH_MIN_CHARS && (search.isFetching || search.places.length > 0);
	const choosePlace = (place: Place) => {
		Keyboard.dismiss();
		setQuery('');
		choose({ point: { lat: place.lat, lng: place.lng }, source: 'search', label: place.label });
	};

	// Reverse lookup once the map stops (search results bring their own label); null means outside Slovenia.
	const lookup = online && !camera.moving && !pick.label;
	const reverse = useReversePlaceQuery(lookup ? pick.point : skipToken);
	const outside = lookup && reverse.data === null;
	const addressLoading = online && (camera.moving || (lookup && reverse.data === undefined && !reverse.isError));
	const address = !online
		? pick.source === 'gps'
			? t('offline_gps_set')
			: t('address_unknown')
		: (pick.label ?? reverse.data?.label ?? t('address_unknown'));

	// Offline: lost and alert wait for the map; found and sighted can still confirm a GPS point (FR-042).
	const confirmable = online || (!area && (pick.source === 'gps' || value !== undefined));
	const own = value !== undefined && metres(pick.point, value.point) < SAME_M;
	const confirm = () =>
		onChange({
			point: coarsenPoint(pick.point, random),
			...(radiusM !== undefined && { radiusM }),
			source: pick.source,
		});

	// Short screens and large text: fold the privacy line into a button rather than squeeze the map below 180 px.
	const [compact, setCompact] = React.useState(false);
	const privacyHeight = React.useRef(0);
	const onMapLayout = (width: number, height: number) => {
		setSize({ width, height });
		const visible = height - PANEL_OVERLAP;
		setCompact((was) => (was ? visible - privacyHeight.current < MIN_MAP : visible < MIN_MAP));
	};

	const radiusText = (m: number) =>
		mode === 'alert'
			? t('alert_radius_value', { km: m / 1000 })
			: t('radius_value', {
					value: m < 1000 ? `${m} m` : `${format.number(m / 1000, { maximumFractionDigits: 1 })} km`,
				});
	const privacy = t(mode === 'lost' ? 'privacy_lost' : mode === 'alert' ? 'privacy_alert' : 'privacy_found');
	const privacyIcon = mode === 'alert' ? LockSimpleIcon : ShieldCheckIcon;
	const large = mode === 'lost' && radiusM !== undefined && radiusM >= LARGE_RADIUS_M;
	const discPx = radiusM ? (2 * radiusM) / metresPerPx(pick.point.lat, camera.zoom) : 0;

	const overlay = (
		<View pointerEvents="none" style={StyleSheet.absoluteFill}>
			{discPx > 0 && <Disc size={discPx} alert={mode === 'alert'} />}
			{camera.moving && <View className="absolute size-2 rounded-full bg-primary" style={tipStyle} />}
			<Pin lifted={camera.moving} icon={mode === 'alert' ? HouseIcon : PawPrintIcon} />
			{own && (
				<View className="absolute inset-x-0 items-center" style={{ top: '50%', marginTop: 8 }}>
					<View
						className="h-8 flex-row items-center gap-1.5 rounded-full bg-card pl-2.5 pr-3"
						style={shadow('md')}
					>
						<Icon as={LockSimpleIcon} weight="fill" size={16} className="text-primary" />
						<Text className="font-sans-bold text-sm">{t('exact_own')}</Text>
					</View>
				</View>
			)}
		</View>
	);

	const nudges = (
		<View className="gap-3 py-2">
			<Text aria-live="polite" className="font-sans-bold">
				{address}
			</Text>
			{(Object.keys(NUDGES) as (keyof typeof NUDGES)[]).map((direction) => {
				const [north, east] = NUDGES[direction];
				const { lat, lng } = pick.point;
				const point = {
					lat: lat + (north * NUDGE_M) / M_PER_DEG,
					lng: lng + (east * NUDGE_M) / (M_PER_DEG * Math.cos((lat * Math.PI) / 180)),
				};
				return (
					<Button key={direction} variant="secondary" onPress={() => choose({ point, source: 'pin' })}>
						{t(`nudge_${direction}`)}
					</Button>
				);
			})}
		</View>
	);

	// Denied: the note takes the button's place (a tap would only fail again). No fix: the button stays to retry.
	const locationRow = denied ? (
		<Note icon={GpsSlashIcon} className="mt-3">
			{t('gps_denied')}
			<Button variant="text" className="-ml-3 self-start" onPress={() => void Linking.openSettings()}>
				{tp('open_settings')}
			</Button>
		</Note>
	) : (
		<>
			<Button variant="text" className="-ml-3 self-start" loading={locating} onPress={() => void locateMe()}>
				<Icon as={CrosshairIcon} />
				{locating ? t('locating') : t('use_my_location')}
			</Button>
			{gps === 'failed' && <Note icon={GpsSlashIcon}>{t('gps_denied')}</Note>}
		</>
	);

	return (
		<View className="flex-1 bg-background">
			<Text role="heading" className="px-5 pt-2 font-display text-[34px] leading-[40px] tracking-[-0.68px]">
				{t(`title_${mode}`)}
			</Text>
			<FormField label={t('search_label')} disabled={!online} className="mt-4 px-5">
				<View>
					<Input
						value={query}
						onChangeText={setQuery}
						placeholder={t('search_placeholder')}
						autoComplete="off"
						autoCorrect={false}
						returnKeyType="search"
						aria-expanded={listing}
						className="pl-[34px] pr-12"
					/>
					<View className="pointer-events-none absolute inset-y-0 left-0.5 justify-center">
						<Icon as={MapPinIcon} size={22} className="text-muted-foreground" />
					</View>
					<View className="absolute inset-y-0 right-0 justify-center">
						{search.isFetching ? (
							<View className="size-11 items-center justify-center">
								<Spinner className="text-primary" />
							</View>
						) : query ? (
							<Button variant="ghost" size="icon" aria-label={t('search_clear')} onPress={() => setQuery('')}>
								<Icon as={XCircleIcon} weight="fill" size={22} className="text-muted-foreground" />
							</Button>
						) : null}
					</View>
				</View>
			</FormField>
			{!online && !area ? (
				<Note icon={WifiSlashIcon} className="mx-5 mt-3">
					{t('search_offline')}
				</Note>
			) : !listing && search.error ? (
				<Text aria-live="polite" className="mt-4 px-5">
					{te(searchErrorKey(search.error))}
				</Text>
			) : !listing && search.searched && search.places.length === 0 ? (
				<View className="mt-4 gap-1 px-5">
					<View className="flex-row gap-3">
						<Icon as={MagnifyingGlassIcon} className="mt-0.5 text-muted-foreground" />
						<Text aria-live="polite" className="shrink">
							{t('no_results')}
						</Text>
					</View>
					<Attribution className="pl-8" />
				</View>
			) : null}

			<View className="mt-3 flex-1">
				<View
					className="flex-1"
					aria-hidden={listing}
					importantForAccessibility={listing ? 'no-hide-descendants' : 'auto'}
				>
					<View
						className="flex-1"
						onLayout={(event) => onMapLayout(event.nativeEvent.layout.width, event.nativeEvent.layout.height)}
					>
						{online ? (
							<MapView
								ref={map}
								initialView={{ center: pick.point, zoom: camera.zoom }}
								onCameraChange={onCameraChange}
								label={own ? `${t('pin_a11y')} ${t('exact_own')}` : t('pin_a11y')}
								hint={t('nudge_show')}
								bottomInset={PANEL_OVERLAP}
								textAlternative={nudges}
							>
								{overlay}
							</MapView>
						) : (
							<View className="flex-1 bg-map-land">
								{area ? (
									<Note icon={WifiSlashIcon} className="mx-5 mt-5">
										{t('offline')}
										<Button variant="text" className="-ml-3 self-start" onPress={retry}>
											{t('offline_retry')}
										</Button>
									</Note>
								) : (
									overlay
								)}
							</View>
						)}
					</View>

					<View
						className="-mt-7 rounded-t-sheet bg-card px-5 pt-5"
						style={[shadow('lg'), { paddingBottom: Math.max(20, insets.bottom + 8) }]}
					>
						{online || !area ? (
							<>
								<View className="flex-row items-center gap-2">
									{addressLoading ? (
										<Spinner className="text-muted-foreground" />
									) : (
										<Icon as={MapPinSimpleIcon} weight="fill" className="text-primary" />
									)}
									<Text
										aria-live="polite"
										className={cn(
											'min-w-0 flex-1',
											addressLoading ? 'font-sans-semibold text-muted-foreground' : 'font-sans-bold'
										)}
									>
										{addressLoading ? t('address_loading') : address}
									</Text>
									{compact && <PrivacyButton icon={privacyIcon} text={privacy} />}
								</View>
								{locationRow}
								{suggested?.source === 'exif' && (
									<Button
										variant="text"
										className="-ml-3 self-start"
										onPress={() =>
											choose({ point: { lat: suggested.lat, lng: suggested.lng }, source: 'exif' })
										}
									>
										<Icon as={ImageSquareIcon} />
										{t('use_photo_location')}
									</Button>
								)}
								{outside && (
									<Note icon={GlobeHemisphereEastIcon} className="mt-3">
										{t('outside_si')}
									</Note>
								)}
							</>
						) : null}
						{area && online && radiusM !== undefined ? (
							<View className="mt-3">
								<View className="flex-row items-baseline justify-between gap-3">
									<Text className="font-sans-bold text-control">
										{t(mode === 'alert' ? 'alert_radius_label' : 'radius_label')}
									</Text>
									<Text aria-hidden className="font-sans-bold text-control">
										{radiusText(radiusM)}
									</Text>
								</View>
								<RadiusSlider
									label={t(mode === 'alert' ? 'alert_radius_label' : 'radius_label')}
									valueText={radiusText(radiusM)}
									hint={large ? t('radius_large_warning') : t(mode === 'alert' ? 'alert_radius_help' : 'radius_help')}
									count={area.stops.length}
									index={radiusIndex}
									onChange={changeRadius}
								/>
								{large ? (
									<View className="flex-row gap-2">
										<Icon as={WarningIcon} size={16} className="mt-0.5 text-foreground" />
										<Text aria-live="polite" className="shrink font-sans-semibold text-sm">
											{t('radius_large_warning')}
										</Text>
									</View>
								) : (
									<Text className="text-sm text-muted-foreground">
										{t(mode === 'alert' ? 'alert_radius_help' : 'radius_help')}
									</Text>
								)}
							</View>
						) : null}
						{!compact && (
							<View
								className="mt-3 flex-row gap-2"
								onLayout={(event) => (privacyHeight.current = event.nativeEvent.layout.height + 12)}
							>
								<Icon as={privacyIcon} weight="fill" size={16} className="mt-0.5 text-primary" />
								<Text className="shrink text-sm text-muted-foreground">{privacy}</Text>
							</View>
						)}
						<Button size="lg" className="mt-4" disabled={!confirmable} onPress={confirm}>
							{t(mode === 'alert' ? 'save_area' : 'confirm')}
						</Button>
					</View>
				</View>

				{listing && (
					<ScrollView
						keyboardShouldPersistTaps="handled"
						className="absolute inset-0 bg-background"
						contentContainerClassName="px-2 pb-8"
					>
						{search.isFetching ? (
							<>
								<Text aria-live="polite" className="px-3 text-sm text-muted-foreground">
									{t('searching')}
								</Text>
								{[62, 48, 70].map((width) => (
									<View key={width} className="min-h-11 flex-row items-center gap-3 px-3">
										<Skeleton className="size-5 rounded-full" />
										<Skeleton className="h-4" style={{ width: `${width}%` as const }} />
									</View>
								))}
							</>
						) : (
							<>
								{search.places.map((place) => (
									<ResultRow key={`${place.lat},${place.lng}`} place={place} onPress={choosePlace} />
								))}
								<Attribution className="mt-3 px-3" />
							</>
						)}
					</ScrollView>
				)}
			</View>

			<PermissionPrimer
				kind="location"
				open={primer}
				request={async () => (await Location.requestForegroundPermissionsAsync()).granted}
				onResult={(granted) => {
					setPrimer(false);
					if (granted) void locate();
					else setGps('denied');
				}}
			/>
		</View>
	);
}

// Centred on the map's centre point: the 8 px tip dot, and the pin by its tail tip (27, 62).
const tipStyle = { left: '50%', top: '50%', marginLeft: -4, marginTop: -4 } as const;
const pinStyle = {
	position: 'absolute',
	left: '50%',
	top: '50%',
	width: 54,
	height: 66,
	marginLeft: -27,
	marginTop: -62,
} as const;

const searchErrorKey = (error: unknown) => {
	const code = (error as { data?: { code?: string } }).data?.code;
	return code === 'RATE_LIMITED' ? 'RATE_LIMITED_generic' : code === 'NETWORK' ? 'NETWORK' : 'INTERNAL';
};

/** The 48 px `primary` pin with its tail; it lifts 14 px while the map moves (not under reduced motion). */
function Pin({ lifted, icon }: { lifted: boolean; icon: PhosphorIcon }) {
	const c = useColors();
	const reduceMotion = useReducedMotion();
	const lift = useSharedValue(0);
	React.useEffect(() => {
		lift.value = withTiming(lifted && !reduceMotion ? -14 : 0, {
			duration: reduceMotion ? 0 : motion.duration.fast,
			easing: Easing.bezier(0.2, 0, 0, 1),
		});
	}, [lifted, reduceMotion, lift]);
	const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
	return (
		<Animated.View testID="picker-pin" style={[pinStyle, style]}>
			<Svg width={54} height={66} viewBox="0 0 54 66">
				{/* The halo: a 6 px marker-ring stroke whose inner half the fill covers. */}
				<Path d={PIN} fill={c.primary} stroke={c['marker-ring']} strokeWidth={6} strokeLinejoin="round" />
				<Path d={PIN} fill={c.primary} />
			</Svg>
			<View className="absolute left-[15px] top-[15px]">
				<Icon as={icon} weight="fill" size={24} className="text-primary-foreground" />
			</View>
		</Animated.View>
	);
}

/** The chosen radius to scale around the pin: lost in the area hue with a 2 px marker-lost edge, own areas primary. */
function Disc({ size, alert }: { size: number; alert: boolean }) {
	const c = useColors();
	const alpha = c['marker-area'].slice(7);
	const edge = alert ? c.primary : c['marker-lost'];
	return (
		<View
			testID="picker-disc"
			className="absolute"
			style={{
				left: '50%',
				top: '50%',
				width: size,
				height: size,
				marginLeft: -size / 2,
				marginTop: -size / 2,
				borderRadius: size / 2,
				borderWidth: 2,
				borderColor: edge,
				backgroundColor: alert ? `${c.primary}${alpha}` : c['marker-area'],
			}}
		/>
	);
}

/** The view's one note (system `note`): muted surface, icon and words, never colour alone. */
function Note({ icon, className, children }: { icon: PhosphorIcon; className?: string; children: React.ReactNode }) {
	const [text, ...rest] = React.Children.toArray(children);
	return (
		<View className={cn('flex-row gap-3 rounded-row bg-muted px-[18px] py-4', className)}>
			<Icon as={icon} size={22} className="mt-px text-foreground" />
			<View className="min-w-0 flex-1">
				<Text aria-live="polite" className="text-control leading-[22px]">
					{text}
				</Text>
				{rest}
			</View>
		</View>
	);
}

/** A 52 px result row: place in bold, then the municipality (the API label as is). */
function ResultRow({ place, onPress }: { place: Place; onPress: (place: Place) => void }) {
	const [head, ...tail] = place.label.split(', ');
	return (
		<Pressable
			role="button"
			aria-label={place.label}
			onPress={() => onPress(place)}
			className="min-h-[52px] flex-row items-center gap-3 rounded-sm px-3 active:bg-accent"
		>
			<Icon as={MapPinIcon} className="text-muted-foreground" />
			<Text className="shrink">
				<Text className="font-sans-bold">{head}</Text>
				{tail.length ? `, ${tail.join(', ')}` : null}
			</Text>
		</Pressable>
	);
}

/** GURS source line under the results (content `location.search_attribution`), with the imprint and licence links. */
function Attribution({ className }: { className?: string }) {
	const t = useTranslations('location');
	const locale = useLocale() as Locale;
	const link = (url: string) => (chunks: React.ReactNode) => (
		<Text
			role="link"
			className="text-sm text-muted-foreground underline"
			onPress={() => void Linking.openURL(url).catch(() => undefined)}
		>
			{chunks}
		</Text>
	);
	const en = locale === 'en';
	return (
		<Text className={cn('text-sm text-muted-foreground', className)}>
			{t.rich('search_attribution', {
				// Content P5: "15. 10. 2026" in SL, "15 October 2026" in EN.
				data_date: formatDate(GEO_DATA_DATE, locale, en ? 'long' : 'short'),
				source: link(`${env.EXPO_PUBLIC_APP_URL}${en ? '/en/imprint' : '/impresum'}`),
				licence: link(`https://creativecommons.org/licenses/by/4.0/${en ? '' : 'deed.sl'}`),
			})}
		</Text>
	);
}

/** Short screens: the privacy line as a 44 px shield button that opens it in a small sheet (P5 D2, D3). */
function PrivacyButton({ icon, text }: { icon: PhosphorIcon; text: string }) {
	const t = useTranslations('location');
	const tc = useTranslations('common');
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" aria-label={t('privacy_info_button')}>
					<Icon as={icon} />
				</Button>
			</SheetTrigger>
			<SheetContent closeLabel={tc('close')}>
				<View className="pt-4">
					<Icon as={icon} weight="fill" size={32} className="text-primary" />
					<SheetTitle>{t('privacy_info_button')}</SheetTitle>
					<Text className="mt-2 text-lg">{text}</Text>
				</View>
			</SheetContent>
		</Sheet>
	);
}
