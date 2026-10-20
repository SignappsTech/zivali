'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { CatIcon } from '@phosphor-icons/react/dist/ssr/Cat';
import { DogIcon } from '@phosphor-icons/react/dist/ssr/Dog';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { HandHeartIcon } from '@phosphor-icons/react/dist/ssr/HandHeart';
import { HourglassMediumIcon } from '@phosphor-icons/react/dist/ssr/HourglassMedium';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PawPrintIcon } from '@phosphor-icons/react/dist/ssr/PawPrint';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { skipToken } from '@reduxjs/toolkit/query';
import { del, get, set as idbSet } from 'idb-keyval';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import * as React from 'react';

import { type EventParams, flowTracker, getConsent, track } from '@zivali/analytics';
import { ApiError } from '@zivali/api/client';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { reportsApi, useCreateReportMutation, useGetReportQuery } from '@zivali/api/reports';
import type { QueryError } from '@zivali/api/rtk';
import { type BreedCode, COLOURS, type CreateReportResponse, SIZES, type Size, type Species } from '@zivali/types';
import { isBreedOf } from '@zivali/validation/breeds';
import { coarsenPoint } from '@zivali/validation/geo';
import { AiHint, AiInfo, AiNotice, AiSlot, SuggestedMark, useSuggestedText } from '@/components/ai/ai-parts';
import type { AiField } from '@/components/ai/prefill';
import { type Prefill, usePrefill } from '@/components/ai/use-prefill';
import { errorCode, useErrorText } from '@/components/auth/error-text';
import { useCaptcha } from '@/components/auth/turnstile';
import { useAutoRetry } from '@/components/manage/use-auto-retry';
import type { LatLng } from '@/components/map/map-view';
import { BreedField } from '@/components/pets/breed-field';
import { PhotoPicker, type PhotoPickerHandle } from '@/components/photos/photo-picker';
import { clearPhotoDraft, type PickedPhoto } from '@/components/photos/use-photo-uploads';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Pill } from '@/components/ui/pill';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusLabel } from '@/components/ui/status-label';
import { Textarea } from '@/components/ui/textarea';
import { saveManageToken } from '@/lib/manage-link';
import { photoCrop, photoWhole } from '@/lib/photo';
import { cn, focusHeading } from '@/lib/utils';

import {
	capturedAt,
	createBody,
	firstError,
	formKey,
	FOUND_STEPS,
	type FoundValues,
	initialValues,
	isoDay,
	isoTime,
	keepsSubmission,
	type Linked,
	nextSubmission,
	NOTE_MAX,
	type Refusal,
	refusalOf,
	sentenceBreed,
	SIGHTING_STEPS,
	type Source,
	type Step,
	stepErrors,
	type Submission,
	type When,
} from './found-form';

// P7 quick found or sighted report on the web (FR-006, TASK-30.2), the twin of the mobile flow: one question per
// screen in the 560 px flow column, no account (anonymous session with the lazy Turnstile, C7), never where the animal
// is kept. No ad component in this flow (C15).

// Only the first step loads with the page (TASK-112 script budget): the picker (MapView, the "Spremeni" dialog) on
// "Kje", the confirmation once the report is created. Each has its own Suspense (a loading skeleton, or ssr: false for
// the dialog), so a load never suspends to the page's and blanks it.
const LocationPicker = dynamic(() => import('@/components/location/location-picker').then((m) => m.LocationPicker), {
	loading: () => <Skeleton className="h-[360px] w-full rounded-card" />,
});
const Dialog = dynamic(() => import('@/components/ui/dialog').then((m) => m.Dialog), { ssr: false });
const DialogContent = dynamic(() => import('@/components/ui/dialog').then((m) => m.DialogContent), { ssr: false });
const FoundDone = dynamic(() => import('./found-done').then((m) => m.FoundDone), {
	loading: () => <Skeleton className="h-[600px] w-full rounded-card" />,
});

const WHEN: readonly When[] = ['now', 'today', 'other'];
const CAT_SIZES: readonly Size[] = ['s', 'm', 'l'];
/** What the AI pre-fill fills or hints here (C19): no breed or pattern field; the collar hint goes under the note. */
const AI_FIELDS: readonly AiField[] = ['species', 'size', 'colours', 'collar'];
/** A GPS fix this fresh is good enough for "Kje"; a weak one must not hold the step. */
const FIX_MAX_AGE_MS = 10 * 60_000;
const FIX_WAIT_MS = 5000;
/** "Preverjamo …" once the Turnstile check has run this long (P7 M5). */
const CAPTCHA_LINE_MS = 2000;

const titleClass =
	'font-display text-[34px] leading-10 font-bold tracking-[-0.02em] text-balance outline-none lg:text-5xl lg:leading-[52px]';
const groupTitleClass = 'mt-8 mb-3 font-display text-xl font-semibold tracking-[-0.01em]';
const noteIconClass = 'mt-px size-[22px] shrink-0';

/** C12b §3: the flow one P7 instance tracks, a sighting of a listed pet or a find. */
type Tracked = 'report_found' | 'report_sighting';

/** The C1 `issues` of a refused send, from an ApiError or an RTK Query error. */
const issuesOf = (error: unknown) =>
	(error instanceof ApiError ? error.issues : (error as Partial<QueryError> | null)?.data?.issues) ?? [];

/** C4 §Drafts: idb-keyval `draft:<kind>:<id>`. The location in it is the coarsened point (C6); EXIF never goes in. */
type Draft = {
	step: Step;
	values: FoundValues;
	/** Step 2 as "Je to pravilno?" or, after "Uredi podatke", the manual step (TASK-41.2). */
	aiMode?: 'sentence' | 'manual';
};

/** The quiet line (P7 `lp-line`): a 16 px primary icon and 14/20 muted text. */
function Line({
	icon: Icon,
	weight = 'fill',
	className,
	children,
}: {
	icon: PhosphorIcon;
	weight?: 'fill' | 'bold';
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<p className={cn('flex gap-2 text-sm text-muted-foreground', className)}>
			<Icon weight={weight} aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
			<span className="min-w-0 flex-1">{children}</span>
		</p>
	);
}

/** A point offered for "Kje": the raw one stays in memory for the picker, the row and the form get `coarse` (C6). */
type Offered = { raw: LatLng; coarse: LatLng };
const offer = (raw: LatLng): Offered => ({ raw, coarse: coarsenPoint(raw) });

/**
 * A GPS point for "Kje" when this site may already read the location: it never prompts (the picker's "Uporabi mojo
 * lokacijo" does, after the P2 primer).
 */
function useGpsFix(): { fix?: Offered; locating: boolean } {
	const [state, setState] = React.useState<{ fix?: Offered; locating: boolean }>({ locating: true });
	React.useEffect(() => {
		let alive = true;
		(async () => {
			const permission = await navigator.permissions?.query({ name: 'geolocation' }).catch(() => undefined);
			if (permission?.state !== 'granted') return undefined;
			const { coords } = await new Promise<GeolocationPosition>((resolve, reject) =>
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					maximumAge: FIX_MAX_AGE_MS,
					timeout: FIX_WAIT_MS,
				})
			);
			return offer({ lat: coords.latitude, lng: coords.longitude });
		})().then(
			(fix) => alive && setState({ fix, locating: false }),
			() => alive && setState({ locating: false })
		);
		return () => {
			alive = false;
		};
	}, []);
	return state;
}

/** The lost pet a sighting is about (P7 S1): 48 px photo, name, status word, on every step. */
function LinkedPet({ code }: { code: string }) {
	const t = useTranslations('browse');
	const { data } = useGetReportQuery({ code });
	if (!data) return null;
	const thumb = data.photos[0]?.thumb_url;
	return (
		<div className="mt-6 flex items-center gap-3 lg:mt-8">
			{thumb ? (
				// eslint-disable-next-line @next/next/no-img-element -- the API's sized thumbnail (C5)
				<img
					src={thumb}
					alt=""
					width={48}
					height={48}
					className={cn('size-12 rounded-xl bg-muted', photoCrop)}
				/>
			) : (
				<span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
					<PawPrintIcon weight="bold" aria-hidden="true" className="size-6" />
				</span>
			)}
			<div className="min-w-0">
				{data.name && <p className="font-bold">{data.name}</p>}
				<StatusLabel status={data.type}>{t(`status_${data.type}`)}</StatusLabel>
			</div>
		</div>
	);
}

/** One bar per step (P7: five; three for the sighting of a listed pet). */
function StepBars({ current, total }: { current: number; total: number }) {
	const t = useTranslations('report_found');
	return (
		<div
			role="progressbar"
			aria-label={t('step_a11y', { current, total })}
			aria-valuemin={1}
			aria-valuemax={total}
			aria-valuenow={current}
			className="flex gap-1.5"
		>
			{Array.from({ length: total }, (_, i) => (
				<span key={i} className={cn('h-1 flex-1 rounded-sm', i < current ? 'bg-primary' : 'bg-muted')} />
			))}
		</div>
	);
}

type StepProps = {
	values: FoundValues;
	set: (change: Partial<FoundValues>) => void;
	errors: ReturnType<typeof stepErrors>;
	labelledBy: string;
};

/** A field's AI description under it: suggested_a11y (screen readers) while marked, else the low-confidence hint. */
function AiLine({ ai, field, id }: { ai: Prefill; field: AiField; id: string }) {
	const tai = useTranslations('ai_prefill');
	const suggested = useSuggestedText();
	if (ai.marks.has(field))
		return (
			<span id={id} className="sr-only">
				{suggested(ai.confidence.get(field))}
			</span>
		);
	return ai.hints.has(field) ? (
		<AiHint id={id} className="mt-2">
			{tai('low_confidence')}
		</AiHint>
	) : null;
}

/** The breed on P7's "Uredi podatke" step, only when the sentence named one (wireframe v2 F3). */
type BreedAsk = { marked: boolean; confidence?: number; onChange: (code: BreedCode | undefined) => void };

/**
 * Step 2 without AI, or after "Uredi podatke" (P7 C1, wireframe F3): species is the one required answer; size and
 * colour are optional pills. Suggested values come selected with the "Predlog" mark and its confidence (inside the
 * selected row for the species, whose label is the h1), a value below the minimum confidence leaves the hint, a
 * different species a hint. A breed the sentence named shows as "Pasma (neobvezno)", to change or clear.
 */
function WhatStep({ values, set, errors, labelledBy, ai, breed }: StepProps & { ai: Prefill; breed?: BreedAsk }) {
	const t = useTranslations('report_found');
	const ta = useTranslations('attributes');
	const tai = useTranslations('ai_prefill');
	const suggested = useSuggestedText();
	const id = React.useId();
	const sizes = values.species === 'cat' ? CAT_SIZES : SIZES;
	const describedBy = (field: AiField, extra?: string) =>
		[extra, (ai.marks.has(field) || ai.hints.has(field)) && `${id}-${field}`].filter(Boolean).join(' ') ||
		undefined;
	const chooseSpecies = (species: Species) =>
		set({
			species,
			...(species === 'cat' && values.size && !CAT_SIZES.includes(values.size) && { size: undefined }),
			// A breed of the other species no longer fits.
			...(values.breed_codes?.some((code) => !isBreedOf(code, species)) ? { breed_codes: undefined } : {}),
		});
	const mark = (field: AiField) => ai.marks.has(field) && <SuggestedMark confidence={ai.confidence.get(field)} />;
	const speciesMark = (species: Species) =>
		ai.marks.has('species') &&
		values.species === species && (
			<SuggestedMark confidence={ai.confidence.get('species')} onPrimary className="ml-0" />
		);
	const breedCode = values.breed_codes?.[0];
	return (
		<div className="mt-6">
			<RadioGroup
				value={values.species ?? ''}
				onValueChange={(species) => {
					ai.touch('species');
					chooseSpecies(species as Species);
				}}
				aria-labelledby={labelledBy}
				aria-describedby={describedBy('species', ai.differs && `${id}-differs`)}
				aria-invalid={errors.species || undefined}
				className="gap-3"
			>
				<ChoiceRow
					value="dog"
					title={t('species_dog')}
					description={speciesMark('dog')}
					icon={<DogIcon weight="bold" aria-hidden="true" />}
				/>
				<ChoiceRow
					value="cat"
					title={t('species_cat')}
					description={speciesMark('cat')}
					icon={<CatIcon weight="bold" aria-hidden="true" />}
				/>
			</RadioGroup>
			{errors.species && <FieldError className="mt-3">{t('species_required')}</FieldError>}
			<AiLine ai={ai} field="species" id={`${id}-species`} />
			{ai.differs && (
				<div className="mt-2 grid justify-items-start">
					<AiHint id={`${id}-differs`}>{tai('species_differs', { species: ai.differs })}</AiHint>
					<Button
						type="button"
						variant="text"
						className="-ml-3"
						onClick={() => {
							ai.touch('species');
							chooseSpecies(ai.differs!);
							ai.refill();
						}}
					>
						{tai('species_switch', { species: ai.differs })}
					</Button>
				</div>
			)}
			{breed && (
				<div className="mt-8">
					<BreedField
						species={values.species}
						value={breedCode}
						onChange={breed.onChange}
						label={t('breed_label')}
						mark={breed.marked && breedCode && <SuggestedMark confidence={breed.confidence} />}
						note={
							breed.marked && breedCode && <span className="sr-only">{suggested(breed.confidence)}</span>
						}
					/>
				</div>
			)}
			<h2 className={groupTitleClass}>
				{t('size_label')}
				{mark('size')}
			</h2>
			<div
				role="group"
				aria-label={t('size_label')}
				aria-describedby={describedBy('size')}
				className="flex flex-wrap gap-2"
			>
				{sizes.map((size) => (
					<Pill
						key={size}
						pressed={values.size === size}
						onPressedChange={(on) => {
							ai.touch('size');
							set({ size: on ? size : undefined });
						}}
					>
						{ta(`size.${size}`)}
					</Pill>
				))}
			</div>
			<AiLine ai={ai} field="size" id={`${id}-size`} />
			<h2 className={groupTitleClass}>
				{t('colour_label')}
				{mark('colours')}
			</h2>
			<div
				role="group"
				aria-label={t('colour_label')}
				aria-describedby={describedBy('colours')}
				className="flex flex-wrap gap-2"
			>
				{COLOURS.map((colour) => (
					<Pill
						key={colour}
						pressed={values.colours.includes(colour)}
						onPressedChange={(on) => {
							ai.touch('colours');
							set({
								colours: on ? [...values.colours, colour] : values.colours.filter((c) => c !== colour),
							});
						}}
					>
						{ta(`colours.${colour}`)}
					</Pill>
				))}
			</div>
			<AiLine ai={ai} field="colours" id={`${id}-colours`} />
		</div>
	);
}

/**
 * Step 2 with a suggestion (wireframe F2): the photo, "Je to pravilno?" and one sentence from the suggested values
 * only ("Pes, labradorec, črne barve"; a missing size, breed or colour is left out), the disclosure line and the info.
 */
function SentenceStep({ values, photos, breed }: { values: FoundValues; photos: PickedPhoto[]; breed?: BreedCode }) {
	const t = useTranslations('report_found');
	const tb = useTranslations('breeds');
	const tph = useTranslations('photos');
	const format = useFormatter();
	const locale = useLocale();
	const photo = photos[0];
	const size = values.size ?? 'none';
	const breedName = breed && tb(breed);
	const sentence = [
		values.species === 'cat' ? t('ai_cat', { size }) : t('ai_dog', { size }),
		// Mid-sentence in SL a breed is lower case ("labradorec"), unless the name has capitals of its own.
		breedName && locale === 'sl' && !/\p{Lu}/u.test(breedName.slice(1))
			? breedName.toLocaleLowerCase('sl')
			: breedName,
		values.colours.length > 0 &&
			t('ai_colours', {
				colours: format.list(
					values.colours.map((colour) => t(`ai_colour.${colour}`)),
					{ type: 'conjunction' }
				),
			}),
	]
		.filter(Boolean)
		.join(', ');
	return (
		<>
			{photo && (
				// eslint-disable-next-line @next/next/no-img-element -- a local object URL
				<img
					src={photo.preview}
					alt={tph('thumb_alt', { n: 1, total: photos.length })}
					width={560}
					height={420}
					className={cn('mt-6 aspect-[4/3] w-full rounded-[32px] bg-muted', photoWhole)}
				/>
			)}
			<p className="mt-3 text-[22px] leading-8">{sentence}</p>
			<Line icon={SparkleIcon} className="mt-3">
				{t('ai_note')}
			</Line>
			<div className="-ml-3 flex flex-wrap">
				<AiInfo />
			</div>
		</>
	);
}

/** Step 3 (P7 M3): the place read from the photo or GPS, its address and "Spremeni"; never where the animal is now. */
function WhereRow({ source, address, onChange }: { source?: Source; address: string; onChange: () => void }) {
	const t = useTranslations('report_found');
	const from = source === 'exif' ? t('where_from_photo') : source === 'gps' ? t('where_from_gps') : null;
	return (
		<>
			<div className="mt-8 grid grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-4 rounded-row bg-card py-3 pr-2 pl-3 text-card-foreground">
				<span aria-hidden="true" className="grid size-20 place-items-center rounded-2xl bg-map-land">
					<MapPinIcon weight="fill" className="size-8 text-primary" />
				</span>
				<div className="min-w-0">
					<p className="font-bold">{address}</p>
					{from && <p className="mt-0.5 text-sm text-muted-foreground">{from}</p>}
				</div>
				<Button type="button" variant="text" aria-haspopup="dialog" onClick={onChange}>
					{t('where_change')}
				</Button>
			</div>
			<Line icon={ShieldCheckIcon} className="mt-5">
				{t('where_note')}
			</Line>
		</>
	);
}

function NoteField({
	values,
	set,
	errors,
	sighting = false,
	collarHint = false,
}: Omit<StepProps, 'labelledBy'> & { sighting?: boolean; collarHint?: boolean }) {
	const t = useTranslations('report_found');
	const tai = useTranslations('ai_prefill');
	return (
		<FormField
			label={t(sighting ? 'sighting_note' : 'note_label')}
			hint={
				<>
					{t('note_help')}
					{/* The photo shows a collar (C19): P7 has no collar field, so the hint asks for it in the note. */}
					{collarHint && <AiHint className="mt-1.5">{tai('collar_hint_note')}</AiHint>}
				</>
			}
			error={errors.note ? t('note_too_long', { max: NOTE_MAX }) : undefined}
			className="mt-8"
		>
			<Textarea
				value={values.note}
				onChange={(event) => set({ note: event.target.value })}
				rows={3}
				placeholder={t(sighting ? 'sighting_note_placeholder' : 'note_placeholder')}
			/>
		</FormField>
	);
}

/** Step 4 (P7 M4): have it or only saw it (nothing preselected for a find), the public note, the optional email. */
function SituationStep({ account, collarHint, ...props }: StepProps & { account: boolean; collarHint: boolean }) {
	const t = useTranslations('report_found');
	const { values, set, errors, labelledBy } = props;
	return (
		<div className="mt-6">
			<RadioGroup
				value={values.situation ?? ''}
				onValueChange={(situation) => set({ situation: situation as 'have' | 'seen' })}
				aria-labelledby={labelledBy}
				aria-invalid={errors.situation || undefined}
				className="gap-3"
			>
				<ChoiceRow
					value="have"
					title={t('situation_have')}
					description={t('situation_have_desc')}
					icon={<HandHeartIcon weight="bold" aria-hidden="true" />}
				/>
				<ChoiceRow
					value="seen"
					title={t('situation_seen')}
					description={t('situation_seen_desc')}
					icon={<EyeIcon weight="bold" aria-hidden="true" />}
				/>
			</RadioGroup>
			{errors.situation && <FieldError className="mt-3">{t('situation_required')}</FieldError>}
			<NoteField {...props} collarHint={collarHint} />
			{/* The private link is for finders without an account (C7); an account has its reports anyway. */}
			{!account && (
				<FormField
					label={t('email_label')}
					hint={t('email_help')}
					error={errors.email ? t('email_invalid') : undefined}
					className="mt-8"
				>
					<Input
						type="email"
						inputMode="email"
						autoComplete="email"
						spellCheck={false}
						value={values.email}
						onChange={(event) => set({ email: event.target.value })}
					/>
				</FormField>
			)}
		</div>
	);
}

/** Sighting step 2: Pravkar, Danes (the time) or Drugič (the date and the time), prefilled with now. */
function WhenStep({ values, set, errors, labelledBy }: StepProps) {
	const t = useTranslations('report_found');
	const choose = (when: When) => {
		const now = new Date();
		set({
			when,
			...(when !== 'now' && !values.time && { time: isoTime(now) }),
			...(when === 'other' && !values.date && { date: isoDay(now) }),
		});
	};
	return (
		<div className="mt-6 grid gap-5">
			<RadioGroup
				value={values.when}
				onValueChange={(when) => choose(when as When)}
				aria-labelledby={labelledBy}
				className="gap-3"
			>
				{WHEN.map((when) => (
					<ChoiceRow key={when} value={when} title={t(`sighting_when_${when}`)} />
				))}
			</RadioGroup>
			{values.when !== 'now' && (
				<div className="flex flex-wrap gap-5">
					{values.when === 'other' && (
						<FormField label={t('sighting_date')} className="min-w-40 flex-1">
							<Input
								type="date"
								max={isoDay(new Date())}
								value={values.date}
								onChange={(event) => set({ date: event.target.value })}
								className="tabular-nums"
							/>
						</FormField>
					)}
					<FormField label={t('sighting_time')} className="w-36">
						<Input
							type="time"
							value={values.time}
							onChange={(event) => set({ time: event.target.value })}
							className="tabular-nums"
						/>
					</FormField>
				</div>
			)}
			{errors.when && <FieldError>{t('sighting_when_invalid')}</FieldError>}
		</div>
	);
}

/** Publish (P7 M5): one line per answer, each with "Uredi" named after it. */
function SummaryRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
	const tc = useTranslations('common');
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
			<dt className="text-sm font-bold text-muted-foreground">{label}</dt>
			<dd className="col-start-1 mt-0.5 break-words">{children}</dd>
			<dd className="col-start-2 row-span-2 row-start-1 -mt-2 -mr-3">
				<Button type="button" variant="text" aria-label={`${tc('edit')}: ${label}`} onClick={onEdit}>
					{tc('edit')}
				</Button>
			</dd>
		</div>
	);
}

/** report_found_submit (C12) needs the region and municipality the API derived; fetched only with consent. */
function useTrackSubmit() {
	const [fetchReport] = reportsApi.endpoints.getReport.useLazyQuery();
	return React.useCallback(
		(code: string) => {
			if (!getConsent()?.analytics) return;
			fetchReport({ code })
				.unwrap()
				.then((report) => {
					if (!report.region_slug || !report.municipality_slug || report.type === 'lost') return;
					track('report_found_submit', {
						report_type: report.type,
						species: report.species,
						region: report.region_slug as EventParams['report_found_submit']['region'],
						municipality: report.municipality_slug,
					});
				})
				.catch(() => {});
		},
		[fetchReport]
	);
}

/**
 * P7 report found or sighted, without an account (FR-006, C7). `entry` `found` or `sighted` runs the five steps;
 * `linked` (P9 "Sporoči opažanje" on a lost report) the short sighting flow with the lost pet on top. The finder's
 * anonymous session starts with the first photo upload (or with Publish): Turnstile loads only then (TASK-17.9).
 * Photos upload while the flow goes on and the draft is saved on each step (C4 §Drafts). Publish sends one submission
 * per body (one Idempotency-Key, kept across failures the API stores nothing for); a failed captcha or a lost
 * connection keeps the answers and tries again every 60 s and on reconnect. `account`: a signed-in finder (no email,
 * no manage link). The capture time is the earliest photo EXIF time, else when the flow started.
 */
export function FoundFlow({
	entry,
	linked: linkedProp,
	account = false,
}: {
	entry: 'found' | 'sighted';
	linked?: Linked;
	account?: boolean;
}) {
	const t = useTranslations('report_found');
	const tc = useTranslations('common');
	const tl = useTranslations('location');
	const ta = useTranslations('attributes');
	const tb = useTranslations('breeds');
	const tph = useTranslations('photos');
	const te = useTranslations('errors');
	const errorText = useErrorText();
	const trackSubmit = useTrackSubmit();
	// The link without a species reads it from the listing; a listing that will not load drops the link, so the finder
	// still gets the plain sighting flow instead of a Publish that does nothing.
	const listing = useGetReportQuery(linkedProp?.code && !linkedProp.species ? { code: linkedProp.code } : skipToken);
	const linked = listing.isError ? undefined : linkedProp;
	const steps = linked ? SIGHTING_STEPS : FOUND_STEPS;
	const last = steps[steps.length - 1]!;
	const photoStep: Step = linked ? 'extra' : 'photo';
	const kind = linked || entry === 'sighted' ? 'sighted' : 'found';
	const draftId = linked ? `sighted-${linked.id}` : entry;
	const draftKey = `draft:${kind}:${draftId}`;

	const [values, setValues] = React.useState<FoundValues>(() => initialValues(entry));
	// The field the API refused (GH#1), marked on its step until the finder changes an answer or moves on.
	const [refusal, setRefusal] = React.useState<Refusal>();
	const set = React.useCallback((change: Partial<FoundValues>) => {
		setRefusal(undefined);
		setValues((prev) => ({ ...prev, ...change }));
	}, []);
	// Until the finder moves on, the first step of whichever flow it is: a dropped link changes the flow.
	const [stepState, setStep] = React.useState<Step>();
	const step = stepState && steps.includes(stepState) ? stepState : steps[0]!;
	const index = steps.indexOf(step);
	const [attempted, setAttempted] = React.useState(false);
	const [toReview, setToReview] = React.useState(false);
	const [photos, setPhotos] = React.useState<PickedPhoto[]>([]);
	const picker = React.useRef<PhotoPickerHandle>(null);
	const changePhoto = () => picker.current?.replaceFirst();
	// C19 (TASK-41.2): the first photo's suggestions fill the untouched answers of step 2 with marks; Publish (or
	// "Da, nadaljuj") confirms them. Not in the short sighting flow, which asks nothing about the animal.
	const ai = usePrefill({
		photos,
		enabled: !linked,
		fields: AI_FIELDS,
		analytics: 'report_found',
		read: () => ({ species: values.species, size: values.size ?? null, colours: values.colours, collar: null }),
		write: ({ species, size, colours }) =>
			set({ ...(species && { species }), ...(size && { size }), ...(colours && { colours }) }),
		clear: (fields) =>
			set({
				...(fields.includes('species') && { species: undefined }),
				...(fields.includes('size') && { size: undefined }),
				...(fields.includes('colours') && { colours: [] }),
			}),
	});
	// "Je to pravilno?" (wireframe F2): offered when a species was suggested before Naprej on the photo step, so the
	// screen never swaps under the finder; "Uredi podatke" turns it into the manual step for good.
	const [aiMode, setAiMode] = React.useState<Draft['aiMode']>();
	const sentence = step === 'what' && aiMode === 'sentence';
	// The breed the sentence named, on "Uredi podatke" (wireframe v2 F3): asked there from then on, marked until changed.
	const [breedAsk, setBreedAsk] = React.useState<{ marked: boolean }>();
	// From step 2's note the picker is hidden, and so is the note once the copy is checked: focus goes to the heading.
	const cropFirst = () => picker.current?.cropFirst(() => focusHeading(root.current));
	// A cropped first photo is checked again (C19 §Crop 6); the breed the sentence named goes too while still marked,
	// and "Je to pravilno?" is offered again only for the copy's own suggestion (Naprej on the photo step).
	const cropped = (index: number) => {
		if (index > 0) return;
		ai.recheck();
		if (aiMode === 'sentence') setAiMode(undefined);
		if (breedAsk?.marked) {
			setBreedAsk({ marked: false });
			set({ breed_codes: undefined });
		}
	};
	// The photo's place wins over GPS; both are coarsened once when they arrive (C6).
	const [exif, setExif] = React.useState<Offered>();
	const { fix, locating } = useGpsFix();
	const [picking, setPicking] = React.useState(false);
	// The "Spremeni" dialog loads on its first open and then stays mounted, so it can animate out and return focus.
	const [dialogLoaded, setDialogLoaded] = React.useState(false);
	if (picking && !dialogLoaded) setDialogLoaded(true);
	const [limit, setLimit] = React.useState<{ until: number; text: string }>();
	const [checking, setChecking] = React.useState(false);
	const root = React.useRef<HTMLElement>(null);
	const headingId = React.useId();

	React.useEffect(() => track('report_found_start'), []);

	// Restored silently, as on mobile; the draft keeps its own startedAt, the capture time without a photo time.
	const [draftRead, setDraftRead] = React.useState(false);
	React.useEffect(() => {
		let live = true;
		get<Draft>(draftKey)
			.then((draft) => {
				if (!live || !draft?.step || !draft.values) return;
				setValues((prev) => ({ ...prev, ...draft.values }));
				// Step 2 as it was left: the sentence, or the manual step with the breed now the finder's own.
				setAiMode(draft.aiMode);
				if (draft.aiMode === 'manual' && draft.values.breed_codes?.length) setBreedAsk({ marked: false });
				if (steps.includes(draft.step)) setStep(draft.step);
			})
			.catch(() => {})
			.finally(() => live && setDraftRead(true));
		return () => {
			live = false;
		};
	}, [draftKey, steps]);

	// Focus on the step's heading (the picker's own h1 on an empty "Kje"), so a screen reader starts at the question.
	const first = React.useRef(true);

	// "Kje": the chosen place, else the photo's, else the GPS fix; with none of them the picker shows at once.
	const where: { point: LatLng; source?: Source } | undefined = values.location
		? { point: values.location, source: values.source }
		: exif
			? { point: exif.coarse, source: 'exif' }
			: fix && { point: fix.coarse, source: 'gps' };
	const suggested = exif ? { ...exif.raw, source: 'exif' as const } : fix && { ...fix.raw, source: 'gps' as const };
	const inlinePicker = step === 'where' && !where && !locating;
	// The picker's chunk (with the dialog's) comes down as "Kje" shows, so "Spremeni" after a GPS or photo place opens
	// at once.
	React.useEffect(() => {
		if (step === 'where') void import('@/components/location/location-picker').catch(() => {});
	}, [step]);
	const reverse = useReversePlaceQuery(where ? where.point : skipToken);
	const address = !where
		? ''
		: reverse.currentData === undefined && !reverse.isError
			? tc('loading')
			: (reverse.currentData?.label ?? tl('address_unknown'));

	// Submit: the anonymous session (shared by the photo uploads, so there is only ever one sign-in), then create.
	const captcha = useCaptcha({ lazy: true });
	const { getToken, interactive } = captcha;
	// A challenge's sheet takes focus (Tab reaches the check next) and gives it back once Cloudflare is done.
	const captchaSheet = React.useRef<HTMLDivElement>(null);
	const captchaReturn = React.useRef<Element | null>(null);
	/** Back to where the finder was before the sheet opened, or to the step's heading if that is gone. */
	const leaveCaptcha = React.useCallback(() => {
		const back = captchaReturn.current;
		if (back instanceof HTMLElement && back.isConnected && back !== document.body) back.focus();
		else focusHeading(root.current);
	}, []);
	React.useEffect(() => {
		const sheet = captchaSheet.current;
		const main = root.current;
		if (!interactive || !sheet || !main) return;
		captchaReturn.current = document.activeElement;
		sheet.focus();
		// Below lg the sticky action bar rides above the sheet, so Publish, Nazaj and the captcha line stay in view.
		const lift = () => main.style.setProperty('--captcha-sheet', `${sheet.offsetHeight}px`);
		lift();
		const observer = new ResizeObserver(lift);
		observer.observe(sheet);
		return () => {
			observer.disconnect();
			main.style.removeProperty('--captcha-sheet');
			const now = document.activeElement;
			if (now === document.body || sheet.contains(now)) leaveCaptcha();
		};
	}, [interactive, leaveCaptcha]);
	const signingIn = React.useRef<Promise<void> | null>(null);
	const session = React.useCallback(() => {
		signingIn.current ??= (async () => {
			// A chunk that fails to download is a lost connection: the note and the automatic retry.
			const { ensureSession } = await import('@/lib/auth').catch((cause) => {
				throw new ApiError('NETWORK', 'NETWORK', { cause });
			});
			await ensureSession(async () => {
				const timer = setTimeout(() => setChecking(true), CAPTCHA_LINE_MS);
				try {
					return await getToken();
				} finally {
					clearTimeout(timer);
					setChecking(false);
				}
			});
		})().finally(() => {
			signingIn.current = null;
		});
		return signingIn.current;
	}, [getToken]);

	const [createReport] = useCreateReportMutation();
	const submission = React.useRef<Submission | null>(null);
	const photoIds = React.useMemo(
		() => photos.flatMap((photo) => (photo.status === 'uploaded' && photo.photoId ? [photo.photoId] : [])),
		[photos]
	);
	const uploading = photos.some((photo) => photo.status === 'uploading');
	const species = linked ? (linked.species ?? listing.data?.species) : values.species;

	// C12b §3: one tracker per flow shown (a dropped link turns the sighting into a find), each step once as it shows,
	// from when the draft is read, so a restored step is the first. The last step carries the species when known.
	const flow: Tracked = linked ? 'report_sighting' : 'report_found';
	const tracker = React.useRef<ReturnType<typeof flowTracker<Tracked>> & { flow: Tracked }>(null);
	React.useEffect(() => {
		if (!draftRead) return;
		if (tracker.current?.flow !== flow) tracker.current = { flow, ...flowTracker(flow) };
		tracker.current.step(step, step === last && species ? { species } : {});
	}, [draftRead, flow, step, last, species]);
	// A refused send (C12b §4) is the finder's own Publish, not one of the automatic retries; a VALIDATION answer
	// names its first field by the form's key.
	const pressed = React.useRef(false);
	const refused = React.useCallback(
		(error: unknown) => {
			if (!pressed.current) return;
			const code = errorCode(error);
			tracker.current?.error(last, code, code === 'VALIDATION' ? formKey(issuesOf(error)[0]?.path) : undefined);
		},
		[last]
	);
	const noteLimit = React.useCallback(
		(error: unknown) => {
			if (errorCode(error) !== 'RATE_LIMITED') return;
			const seconds =
				Number(((error as QueryError).data?.details ?? (error as ApiError).details)?.retry_after_s) || 60;
			const minutes = Math.max(1, Math.ceil(seconds / 60));
			setLimit({
				until: Date.now() + seconds * 1000,
				text: minutes > 60 ? t('limit_day') : t('limit_hour', { minutes }),
			});
		},
		[t]
	);
	// What is still missing before a publish: a step to go back to, 'wait' (uploads, the listing's species) or nothing.
	const missing = (): Step | 'wait' | undefined => {
		for (const s of steps) if (firstError(s, values)) return s;
		// Found reports need a photo (C4: 1 to 5); a sighting may have none. Uploads still running finish first.
		if (uploading) return 'wait';
		if (!linked && photoIds.length === 0) return 'photo';
		if (!values.location) return 'where';
		if (!species) return 'wait';
	};
	const ready = step === last && !missing();
	const go = React.useCallback((next: Step) => {
		setAttempted(false);
		setPicking(false);
		setRefusal(undefined);
		setStep(next);
	}, []);
	const edit = React.useCallback(
		(target: Step) => {
			setToReview(true);
			go(target);
		},
		[go]
	);
	const send = React.useCallback(async (): Promise<CreateReportResponse> => {
		// The automatic retry runs this on any step: only the finder on the last step, with everything checked, publishes.
		if (!ready) throw new ApiError('NETWORK', 'NETWORK');
		// The confirmation's chunk comes down while the report is sent.
		void import('./found-done').catch(() => {});
		try {
			await session();
		} catch (error) {
			// The anonymous sign-in has its own rate limit (GoTrue 429); a failed captcha shows its note and retries.
			noteLimit(error);
			refused(error);
			throw error;
		}
		const location = values.location!;
		submission.current = nextSubmission(
			submission.current,
			(at) => createBody({ ...values, species: species!, location }, { photoIds, at, linked, account }),
			{
				at: capturedAt(values, Boolean(linked)),
				now: Boolean(linked) && values.when === 'now',
				newKey: () => crypto.randomUUID(),
			}
		);
		const { key, body } = submission.current;
		try {
			return await createReport({ body: JSON.parse(body), idempotencyKey: key }).unwrap();
		} catch (error) {
			// Only a definitive refusal ends the submission; anything the API may have stored repeats with its key.
			if (!keepsSubmission(error)) submission.current = null;
			noteLimit(error);
			refused(error);
			// A refused field the finder can fix: back to its step, marked there (GH#1).
			const target = errorCode(error) === 'VALIDATION' ? refusalOf(issuesOf(error), steps) : undefined;
			if (target) {
				if (target.step !== last) edit(target.step);
				setRefusal(target);
			}
			throw error;
		}
	}, [
		ready,
		session,
		noteLimit,
		refused,
		values,
		species,
		photoIds,
		linked,
		account,
		createReport,
		steps,
		last,
		edit,
	]);
	const submit = useAutoRetry(send);
	const sending = submit.status === 'running';
	const result = submit.status === 'done' ? submit.result : undefined;

	// The limit's timer clears the note and enables Publish when the time is up.
	React.useEffect(() => {
		if (!limit) return;
		const timer = setTimeout(() => setLimit(undefined), Math.max(0, limit.until - Date.now()));
		return () => clearTimeout(timer);
	}, [limit]);

	// Once per created report: the token for the manage link on this device, the draft goes, the C12 event.
	React.useEffect(() => {
		if (!result) return;
		if (result.manage_token) saveManageToken(result.id, result.manage_token);
		void Promise.all([del(draftKey).catch(() => {}), clearPhotoDraft(draftId)]);
		trackSubmit(result.short_code);
	}, [result, draftKey, draftId, trackSubmit]);

	React.useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		return focusHeading(root.current);
	}, [step, inlinePicker, result, sentence]);

	const advance = (current = values, mode = aiMode) => {
		const target = toReview ? last : steps[index + 1]!;
		if (target === last) setToReview(false);
		go(target);
		idbSet(draftKey, { step: target, values: current, aiMode: mode } satisfies Draft).catch(() => {});
	};
	// "Da, nadaljuj": the suggested answers, and the breed the sentence names, become the finder's own.
	const accept = () => {
		const breed = values.breed_codes?.[0] ?? sentenceBreed(ai.result, values.species);
		ai.confirm();
		const current = { ...values, breed_codes: breed ? [breed] : undefined };
		setValues(current);
		advance(current);
	};
	// "Uredi podatke": the manual step with the suggestions marked; a breed the sentence named shows there as
	// "Pasma (neobvezno)", filled and marked (unless the finder had already confirmed it), to change or clear.
	const editSuggestion = () => {
		const confirmed = values.breed_codes?.[0];
		const breed = confirmed ?? sentenceBreed(ai.result, values.species);
		setAiMode('manual');
		setBreedAsk(breed ? { marked: !confirmed } : undefined);
		set({ breed_codes: breed ? [breed] : undefined });
	};
	const next = () => {
		setAttempted(true);
		// C12b §4: one flow_error per refused Naprej, the first refused field and its code.
		const refusal = firstError(step, values);
		if (refusal) return tracker.current?.error(step, refusal.code, refusal.field);
		if (sentence) return accept();
		if (step === 'photo' && !aiMode && ai.marks.has('species')) {
			setAiMode('sentence');
			return advance(values, 'sentence');
		}
		// Naprej on "Kje" takes the offered place into the form.
		if (step === 'where' && !values.location && where) {
			const current = { ...values, location: where.point, source: where.source };
			setValues(current);
			return advance(current);
		}
		advance();
	};
	const back = () => index > 0 && go(steps[index - 1]!);
	const pickPlace = ({ point, source }: { point: LatLng; source: Source }) => {
		const current = { ...values, location: point, source };
		setValues(current);
		advance(current);
	};

	// Enter, a click and requestSubmit can all come at once: one publish at a time.
	const busy = React.useRef(false);
	const publish = async () => {
		if (busy.current || sending || limit) return;
		busy.current = true;
		try {
			const blocker = missing();
			if (blocker === 'wait') return;
			if (blocker) {
				// A refused send (C12b §3): the first answer it goes back for (no photo, no place, or a step's check).
				const check = firstError(blocker, values);
				const field = check?.field ?? (blocker === 'photo' ? 'photo' : 'location');
				tracker.current?.error(last, check?.code ?? 'required', field);
				edit(blocker);
				return setAttempted(Boolean(check));
			}
			setRefusal(undefined);
			pressed.current = true;
			await submit.run();
		} finally {
			busy.current = false;
			pressed.current = false;
		}
	};

	if (result)
		return (
			<main id="main" ref={root} className="mx-auto box-content max-w-[560px] px-5 pt-8 pb-16 lg:pb-24">
				<FoundDone
					result={result}
					point={values.location!}
					kind={!linked && values.situation === 'have' ? 'found' : 'sighted'}
					linked={linked}
					emailed={!linked && !account && values.email.trim() !== ''}
					titleClass={cn(titleClass, 'mt-0')}
				/>
			</main>
		);

	const errors: ReturnType<typeof stepErrors> = attempted ? stepErrors(step, values) : {};
	if (refusal?.step === step && refusal.field !== 'photo') errors[refusal.field] = true;
	const stepProps = { values, set, errors, labelledBy: headingId };
	const titles: Record<Step, string> = {
		photo: t('photo_title'),
		what: sentence ? t('ai_title') : t('species_title'),
		where: linked ? t('sighting_where') : tl(kind === 'sighted' ? 'title_sighted' : 'title_found'),
		situation: t('situation_title'),
		send: t('send_title'),
		when: t('sighting_when'),
		extra: t('sighting_photo'),
	};
	const animal = [
		values.species && t(`species_${values.species}`),
		values.breed_codes?.[0] && tb(values.breed_codes[0]),
		values.size && ta(`size.${values.size}`),
		values.colours.map((colour) => ta(`colours.${colour}`)).join(', '),
	]
		.filter(Boolean)
		.join(' · ');
	const emptyPhotos = step === 'photo' && photos.length === 0;
	// The rate limit speaks through its own note while it lasts; any other failure keeps its note until the next try.
	// A refusal (VALIDATION) speaks on the field it names; one no step shows says why, never "check the highlighted
	// fields" (GH#1): the listing is gone, else the request is ours to fix.
	const refusedText = (error: unknown) => {
		const issues = issuesOf(error);
		if (refusalOf(issues, steps)) return undefined;
		return te(issues.some((issue) => issue.path === 'linked_report_id') ? 'NOT_FOUND' : 'INTERNAL');
	};
	const failure =
		submit.error && errorCode(submit.error) !== 'RATE_LIMITED'
			? errorCode(submit.error) === 'CAPTCHA_FAILED'
				? t('captcha_failed')
				: errorCode(submit.error) === 'VALIDATION'
					? refusedText(submit.error)
					: errorText(submit.error)
			: undefined;
	const noteId = `${headingId}-send-note`;

	return (
		<main id="main" ref={root} className="mx-auto box-content max-w-[560px] px-5 pt-6 pb-16 lg:pt-8 lg:pb-24">
			{/* P7: a challenge opens as a bottom sheet (system §10.7) with captcha_title and captcha_body, in view on
			    every step. The widget never moves (a moved iframe restarts the check): its wrapper becomes the sheet
			    while Cloudflare needs a click, with the widget's 65 px slot reserved. */}
			{captcha.widget && (
				<div
					ref={captchaSheet}
					role={interactive ? 'dialog' : undefined}
					aria-labelledby={interactive ? `${headingId}-captcha` : undefined}
					aria-describedby={interactive ? `${headingId}-captcha-body` : undefined}
					tabIndex={interactive ? -1 : undefined}
					// Escape steps back to where the finder was; the sheet stays, as the check cannot be skipped.
					onKeyDown={
						interactive
							? (event) => {
									if (event.key !== 'Escape') return;
									event.preventDefault();
									leaveCaptcha();
								}
							: undefined
					}
					// The 300 px widget fits a 320 px screen with 10 px sides (max-[359px]).
					className={cn(
						interactive &&
							'fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] w-full max-w-[560px] overflow-y-auto rounded-t-sheet bg-card px-5 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-card-foreground shadow-lg outline-hidden max-[359px]:px-2.5'
					)}
				>
					{interactive && (
						<>
							<h2
								id={`${headingId}-captcha`}
								className="font-display text-2xl leading-[30px] font-bold tracking-[-0.015em] text-balance lg:text-3xl lg:leading-9"
							>
								{t('captcha_title')}
							</h2>
							<p id={`${headingId}-captcha-body`} className="mt-2 text-muted-foreground">
								{t('captcha_body')}
							</p>
						</>
					)}
					<div className={cn(interactive && 'mt-5 min-h-[65px]')}>{captcha.widget}</div>
				</div>
			)}
			<StepBars current={index + 1} total={steps.length} />
			{linked?.code && <LinkedPet code={linked.code} />}

			{inlinePicker && (
				<div className="mt-8 lg:mt-10">
					<LocationPicker
						mode={kind}
						value={values.location && { point: values.location }}
						suggested={suggested}
						onChange={pickPlace}
					/>
					{index > 0 && (
						<Button type="button" variant="text" className="mt-4 -ml-3" onClick={back}>
							{tc('back')}
						</Button>
					)}
				</div>
			)}

			{/* Never unmounted while the flow is open, so photo uploads go on behind the later steps. */}
			<form
				noValidate
				hidden={inlinePicker}
				onSubmit={(event) => {
					event.preventDefault();
					void (step === last ? publish() : next());
				}}
				onKeyDown={(event) => {
					// Enter on a choice row advances too (Radix radios ignore Enter, per WAI-ARIA).
					if (event.key !== 'Enter' || (event.target as HTMLElement).getAttribute('role') !== 'radio') return;
					event.preventDefault();
					event.currentTarget.requestSubmit();
				}}
			>
				<h1 key={sentence ? 'sentence' : step} id={headingId} className={cn(titleClass, 'mt-8 lg:mt-10')}>
					{titles[step]}
				</h1>
				{step === 'photo' && <p className="mt-3 text-lg leading-7">{t('photo_help')}</p>}
				{emptyPhotos && (
					<Line icon={TimerIcon} weight="bold" className="mt-6">
						{t('intro_note')}
					</Line>
				)}
				{step === 'extra' && <p className="mt-3 text-lg leading-7">{t('sighting_photo_help')}</p>}
				<div hidden={step !== photoStep}>
					<PhotoPicker
						ref={picker}
						draft={draftId}
						onChange={(next) => {
							setPhotos(next);
							// A swapped or removed photo is the finder's answer to a refused one.
							setRefusal((current) => (current?.field === 'photo' ? undefined : current));
						}}
						beforeUpload={session}
						onCropped={cropped}
						analytics={
							linked
								? { flow: 'report_sighting', step: 'extra' }
								: { flow: 'report_found', step: 'photo' }
						}
						firstNote={
							ai.notice && (
								<AiNotice
									notice={ai.notice}
									onChangePhoto={changePhoto}
									onCrop={cropFirst}
									onKeep={ai.dismissNotice}
								/>
							)
						}
						onExif={({ lat, lng, takenAt }) => {
							if (lat !== undefined && lng !== undefined) {
								const offered = offer({ lat, lng });
								setExif((prev) => prev ?? offered);
							}
							if (takenAt)
								setValues((prev) =>
									prev.takenAt && Date.parse(prev.takenAt) <= takenAt.getTime()
										? prev
										: { ...prev, takenAt: takenAt.toISOString() }
								);
						}}
						className="mt-6"
					/>
					{/* A photo the API refused (C5: not this session's, or gone): said here, under the photos. */}
					{refusal?.field === 'photo' && <FieldError className="mt-3">{tph('rejected')}</FieldError>}
					{step === 'extra' && <NoteField {...stepProps} sighting />}
				</div>
				{step === 'what' &&
					(sentence ? (
						<SentenceStep
							values={values}
							photos={photos}
							breed={values.breed_codes?.[0] ?? sentenceBreed(ai.result, values.species)}
						/>
					) : (
						<WhatStep
							{...stepProps}
							ai={ai}
							breed={
								breedAsk && {
									marked: breedAsk.marked,
									confidence: ai.result?.breed_codes?.confidence,
									onChange: (code) => {
										setBreedAsk({ marked: false });
										set({ breed_codes: code ? [code] : undefined });
									},
								}
							}
						/>
					))}
				{step === 'where' &&
					(where ? (
						<WhereRow source={where.source} address={address} onChange={() => setPicking(true)} />
					) : (
						<div className="mt-8">
							<p className="sr-only">{tc('loading')}</p>
							<Skeleton aria-hidden="true" className="h-[104px] w-full rounded-row" />
						</div>
					))}
				{step === 'situation' && (
					<SituationStep {...stepProps} account={account} collarHint={ai.hints.has('collar')} />
				)}
				{step === 'when' && <WhenStep {...stepProps} />}
				{step === 'send' && (
					<dl className="mt-8 grid gap-5">
						<SummaryRow label={t('summary_photo')} onEdit={() => edit('photo')}>
							{photos[0] && (
								// eslint-disable-next-line @next/next/no-img-element -- a local object URL
								<img
									src={photos[0].preview}
									alt={tph('thumb_alt', { n: 1, total: photos.length })}
									width={72}
									height={72}
									className={cn('mt-1 size-[72px] rounded-xl bg-muted', photoCrop)}
								/>
							)}
						</SummaryRow>
						<SummaryRow label={t('summary_animal')} onEdit={() => edit('what')}>
							{animal}
						</SummaryRow>
						<SummaryRow label={t('summary_place')} onEdit={() => edit('where')}>
							{address}
						</SummaryRow>
						<SummaryRow label={t('summary_situation')} onEdit={() => edit('situation')}>
							{t(values.situation === 'have' ? 'summary_with_me' : 'summary_not_with_me')}
						</SummaryRow>
					</dl>
				)}

				<div
					className={cn(
						'mt-10 grid gap-4 max-lg:sticky max-lg:bg-background max-lg:pt-4 max-lg:pb-11',
						// Above the captcha sheet while it is open (its height, kept by a ResizeObserver).
						interactive ? 'max-lg:bottom-[var(--captcha-sheet,0px)]' : 'max-lg:bottom-0'
					)}
				>
					{/* The AI slot (wireframe rule 1): checking on any step; on the manual step 2 the note or a notice
					    that came after the photo step. */}
					<AiSlot
						ai={ai}
						note={step === 'what' && !sentence ? 'continue' : undefined}
						notice={step === 'what' && !sentence}
						onChangePhoto={changePhoto}
						onCrop={cropFirst}
					/>
					{step === last && limit ? (
						<div id={noteId} role="alert" className={noteClass}>
							<HourglassMediumIcon weight="bold" aria-hidden="true" className={noteIconClass} />
							<p>{limit.text}</p>
						</div>
					) : step === last && failure ? (
						<div id={noteId} role="alert" className={noteClass}>
							<WarningCircleIcon
								weight="fill"
								aria-hidden="true"
								className={cn(noteIconClass, 'text-destructive')}
							/>
							<p>{failure}</p>
						</div>
					) : step === 'send' ? (
						<Line icon={ShieldCheckIcon}>{t('privacy_line')}</Line>
					) : null}
					{/* Publish waits for the check while it sends or while a photo still uploads (the session starts
					    with the first photo, TASK-17.9). */}
					<p aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
						{step === last && checking ? t('captcha_checking') : ''}
					</p>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
						{step === last ? (
							<Button
								type="submit"
								size="lg"
								loading={sending || uploading}
								disabled={Boolean(limit)}
								aria-describedby={limit ? noteId : undefined}
								className="flex-1 lg:flex-none"
							>
								{linked ? t('sighting_send') : sending ? t('publishing') : t('publish')}
							</Button>
						) : (
							// No photo yet: the tiles are the step's actions (P7 M1).
							!emptyPhotos && (
								<Button
									type="submit"
									size="lg"
									disabled={step === 'where' && !where}
									className={cn('flex-1 lg:flex-none', sentence && 'max-lg:basis-full')}
								>
									{sentence ? t('ai_yes') : tc('next')}
								</Button>
							)
						)}
						{sentence && (
							<Button type="button" variant="text" onClick={editSuggestion}>
								{t('ai_edit')}
							</Button>
						)}
						{index > 0 && (
							<Button type="button" variant="text" onClick={back}>
								{tc('back')}
							</Button>
						)}
					</div>
				</div>
			</form>

			{/* P5 E1 as a content dialog (P7 W): "Spremeni" on "Kje"; Confirm takes the place and goes on. */}
			{dialogLoaded && (
				<Dialog open={picking} onOpenChange={setPicking}>
					<DialogContent closeLabel={tc('close')} aria-describedby={undefined} className="max-w-[600px] p-7">
						<LocationPicker
							mode={kind}
							variant="dialog"
							value={values.location && { point: values.location }}
							suggested={suggested}
							onChange={pickPlace}
						/>
					</DialogContent>
				</Dialog>
			)}
		</main>
	);
}
