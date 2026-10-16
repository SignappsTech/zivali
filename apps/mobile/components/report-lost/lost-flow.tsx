import { skipToken } from '@reduxjs/toolkit/query';
import { useAccessibilityFocus } from '@rn-primitives/hooks';
import { randomUUID } from 'expo-crypto';
import { useIsFocused, useRouter } from 'expo-router';
import { ArrowsClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { CalendarBlankIcon } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { GiftIcon } from 'phosphor-react-native/src/icons/Gift';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { PawPrintIcon } from 'phosphor-react-native/src/icons/PawPrint';
import { PhoneIcon } from 'phosphor-react-native/src/icons/Phone';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { ShieldWarningIcon } from 'phosphor-react-native/src/icons/ShieldWarning';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { FormProvider, useController, useForm, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { BackHandler, Image, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFormatter, useLocale, useTranslations } from 'use-intl';

import { type EventParams, getConsent, track } from '@zivali/analytics';
import { useRequireAuth } from '@zivali/api/auth';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { useListPetsQuery } from '@zivali/api/pets';
import { reportsApi, useCreateReportMutation, useUpdateReportMutation } from '@zivali/api/reports';
import type { QueryError } from '@zivali/api/rtk';
import { formatDate, type Locale } from '@zivali/i18n/format';
import type { Pet } from '@zivali/types';
import { AuthGate } from '@/components/auth/gate';
import { useErrorText } from '@/components/auth/parts';
import { LocationPicker } from '@/components/location/location-picker';
import type { LatLng } from '@/components/map/features';
import { PetBasicsFields, PetChipFields, PetLooksFields, PetNotesFields } from '@/components/pets/pet-fields';
import { PhotoPicker } from '@/components/photos/photo-picker';
import { clearPhotoDraft, type PickedPhoto } from '@/components/photos/use-photo-uploads';
import { PermissionPrimer } from '@/components/shell/permission-primer';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { getDb } from '@/lib/db';
import { cn } from '@/lib/utils';

import {
	CIRCUMSTANCES_MAX,
	createBody,
	eventAt,
	formatDay,
	formatTime,
	initialValues,
	isOld,
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
import { Heading, Note } from './parts';

/** The one lost-report draft of this device (C17 `drafts`); PhotoPicker keeps its photos under the same id. */
export const LOST_DRAFT = 'lost';
type Draft = { step: Step; values: LostValues };

async function loadDraft(): Promise<(Draft & { at: number }) | null> {
	const db = await getDb();
	const row = await db.getFirstAsync<{ data: string; updated_at: number }>(
		'select data, updated_at from drafts where id = ?',
		LOST_DRAFT
	);
	if (!row) return null;
	try {
		const draft = JSON.parse(row.data) as Partial<Draft>;
		return draft.step && draft.values ? { step: draft.step, values: draft.values, at: row.updated_at } : null;
	} catch {
		return null;
	}
}

/** Writes `data` only; PhotoPicker owns `photo_paths`. The location in it is the coarsened point (C6). */
async function saveDraft(draft: Draft): Promise<void> {
	const db = await getDb();
	await db.runAsync(
		`insert into drafts (id, kind, data, photo_paths, updated_at) values (?, 'lost', ?, '[]', ?)
		on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at`,
		LOST_DRAFT,
		JSON.stringify(draft),
		Date.now()
	);
}

/** Fallback when dropDraft fails after a send: loadDraft ignores a row without a step, so no resume offer. */
async function markPublished(): Promise<void> {
	await (await getDb()).runAsync(`update drafts set data = '{"published":true}' where id = ?`, LOST_DRAFT);
}

async function dropDraft(): Promise<void> {
	await clearPhotoDraft(LOST_DRAFT);
	await (await getDb()).runAsync('delete from drafts where id = ?', LOST_DRAFT);
}

const hidden = { display: 'none' } as const;
const groupTitle = 'font-display-semibold text-xl tracking-[-0.2px]';

/** One bar per step of the real path; on the picker step (its own h1) the bars take the step-change focus. */
function StepBars({ current, total, focus }: { current: number; total: number; focus: boolean }) {
	const t = useTranslations('report_lost');
	const ref = useAccessibilityFocus<View>(focus);
	return (
		<View
			ref={ref}
			accessible
			role="progressbar"
			aria-label={t('step_a11y', { current, total })}
			aria-valuemin={1}
			aria-valuemax={total}
			aria-valuenow={current}
			className="flex-1 flex-row gap-1.5"
		>
			{Array.from({ length: total }, (_, i) => (
				<View key={i} className={cn('h-1 flex-1 rounded-sm', i < current ? 'bg-primary' : 'bg-muted')} />
			))}
		</View>
	);
}

function PetThumb({ pet }: { pet: Pet }) {
	const uri = pet.photos[0]?.thumb_url;
	return uri ? (
		<Image source={{ uri }} alt={pet.name} className="size-12 rounded-xl bg-muted" />
	) : (
		<View className="size-12 items-center justify-center rounded-xl bg-muted">
			<Icon as={PawPrintIcon} size={24} className="text-muted-foreground" />
		</View>
	);
}

/** Step 1: a row per saved pet plus "Druga žival"; signed out or without pets only "Vnesi podatke". */
function PetStep({ pets, loading }: { pets: Pet[]; loading: boolean }) {
	const t = useTranslations('report_lost');
	const ta = useTranslations('attributes');
	const { field, fieldState } = useController<LostValues, 'pet'>({ name: 'pet' });
	return (
		<View className="mt-8 gap-3">
			<RadioGroup
				value={field.value}
				onValueChange={field.onChange}
				aria-label={t('pet_title')}
				className="gap-3"
			>
				{pets.map((pet) => (
					<ChoiceRow
						key={pet.id}
						value={pet.id}
						title={`${pet.name} · ${ta(`species.${pet.species}`)}`}
						icon={<PetThumb pet={pet} />}
					/>
				))}
				{loading ? <Skeleton className="h-16 rounded-row" /> : null}
				<ChoiceRow
					value={NEW_PET}
					title={t(pets.length ? 'pet_other' : 'pet_enter')}
					description={pets.length ? t('pet_other_desc') : undefined}
					icon={
						<View className="size-12 items-center justify-center rounded-xl bg-secondary">
							<Icon as={PlusIcon} size={24} className="text-secondary-foreground" />
						</View>
					}
				/>
			</RadioGroup>
			{fieldState.error ? <FieldError>{t('pet_required')}</FieldError> : null}
		</View>
	);
}

/** Step 3: the shared PetFields parts (TASK-16.5) in their report variant. */
function DetailsStep({ summary }: { summary: boolean }) {
	const t = useTranslations('report_lost');
	const { errors } = useFormState<LostValues>({ name: 'colours' });
	return (
		<View className="mt-8 gap-8">
			{summary ? (
				<Note icon={WarningCircleIcon} alert>
					{t('validation_summary')}
				</Note>
			) : null}
			<PetBasicsFields variant="report" />
			<PetLooksFields variant="report" colourError={errors.colours ? t('colour_required') : undefined} />
			<PetChipFields variant="report" />
			<PetNotesFields variant="report" />
		</View>
	);
}

const WHEN: readonly When[] = ['now', 'today', 'yesterday', 'other'];

/** Step 5: choice rows; Danes and Včeraj ask the time, Drugič the date and the time. */
function WhenStep() {
	const t = useTranslations('report_lost');
	const locale = useLocale();
	const { getValues, setValue } = useFormContext<LostValues>();
	const when = useController<LostValues, 'when'>({ name: 'when' });
	const date = useController<LostValues, 'date'>({ name: 'date' });
	const time = useController<LostValues, 'time'>({ name: 'time' });
	const error = (message?: string) => (message ? t(message as LostError) : undefined);

	const choose = (next: When) => {
		when.field.onChange(next);
		// Prefilled with now, so a choice is never left without a value to correct.
		const now = new Date();
		if (next !== 'now' && !getValues('time')) setValue('time', formatTime(now, locale));
		if (next === 'other' && !getValues('date')) setValue('date', formatDay(now, locale));
	};
	const at = eventAt({ when: when.field.value, date: date.field.value, time: time.field.value });

	return (
		<View className="mt-6 gap-5">
			<RadioGroup
				value={when.field.value}
				onValueChange={(value) => choose(value as When)}
				aria-label={t('when_title')}
				className="gap-3"
			>
				{WHEN.map((option) => (
					<ChoiceRow key={option} value={option} title={t(`when_${option}`)} />
				))}
			</RadioGroup>
			{when.field.value !== 'now' ? (
				<View className="flex-row flex-wrap gap-5">
					{when.field.value === 'other' ? (
						<FormField
							label={t('when_date')}
							error={error(date.fieldState.error?.message)}
							className="min-w-40 flex-1"
						>
							<View className="justify-center">
								<Input
									ref={(el) => date.field.ref(el)}
									value={date.field.value}
									onChangeText={date.field.onChange}
									onBlur={date.field.onBlur}
									keyboardType="numbers-and-punctuation"
									autoComplete="off"
									className="pl-8 tabular-nums"
								/>
								<View pointerEvents="none" className="absolute left-0.5">
									<Icon as={CalendarBlankIcon} className="text-muted-foreground" />
								</View>
							</View>
						</FormField>
					) : null}
					<FormField label={t('when_time')} error={error(time.fieldState.error?.message)} className="w-32">
						<Input
							ref={(el) => time.field.ref(el)}
							value={time.field.value}
							onChangeText={time.field.onChange}
							onBlur={time.field.onBlur}
							keyboardType="numbers-and-punctuation"
							autoComplete="off"
							className="tabular-nums"
						/>
					</FormField>
				</View>
			) : null}
			{isOld(at) ? <Note icon={WarningIcon}>{t('when_old')}</Note> : null}
		</View>
	);
}

/** Step 6: circumstances, contact preference and the display-only reward (brief v1.1: nothing is charged). */
function WhatStep({ summary, hasPhone }: { summary: boolean; hasPhone: boolean }) {
	const t = useTranslations('report_lost');
	const format = useFormatter();
	const { setValue } = useFormContext<LostValues>();
	const circumstances = useController<LostValues, 'circumstances'>({ name: 'circumstances' });
	const contact = useController<LostValues, 'contact_pref'>({ name: 'contact_pref' });
	const reward = useController<LostValues, 'reward'>({ name: 'reward' });
	const eur = useController<LostValues, 'reward_eur'>({ name: 'reward_eur' });
	const note = useController<LostValues, 'reward_note'>({ name: 'reward_note' });
	const max = format.number(REWARD_MAX, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
	const error = (message?: string) => (message ? t(message as LostError, { max: CIRCUMSTANCES_MAX }) : undefined);

	const toggle = (on: boolean) => {
		reward.field.onChange(on);
		// Off: the fields go, and so do their values.
		if (!on) {
			setValue('reward_eur', '');
			setValue('reward_note', '');
		}
	};

	return (
		<View className="mt-8">
			{summary ? (
				<Note icon={WarningCircleIcon} alert className="mb-8">
					{t('validation_summary')}
				</Note>
			) : null}
			<FormField
				label={t('circumstances_label')}
				hint={t('circumstances_help')}
				error={error(circumstances.fieldState.error?.message)}
			>
				<Textarea
					ref={(el) => circumstances.field.ref(el)}
					value={circumstances.field.value ?? ''}
					onChangeText={circumstances.field.onChange}
					onBlur={circumstances.field.onBlur}
					placeholder={t('circumstances_placeholder')}
					maxLength={CIRCUMSTANCES_MAX}
				/>
			</FormField>

			<Text role="heading" className={cn(groupTitle, 'mb-3 mt-10')}>
				{t('contact_label')}
			</Text>
			<RadioGroup
				value={contact.field.value}
				onValueChange={contact.field.onChange}
				aria-label={t('contact_label')}
				className="gap-3"
			>
				<ChoiceRow
					value="chat_only"
					title={t('contact_chat')}
					description={t('contact_chat_desc')}
					icon={<Icon as={ChatCircleIcon} size={24} />}
				/>
				<ChoiceRow
					value="chat_and_phone"
					title={t('contact_phone')}
					description={t('contact_phone_desc')}
					icon={<Icon as={PhoneIcon} size={24} />}
				/>
			</RadioGroup>
			{contact.field.value === 'chat_and_phone' && !hasPhone ? (
				<Note icon={InfoIcon} className="mt-3">
					{t('contact_phone_missing')}
				</Note>
			) : null}

			<Text role="heading" className={cn(groupTitle, 'mb-3 mt-10')}>
				{t('reward_label')}
			</Text>
			<View className="flex-row items-center gap-3.5 rounded-row bg-card pl-5 pr-4">
				<Icon as={GiftIcon} size={24} className="text-primary" />
				<Switch
					label={t('reward_toggle')}
					checked={reward.field.value}
					onCheckedChange={toggle}
					className="min-h-16 flex-1 py-3"
				/>
			</View>
			{reward.fieldState.error ? <FieldError className="mt-3">{t('reward_empty')}</FieldError> : null}
			{reward.field.value ? (
				<>
					<FormField
						label={t('reward_amount_label')}
						error={eur.fieldState.error && t(eur.fieldState.error.message as LostError, { max })}
						className="mt-6 max-w-52"
					>
						<View className="justify-center">
							<Input
								ref={(el) => eur.field.ref(el)}
								value={eur.field.value}
								onChangeText={eur.field.onChange}
								onBlur={eur.field.onBlur}
								keyboardType="number-pad"
								autoComplete="off"
								className="pr-7 tabular-nums"
							/>
							<Text aria-hidden className="absolute right-0.5 text-lg text-muted-foreground">
								€
							</Text>
						</View>
					</FormField>
					<FormField
						label={t('reward_note_label')}
						hint={t('reward_note_help')}
						error={error(note.fieldState.error?.message)}
						className="mt-6"
					>
						<Input
							ref={(el) => note.field.ref(el)}
							value={note.field.value}
							onChangeText={note.field.onChange}
							onBlur={note.field.onBlur}
							placeholder={t('reward_note_placeholder')}
							maxLength={NOTE_MAX}
							autoComplete="off"
						/>
					</FormField>
					<Text aria-hidden className="mt-1 self-end text-sm tabular-nums text-muted-foreground">
						{`${note.field.value.length}/${NOTE_MAX}`}
					</Text>
					<Note icon={ShieldWarningIcon} className="mt-6">
						{t('reward_warning')}
					</Note>
				</>
			) : null}
		</View>
	);
}

/** A summary row: label (14 bold muted), value, "Uredi" named after the row. */
function Row({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
	const t = useTranslations('report_lost');
	return (
		<View className="flex-row items-start gap-3">
			<View className="min-w-0 flex-1">
				<Text className="font-sans-bold text-sm text-muted-foreground">{label}</Text>
				<View className="mt-0.5">{children}</View>
			</View>
			<Button
				variant="text"
				aria-label={t('review_edit_a11y', { field: label })}
				onPress={onEdit}
				className="-mr-3 -mt-2"
			>
				{t('review_edit')}
			</Button>
		</View>
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

/** Step 7: the plain summary list, each row with Edit; the duplicate choice above it after a 409. */
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
		<View className="mt-8 gap-8">
			{duplicate ? (
				<View className="gap-5">
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
							icon={<Icon as={ArrowsClockwiseIcon} size={24} />}
						/>
						<ChoiceRow value="new" title={t('duplicate_new')} icon={<Icon as={PlusIcon} size={24} />} />
					</RadioGroup>
					{update ? <Note icon={InfoIcon}>{t('duplicate_replaces_photos')}</Note> : null}
				</View>
			) : null}
			<View className="gap-5">
				{photos.length ? (
					<Row label={t('review_photos')} onEdit={() => edit('photos')}>
						<View className="flex-row flex-wrap gap-2">
							{photos.map((photo, i) => (
								<Image
									key={photo.key}
									source={{ uri: photo.thumb.uri }}
									alt={tp('thumb_alt', { n: i + 1, total: photos.length })}
									className="size-[72px] rounded-xl bg-muted"
								/>
							))}
						</View>
					</Row>
				) : null}
				<Row label={t('review_pet')} onEdit={() => edit(pet ? 'pet' : 'details')}>
					{name ? <Text className="font-sans-bold">{name}</Text> : null}
					<Text>{looks}</Text>
				</Row>
				<Row label={t('review_place')} onEdit={() => edit('where')}>
					<Text>
						{`${place.currentData?.label ?? tl('address_unknown')} · `}
						<Text className="tabular-nums">{radiusText}</Text>
					</Text>
				</Row>
				<Row label={t('review_time')} onEdit={() => edit('when')}>
					<Text className="tabular-nums">{seen}</Text>
				</Row>
				{values.circumstances?.trim() ? (
					<Row label={t('review_circumstances')} onEdit={() => edit('what')}>
						<Text>{values.circumstances.trim()}</Text>
					</Row>
				) : null}
				<Row label={t('review_contact')} onEdit={() => edit('what')}>
					<Text>{t(values.contact_pref === 'chat_and_phone' ? 'contact_phone' : 'contact_chat')}</Text>
				</Row>
				<Row label={t('review_reward')} onEdit={() => edit('what')}>
					{eur || note ? (
						<>
							{eur ? (
								<View className="flex-row items-center gap-1.5">
									<Icon as={GiftIcon} size={18} className="text-primary" />
									<Text className="font-sans-bold tabular-nums">
										{format.number(Number(eur), {
											style: 'currency',
											currency: 'EUR',
											maximumFractionDigits: 0,
										})}
									</Text>
								</View>
							) : null}
							{note ? <Text>{note}</Text> : null}
						</>
					) : (
						<Text>{t('review_reward_none')}</Text>
					)}
				</Row>
			</View>
		</View>
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
 * P6 report-lost flow (FR-005): one question per screen in the flow shell (back, step bars, close), Naprej sticky at the
 * bottom. A saved pet takes pet, photos, where, when, what happened, review; a new pet adds the details. The draft
 * (C17) is saved on every step; publishing calls create_report (C4) and handles DUPLICATE_OPEN_REPORT by offering to
 * update the open search. Lost reports need an account, so they are sent online (no outbox, C17), and the AuthGate
 * opens at Publish for a signed-out visitor. No ad in the flow (C15).
 */
export function LostFlow() {
	const t = useTranslations('report_lost');
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const errorText = useErrorText();
	const tErrors = useTranslations('errors');
	const trackSubmit = useTrackSubmit();
	const { gate, me } = useRequireAuth();
	const petList = useListPetsQuery(gate === 'ok' ? undefined : skipToken);
	const pets = petList.data?.items ?? [];
	const petsLoading = gate === 'loading' || petList.isLoading;
	const [createReport] = useCreateReportMutation();
	const [updateReport] = useUpdateReportMutation();

	// When Publish was pressed signed out: "Pravkar", "Danes" and "Včeraj" mean then, not after the sign-in detour.
	// The hand-off itself lives in this screen (`awaiting`, set by the gate's onReady): nothing is persisted, so a
	// relaunch or another account never publishes the draft.
	const pressAt = React.useRef<number>(undefined);
	const form = useForm<LostValues>({
		resolver: lostResolverAt(() => pressAt.current ?? Date.now()),
		defaultValues: initialValues,
	});
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
	const [primer, setPrimer] = React.useState(false);
	const primerResult = React.useRef<(granted: boolean) => void>(null);
	const [saved, setSaved] = React.useState(false);
	const [resume, setResume] = React.useState<Draft & { at: number }>();
	const [closing, setClosing] = React.useState(false);
	const [gateOpen, setGateOpen] = React.useState(false);
	const [sending, setSending] = React.useState(false);
	// Publish was pressed signed out: it goes on once the account is ready, this screen is back and the photos are up.
	const [awaiting, setAwaiting] = React.useState(false);
	const focused = useIsFocused();
	const [sendError, setSendError] = React.useState<string>();
	const [found, setFound] = React.useState<{ code: string; pet?: string }>();
	const [update, setUpdate] = React.useState(true);
	// Stable across repeats of one submission (C1): key, exact body and its event_at. Cleared once the server has answered.
	const submission = React.useRef<{ key: string; body: string; when: LostValues['when']; at: Date } | null>(null);
	const busy = React.useRef(false);
	const scroll = React.useRef<ScrollView>(null);
	const pet = pets.find((p) => p.id === values.pet);
	// The open search found by a 409 belongs to the pet it was found for; another choice is a fresh question.
	const duplicate = found && found.pet === values.pet ? found.code : undefined;

	React.useEffect(() => track('report_lost_start'), []);

	React.useEffect(() => {
		let live = true;
		loadDraft()
			.then((draft) => live && draft && setResume(draft))
			.catch(() => {});
		return () => {
			live = false;
		};
	}, []);

	// Signed out or no saved pets: "Vnesi podatke" is the only row, so it is chosen.
	React.useEffect(() => {
		if (!petsLoading && !pets.length && !form.getValues('pet')) form.setValue('pet', NEW_PET);
	}, [petsLoading, pets.length, form]);

	React.useEffect(() => {
		const fields = STEP_FIELDS[step];
		if (attempted && fields.length) void form.trigger(fields);
	}, [attempted, step, values, form]);

	const go = (next: Step) => {
		// Any later edit is a new "now".
		pressAt.current = undefined;
		setAttempted(false);
		setStep(next);
		scroll.current?.scrollTo({ y: 0, animated: false });
	};
	const save = (next: Step) =>
		saveDraft({ step: next, values: form.getValues() }).then(
			() => setSaved(true),
			() => {}
		);
	const advance = (next: Step = toReview ? 'review' : steps[index + 1]!) => {
		if (next === 'review') setToReview(false);
		go(next);
		void save(next);
	};
	const next = async () => {
		setAttempted(true);
		if (step === 'photos' && !photos.length) return;
		const fields = STEP_FIELDS[step];
		if (fields.length && !(await form.trigger(fields, { shouldFocus: true }))) return;
		advance();
	};
	const back = () => (index > 0 ? go(steps[index - 1]!) : setClosing(true));
	const hardwareBack = React.useEffectEvent(() => {
		if (!closing && !resume) back();
	});
	React.useEffect(() => {
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			hardwareBack();
			return true;
		});
		return () => subscription.remove();
	}, []);
	const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
	const edit = (target: Step) => {
		setToReview(true);
		go(target);
	};

	const cameraPrimer = () =>
		new Promise<boolean>((resolve) => {
			primerResult.current = resolve;
			setPrimer(true);
		});

	const failed = (error: unknown) => {
		const data = (error as Partial<QueryError> | null)?.data;
		// The key survives what may still commit or can be repeated safely (network, 5xx, 429, 409 "in progress");
		// only a definitive refusal ends the submission.
		const status = (error as Partial<QueryError> | null)?.status;
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
		// A rule the device could not check (contact data in the note, clock skew): back to the field, input kept.
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
			const target = roots.includes('photo_ids')
				? 'photos'
				: roots.includes('location') || roots.includes('radius_m')
					? 'where'
					: steps.find((s) => STEP_FIELDS[s].some((field) => roots.includes(field)));
			if (target) {
				edit(target);
				setAttempted(true);
				return;
			}
		}
		if (data?.code === 'RATE_LIMITED' && typeof data.details?.retry_after_s === 'number') {
			return setSendError(
				tErrors('RATE_LIMITED', { minutes: Math.max(1, Math.ceil(data.details.retry_after_s / 60)) })
			);
		}
		setSendError(data?.code === 'NETWORK' ? t('send_failed') : errorText(error));
	};

	const publish = async () => {
		if (busy.current || photos.some((photo) => photo.status === 'uploading')) return;
		busy.current = true;
		// Stays closed after a publish that went through: the screen is leaving, and a late press would start a new
		// submission (a new key, so a second report).
		let sent = false;
		try {
			sent = (await send()) === true;
		} finally {
			if (!sent) busy.current = false;
		}
	};
	const send = async (): Promise<boolean | void> => {
		setSendError(undefined);
		const photoIds = photos.flatMap((photo) => (photo.photoId ? [photo.photoId] : []));
		if (!photos.length) return setSendError(t('photos_required'));
		// Signed out, the photos wait on the device; they upload after sign-in (C3: nothing is sent before).
		if (!photoIds.length && gate !== 'signin') return setSendError(t('photos_wait'));
		for (const s of steps) {
			const fields = STEP_FIELDS[s];
			if (fields.length && !(await form.trigger(fields))) {
				edit(s);
				return setAttempted(true);
			}
		}
		if (gate === 'signin') {
			pressAt.current = Date.now();
			return setGateOpen(true);
		}
		if (!values.location) return edit('where');
		const at = eventAt(values, pressAt.current ?? Date.now())!;
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
				const when = prev?.when === 'now' && values.when === 'now' ? prev.at : at;
				const next = JSON.stringify(
					createBody(values, { photoIds, at: when, pet, inline: Boolean(duplicate) })
				);
				if (!prev || next !== prev.body) {
					submission.current = { key: randomUUID(), body: next, when: values.when, at: when };
				}
				const { key, body } = submission.current!;
				code = (await createReport({ body: JSON.parse(body), idempotencyKey: key }).unwrap()).short_code;
			}
			submission.current = null;
			if (!(duplicate && update)) trackSubmit(code);
			await dropDraft().catch(() => markPublished().catch(() => {}));
			const name = pet?.name ?? values.name?.trim();
			router.replace({ pathname: '/report/lost/done', params: name ? { code, name } : { code } });
			return true;
		} catch (error) {
			failed(error);
		} finally {
			setSending(false);
		}
	};

	const held = photos.some((photo) => photo.status === 'kept' || photo.status === 'uploading');
	const publishNow = React.useEffectEvent(() => {
		setAwaiting(false);
		void publish();
	});
	React.useEffect(() => {
		if (!awaiting || gate !== 'ok' || !focused || held) return;
		// On the next tick, so the send is not a state update inside this commit; dropped if anything changes first.
		const timer = setTimeout(publishNow);
		return () => clearTimeout(timer);
	}, [awaiting, gate, focused, held]);

	const summary = attempted && STEP_FIELDS[step].some((field) => form.formState.errors[field]);
	const titles: Record<Exclude<Step, 'where'>, string> = {
		pet: t('pet_title'),
		photos: t('photos_title'),
		details: t('details_title'),
		when: t('when_title'),
		what: t('circumstances_title'),
		review: t('review_title'),
	};

	return (
		<FormProvider {...form}>
			<SafeAreaView edges={['top']} className="flex-1 bg-background">
				<View className="h-14 flex-row items-center gap-2 px-3">
					<Button variant="ghost" size="icon" aria-label={t('back')} onPress={back}>
						<Icon as={CaretLeftIcon} size={24} />
					</Button>
					<StepBars key={step} current={index + 1} total={steps.length} focus={step === 'where'} />
					<Button variant="ghost" size="icon" aria-label={t('close')} onPress={() => setClosing(true)}>
						<Icon as={XIcon} size={24} />
					</Button>
				</View>

				{step === 'where' ? (
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
				) : null}

				{/* Never unmounted while the flow is open, so photo uploads go on behind the later steps. */}
				<KeyboardAvoidingView
					behavior="padding"
					className="flex-1"
					style={step === 'where' ? hidden : undefined}
				>
					<ScrollView
						ref={scroll}
						keyboardShouldPersistTaps="handled"
						contentContainerClassName="grow px-5 pb-8 pt-2"
					>
						{step !== 'where' ? <Heading key={step}>{titles[step]}</Heading> : null}
						{step === 'pet' ? <PetStep pets={pets} loading={petsLoading} /> : null}
						<View style={step === 'photos' ? undefined : hidden}>
							<Text className="mt-3">{t('photos_help')}</Text>
							<PhotoPicker
								key={pickerKey}
								draft={LOST_DRAFT}
								kind="lost"
								cameraPrimer={cameraPrimer}
								onChange={setPhotos}
								onExif={({ lat, lng }) =>
									lat !== undefined && lng !== undefined && setExif({ lat, lng })
								}
								hold={gate === 'signin' || gate === 'loading'}
								className="mt-6"
							/>
							{attempted && step === 'photos' && !photos.length ? (
								<FieldError className="mt-4">{t('photos_required')}</FieldError>
							) : null}
						</View>
						{step === 'details' ? <DetailsStep summary={summary} /> : null}
						{step === 'when' ? <WhenStep /> : null}
						{step === 'what' ? <WhatStep summary={summary} hasPhone={Boolean(me?.phone)} /> : null}
						{step === 'review' ? (
							<ReviewStep
								photos={photos}
								pet={pet}
								edit={edit}
								duplicate={duplicate}
								update={update}
								onUpdateChange={setUpdate}
							/>
						) : null}
					</ScrollView>
					<View className="gap-3 px-5 pt-4" style={{ paddingBottom: Math.max(44, insets.bottom + 8) }}>
						{step === 'review' ? (
							<View className="flex-row gap-2">
								<Icon as={BellIcon} size={16} className="mt-0.5 text-muted-foreground" />
								<Text className="shrink text-sm text-muted-foreground">{t('review_note')}</Text>
							</View>
						) : null}
						{step === 'review' && sendError ? (
							<Note icon={WarningCircleIcon} alert>
								{sendError}
							</Note>
						) : null}
						{saved && step !== 'review' ? (
							<View role="status" className="flex-row items-center justify-center gap-1.5">
								<Icon as={CheckCircleIcon} size={16} className="text-primary" />
								<Text className="text-sm text-muted-foreground">{t('draft_saved')}</Text>
							</View>
						) : null}
						{step === 'review' ? (
							<Button
								size="lg"
								loading={sending || awaiting}
								onPress={() => {
									// Pressed signed in: a hand-off's press time is stale.
									if (gate !== 'signin') pressAt.current = undefined;
									void publish();
								}}
							>
								{sending || awaiting ? t('publishing') : t('publish')}
							</Button>
						) : (
							<Button size="lg" onPress={() => void next()}>
								{t('next')}
							</Button>
						)}
					</View>
				</KeyboardAvoidingView>
			</SafeAreaView>

			<PermissionPrimer
				kind="camera"
				open={primer}
				request={async () => true}
				onResult={(granted) => {
					setPrimer(false);
					primerResult.current?.(granted);
				}}
			/>
			<AuthGate
				reason="report"
				title={t('gate_title')}
				body={t('gate_body')}
				open={gateOpen}
				onOpenChange={setGateOpen}
				verified={false}
				onReady={() => setAwaiting(true)}
			/>
			<AlertDialog open={closing} onOpenChange={setClosing}>
				<AlertDialogContent>
					<AlertDialogTitle>{t('close_title')}</AlertDialogTitle>
					<AlertDialogDescription>{t('close_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogAction variant="secondary" onPress={leave}>
							{t('close_confirm')}
						</AlertDialogAction>
						<AlertDialogCancel>{t('close_cancel')}</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<ResumeDialog
				draft={resume}
				onContinue={(draft) => {
					form.reset({ ...initialValues, ...draft.values });
					setSaved(true);
					go(draft.step);
				}}
				onDiscard={() => {
					void dropDraft()
						.catch(() => {})
						.then(() => setPickerKey((key) => key + 1));
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
	draft?: Draft & { at: number };
	onContinue: (draft: Draft) => void;
	onDiscard: () => void;
	onClose: () => void;
}) {
	const t = useTranslations('report_lost');
	const locale = useLocale() as Locale;
	return (
		<AlertDialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent>
				<AlertDialogTitle>{t('resume_title')}</AlertDialogTitle>
				<AlertDialogDescription>
					{t('resume_body', { date: draft ? formatDate(draft.at, locale) : '' })}
				</AlertDialogDescription>
				<AlertDialogFooter>
					<AlertDialogAction variant="default" onPress={() => draft && onContinue(draft)}>
						{t('resume_continue')}
					</AlertDialogAction>
					<Button
						variant="text"
						onPress={() => {
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
