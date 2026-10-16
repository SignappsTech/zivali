import { useAccessibilityFocus } from '@rn-primitives/hooks';
import { ArrowsOutIcon } from 'phosphor-react-native/src/icons/ArrowsOut';
import { MapPinAreaIcon } from 'phosphor-react-native/src/icons/MapPinArea';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFormatter, useTranslations } from 'use-intl';

import type { BBox, Circle, Marker } from '@/components/map/features';
import { MapView } from '@/components/map/map-view';
import type { DetailReport } from '@/components/report/slots';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { shadow } from '@/lib/theme';

const THUMB_HEIGHT = 160;
const M_PER_DEG = 111_320;
// Stands in for the area name while splitting the area line around it, so only the name is bold.
const NAME = '\u0000';

/** The fuzzed area with some margin around it (2.5 radii, at least 400 m each way). */
function areaBBox({ lat, lng, radius_m }: DetailReport['area']): BBox {
	const span = Math.max(radius_m * 2.5, 400);
	const dLat = span / M_PER_DEG;
	const dLng = span / (M_PER_DEG * Math.cos((lat * Math.PI) / 180));
	return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

/** The map's drawing: found and sighted get their to-scale area disc; the lost marker carries its own area disc. */
function mapParts(report: DetailReport, label: string, ownLabel: string) {
	const { area } = report;
	const center = { lat: area.lat, lng: area.lng };
	const markers: Marker[] = [{ id: report.id, position: center, kind: report.type, label }];
	// The owner's stored (coarsened) point, only in their own view (C6 §Storage, P5 `location.exact_own`).
	if (report.is_mine && report.location)
		markers.push({ id: 'own', position: report.location, kind: 'me', label: ownLabel });
	const circles: Circle[] =
		report.type === 'lost' ? [] : [{ id: 'area', center, radiusM: area.radius_m, kind: 'area' }];
	return { markers, circles, initialView: { bbox: areaBBox(area) } };
}

/** P5 owner pin label as real text after the map: "Približna lokacija · vidno samo vam" and why. */
function OwnPoint() {
	const t = useTranslations('location');
	return (
		<View className="mt-3">
			<Text className="font-sans-semibold text-sm">{t('exact_own')}</Text>
			<Text className="text-sm text-muted-foreground">{t('exact_own_help')}</Text>
		</View>
	);
}

/** P9 M6: the map at the 92 % snap over the scrim, pannable; the area line and pin stay as text under it. */
function MapSheet({
	parts,
	alternative,
	onClose,
	children,
}: {
	parts: ReturnType<typeof mapParts>;
	alternative: string;
	onClose: () => void;
	children: React.ReactNode;
}) {
	const t = useTranslations('report');
	const tc = useTranslations('common');
	const insets = useSafeAreaInsets();
	// Focus starts on "Zapri".
	const closeRef = useAccessibilityFocus<View>();
	return (
		<View className="flex-1">
			<Pressable
				accessible={false}
				importantForAccessibility="no"
				className="absolute inset-0 bg-scrim"
				onPress={onClose}
			/>
			<View
				role="dialog"
				aria-modal
				aria-label={t('where_title')}
				className="mt-auto h-[92%] rounded-t-sheet bg-card"
				style={[shadow('lg'), { paddingBottom: Math.max(32, insets.bottom) }]}
			>
				<View className="flex-row items-center gap-2 pl-5 pr-3 pt-4">
					<Text role="heading" className="flex-1 font-display text-2xl tracking-[-0.36px]">
						{t('where_title')}
					</Text>
					<Button ref={closeRef} variant="ghost" size="icon" aria-label={tc('close')} onPress={onClose}>
						<Icon as={XIcon} />
					</Button>
				</View>
				<View className="mx-5 mt-4 flex-1 overflow-hidden rounded-card">
					<MapView {...parts} textAlternative={<Text>{alternative}</Text>} />
				</View>
				<View className="px-5 pt-5">{children}</View>
			</View>
		</View>
	);
}

/**
 * P9 area: the area line (map-pin-area, bold area name with the radius, "Prikazano območje je približno.") and a
 * 160 px map thumbnail of the fuzzed area that is one button opening the full map sheet; the thumbnail itself does not
 * pan. Offline the map is left out and the text line stays (P9 S5, M10). `place` is the area name (reverse lookup of
 * the public point); without it only the approximate sentence shows. The owner also sees their own point.
 */
export function AreaMap({
	report,
	label,
	place,
	offline,
}: {
	report: DetailReport;
	/** The report's title, the marker's accessible name. */
	label: string;
	place?: string;
	offline: boolean;
}) {
	const t = useTranslations('report');
	const tl = useTranslations('location');
	const format = useFormatter();
	const reduceMotion = useReducedMotion();
	const [open, setOpen] = React.useState(false);
	const ownLabel = tl('exact_own');
	const parts = React.useMemo(() => mapParts(report, label, ownLabel), [report, label, ownLabel]);

	const meters = report.area.radius_m;
	const radius =
		meters < 1000
			? `${format.number(meters)} m`
			: `${format.number(meters / 1000, { maximumFractionDigits: 1 })} km`;
	const [before, after] = tl('area_line', { area: NAME, radius }).split(NAME);
	const line = place ? `${before}${place}${after}` : undefined;
	const note = t('area_note');
	const own = report.is_mine && report.location ? <OwnPoint /> : null;

	const text = (
		<View className="flex-row gap-3">
			<Icon as={MapPinAreaIcon} size={24} className="mt-0.5 text-primary" />
			<View className="min-w-0 flex-1">
				{place && (
					<Text>
						{before}
						<Text className="font-sans-bold">{place}</Text>
						{after}
					</Text>
				)}
				<Text className="text-sm text-muted-foreground">{note}</Text>
			</View>
		</View>
	);

	return (
		<View>
			{text}
			{!offline && (
				<>
					<Pressable
						role="button"
						aria-label={[t('map_open'), line, note].filter(Boolean).join('. ')}
						onPress={() => setOpen(true)}
						className="mt-4 overflow-hidden rounded-row"
						style={{ height: THUMB_HEIGHT }}
					>
						<View
							pointerEvents="none"
							importantForAccessibility="no-hide-descendants"
							accessibilityElementsHidden
							className="flex-1"
						>
							<MapView {...parts} textAlternative={null} bottomInset={52} />
						</View>
						<View
							className="absolute bottom-3 right-3 h-11 flex-row items-center gap-2 rounded-full bg-card px-4"
							style={shadow('md')}
						>
							<Icon as={ArrowsOutIcon} size={18} />
							<Text className="font-sans-bold text-control">{t('map_open')}</Text>
						</View>
					</Pressable>
					{own}
					<Modal
						visible={open}
						transparent
						statusBarTranslucent
						animationType={reduceMotion ? 'none' : 'slide'}
						onRequestClose={() => setOpen(false)}
					>
						<MapSheet
							parts={parts}
							alternative={place ? tl('area_map_alt', { area: place, radius }) : note}
							onClose={() => setOpen(false)}
						>
							{text}
							{own}
						</MapSheet>
					</Modal>
				</>
			)}
		</View>
	);
}
