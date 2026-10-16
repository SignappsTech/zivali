'use client';

import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretUpIcon } from '@phosphor-icons/react/dist/ssr/CaretUp';
import { CrosshairIcon } from '@phosphor-icons/react/dist/ssr/Crosshair';
import { MapPinLineIcon } from '@phosphor-icons/react/dist/ssr/MapPinLine';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { usePlaceSearch } from '@zivali/api/geocode';
import type { Colour } from '@zivali/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Pill } from '@/components/ui/pill';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';

import {
	type ChosenPlace,
	COLOURS,
	type Filters,
	KM_MAX,
	KM_MIN,
	type Point,
	resetFilters,
	SIZE_LIST,
	SPECIES,
	toggle,
	TYPES,
	WHEN,
} from './filters';

const SPECIES_LABEL = { dog: 'filter_dogs', cat: 'filter_cats' } as const;
// Swatches in the tokens the P4 mockup uses; the other coat colours show the word only (as on mobile).
const SWATCH: Partial<Record<Colour, string>> = {
	black: 'bg-foreground',
	white: 'bg-card',
	grey: 'bg-muted-foreground',
	brown: 'bg-status-reunited-subtle-foreground',
	red: 'bg-status-lost',
};
const legendClass = 'p-0 font-display text-lg leading-7 font-semibold';
// P5 distance slider: 44 px target, 6 px track filled in primary up to the 28 px thumb (`--f`, 0 to 1).
const rangeClass =
	'block h-11 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none [&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-[3px] [&::-moz-range-progress]:bg-primary [&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-[0_0_0_3px_hsl(var(--card))] focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_2px_hsl(var(--card)),0_0_0_5px_hsl(var(--ring))] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-[3px] [&::-moz-range-track]:bg-input [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-[3px] [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,hsl(var(--primary))_0_calc(14px+(100%-28px)*var(--f)),hsl(var(--input))_0)] [&::-webkit-slider-thumb]:-mt-[11px] [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_hsl(var(--card))] focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_2px_hsl(var(--card)),0_0_0_5px_hsl(var(--ring))]';

export type FilterDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The filters being edited; nothing applies until `onApply`. */
	draft: Filters;
	onDraftChange: (draft: Filters) => void;
	/** Reports the draft would show. */
	count: number;
	onApply: () => void;
	/** No browser location to centre on: the place search takes over. */
	noLocation: boolean;
	/** The browser refused the location: the note explains the manual choice. */
	locationDenied: boolean;
	onUseLocation: () => void;
	/** The place shown instead ("Slovenija" or the chosen place), for the denied note. */
	placeLabel: string;
	/** Biases the place search. */
	near?: Point;
};

/**
 * P4 filters: a right drawer (480 px) from lg, a bottom sheet below it. Type and species pills, "Kdaj" choice rows,
 * the distance slider with "Uporabi mojo lokacijo" (the place search when there is no location, with the note when it
 * was refused), "Več filtrov" (colour, size). The body scrolls; the live-count primary stays pinned and the count is
 * announced politely. Closing applies nothing.
 */
export function FilterDrawer({
	open,
	onOpenChange,
	draft,
	onDraftChange,
	count,
	onApply,
	noLocation,
	locationDenied,
	onUseLocation,
	placeLabel,
	near,
}: FilterDrawerProps) {
	const t = useTranslations('browse');
	const ta = useTranslations('attributes');
	const [more, setMore] = React.useState(false);
	const set = (patch: Partial<Filters>) => onDraftChange({ ...draft, ...patch });
	const km = t('filter_distance_value', { km: draft.km });

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				aria-describedby={undefined}
				className="top-auto right-0 bottom-0 left-0 flex max-h-[92dvh] w-full max-w-none translate-0 flex-col overflow-hidden rounded-none rounded-t-sheet bg-card p-0 text-card-foreground lg:top-0 lg:left-auto lg:h-dvh lg:max-h-none lg:max-w-[480px] lg:rounded-none lg:rounded-l-card"
			>
				<div className="flex items-start justify-between gap-3 pt-5 pr-4 pb-2 pl-5 lg:pl-6">
					<DialogTitle className="pt-2 text-xl">{t('filters_title')}</DialogTitle>
					<div className="flex items-center gap-1">
						<Button variant="text" onClick={() => onDraftChange(resetFilters(draft))}>
							{t('filters_reset')}
						</Button>
						<DialogClose asChild>
							<Button variant="ghost" size="icon" aria-label={t('filters_close')}>
								<XIcon weight="bold" aria-hidden="true" />
							</Button>
						</DialogClose>
					</div>
				</div>
				<div className="grid min-h-0 flex-1 content-start gap-8 overflow-y-auto px-5 pt-2 pb-4 lg:px-6">
					<Group legend={t('filter_type')}>
						{TYPES.map((type) => (
							<Pill
								key={type}
								pressed={draft.types.includes(type)}
								onPressedChange={() => set({ types: toggle(draft.types, type, 1) })}
							>
								{t(`filter_type_${type}`)}
							</Pill>
						))}
					</Group>
					<Group legend={t('filter_species')}>
						{SPECIES.map((species) => (
							<Pill
								key={species}
								pressed={draft.species.includes(species)}
								onPressedChange={() => set({ species: toggle(draft.species, species, 1) })}
							>
								{t(SPECIES_LABEL[species])}
							</Pill>
						))}
					</Group>
					<div>
						<p id="browse-when" className={legendClass}>
							{t('filter_when')}
						</p>
						<RadioGroup
							aria-labelledby="browse-when"
							value={draft.when}
							onValueChange={(when) => set({ when: when as Filters['when'] })}
							className="mt-3 gap-2"
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
					</div>
					<div>
						<div className="flex items-baseline justify-between">
							<label htmlFor="browse-km" className={legendClass}>
								{t('filter_distance')}
							</label>
							<output htmlFor="browse-km" className="font-bold tabular-nums">
								{km}
							</output>
						</div>
						<input
							id="browse-km"
							type="range"
							min={KM_MIN}
							max={KM_MAX}
							value={draft.km}
							aria-valuetext={km}
							onChange={(event) => set({ km: Number(event.target.value) })}
							className={rangeClass}
							style={{ '--f': (draft.km - KM_MIN) / (KM_MAX - KM_MIN) } as React.CSSProperties}
						/>
						<Button variant="text" className="-ml-3" onClick={onUseLocation}>
							<CrosshairIcon weight="bold" aria-hidden="true" />
							{t('filter_use_location')}
						</Button>
						{noLocation && (
							<PlacePicker
								note={locationDenied ? t('location_denied_note', { place: placeLabel }) : undefined}
								selected={draft.place}
								near={near}
								onSelect={(place) => set({ place })}
							/>
						)}
					</div>
					<div>
						<Button variant="text" className="-ml-3" aria-expanded={more} onClick={() => setMore(!more)}>
							{more ? (
								<CaretUpIcon weight="bold" aria-hidden="true" />
							) : (
								<CaretDownIcon weight="bold" aria-hidden="true" />
							)}
							{t('filter_more')}
						</Button>
						{more && (
							<div className="mt-3 grid gap-8">
								<Group legend={t('filter_colour')} small>
									{COLOURS.map((colour) => (
										<Pill
											key={colour}
											pressed={draft.colours.includes(colour)}
											onPressedChange={() => set({ colours: toggle(draft.colours, colour) })}
										>
											{SWATCH[colour] && (
												<span
													aria-hidden="true"
													className={`size-[18px] shrink-0 rounded-full shadow-[inset_0_0_0_2px_hsl(var(--input))] ${SWATCH[colour]}`}
												/>
											)}
											{ta(`colours.${colour}`)}
										</Pill>
									))}
								</Group>
								<Group legend={t('filter_size')} small>
									{SIZE_LIST.map((size) => (
										<Pill
											key={size}
											pressed={draft.sizes.includes(size)}
											onPressedChange={() => set({ sizes: toggle(draft.sizes, size) })}
										>
											{t(`filter_size_${size}`)}
										</Pill>
									))}
								</Group>
							</div>
						)}
					</div>
				</div>
				<div className="px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-6">
					{/* P4: the count change is announced politely while the drawer is open. */}
					<p role="status" className="sr-only">
						{t('count_announce', { count })}
					</p>
					<Button size="lg" className="w-full" onClick={onApply}>
						{t('filters_apply', { count })}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

/** A group of toggle pills under its legend (fieldset), 12 px below it. */
function Group({ legend, small, children }: { legend: string; small?: boolean; children: React.ReactNode }) {
	return (
		<fieldset className="m-0 min-w-0 border-0 p-0">
			<legend className={small ? 'p-0 text-control font-bold' : legendClass}>{legend}</legend>
			<div className="mt-3 flex flex-wrap gap-2">{children}</div>
		</fieldset>
	);
}

/** No location (P4 4b): our own place search (C6); with a refusal, the note says why the place is chosen by hand. */
function PlacePicker({
	note,
	selected,
	near,
	onSelect,
}: {
	note?: string;
	selected: ChosenPlace | null;
	near?: Point;
	onSelect: (place: ChosenPlace) => void;
}) {
	const t = useTranslations('browse');
	const [query, setQuery] = React.useState('');
	const search = usePlaceSearch(query, near);
	const key = (p: Point) => `${p.lat},${p.lng}`;
	return (
		<div className="mt-3 grid gap-5">
			{note && (
				<p className="flex gap-3 rounded-row bg-muted py-4 pr-4 pl-[18px] text-control">
					<MapPinLineIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
					<span>{note}</span>
				</p>
			)}
			<FormField label={t('filter_place')}>
				<Input
					type="search"
					autoComplete="off"
					placeholder={t('filter_place_search')}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
			</FormField>
			{search.places.length > 0 && (
				<RadioGroup
					aria-label={t('filter_place')}
					value={selected ? key(selected) : ''}
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
		</div>
	);
}
