import * as Location from 'expo-location';
import { type Href, useRouter } from 'expo-router';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { SlidersHorizontalIcon } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import * as React from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { useReversePlaceQuery } from '@zivali/api/geocode';
import { FilterSheet } from '@/components/browse/filter-sheet';
import {
	areaBBox,
	boostedFirst,
	DEFAULT_FILTERS,
	type Filters,
	inArea,
	isDefault,
	resetFilters,
	SLOVENIA,
	toMapQuery,
	toSearch,
} from '@/components/browse/filters';
import { ListSheet, SNAP_FRACTIONS } from '@/components/browse/list-sheet';
import { reportTitle } from '@/components/browse/report-row';
import { useDeviceLocation } from '@/components/browse/use-device-location';
import { MapView, type Marker } from '@/components/map/map-view';
import { OutboxList } from '@/components/outbox/queue';
import { PermissionPrimer } from '@/components/shell/permission-primer';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useMapReports, useReportSearch } from '@/lib/data/reports';
import { shadow } from '@/lib/theme';

const PILL_TOP = 12;
const PILL_HEIGHT = 48;
const COUNT_DEBOUNCE_MS = 300;
const round2 = (n: number) => Math.round(n * 100) / 100;

function useDebounced<T>(value: T, ms: number): T {
	const [settled, setSettled] = React.useState(value);
	React.useEffect(() => {
		const timer = setTimeout(() => setSettled(value), ms);
		return () => clearTimeout(timer);
	}, [value, ms]);
	return settled;
}

/**
 * P4 Map tab, the app home (FR-007): a full-bleed MapView of public fuzzed areas (clustered), the area pill as the only
 * floating control, and the list sheet as its accessible alternative, both narrowed by the same filters. Reports come
 * only through `lib/data/reports.ts` (C17), so the offline cache serves them without changes here. The device location
 * stays in memory and is never drawn; it centres the area and becomes the cache's `current` area.
 */
export default function MapTab() {
	const t = useTranslations('browse');
	const tm = useTranslations('map');
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const pillFocus = useFocusRing();
	const [height, setHeight] = React.useState(0);
	const [snap, setSnap] = React.useState(0);
	const { here, access, check } = useDeviceLocation();
	const [declined, setDeclined] = React.useState(false);
	const [primer, setPrimer] = React.useState(false);
	const [applied, setApplied] = React.useState<Filters>(DEFAULT_FILTERS);
	const [draft, setDraft] = React.useState<Filters>(DEFAULT_FILTERS);
	const [filtersOpen, setFiltersOpen] = React.useState(false);

	// Nothing is asked before the permission (and, when granted, the first fix) is known: no Slovenia-wide detour.
	const skip = access === 'unknown';
	const center = applied.place ?? here;
	const search = useReportSearch(toSearch(applied, center), { skip });
	const mapQuery = toMapQuery(applied, center);
	const map = useMapReports(mapQuery, { skip });
	const pins = React.useMemo(() => inArea(map.data?.items ?? [], center, applied.km), [map.data, center, applied.km]);
	const reports = React.useMemo(
		() => search.data && (search.source === 'cache' ? boostedFirst(search.data) : search.data),
		[search.data, search.source]
	);

	// The filter sheet's live count: the draft (debounced while the slider moves); closed, the map's own query.
	const settled = useDebounced(draft, COUNT_DEBOUNCE_MS);
	const draftCenter = settled.place ?? here;
	const counted = useMapReports(filtersOpen ? toMapQuery(settled, draftCenter) : mapQuery, { skip });
	const draftCount = inArea(counted.data?.items ?? [], draftCenter, settled.km).length;

	// The pill's place: the chosen one, else the settlement around the device (asked at 2 decimals), else Slovenia.
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
			})),
		[pins, t, tm]
	);

	const openReport = (code: string) => router.push(`/r/${code}` as Href);
	const openFilters = () => {
		setDraft(applied);
		setFiltersOpen(true);
	};
	const locateMe = async () => {
		const next = await check();
		if (next === 'granted') {
			setDeclined(false);
			setDraft((d) => ({ ...d, place: null }));
		} else if (next === 'ask') setPrimer(true);
	};

	const topInset = insets.top + PILL_TOP + PILL_HEIGHT + 4;
	const areaKey = center ? `${round2(center.lat)},${round2(center.lng)},${applied.km}` : 'slovenia';
	return (
		<View className="flex-1 bg-background" onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
			{skip ? (
				// P4 loading: the map area in the `map-land` tone until the centre is known.
				<View className="flex-1 bg-map-land" />
			) : (
				<MapView
					// A new area (place, location or radius) opens the map on it.
					key={areaKey}
					markers={markers}
					cluster
					initialView={{ bbox: center ? areaBBox(center, applied.km) : SLOVENIA }}
					onMarkerPress={openReport}
					bottomInset={Math.min(height * SNAP_FRACTIONS[snap]!, height - topInset)}
					textAlternative={
						<View className="gap-2">
							<Text>{tm('text_alternative', { place })}</Text>
							{markers.map((marker) => (
								<Text key={marker.id}>{marker.label}</Text>
							))}
						</View>
					}
				/>
			)}
			<Pressable
				role="button"
				aria-label={t('area_pill_a11y', { place, radius: applied.km })}
				onPress={openFilters}
				onFocus={pillFocus.onFocus}
				onBlur={pillFocus.onBlur}
				className="absolute left-5 h-12 flex-row items-center gap-2 rounded-full bg-card pl-4 pr-2"
				style={[{ top: insets.top + PILL_TOP, maxWidth: width - 40 }, shadow('md'), pillFocus.ringStyle]}
			>
				<Icon as={MapPinIcon} size={18} />
				<Text numberOfLines={1} className="shrink font-sans-bold">
					{/* P4 responsive: at 320 px the pill keeps the place and the icon. */}
					{width <= 320 ? place : t('area_pill', { place, radius: applied.km })}
				</Text>
				<View className="ml-1 size-8 items-center justify-center rounded-full bg-secondary">
					<Icon as={SlidersHorizontalIcon} size={16} className="text-secondary-foreground" />
				</View>
			</Pressable>
			<ListSheet
				reports={reports}
				count={map.data ? pins.length : (reports?.length ?? 0)}
				center={center}
				isLoading={search.isLoading}
				isError={Boolean(search.error)}
				onRetry={() => {
					search.refetch();
					map.refetch();
				}}
				filtered={!isDefault(applied)}
				onResetFilters={() => setApplied(resetFilters(applied))}
				sort={applied.sort}
				onSortChange={center ? (sort) => setApplied({ ...applied, sort }) : undefined}
				includeClosed={applied.includeClosed}
				onIncludeClosedChange={(includeClosed) => setApplied({ ...applied, includeClosed })}
				hasNextPage={search.hasNextPage}
				onEndReached={() => void search.fetchNextPage()}
				onOpenReport={openReport}
				onReport={() => router.push('/report')}
				onSetAlert={() => router.push('/settings/alerts' as Href)}
				header={<OutboxList recent />}
				topInset={topInset}
				onSnapChange={setSnap}
			/>
			<FilterSheet
				open={filtersOpen}
				onOpenChange={setFiltersOpen}
				draft={draft}
				onDraftChange={setDraft}
				count={draftCount}
				onApply={() => {
					setApplied(draft);
					setFiltersOpen(false);
				}}
				locationDenied={access === 'denied' || declined}
				onUseLocation={() => void locateMe()}
				placeLabel={place}
				near={rounded}
			/>
			<PermissionPrimer
				kind="location"
				open={primer}
				request={async () => (await Location.requestForegroundPermissionsAsync()).granted}
				onResult={(granted) => {
					setPrimer(false);
					setDeclined(!granted);
					if (!granted) return;
					setDraft((d) => ({ ...d, place: null }));
					void check();
				}}
			/>
		</View>
	);
}
