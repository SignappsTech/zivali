'use client';

import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { CatIcon } from '@phosphor-icons/react/dist/ssr/Cat';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { DogIcon } from '@phosphor-icons/react/dist/ssr/Dog';
import { GiftIcon } from '@phosphor-icons/react/dist/ssr/Gift';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { skipToken } from '@reduxjs/toolkit/query';
import { del, get, set } from 'idb-keyval';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { FormProvider, useController, useForm, useFormContext, useWatch } from 'react-hook-form';

import { type EventParams, getConsent, track } from '@zivali/analytics';
import { useRequireAuth } from '@zivali/api/auth';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { useListPetsQuery } from '@zivali/api/pets';
import { reportsApi, useCreateReportMutation, useUpdateReportMutation } from '@zivali/api/reports';
import type { QueryError } from '@zivali/api/rtk';
import { formatDate, type Locale } from '@zivali/i18n/format';
import type { Pet } from '@zivali/types';
import { LocationPicker } from '@/components/location/location-picker';
import type { LatLng } from '@/components/map/map-view';
import { PetFields } from '@/components/pets/pet-fields';
import { useErrorText } from '@/components/pets/pet-list';
import { PhotoPicker } from '@/components/photos/photo-picker';
import { clearPhotoDraft, type PickedPhoto } from '@/components/photos/use-photo-uploads';
import { noteClass } from '@/components/shelters/classes';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import {
	CIRCUMSTANCES_MAX,
	createBody,
	eventAt,
	formatTime,
	initialValues,
	isoDay,
	isOld,
	isoTime,
	type LostError,
	lostResolver,
	type LostValues,
	NEW_PET,
	NOTE_MAX,
	REWARD_MAX,
	reportFields,
	type Step,
	STEP_FIELDS,
	stepsFor,
	type When,
} from './lost-form';

/** The one lost-report draft of this browser; PhotoPicker keeps its photos under the same name. */
export const LOST_DRAFT = 'lost';
// C4 §Drafts: idb-keyval `draft:<kind>:<id>`. The location in it is the coarsened point (C6); EXIF never goes in.
const DRAFT_KEY = `draft:lost:${LOST_DRAFT}`;
type Draft = { step: Step; values: LostValues; at: number };

async function loadDraft(): Promise<Draft | undefined> {
	const draft = await get<Draft>(DRAFT_KEY).catch(() => undefined);
	return draft?.step && draft.values ? draft : undefined;
}
const saveDraft = (step: Step, values: LostValues) => set(DRAFT_KEY, { step, values, at: Date.now() } satisfies Draft);
const dropDraft = () => Promise.all([del(DRAFT_KEY).catch(() => {}), clearPhotoDraft(LOST_DRAFT)]);

const titleClass =
	'font-display text-[34px] leading-10 font-bold tracking-[-0.02em] text-balance outline-none lg:text-5xl lg:leading-[52px]';
const groupTitleClass = 'mt-10 mb-3 font-display text-xl font-semibold tracking-[-0.01em]';
const iconClass = 'mt-px size-[22px] shrink-0';

function Note({
	icon: Icon,
	children,
	className,
}: {
	icon: typeof InfoIcon;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn(noteClass, className)}>
			<Icon weight="bold" aria-hidden="true" className={iconClass} />
			<p>{children}</p>
		</div>
	);
}

/** One bar per step of the real path (P6: five or seven, plus the photos step while C5 keeps it for saved pets). */
function StepBars({ current, total }: { current: number; total: number }) {
	const t = useTranslations('report_lost');
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

function PetThumb({ pet }: { pet: Pet }) {
	const url = pet.photos[0]?.thumb_url;
	const Species = pet.species === 'cat' ? CatIcon : DogIcon;
	return url ? (
		// The row's title names the pet, so the photo is decorative here (alt text would say the name twice).
		// eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned thumbnail
		<img src={url} alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl bg-muted object-cover" />
	) : (
		<span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
			<Species weight="bold" aria-hidden="true" className="size-6" />
		</span>
	);
}

/** Step 1: a row per saved pet plus "Druga žival"; without saved pets only "Vnesi podatke". */
function PetStep({ pets, loading, labelledBy }: { pets: Pet[]; loading: boolean; labelledBy: string }) {
	const t = useTranslations('report_lost');
	const ta = useTranslations('attributes');
	const { field, fieldState } = useController<LostValues, 'pet'>({ name: 'pet' });
	return (
		<div className="mt-8 grid gap-3">
			<RadioGroup
				value={field.value ?? ''}
				onValueChange={field.onChange}
				aria-labelledby={labelledBy}
				aria-invalid={fieldState.error ? true : undefined}
				className="gap-3"
			>
				{pets.map((pet, index) => (
					<ChoiceRow
						key={pet.id}
						ref={index === 0 ? field.ref : undefined}
						value={pet.id}
						title={`${pet.name} · ${ta(`species.${pet.species}`)}`}
						icon={<PetThumb pet={pet} />}
					/>
				))}
				{loading && <Skeleton className="h-16 rounded-row" />}
				<ChoiceRow
					ref={pets.length ? undefined : field.ref}
					value={NEW_PET}
					title={t(pets.length ? 'pet_other' : 'pet_enter')}
					description={pets.length ? t('pet_other_desc') : undefined}
					icon={
						<span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground group-data-[state=checked]/row:text-secondary-foreground">
							<PlusIcon weight="bold" aria-hidden="true" className="size-6" />
						</span>
					}
				/>
			</RadioGroup>
			{fieldState.error && <FieldError>{t('pet_required')}</FieldError>}
		</div>
	);
}

const WHEN: readonly When[] = ['now', 'today', 'yesterday', 'other'];

/** Step 5: choice rows; Danes and Včeraj ask the time, Drugič the date and the time (native pickers, max today). */
function WhenStep({ labelledBy }: { labelledBy: string }) {
	const t = useTranslations('report_lost');
	const { getValues, setValue } = useFormContext<LostValues>();
	const when = useController<LostValues, 'when'>({ name: 'when' });
	const date = useController<LostValues, 'date'>({ name: 'date' });
	const time = useController<LostValues, 'time'>({ name: 'time' });
	const error = (message?: string) => (message ? t(message as LostError) : undefined);
	const now = new Date();

	const choose = (next: When) => {
		when.field.onChange(next);
		// Prefilled with now, so a choice is never left without a value to correct.
		if (next !== 'now' && !getValues('time')) setValue('time', isoTime(now));
		if (next === 'other' && !getValues('date')) setValue('date', isoDay(now));
	};
	const at = eventAt({ when: when.field.value, date: date.field.value, time: time.field.value });

	return (
		<div className="mt-6 grid gap-5">
			<RadioGroup
				value={when.field.value}
				onValueChange={(value) => choose(value as When)}
				aria-labelledby={labelledBy}
				className="gap-3"
			>
				{WHEN.map((option) => (
					<ChoiceRow key={option} value={option} title={t(`when_${option}`)} />
				))}
			</RadioGroup>
			{when.field.value !== 'now' && (
				<div className="flex flex-wrap gap-5">
					{when.field.value === 'other' && (
						<FormField
							label={t('when_date')}
							error={error(date.fieldState.error?.message)}
							className="min-w-40 flex-1"
						>
							<Input {...date.field} type="date" max={isoDay(now)} className="tabular-nums" />
						</FormField>
					)}
					<FormField label={t('when_time')} error={error(time.fieldState.error?.message)} className="w-36">
						<Input {...time.field} type="time" className="tabular-nums" />
					</FormField>
				</div>
			)}
			<div role="status">{isOld(at) && <Note icon={WarningIcon}>{t('when_old')}</Note>}</div>
		</div>
	);
}

/** Step 6: circumstances, contact preference and the display-only reward (brief v1.1: nothing is charged). */
function WhatStep({ hasPhone }: { hasPhone: boolean }) {
	const t = useTranslations('report_lost');
	const format = useFormatter();
	const { setValue } = useFormContext<LostValues>();
	const id = React.useId();
	const circumstances = useController<LostValues, 'circumstances'>({ name: 'circumstances' });
	const contact = useController<LostValues, 'contact_pref'>({ name: 'contact_pref' });
	const {
		field: { ref: rewardRef, ...reward },
		fieldState: rewardState,
	} = useController<LostValues, 'reward'>({ name: 'reward' });
	const eur = useController<LostValues, 'reward_eur'>({ name: 'reward_eur' });
	const note = useController<LostValues, 'reward_note'>({ name: 'reward_note' });
	const max = format.number(REWARD_MAX, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
	const error = (message?: string) => (message ? t(message as LostError, { max: CIRCUMSTANCES_MAX }) : undefined);

	const toggle = (on: boolean) => {
		reward.onChange(on);
		// Off: the fields go, and so do their values.
		if (!on) {
			setValue('reward_eur', '');
			setValue('reward_note', '');
		}
	};

	return (
		<div className="mt-8">
			<FormField
				label={t('circumstances_label')}
				hint={t('circumstances_help')}
				error={error(circumstances.fieldState.error?.message)}
			>
				<Textarea
					{...circumstances.field}
					value={circumstances.field.value ?? ''}
					rows={3}
					placeholder={t('circumstances_placeholder')}
					maxLength={CIRCUMSTANCES_MAX}
				/>
			</FormField>

			<h2 id={`${id}-contact`} className={groupTitleClass}>
				{t('contact_label')}
			</h2>
			<RadioGroup
				value={contact.field.value}
				onValueChange={contact.field.onChange}
				aria-labelledby={`${id}-contact`}
				className="gap-3"
			>
				<ChoiceRow
					value="chat_only"
					title={t('contact_chat')}
					description={t('contact_chat_desc')}
					icon={<ChatCircleIcon weight="bold" aria-hidden="true" />}
				/>
				<ChoiceRow
					value="chat_and_phone"
					title={t('contact_phone')}
					description={t('contact_phone_desc')}
					icon={<PhoneIcon weight="bold" aria-hidden="true" />}
				/>
			</RadioGroup>
			{contact.field.value === 'chat_and_phone' && !hasPhone && (
				<p className="mt-3 text-sm text-muted-foreground">{t('contact_phone_missing')}</p>
			)}

			<h2 className={groupTitleClass}>{t('reward_label')}</h2>
			{/* The whole row is the switch (system §10.3). */}
			<label className="flex min-h-16 cursor-pointer items-center gap-3.5 rounded-row bg-card py-3 pr-4 pl-5 text-control-lg font-bold hover:bg-[linear-gradient(hsl(var(--foreground)/0.1),hsl(var(--foreground)/0.1))]">
				<GiftIcon weight="bold" aria-hidden="true" className="size-6 shrink-0 text-primary" />
				<span className="min-w-0 flex-1">{t('reward_toggle')}</span>
				<Switch
					ref={rewardRef}
					checked={reward.value}
					onCheckedChange={toggle}
					aria-describedby={rewardState.error ? `${id}-reward-error` : undefined}
				/>
			</label>
			{rewardState.error && (
				<FieldError id={`${id}-reward-error`} className="mt-3">
					{t('reward_empty')}
				</FieldError>
			)}
			{reward.value && (
				<>
					<FormField
						label={t('reward_amount_label')}
						error={eur.fieldState.error && t(eur.fieldState.error.message as LostError, { max })}
						className="mt-6 max-w-[200px]"
					>
						<div className="relative">
							<Input
								{...eur.field}
								inputMode="numeric"
								autoComplete="off"
								className="pr-7 tabular-nums"
							/>
							<span
								aria-hidden="true"
								className="pointer-events-none absolute top-1/2 right-0.5 -translate-y-1/2 text-lg text-muted-foreground"
							>
								€
							</span>
						</div>
					</FormField>
					<FormField
						label={t('reward_note_label')}
						hint={t('reward_note_help')}
						error={error(note.fieldState.error?.message)}
						className="mt-6"
					>
						<Input
							{...note.field}
							placeholder={t('reward_note_placeholder')}
							maxLength={NOTE_MAX}
							autoComplete="off"
						/>
						<span
							aria-hidden="true"
							className="justify-self-end text-sm text-muted-foreground tabular-nums"
						>
							{`${note.field.value.length}/${NOTE_MAX}`}
						</span>
					</FormField>
					<Note icon={ShieldWarningIcon} className="mt-6">
						{t('reward_warning')}
					</Note>
				</>
			)}
		</div>
	);
}

/** A summary row: label (14 bold muted), value, "Uredi" named after the row. */
function Row({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
	const t = useTranslations('report_lost');
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
			<dt className="text-sm font-bold text-muted-foreground">{label}</dt>
			<dd className="col-start-1 mt-0.5 break-words">{children}</dd>
			<dd className="col-start-2 row-span-2 row-start-1 -mt-2 -mr-3">
				<Button
					type="button"
					variant="text"
					aria-label={t('review_edit_a11y', { field: label })}
					onClick={onEdit}
				>
					{t('review_edit')}
				</Button>
			</dd>
		</div>
	);
}

type ReviewProps = {
	photos: PickedPhoto[];
	pet?: Pet;
	edit: (step: Step) => void;
	duplicate?: string;
	update: boolean;
	onUpdateChange: (update: boolean) => void;
};

/**
 * Step 7: the plain summary list, each row with Uredi; on lg the photos sit on the right (W1). After a 409 the
 * duplicate choice comes first.
 */
function ReviewStep({ photos, pet, edit, duplicate, update, onUpdateChange }: ReviewProps) {
	const t = useTranslations('report_lost');
	const tl = useTranslations('location');
	const ta = useTranslations('attributes');
	const tp = useTranslations('photos');
	const format = useFormatter();
	const locale = useLocale() as Locale;
	const values = useWatch<LostValues>() as LostValues;
	const place = useReversePlaceQuery(values.location ?? skipToken);

	const species = pet?.species ?? values.species;
	const colours = (pet?.colours ?? values.colours ?? []).map((c, i) => {
		const label = ta(`colours.${c}`);
		return i ? label.toLocaleLowerCase(locale) : label;
	});
	const size = pet?.size ?? values.size;
	const looks = [species && ta(`species.${species}`), size && ta(`size.${size}`), colours.join(', ')]
		.filter(Boolean)
		.join(' · ');
	const name = pet?.name ?? values.name?.trim();

	const radius = values.radius_m ?? 0;
	const radiusText = tl('radius_value', {
		value: radius < 1000 ? `${radius} m` : `${format.number(radius / 1000, { maximumFractionDigits: 1 })} km`,
	});
	const at = eventAt(values);
	const time = at ? formatTime(at, locale) : '';
	const seen =
		values.when === 'now'
			? t('when_now')
			: values.when === 'other'
				? `${at ? formatDate(at, locale) : values.date}, ${time}`
				: `${t(values.when === 'today' ? 'when_today' : 'when_yesterday')}, ${time}`;
	const eur = values.reward ? values.reward_eur.trim() : '';
	const note = values.reward ? values.reward_note.trim() : '';

	return (
		<div className="mt-8 grid gap-8 lg:mt-10">
			{duplicate && (
				<div className="grid gap-5 lg:max-w-[560px]">
					<Note icon={InfoIcon}>{t('duplicate_title')}</Note>
					<RadioGroup
						value={update ? 'update' : 'new'}
						onValueChange={(value) => onUpdateChange(value === 'update')}
						aria-label={t('duplicate_title')}
						className="gap-3"
					>
						<ChoiceRow
							value="update"
							title={t('duplicate_update')}
							icon={<ArrowsClockwiseIcon weight="bold" aria-hidden="true" />}
						/>
						<ChoiceRow
							value="new"
							title={t('duplicate_new')}
							icon={<PlusIcon weight="bold" aria-hidden="true" />}
						/>
					</RadioGroup>
					{update && <p className="text-sm text-muted-foreground">{t('duplicate_replaces_photos')}</p>}
				</div>
			)}
			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
				{photos.length > 0 && (
					<dl className="lg:col-start-2 lg:row-start-1">
						<Row label={t('review_photos')} onEdit={() => edit('photos')}>
							<span className="mt-1 flex flex-wrap gap-2 lg:gap-3">
								{photos.map((photo, i) => (
									// eslint-disable-next-line @next/next/no-img-element -- local object URLs
									<img
										key={photo.key}
										src={photo.preview}
										alt={tp('thumb_alt', { n: i + 1, total: photos.length })}
										width={i ? 88 : 400}
										height={i ? 72 : 300}
										className={cn(
											'size-[72px] rounded-xl bg-muted object-cover',
											i
												? 'lg:h-[72px] lg:w-[88px] lg:rounded-lg'
												: 'lg:aspect-[4/3] lg:h-auto lg:w-full lg:rounded-[32px]'
										)}
									/>
								))}
							</span>
						</Row>
					</dl>
				)}
				<dl className="grid gap-5 lg:col-start-1 lg:row-start-1">
					<Row label={t('review_pet')} onEdit={() => edit(pet ? 'pet' : 'details')}>
						{name && <b className="block">{name}</b>}
						{looks}
					</Row>
					<Row label={t('review_place')} onEdit={() => edit('where')}>
						{`${place.currentData?.label ?? tl('address_unknown')} · `}
						<span className="tabular-nums">{radiusText}</span>
					</Row>
					<Row label={t('review_time')} onEdit={() => edit('when')}>
						<span className="tabular-nums">{seen}</span>
					</Row>
					{values.circumstances?.trim() && (
						<Row label={t('review_circumstances')} onEdit={() => edit('what')}>
							<span className="block max-w-[58ch]">{values.circumstances.trim()}</span>
						</Row>
					)}
					<Row label={t('review_contact')} onEdit={() => edit('what')}>
						{t(values.contact_pref === 'chat_and_phone' ? 'contact_phone' : 'contact_chat')}
					</Row>
					<Row label={t('review_reward')} onEdit={() => edit('what')}>
						{eur || note ? (
							<>
								{eur && (
									<b className="flex items-center gap-1.5 tabular-nums">
										<GiftIcon
											weight="bold"
											aria-hidden="true"
											className="size-[18px] text-primary"
										/>
										{format.number(Number(eur), {
											style: 'currency',
											currency: 'EUR',
											maximumFractionDigits: 0,
										})}
									</b>
								)}
								{note && <span className="block">{note}</span>}
							</>
						) : (
							t('review_reward_none')
						)}
					</Row>
				</dl>
			</div>
		</div>
	);
}

/** After publishing: the heading, the lede and what happens next (TASK-29.4 adds poster, shelter row and support). */
function Done({ name, verified }: { name?: string; verified: boolean }) {
	const t = useTranslations('report_lost');
	const id = React.useId();
	const steps = [
		[BellIcon, t('next_1')],
		[MagnifyingGlassIcon, t('next_2')],
		[ChatCircleIcon, t('next_3')],
	] as const;
	return (
		<>
			<h1 className={titleClass}>{t('done_title')}</h1>
			<p className="mt-3 text-lg leading-7">{name ? t('done_lede_named', { name }) : t('done_lede')}</p>
			{!verified && (
				<Note icon={InfoIcon} className="mt-6">
					{t('unverified_note')}
				</Note>
			)}
			<h2 id={id} className="mt-10 font-display text-2xl leading-[30px] font-bold tracking-[-0.015em]">
				{t('next_title')}
			</h2>
			<ul aria-labelledby={id} className="mt-4 grid gap-4">
				{steps.map(([Icon, text]) => (
					<li key={text} className="flex gap-3.5">
						<Icon weight="bold" aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
						{text}
					</li>
				))}
			</ul>
		</>
	);
}

/** report_lost_submit (C12) needs the region and municipality the API derived; fetched only with consent. */
function useTrackSubmit() {
	const [fetchReport] = reportsApi.endpoints.getReport.useLazyQuery();
	return (code: string) => {
		if (!getConsent()?.analytics) return;
		fetchReport({ code })
			.unwrap()
			.then((report) => {
				if (!report.region_slug || !report.municipality_slug) return;
				track('report_lost_submit', {
					report_type: 'lost',
					species: report.species,
					region: report.region_slug as EventParams['report_lost_submit']['region'],
					municipality: report.municipality_slug,
				});
			})
			.catch(() => {});
	};
}

/**
 * P6 report-lost flow on web (FR-005): one question per screen in the 560 px flow column, the step bars under the
 * header, Naprej and Nazaj at the bottom (Enter advances), focus on the heading at each step. A saved pet skips the
 * details. The draft is saved on every step (C4 §Drafts); publishing calls create_report (C4) once per submission
 * (one Idempotency-Key for the exact body, a new one after any edit), maps errors back to their fields with the input
 * kept, and offers to update the open search on DUPLICATE_OPEN_REPORT. A photo's EXIF place is only offered to the
 * LocationPicker, which coarsens what it hands back (C6). Signed-in owners only: the page shows signed-out visitors
 * the sign-in gate (TASK-29.4 adds the fill-first hand-off). No ad in the flow (C15).
 */
export function LostFlow({ initialPet }: { initialPet?: string }) {
	const t = useTranslations('report_lost');
	const errorText = useErrorText();
	const trackSubmit = useTrackSubmit();
	const { gate, me, isVerified } = useRequireAuth();
	const petList = useListPetsQuery(gate === 'ok' ? undefined : skipToken);
	const pets = React.useMemo(() => (petList.data?.items ?? []).filter((pet) => !pet.archived_at), [petList.data]);
	const petsLoading = gate === 'loading' || petList.isLoading;
	const [createReport] = useCreateReportMutation();
	const [updateReport] = useUpdateReportMutation();

	const form = useForm<LostValues>({ resolver: lostResolver, defaultValues: { ...initialValues, pet: initialPet } });
	const values = useWatch({ control: form.control }) as LostValues;
	const [step, setStep] = React.useState<Step>('pet');
	const steps = stepsFor(values.pet);
	const index = Math.max(0, steps.indexOf(step));
	// Errors show once Naprej was pressed on the step and then follow every change.
	const [attempted, setAttempted] = React.useState(false);
	const [toReview, setToReview] = React.useState(false);
	const [photos, setPhotos] = React.useState<PickedPhoto[]>([]);
	const [pickerKey, setPickerKey] = React.useState(0);
	// The photo's place stays in memory for the picker to offer; it is coarsened only if the user confirms it.
	const [exif, setExif] = React.useState<LatLng>();
	const [saved, setSaved] = React.useState(false);
	const [resume, setResume] = React.useState<Draft>();
	const [sending, setSending] = React.useState(false);
	const [sendError, setSendError] = React.useState<string>();
	const [duplicate, setDuplicate] = React.useState<string>();
	const [update, setUpdate] = React.useState(true);
	const [done, setDone] = React.useState<{ name?: string }>();
	// Stable across repeats of one submission (C1): key, exact body and its event_at. Cleared once the server has answered.
	const submission = React.useRef<{ key: string; body: string; at: Date } | null>(null);
	const root = React.useRef<HTMLElement>(null);
	const headingId = React.useId();
	const pet = pets.find((p) => p.id === values.pet);

	React.useEffect(() => track('report_lost_start'), []);

	React.useEffect(() => {
		let live = true;
		void loadDraft().then((draft) => live && draft && setResume(draft));
		return () => {
			live = false;
		};
	}, []);

	// Without saved pets "Vnesi podatke" is the only row, so it is chosen; a pet that is gone (archived, another
	// account's link) is not kept.
	React.useEffect(() => {
		if (petsLoading) return;
		const chosen = form.getValues('pet');
		if (chosen === NEW_PET || pets.some((p) => p.id === chosen)) return;
		if (chosen || !pets.length) form.setValue('pet', pets.length ? undefined : NEW_PET);
	}, [petsLoading, pets, values.pet, form]);

	React.useEffect(() => {
		const fields = STEP_FIELDS[step];
		if (attempted && fields.length) void form.trigger(fields);
	}, [attempted, step, values, form]);

	// Focus on the step's heading (the picker's own h1 on Kje), so a screen reader starts at the new question.
	const first = React.useRef(true);
	React.useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		const heading = root.current?.querySelector('h1');
		if (!heading) return;
		heading.tabIndex = -1;
		heading.focus();
	}, [step, done]);

	const go = (next: Step) => {
		setAttempted(false);
		setStep(next);
	};
	const advance = (next: Step = toReview ? 'review' : steps[index + 1]!) => {
		if (next === 'review') setToReview(false);
		go(next);
		saveDraft(next, form.getValues()).then(
			() => setSaved(true),
			() => {}
		);
	};
	const next = async () => {
		setAttempted(true);
		if (step === 'photos' && !photos.length) return;
		const fields = STEP_FIELDS[step];
		if (fields.length && !(await form.trigger(fields, { shouldFocus: true }))) return;
		advance();
	};
	const back = () => index > 0 && go(steps[index - 1]!);
	const edit = (target: Step) => {
		setToReview(true);
		go(target);
	};

	const failed = (error: unknown) => {
		const data = (error as Partial<QueryError> | null)?.data;
		if (data?.code !== 'NETWORK') submission.current = null;
		const paths = (data?.issues ?? []).map((issue) => issue.path);
		if (data?.code === 'DUPLICATE_OPEN_REPORT' && typeof data.details?.short_code === 'string') {
			setDuplicate(data.details.short_code);
			setUpdate(true);
			return;
		}
		// A rule the browser could not check (contact data in the note, clock skew): back to the field, input kept.
		if (data?.code === 'VALIDATION' && paths.includes('reward_note')) {
			const contactData = data.issues!.some(
				(issue) => issue.path === 'reward_note' && issue.message === 'CONTACT_DATA'
			);
			edit('what');
			form.setError('reward_note', {
				message: contactData ? 'reward_note_contact_data' : 'reward_note_too_long',
			});
			return;
		}
		if (data?.code === 'VALIDATION' && paths.includes('event_at') && values.when !== 'now') {
			edit('when');
			form.setError(values.when === 'other' ? 'date' : 'time', { message: 'when_future' });
			return;
		}
		setSendError(data?.code === 'NETWORK' ? t('send_failed') : errorText(error));
	};

	const uploading = photos.some((photo) => photo.status === 'uploading');
	const publish = async () => {
		setSendError(undefined);
		const photoIds = photos.flatMap((photo) =>
			photo.status === 'uploaded' && photo.photoId ? [photo.photoId] : []
		);
		if (!photos.length) return setSendError(t('photos_required'));
		if (!photoIds.length) return setSendError(t('photos_wait'));
		for (const s of steps) {
			const fields = STEP_FIELDS[s];
			if (fields.length && !(await form.trigger(fields))) {
				edit(s);
				return setAttempted(true);
			}
		}
		if (!values.location) return edit('where');
		const at = eventAt(values)!;
		setSending(true);
		try {
			let code: string;
			if (duplicate && update) {
				code = (await updateReport({ code: duplicate, body: reportFields(values, photoIds, at) }).unwrap())
					.short_code;
			} else {
				// A retry after NETWORK repeats key and body (event_at included); any edit is a new submission.
				const make = (when: Date) =>
					createBody(values, { photoIds, at: when, pet, inline: Boolean(duplicate) });
				const prev = submission.current;
				if (!prev || JSON.stringify(make(prev.at)) !== prev.body) {
					submission.current = { key: crypto.randomUUID(), body: JSON.stringify(make(at)), at };
				}
				const { key, body } = submission.current!;
				code = (await createReport({ body: JSON.parse(body), idempotencyKey: key }).unwrap()).short_code;
			}
			submission.current = null;
			trackSubmit(code);
			await dropDraft();
			setDone({ name: pet?.name ?? values.name?.trim() });
		} catch (error) {
			failed(error);
		} finally {
			setSending(false);
		}
	};

	const titles: Record<Exclude<Step, 'where'>, string> = {
		pet: t('pet_title'),
		photos: t('photos_title'),
		details: t('details_title'),
		when: t('when_title'),
		what: t('circumstances_title'),
		review: t('review_title'),
	};
	const errors = form.formState.errors;
	const summary = attempted && STEP_FIELDS[step].some((field) => errors[field]);

	return (
		<FormProvider {...form}>
			<main
				id="main"
				ref={root}
				className={cn(
					'mx-auto box-content max-w-[560px] px-5 pt-6 pb-16 lg:pt-8 lg:pb-24',
					step === 'review' && !done && 'lg:max-w-[960px]'
				)}
			>
				{done ? (
					<Done name={done.name} verified={isVerified} />
				) : (
					<>
						<StepBars current={index + 1} total={steps.length} />

						{step === 'where' && (
							<div className="mt-8 lg:mt-10">
								<LocationPicker
									mode="lost"
									value={values.location && { point: values.location, radiusM: values.radius_m }}
									suggested={exif && { ...exif, source: 'exif' }}
									onChange={({ point, radiusM }) => {
										form.setValue('location', point);
										form.setValue('radius_m', radiusM);
										advance();
									}}
								/>
								<Button type="button" variant="text" className="mt-4 -ml-3" onClick={back}>
									{t('back')}
								</Button>
							</div>
						)}

						{/* Never unmounted while the flow is open, so photo uploads go on behind the later steps. */}
						<form
							noValidate
							hidden={step === 'where'}
							onSubmit={(event) => {
								event.preventDefault();
								void (step === 'review' ? publish() : next());
							}}
							onKeyDown={(event) => {
								// Enter on a choice row advances too (Radix radios ignore Enter, per WAI-ARIA).
								if (
									event.key !== 'Enter' ||
									(event.target as HTMLElement).getAttribute('role') !== 'radio'
								)
									return;
								event.preventDefault();
								event.currentTarget.requestSubmit();
							}}
						>
							{step !== 'where' && (
								<h1 key={step} id={headingId} className={cn(titleClass, 'mt-8 lg:mt-10')}>
									{titles[step]}
								</h1>
							)}
							{summary && <FieldError className="mt-6">{t('validation_summary')}</FieldError>}
							{step === 'pet' && <PetStep pets={pets} loading={petsLoading} labelledBy={headingId} />}
							<div hidden={step !== 'photos'}>
								<p className="mt-3 text-lg leading-7">{t('photos_help')}</p>
								<PhotoPicker
									key={pickerKey}
									draft={LOST_DRAFT}
									onChange={setPhotos}
									onExif={({ lat, lng }) =>
										lat !== undefined && lng !== undefined && setExif({ lat, lng })
									}
									className="mt-6"
								/>
								{attempted && step === 'photos' && !photos.length && (
									<FieldError className="mt-4">{t('photos_required')}</FieldError>
								)}
							</div>
							{step === 'details' && (
								<PetFields
									variant="report"
									colourError={errors.colours && t('colour_required')}
									className="mt-8"
								/>
							)}
							{step === 'when' && <WhenStep labelledBy={headingId} />}
							{step === 'what' && <WhatStep hasPhone={Boolean(me?.phone)} />}
							{step === 'review' && (
								<ReviewStep
									photos={photos}
									pet={pet}
									edit={edit}
									duplicate={duplicate}
									update={update}
									onUpdateChange={setUpdate}
								/>
							)}

							<div
								className={cn(
									'mt-10 grid gap-4 max-lg:sticky max-lg:bottom-0 max-lg:bg-background max-lg:pt-4 max-lg:pb-11',
									step === 'review' && 'lg:max-w-[calc(100%-448px)]'
								)}
							>
								{step === 'review' && (
									<p className="flex gap-2 text-sm text-muted-foreground">
										<BellIcon
											weight="bold"
											aria-hidden="true"
											className="mt-0.5 size-4 shrink-0 text-primary"
										/>
										{t('review_note')}
									</p>
								)}
								{step === 'review' && sendError && (
									<div role="alert" className={noteClass}>
										<WarningCircleIcon
											weight="fill"
											aria-hidden="true"
											className={cn(iconClass, 'text-destructive')}
										/>
										<p>{sendError}</p>
									</div>
								)}
								{saved && step !== 'review' && (
									<p
										role="status"
										className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground lg:justify-start"
									>
										<CheckCircleIcon
											weight="bold"
											aria-hidden="true"
											className="size-4 text-primary"
										/>
										{t('draft_saved')}
									</p>
								)}
								<div className="flex items-center gap-4">
									<Button
										type="submit"
										size="lg"
										loading={step === 'review' && (sending || uploading)}
										className="flex-1 lg:flex-none"
									>
										{step !== 'review' ? t('next') : sending ? t('publishing') : t('publish')}
									</Button>
									{index > 0 && (
										<Button type="button" variant="text" onClick={back}>
											{t('back')}
										</Button>
									)}
								</div>
							</div>
						</form>
					</>
				)}
			</main>

			<ResumeDialog
				draft={resume}
				onContinue={(draft) => {
					form.reset({ ...initialValues, ...draft.values });
					setSaved(true);
					go(draft.step);
				}}
				onDiscard={() => {
					void dropDraft().then(() => setPickerKey((key) => key + 1));
				}}
				onClose={() => setResume(undefined)}
			/>
		</FormProvider>
	);
}

/** "Nadaljujete prijavo?" when a draft from an earlier visit exists; closing it keeps the draft as it is. */
function ResumeDialog({
	draft,
	onContinue,
	onDiscard,
	onClose,
}: {
	draft?: Draft;
	onContinue: (draft: Draft) => void;
	onDiscard: () => void;
	onClose: () => void;
}) {
	const t = useTranslations('report_lost');
	const locale = useLocale() as Locale;
	return (
		<AlertDialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
			{/* Focus goes to the restored step's heading, not back to where it was before the dialog. */}
			<AlertDialogContent onCloseAutoFocus={(event) => event.preventDefault()}>
				<AlertDialogTitle>{t('resume_title')}</AlertDialogTitle>
				<AlertDialogDescription>
					{t('resume_body', { date: draft ? formatDate(draft.at, locale) : '' })}
				</AlertDialogDescription>
				<AlertDialogFooter>
					<AlertDialogAction variant="default" onClick={() => draft && onContinue(draft)}>
						{t('resume_continue')}
					</AlertDialogAction>
					<Button
						variant="text"
						onClick={() => {
							onDiscard();
							onClose();
						}}
					>
						{t('resume_discard')}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
