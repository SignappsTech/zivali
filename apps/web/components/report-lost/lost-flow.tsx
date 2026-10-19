'use client';

import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { CatIcon } from '@phosphor-icons/react/dist/ssr/Cat';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { DogIcon } from '@phosphor-icons/react/dist/ssr/Dog';
import { GiftIcon } from '@phosphor-icons/react/dist/ssr/Gift';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { skipToken } from '@reduxjs/toolkit/query';
import { del, get, set } from 'idb-keyval';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
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
import { AiNotice, AiSlot } from '@/components/ai/ai-parts';
import { type AiField, PET_AI_FIELDS } from '@/components/ai/prefill';
import { useFormPrefill } from '@/components/ai/use-prefill';
import { useErrorText } from '@/components/auth/error-text';
import { AuthGate } from '@/components/auth/gate';
import type { LatLng } from '@/components/map/map-view';
import { PhotoPicker, type PhotoPickerHandle } from '@/components/photos/photo-picker';
import { clearPhotoDraft, MAX_PHOTOS, type PickedPhoto } from '@/components/photos/use-photo-uploads';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ChoiceButton, ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { photoCrop, photoCropThenWhole } from '@/lib/photo';
import { cn, focusHeading } from '@/lib/utils';

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
	lostResolverAt,
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

// Only the first steps load with the page (TASK-112 script budget): the details (PetFields, its enums and breeds), the
// picker (MapView), the resume question (AlertDialog) and the confirmation (share, poster, P15) load when shown. Each
// has its own Suspense (a loading skeleton, or ssr: false for the dialog), so a load never suspends to the page's and
// blanks it. AuthGate stays static: it loads its dialog lazily, and a lazy gate on top would make a signed-out Publish
// wait for two chunks.
const PetFields = dynamic(() => import('@/components/pets/pet-fields').then((m) => m.PetFields), {
	loading: () => <Skeleton className="mt-8 h-[360px] w-full rounded-card" />,
});
const LocationPicker = dynamic(() => import('@/components/location/location-picker').then((m) => m.LocationPicker), {
	loading: () => <Skeleton className="h-[360px] w-full rounded-card" />,
});
const ResumeDialog = dynamic(() => import('./resume-dialog').then((m) => m.ResumeDialog), { ssr: false });
const LostDone = dynamic(() => import('./lost-done').then((m) => m.LostDone), {
	loading: () => <Skeleton className="h-[800px] w-full rounded-card" />,
});

/** The one lost-report draft of this browser; PhotoPicker keeps its photos under the same name. */
export const LOST_DRAFT = 'lost';
// C4 §Drafts: idb-keyval `draft:<kind>:<id>`. The location in it is the coarsened point (C6); EXIF never goes in.
const DRAFT_KEY = `draft:lost:${LOST_DRAFT}`;
/**
 * `handoff`: Publish was pressed signed out, at `at`, with `nonce` carried through the sign-in round trip as
 * `?handoff=`. Back signed in within HANDOFF_MS with the same nonce in the URL, the draft publishes itself (C3); any
 * other visit (another account on a shared device, a reload) asks first.
 */
type Handoff = { at: number; nonce: string };
type Draft = { step: Step; values: LostValues; at: number; handoff?: Handoff };
const HANDOFF_PARAM = 'handoff';
/** Adds (or, without a nonce, strips) the hand-off mark in the address bar, so the gate's `next` carries it. */
function markUrl(nonce?: string) {
	const url = new URL(window.location.href);
	if (nonce) url.searchParams.set(HANDOFF_PARAM, nonce);
	else if (url.searchParams.has(HANDOFF_PARAM)) url.searchParams.delete(HANDOFF_PARAM);
	else return;
	window.history.replaceState(null, '', url);
}
const HANDOFF_MS = 24 * 60 * 60 * 1000;

async function loadDraft(): Promise<Draft | undefined> {
	const draft = await get<Draft>(DRAFT_KEY).catch(() => undefined);
	return draft?.step && draft.values ? draft : undefined;
}
const saveDraft = (step: Step, values: LostValues, handoff?: Handoff) =>
	set(DRAFT_KEY, { step, values, at: Date.now(), handoff } satisfies Draft);
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
		<img
			src={url}
			alt=""
			width={48}
			height={48}
			className={cn('size-12 shrink-0 rounded-xl bg-muted', photoCrop)}
		/>
	) : (
		<span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
			<Species weight="bold" aria-hidden="true" className="size-6" />
		</span>
	);
}

/**
 * Step 1, only with saved pets: a row per saved pet plus "Druga žival". One press chooses and moves on (buttons, so
 * arrow keys never advance); the choice is marked when the owner comes back.
 */
function PetStep({ pets, labelledBy, onChoose }: { pets: Pet[]; labelledBy: string; onChoose: (pet: string) => void }) {
	const t = useTranslations('report_lost');
	const ta = useTranslations('attributes');
	const { field, fieldState } = useController<LostValues, 'pet'>({ name: 'pet' });
	const errorId = React.useId();
	return (
		<div className="mt-8 grid gap-3">
			<div
				role="group"
				aria-labelledby={labelledBy}
				aria-describedby={fieldState.error ? errorId : undefined}
				className="grid gap-3"
			>
				{pets.map((pet) => (
					<ChoiceButton
						key={pet.id}
						current={field.value === pet.id}
						title={`${pet.name} · ${ta(`species.${pet.species}`)}`}
						icon={<PetThumb pet={pet} />}
						onClick={() => onChoose(pet.id)}
					/>
				))}
				<ChoiceButton
					current={field.value === NEW_PET}
					title={t('pet_other')}
					description={t('pet_other_desc')}
					icon={
						<span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground group-data-[state=checked]/row:text-secondary-foreground">
							<PlusIcon weight="bold" aria-hidden="true" className="size-6" />
						</span>
					}
					onClick={() => onChoose(NEW_PET)}
				/>
			</div>
			{fieldState.error && <FieldError id={errorId}>{t('pet_required')}</FieldError>}
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
	/** Details still marked as AI suggestions: the "Predlog: …" line on the pet row (wireframe F7). */
	suggested: readonly AiField[];
};

/**
 * Step 7: the plain summary list, each row with Uredi; on lg the photos sit on the right (W1). After a 409 the
 * duplicate choice comes first.
 */
function ReviewStep({ photos, pet, edit, duplicate, update, onUpdateChange, suggested }: ReviewProps) {
	const t = useTranslations('report_lost');
	const tl = useTranslations('location');
	const ta = useTranslations('attributes');
	const tp = useTranslations('photos');
	const tai = useTranslations('ai_prefill');
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
											'size-[72px] rounded-xl bg-muted',
											i ? photoCrop : photoCropThenWhole,
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
						{suggested.length > 0 && (
							<span className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
								<SparkleIcon
									weight="fill"
									aria-hidden="true"
									className="mt-0.5 size-4 shrink-0 text-primary"
								/>
								{tai('review_row', {
									fields: suggested
										.flatMap((field) => (field === 'collar' ? [] : [tai(`fields.${field}`)]))
										.join(', '),
								})}
							</span>
						)}
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
 * header, Naprej and Nazaj at the bottom (Enter advances), focus on the heading at each step. The pet step asks only
 * when there are saved pets (one press on a row moves on), and a saved pet skips the details. The draft is saved on
 * every step (C4 §Drafts); publishing calls create_report (C4) once per submission (one Idempotency-Key for the exact body, a new one after any edit), maps errors back to their fields with the input
 * kept, and offers to update the open search on DUPLICATE_OPEN_REPORT. A photo's EXIF place is only offered to the
 * LocationPicker, which coarsens what it hands back (C6). A signed-out visitor fills every step (the photos wait in
 * this browser); Publish then asks for an account (P16 dialog) and the draft hand-off (C3) publishes it once they are
 * back signed in, nothing sent before. The confirmation is LostDone. No ad in the flow (C15).
 */
export function LostFlow({
	initialPet,
	signedIn,
	payments = true,
	testMode = false,
}: {
	initialPet?: string;
	signedIn: boolean;
	/** Payments off (the page's paymentsEnabled()): no P15 contribution row on the confirmation. */
	payments?: boolean;
	/** Outside production (APP_ENV): the P15 test-payment note on the confirmation. */
	testMode?: boolean;
}) {
	const t = useTranslations('report_lost');
	const errorText = useErrorText();
	const tErrors = useTranslations('errors');
	const tPhotos = useTranslations('photos');
	const tCommon = useTranslations('common');
	const trackSubmit = useTrackSubmit();
	const auth = useRequireAuth();
	const { me, isVerified } = auth;
	// The page read the session cookie: signed out, supabase-js loads only with the gate (TASK-90.5), so until then
	// the session never resolves and this is a visitor.
	const gate = !signedIn && auth.gate === 'loading' ? 'signin' : auth.gate;
	const petList = useListPetsQuery(gate === 'ok' ? undefined : skipToken);
	const pets = React.useMemo(() => (petList.data?.items ?? []).filter((pet) => !pet.archived_at), [petList.data]);
	const petsLoading = gate === 'loading' || petList.isLoading;
	const [createReport] = useCreateReportMutation();
	const [updateReport] = useUpdateReportMutation();

	// When Publish was pressed before the sign-in round trip: "Pravkar" means then, not after the detour.
	const handoffAt = React.useRef<number>(undefined);
	// "Danes" at 23:50 is not in the future for a Publish pressed at 23:55, even if the way back crosses midnight.
	const form = useForm<LostValues>({
		resolver: lostResolverAt(() => handoffAt.current ?? Date.now()),
		defaultValues: { ...initialValues, pet: initialPet },
	});
	const values = useWatch({ control: form.control }) as LostValues;
	const [chosen, setStep] = React.useState<Step>();
	// Without saved pets (or signed out) there is nothing to choose: the flow starts at the photos. Until the list is
	// in, the first step is not known (`starting`: a placeholder, so no question shows that then goes away).
	const hasPets = pets.length > 0;
	const step = chosen ?? (hasPets || petsLoading ? 'pet' : 'photos');
	const starting = !chosen && !hasPets && petsLoading;
	const steps = stepsFor(values.pet, hasPets);
	const index = Math.max(0, steps.indexOf(step));
	// Errors show once Naprej was pressed on the step and then follow every change.
	const [attempted, setAttempted] = React.useState(false);
	const [toReview, setToReview] = React.useState(false);
	const [photos, setPhotos] = React.useState<PickedPhoto[]>([]);
	const [pickerKey, setPickerKey] = React.useState(0);
	const picker = React.useRef<PhotoPickerHandle>(null);
	// C19 on the new-pet path only (a saved pet's details come from the pet): the first photo's suggestions fill
	// the empty details with marks; "Objavi iskanje" confirms them.
	const newPet = !hasPets || !values.pet || values.pet === NEW_PET;
	const ai = useFormPrefill(() => form, photos, { fields: PET_AI_FIELDS, enabled: newPet });
	const changePhoto = () => picker.current?.replaceFirst();
	// From the details step's note the picker is hidden, and so is the note once the copy is checked: focus goes to the
	// heading.
	const cropFirst = () => picker.current?.cropFirst(() => focusHeading(root.current));
	// The photo's place stays in memory for the picker to offer; it is coarsened only if the user confirms it.
	const [exif, setExif] = React.useState<LatLng>();
	const [saved, setSaved] = React.useState(false);
	const [resume, setResume] = React.useState<Draft>();
	// The resume question loads when first asked and then stays mounted, so it can animate out.
	const [resumeLoaded, setResumeLoaded] = React.useState(false);
	if (resume && !resumeLoaded) setResumeLoaded(true);
	const [sending, setSending] = React.useState(false);
	const [sendError, setSendError] = React.useState<string>();
	// The API refused photo_ids: shown on the photo step until the next Publish.
	const [photoError, setPhotoError] = React.useState<string>();
	const [found, setFound] = React.useState<{ code: string; pet?: string }>();
	const [update, setUpdate] = React.useState(true);
	const [done, setDone] = React.useState<{ code: string; name?: string; species: Pet['species']; point: LatLng }>();
	const [gateOpen, setGateOpen] = React.useState(false);
	// Publish was pressed signed out: it goes on once signed in and the photos are up.
	const [awaiting, setAwaiting] = React.useState(false);
	// The draft read on mount, until the session says whether it continues a hand-off or asks to resume.
	const [stored, setStored] = React.useState<Draft>();
	// Stable across repeats of one submission (C1): key, exact body and its event_at. Cleared once the server has answered.
	const submission = React.useRef<{ key: string; body: string; when: LostValues['when']; at: Date } | null>(null);
	const busy = React.useRef(false);
	const root = React.useRef<HTMLElement>(null);
	const headingId = React.useId();
	const pet = pets.find((p) => p.id === values.pet);
	// The open search found by a 409 belongs to the pet it was found for; another choice is a fresh question.
	const duplicate = found && found.pet === values.pet ? found.code : undefined;

	React.useEffect(() => track('report_lost_start'), []);

	React.useEffect(() => {
		let live = true;
		void loadDraft().then((draft) => {
			if (!live || !draft) return;
			// The resume question's chunk comes down while the session settles.
			void import('./resume-dialog').catch(() => {});
			setStored(draft);
		});
		return () => {
			live = false;
		};
	}, []);

	// Back from sign-in or sign-up with a pressed Publish (C3 hand-off): restored at the review, it publishes itself.
	// Any other draft asks first.
	const settle = React.useEffectEvent((draft: Draft) => {
		setStored(undefined);
		const nonce = new URLSearchParams(window.location.search).get(HANDOFF_PARAM);
		markUrl();
		const { handoff } = draft;
		if (gate === 'ok' && handoff?.nonce && handoff.nonce === nonce && Date.now() - handoff.at < HANDOFF_MS) {
			handoffAt.current = handoff.at;
			restore(draft);
			// Consumed: a reload, or a retry after a lost answer, stays manual.
			void saveDraft(draft.step, draft.values).catch(() => {});
			setAwaiting(true);
		} else setResume(draft);
	});
	React.useEffect(() => {
		if (!stored || gate === 'loading') return;
		// On the next tick, so the restore is not a state update inside this commit.
		const timer = setTimeout(() => settle(stored));
		return () => clearTimeout(timer);
	}, [stored, gate]);

	// Without saved pets the details are entered in the flow; a pet that is gone (archived, another account's link)
	// is not kept.
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

	// Focus on the step's heading (the picker's own h1 on Kje), so a screen reader starts at the new question. Only on
	// a move (not when the first step settles on load).
	const first = React.useRef(true);
	React.useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		return focusHeading(root.current);
	}, [chosen, done]);

	const go = (next: Step) => {
		setAttempted(false);
		// Leaving the review stops a waiting publish; the owner publishes again from there.
		setAwaiting(false);
		setStep(next);
	};
	const advance = (next: Step = toReview ? 'review' : steps[index + 1]!) => {
		// Any later edit is a new "now".
		handoffAt.current = undefined;
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
	const restore = (draft: Draft) => {
		form.reset({ ...initialValues, ...draft.values });
		setSaved(true);
		go(draft.step);
	};
	const choose = (id: string) => {
		form.setValue('pet', id);
		advance();
	};
	const back = () => index > 0 && go(steps[index - 1]!);
	const edit = (target: Step) => {
		setToReview(true);
		go(target);
	};

	const failed = (error: unknown) => {
		const data = (error as Partial<QueryError> | null)?.data;
		// The API stores no 5xx/429 answer, so the same key may repeat safely (createReport dedupes on it); only a
		// definitive refusal ends the submission.
		const status = (error as Partial<QueryError> | null)?.status;
		// CONFLICT: the same key is still being processed (C1), so its answer is still to come under that key.
		const retriable =
			data?.code === 'NETWORK' ||
			data?.code === 'RATE_LIMITED' ||
			data?.code === 'CONFLICT' ||
			(typeof status === 'number' && status >= 500);
		if (!retriable) submission.current = null;
		const paths = (data?.issues ?? []).map((issue) => issue.path);
		if (data?.code === 'DUPLICATE_OPEN_REPORT' && typeof data.details?.short_code === 'string') {
			setFound({ code: data.details.short_code, pet: values.pet });
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
		if (data?.code === 'VALIDATION') {
			// Other paths go to their step; a bare "check the marked fields" would point at nothing.
			const roots = paths.map((path) => path.split(/[.[]/)[0]!);
			if (roots.includes('photo_ids')) {
				// Said on the photo step, never a silent jump (TASK-114.5): over the limit, or a photo the API refused.
				setPhotoError(photos.length > MAX_PHOTOS ? tPhotos('limit') : tPhotos('rejected'));
				return edit('photos');
			}
			const target =
				roots.includes('location') || roots.includes('radius_m')
					? 'where'
					: steps.find((s) => STEP_FIELDS[s].some((field) => roots.includes(field)));
			if (target) return edit(target);
		}
		if (data?.code === 'RATE_LIMITED' && typeof data.details?.retry_after_s === 'number') {
			return setSendError(
				tErrors('RATE_LIMITED', { minutes: Math.max(1, Math.ceil(data.details.retry_after_s / 60)) })
			);
		}
		setSendError(data?.code === 'NETWORK' ? t('send_failed') : errorText(error));
	};

	const uploading = photos.some((photo) => photo.status === 'uploading');
	const publish = async () => {
		setAwaiting(false);
		if (busy.current || uploading) return;
		busy.current = true;
		let sent = false;
		try {
			sent = await send();
		} finally {
			// Once sent the guard stays closed: a press before the confirmation shows would be a new submission with a
			// new key, so a second report.
			if (!sent) busy.current = false;
		}
	};
	/** true once the report is created or updated. */
	const send = async (): Promise<boolean> => {
		setSendError(undefined);
		setPhotoError(undefined);
		const photoIds = photos.flatMap((photo) =>
			photo.status === 'uploaded' && photo.photoId ? [photo.photoId] : []
		);
		const notSent = (show: () => void) => {
			show();
			return false;
		};
		if (!photos.length) return notSent(() => setSendError(t('photos_required')));
		if (photos.some((photo) => photo.status === 'failed')) return notSent(() => edit('photos'));
		const signedOut = gate === 'signin';
		// Signed out, the photos wait in this browser; they upload after sign-in (C3: nothing is sent before).
		if (!photoIds.length && !signedOut) return notSent(() => setSendError(t('photos_wait')));
		for (const s of steps) {
			const fields = STEP_FIELDS[s];
			if (fields.length && !(await form.trigger(fields))) {
				edit(s);
				return notSent(() => setAttempted(true));
			}
		}
		if (!values.location) return notSent(() => edit('where'));
		if (signedOut) {
			// Marked, so the way back from sign-in or sign-up publishes it.
			const handoff = { at: Date.now(), nonce: crypto.randomUUID() };
			await saveDraft('review', form.getValues(), handoff).catch(() => {});
			handoffAt.current = handoff.at;
			// The gate's `next` is this address: the nonce rides through the sign-in round trip.
			markUrl(handoff.nonce);
			return notSent(() => setGateOpen(true));
		}
		// "Pravkar", "Danes" and "Včeraj" mean the day Publish was pressed, not after the sign-in detour.
		const at = eventAt(values, handoffAt.current ?? Date.now())!;
		// The confirmation's chunk comes down while the report is sent.
		void import('./lost-done').catch(() => {});
		setSending(true);
		try {
			let code: string;
			if (duplicate && update) {
				code = (await updateReport({ code: duplicate, body: reportFields(values, photoIds, at) }).unwrap())
					.short_code;
			} else {
				// A retry after NETWORK repeats key and body (event_at included); any edit is a new submission.
				const prev = submission.current;
				// "Now" is stamped once per submission; a changed time or date is an edit.
				const sameNow = prev?.when === 'now' && values.when === 'now';
				const when = sameNow ? prev.at : at;
				const next = JSON.stringify(
					createBody(values, { photoIds, at: when, pet, inline: Boolean(duplicate) })
				);
				if (!prev || next !== prev.body) {
					submission.current = { key: crypto.randomUUID(), body: next, when: values.when, at: when };
				}
				const { key, body } = submission.current!;
				code = (await createReport({ body: JSON.parse(body), idempotencyKey: key }).unwrap()).short_code;
			}
			submission.current = null;
			if (!(duplicate && update)) trackSubmit(code);
			await dropDraft();
			setDone({
				code,
				name: pet?.name ?? values.name?.trim(),
				species: (pet?.species ?? values.species)!,
				point: values.location,
			});
			return true;
		} catch (error) {
			failed(error);
			return false;
		} finally {
			setSending(false);
		}
	};

	// The photos restored from this browser upload first (signed in, the picker no longer holds them).
	const held = photos.some((photo) => photo.status === 'kept' || photo.status === 'uploading');
	const publishNow = React.useEffectEvent(() => void publish());
	React.useEffect(() => {
		if (!awaiting || gate !== 'ok' || !photos.length || held) return;
		// On the next tick, as above; dropped if anything changes first.
		const timer = setTimeout(publishNow);
		return () => clearTimeout(timer);
	}, [awaiting, gate, photos.length, held]);
	// No photos came back (storage cleared): the button stays usable and says why on a press.
	const waiting = awaiting && photos.length > 0;
	// The gate calls onReady for verified accounts only, but an unconfirmed owner publishes too (P6): signed in with the
	// gate still open (the other tab, a sign-in without leaving the page), it closes and Publish goes on.
	React.useEffect(() => {
		if (!gateOpen || gate !== 'ok') return;
		// On the next tick, as above.
		const timer = setTimeout(() => {
			markUrl();
			setGateOpen(false);
			setAwaiting(true);
		});
		return () => clearTimeout(timer);
	}, [gateOpen, gate]);

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
					<LostDone
						{...done}
						unverified={Boolean(me) && !isVerified}
						titleClass={titleClass}
						payments={payments}
						testMode={testMode}
					/>
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
							{starting ? (
								<div className="mt-8 grid gap-3 lg:mt-10">
									<p role="status" className="sr-only">
										{tCommon('loading')}
									</p>
									<Skeleton className="mb-5 h-10 w-3/4 lg:h-[52px]" />
									<Skeleton className="h-16 rounded-row" />
									<Skeleton className="h-16 rounded-row" />
								</div>
							) : (
								step !== 'where' && (
									<h1 key={step} id={headingId} className={cn(titleClass, 'mt-8 lg:mt-10')}>
										{titles[step]}
									</h1>
								)
							)}
							{summary && <FieldError className="mt-6">{t('validation_summary')}</FieldError>}
							{step === 'pet' && !starting && (
								<PetStep pets={pets} labelledBy={headingId} onChoose={choose} />
							)}
							<div hidden={step !== 'photos'}>
								<p className="mt-3 text-lg leading-7">{t('photos_help')}</p>
								{/* A saved pet's photos come first (C5: they go on the report too); another pet re-seeds them. */}
								<PhotoPicker
									key={`${pickerKey}:${pet?.id ?? ''}`}
									ref={picker}
									draft={LOST_DRAFT}
									saved={pet?.photos}
									onChange={setPhotos}
									onExif={({ lat, lng }) =>
										lat !== undefined && lng !== undefined && setExif({ lat, lng })
									}
									hold={gate === 'signin' || gate === 'loading'}
									onCropped={(index) => index === 0 && ai.recheck()}
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
									className="mt-6"
								/>
								{step === 'photos' && photos.some((photo) => photo.status === 'failed') && (
									<FieldError className="mt-4">{t('photos_failed')}</FieldError>
								)}
								{step === 'photos' && photoError && (
									<FieldError className="mt-4">{photoError}</FieldError>
								)}
								{attempted && step === 'photos' && !photos.length && (
									<FieldError className="mt-4">{t('photos_required')}</FieldError>
								)}
							</div>
							{step === 'details' && (
								<PetFields
									variant="report"
									colourError={errors.colours && t('colour_required')}
									ai={ai}
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
									suggested={newPet ? PET_AI_FIELDS.filter((field) => ai.marks.has(field)) : []}
								/>
							)}

							{/* The pet step moves on with its rows: no Naprej (and, as the first step, no Nazaj). */}
							<div
								hidden={step === 'pet'}
								className={cn(
									'mt-10 grid gap-4 max-lg:sticky max-lg:bottom-0 max-lg:bg-background max-lg:pt-4 max-lg:pb-11',
									step === 'review' && 'lg:max-w-[calc(100%-448px)]'
								)}
							>
								{/* The AI slot (wireframe rule 1): checking on any step, the note on the details and on the
								    review (the check before publishing) of a new pet, a late notice on the details. */}
								<AiSlot
									ai={ai}
									note={
										newPet && step === 'details'
											? 'continue'
											: newPet && step === 'review'
												? 'publish'
												: undefined
									}
									notice={step === 'details'}
									onChangePhoto={changePhoto}
									onCrop={cropFirst}
								/>
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
										loading={step === 'review' && (sending || uploading || waiting)}
										className="flex-1 lg:flex-none"
									>
										{step !== 'review'
											? t('next')
											: sending || waiting
												? t('publishing')
												: t('publish')}
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

			{/* P16 W3 with the P6 copy; sign-in and sign-up come back here through `next` (this page, with ?pet=). */}
			<AuthGate
				reason="report"
				title={t('gate_title')}
				body={t('gate_body')}
				open={gateOpen}
				onOpenChange={(open) => {
					setGateOpen(open);
					if (!open) markUrl();
					// Cancelled: the draft stays, unmarked, so a later visit asks before publishing; times go back to
					// "when Objavi is pressed next".
					if (!open && gate === 'signin') {
						handoffAt.current = undefined;
						void saveDraft('review', form.getValues()).catch(() => {});
					}
				}}
				onReady={() => setAwaiting(true)}
			/>
			{resumeLoaded && (
				<ResumeDialog
					at={resume?.at}
					onContinue={() => resume && restore(resume)}
					onDiscard={() => {
						void dropDraft().then(() => setPickerKey((key) => key + 1));
					}}
					onClose={() => setResume(undefined)}
				/>
			)}
		</FormProvider>
	);
}
