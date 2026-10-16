import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
import { CrosshairIcon } from 'phosphor-react-native/src/icons/Crosshair';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MapPinLineIcon } from 'phosphor-react-native/src/icons/MapPinLine';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { AccessibilityInfo, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { usePlaceSearch } from '@zivali/api/geocode';
import type { Colour } from '@zivali/types';
import {
	COLOURS,
	type Filters,
	KM_MAX,
	KM_MIN,
	resetFilters,
	SPECIES,
	toggle,
	TYPES,
	WHEN,
} from '@/components/browse/filters';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Pill } from '@/components/ui/pill';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Text } from '@/components/ui/text';
import type { Point } from '@/lib/geo';

// SheetContent around the body: the grabber (44 px, -12 overlap) and the bottom padding (32 px or the safe area).
const SHEET_CHROME = 32;
const SPECIES_LABEL = { dog: 'filter_dogs', cat: 'filter_cats' } as const;
const SIZES = ['small', 'medium', 'large'] as const;
// Swatches drawn with the tokens the P4 mockup uses; the other coat colours show the word only (CHANGE to design).
const SWATCH: Partial<Record<Colour, string>> = {
	black: 'bg-foreground',
	white: 'bg-card',
	grey: 'bg-muted-foreground',
	brown: 'bg-status-reunited-subtle-foreground',
	red: 'bg-status-lost',
};

export type FilterSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The filters being edited; nothing applies until `onApply`. */
	draft: Filters;
	onDraftChange: (draft: Filters) => void;
	/** Reports the draft would show. */
	count: number;
	onApply: () => void;
	/** Location access was refused: show the note and the place search. */
	locationDenied: boolean;
	onUseLocation: () => void;
	/** The place shown instead ("Slovenija" or the chosen place), for the denied note. */
	placeLabel: string;
	/** Biases the place search. */
	near?: Point;
};

/**
 * P4 filter sheet (opens from the area pill): type and species pills, "Kdaj" choice rows, the distance slider with
 * "Uporabi mojo lokacijo" (and its denied fallback: a note and the place search), "Več filtrov" (colour, size).
 * Groups 32 px apart, no boxes; the body scrolls and the live-count primary stays pinned. Closing applies nothing.
 */
export function FilterSheet({
	open,
	onOpenChange,
	draft,
	onDraftChange,
	count,
	onApply,
	locationDenied,
	onUseLocation,
	placeLabel,
	near,
}: FilterSheetProps) {
	const t = useTranslations('browse');
	const ta = useTranslations('attributes');
	const { height } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const [more, setMore] = React.useState(false);
	const set = (patch: Partial<Filters>) => onDraftChange({ ...draft, ...patch });

	// The count change is announced politely while the sheet is open (P4 accessibility).
	const announced = React.useRef(count);
	React.useEffect(() => {
		if (!open) {
			announced.current = count;
			return;
		}
		if (count === announced.current) return;
		announced.current = count;
		AccessibilityInfo.announceForAccessibility(t('count_announce', { count }));
	}, [count, open, t]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent closeLabel={t('filters_close')}>
				<View style={{ height: height * 0.92 - SHEET_CHROME - Math.max(32, insets.bottom) }}>
					<View className="flex-row items-center justify-between gap-2 pb-3">
						<SheetTitle>{t('filters_title')}</SheetTitle>
						<View className="flex-row items-center gap-1 pt-3">
							<Button variant="text" onPress={() => onDraftChange(resetFilters(draft))}>
								{t('filters_reset')}
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label={t('filters_close')}
								onPress={() => onOpenChange(false)}
							>
								<Icon as={XIcon} size={24} />
							</Button>
						</View>
					</View>
					<BottomSheetScrollView
						contentContainerClassName="gap-8 pb-4 pt-3"
						keyboardShouldPersistTaps="handled"
					>
						<Group label={t('filter_type')}>
							{TYPES.map((type) => (
								<Pill
									key={type}
									selected={draft.types.includes(type)}
									onPress={() => set({ types: toggle(draft.types, type, 1) })}
								>
									{t(`filter_type_${type}`)}
								</Pill>
							))}
						</Group>
						<Group label={t('filter_species')}>
							{SPECIES.map((species) => (
								<Pill
									key={species}
									selected={draft.species.includes(species)}
									onPress={() => set({ species: toggle(draft.species, species, 1) })}
								>
									{t(SPECIES_LABEL[species])}
								</Pill>
							))}
						</Group>
						<View className="gap-3">
							<GroupLabel>{t('filter_when')}</GroupLabel>
							<RadioGroup
								aria-label={t('filter_when')}
								value={draft.when}
								onValueChange={(when) => set({ when: when as Filters['when'] })}
								className="gap-2"
							>
								{WHEN.map((when) => (
									<ChoiceRow
										key={when}
										value={when}
										title={t(`filter_${when}`)}
										className="bg-background"
									/>
								))}
							</RadioGroup>
						</View>
						<View>
							<View className="flex-row items-baseline justify-between">
								<GroupLabel>{t('filter_distance')}</GroupLabel>
								<Text className="font-sans-bold">{t('filter_distance_value', { km: draft.km })}</Text>
							</View>
							<Slider
								testID="distance"
								label={t('filter_distance')}
								valueText={t('filter_distance_value', { km: draft.km })}
								value={draft.km}
								min={KM_MIN}
								max={KM_MAX}
								onValueChange={(km) => set({ km })}
							/>
							<Button variant="text" className="-ml-3 self-start" onPress={onUseLocation}>
								<Icon as={CrosshairIcon} />
								{t('filter_use_location')}
							</Button>
							{locationDenied && (
								<PlacePicker
									note={t('location_denied_note', { place: placeLabel })}
									selected={draft.place}
									near={near}
									onSelect={(place) => set({ place })}
								/>
							)}
						</View>
						<View>
							<Button
								variant="text"
								className="-ml-3 self-start"
								aria-expanded={more}
								onPress={() => setMore(!more)}
							>
								<Icon as={more ? CaretUpIcon : CaretDownIcon} />
								{t('filter_more')}
							</Button>
							{more && (
								<View className="mt-3 gap-8">
									<Group label={t('filter_colour')} small>
										{COLOURS.map((colour) => (
											<Pill
												key={colour}
												selected={draft.colours.includes(colour)}
												onPress={() => set({ colours: toggle(draft.colours, colour) })}
											>
												{SWATCH[colour] ? (
													<View
														aria-hidden
														className={`size-[18px] rounded-full border-2 border-input ${SWATCH[colour]}`}
													/>
												) : null}
												{ta(`colours.${colour}`)}
											</Pill>
										))}
									</Group>
									<Group label={t('filter_size')} small>
										{SIZES.map((size) => (
											<Pill
												key={size}
												selected={draft.sizes.includes(size)}
												onPress={() => set({ sizes: toggle(draft.sizes, size) })}
											>
												{t(`filter_size_${size}`)}
											</Pill>
										))}
									</Group>
								</View>
							)}
						</View>
					</BottomSheetScrollView>
					<View className="pt-3">
						<Button size="lg" onPress={onApply}>
							{t('filters_apply', { count })}
						</Button>
					</View>
				</View>
			</SheetContent>
		</Sheet>
	);
}

function GroupLabel({ small, children }: { small?: boolean; children: string }) {
	return (
		<Text role="heading" className={small ? 'font-sans-bold text-control' : 'font-display-semibold text-lg'}>
			{children}
		</Text>
	);
}

/** A labelled group of toggle pills (the native stand-in for fieldset and legend). */
function Group({ label, small, children }: { label: string; small?: boolean; children: React.ReactNode }) {
	return (
		<View role="group" aria-label={label} className="gap-3">
			<GroupLabel small={small}>{label}</GroupLabel>
			<View className="flex-row flex-wrap gap-2">{children}</View>
		</View>
	);
}

/** Location denied (P4 4b): the note explains the manual choice and our own place search takes over (P5, C6). */
function PlacePicker({
	note,
	selected,
	near,
	onSelect,
}: {
	note: string;
	selected: Filters['place'];
	near?: Point;
	onSelect: (place: NonNullable<Filters['place']>) => void;
}) {
	const t = useTranslations('browse');
	const [query, setQuery] = React.useState('');
	const search = usePlaceSearch(query, near);
	const key = (p: Point) => `${p.lat},${p.lng}`;
	return (
		<View className="mt-3 gap-5">
			<View className="flex-row gap-3 rounded-row bg-muted px-[18px] py-4">
				<Icon as={MapPinLineIcon} weight="fill" size={22} className="mt-px" />
				<Text className="shrink text-control leading-[22px]">{note}</Text>
			</View>
			<FormField label={t('filter_place')}>
				<View>
					<Icon as={MagnifyingGlassIcon} weight="regular" className="absolute left-0.5 top-[18px]" />
					<Input
						value={query}
						onChangeText={setQuery}
						placeholder={t('filter_place_search')}
						autoCorrect={false}
						returnKeyType="search"
						className="pl-8"
					/>
				</View>
			</FormField>
			{search.places.length > 0 && (
				<RadioGroup
					aria-label={t('filter_place')}
					value={selected ? key(selected) : undefined}
					onValueChange={(value) => {
						const place = search.places.find((p) => key(p) === value);
						if (place) onSelect({ label: place.label, lat: place.lat, lng: place.lng });
					}}
					className="gap-2"
				>
					{search.places.map((p) => (
						<ChoiceRow key={key(p)} value={key(p)} title={p.label} className="bg-background" />
					))}
				</RadioGroup>
			)}
		</View>
	);
}
