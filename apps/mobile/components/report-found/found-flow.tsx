import { skipToken } from '@reduxjs/toolkit/query';
import { getRandomValues } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { CameraIcon } from 'phosphor-react-native/src/icons/Camera';
import { CameraSlashIcon } from 'phosphor-react-native/src/icons/CameraSlash';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CatIcon } from 'phosphor-react-native/src/icons/Cat';
import { DogIcon } from 'phosphor-react-native/src/icons/Dog';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { HandHeartIcon } from 'phosphor-react-native/src/icons/HandHeart';
import { HourglassMediumIcon } from 'phosphor-react-native/src/icons/HourglassMedium';
import { ImagesIcon } from 'phosphor-react-native/src/icons/Images';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { PawPrintIcon } from 'phosphor-react-native/src/icons/PawPrint';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { TimerIcon } from 'phosphor-react-native/src/icons/Timer';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { BackHandler, Image, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale, useTranslations } from 'use-intl';
import { z } from 'zod';

import { track } from '@zivali/analytics';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import en from '@zivali/i18n/dist/en.json';
import { COLOURS, type Colour, SIZES, type Size, type Species } from '@zivali/types';
import { coarsenPoint } from '@zivali/validation/geo';
import { LocationPicker } from '@/components/location/location-picker';
import type { LatLng } from '@/components/map/features';
import { PhotoPicker, type PhotoPickerHandle } from '@/components/photos/photo-picker';
import { clearPhotoDraft, type DraftKind, type PickedPhoto } from '@/components/photos/use-photo-uploads';
import { FoundDone, type Submitted } from '@/components/report-found/found-done';
import { Heading, Line } from '@/components/report-found/parts';
import { Note, StatusWord } from '@/components/report/parts';
import { PermissionPrimer } from '@/components/shell/permission-primer';
import { Spot } from '@/components/shell/parts';
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
import { Pill } from '@/components/ui/pill';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useCaptchaRequest } from '@/lib/anonymous';
import { useReport } from '@/lib/data/reports';
import { getDb } from '@/lib/db';
import { isOnline, useNetworkState } from '@/lib/net';
import { type OutboxItem, type OutboxPayload, submitReport, useOutbox } from '@/lib/offline/outbox';
import { cn } from '@/lib/utils';

// P7 quick found or sighted report (FR-006, TASK-30.3): one question per screen, no account, sent through the outbox
// (C17) so it works offline. It never asks where the animal is kept. No ad component in this flow (C15).

export type Step = 'photo' | 'what' | 'where' | 'situation' | 'send' | 'when' | 'extra';
type Source = 'gps' | 'pin' | 'search' | 'exif';
type When = 'now' | 'today' | 'other';

/** Found: photo, which animal, where, is it with you, publish. Sighting of a listed lost pet: where, when, photo. */
const FOUND_STEPS: Step[] = ['photo', 'what', 'where', 'situation', 'send'];
const SIGHTING_STEPS: Step[] = ['where', 'when', 'extra'];
const WHEN: readonly When[] = ['now', 'today', 'other'];
const CAT_SIZES: readonly Size[] = ['s', 'm', 'l'];
/** `circumstances` limit (C4, `@zivali/validation` reports schema). */
export const NOTE_MAX = 1000;
const FUTURE_SLACK_MS = 10 * 60_000; // the API accepts event_at up to 10 min ahead (C4)
const FIX_MAX_AGE_MS = 10 * 60_000;
/** A weak GPS must not hold the step: after this "Kje" opens the picker. */
const FIX_WAIT_MS = 5000;
const CAPTCHA_LINE_MS = 2000;
/** C7: a failed captcha is tried again every 60 s while the person is on the publish step. */
const CAPTCHA_RETRY_MS = 60_000;
const hidden = { display: 'none' } as const;
const groupTitle = 'mb-3 mt-8 font-display-semibold text-xl tracking-[-0.2px]';
// coarsenPoint's default needs a global crypto, which Hermes lacks; expo-crypto supplies the same random source.
const random = () => getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
const emailSchema = z.email().max(254);

export type FoundValues = {
	species?: Species;
	size?: Size;
	colours: Colour[];
	/** The coarsened point (C6): the raw GPS or EXIF point never gets here, nor into the draft or the outbox. */
	location?: LatLng;
	source?: Source;
	situation?: 'have' | 'seen';
	note: string;
	email: string;
	when: When;
	/** As typed: "15. 10. 2026" / "15/10/2026" */
	date: string;
	/** As typed: "18.30" / "18:30" */
	time: string;
	/** ISO: the earliest photo EXIF time, the original capture time kept for matching (C17). */
	takenAt?: string;
	/** ISO: when the finder opened the flow, the capture time without EXIF. */
	startedAt: string;
};
export type Linked = { id: string; code?: string; species?: Species };
type FieldErrorKey = 'species' | 'situation' | 'note' | 'email' | 'when';

const pad = (n: number) => String(n).padStart(2, '0');
const formatDay = (d: Date, locale: string) =>
	locale === 'en'
		? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
		: `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
const formatTime = (d: Date, locale: string) =>
	`${pad(d.getHours())}${locale === 'en' ? ':' : '.'}${pad(d.getMinutes())}`;

function parseDay(text: string): Date | null {
	const [d, m, y] = (text.match(/\d+/g) ?? []).map(Number);
	if (d === undefined || m === undefined || y === undefined) return null;
	const date = new Date(y < 100 ? 2000 + y : y, m - 1, d);
	return date.getDate() === d && date.getMonth() === m - 1 ? date : null;
}

function parseTime(text: string): [number, number] | null {
	const match = /^(\d{1,2})\s*[.:]?\s*(\d{2})$/.exec(text.trim());
	if (!match) return null;
	const [h, m] = [Number(match[1]), Number(match[2])];
	return h < 24 && m < 60 ? [h, m] : null;
}

/** When the sighting was, or null while the typed date or time cannot be read or lies in the future. */
export function sightingTime(values: Pick<FoundValues, 'when' | 'date' | 'time'>, now = Date.now()): Date | null {
	if (values.when === 'now') return new Date(now);
	const day = values.when === 'other' ? parseDay(values.date) : new Date(now);
	const time = parseTime(values.time);
	if (!day || !time) return null;
	day.setHours(time[0], time[1], 0, 0);
	return day.getTime() > now + FUTURE_SLACK_MS ? null : day;
}

/** The checks Naprej (or Publish) runs on a step; each key names the field and its message. */
export function stepErrors(step: Step, values: FoundValues): Partial<Record<FieldErrorKey, true>> {
	const errors: Partial<Record<FieldErrorKey, true>> = {};
	if (step === 'what' && !values.species) errors.species = true;
	if (step === 'situation' && !values.situation) errors.situation = true;
	if ((step === 'situation' || step === 'extra') && values.note.trim().length > NOTE_MAX) errors.note = true;
	if (step === 'situation' && values.email.trim() && !emailSchema.safeParse(values.email.trim()).success)
		errors.email = true;
	if (step === 'when' && !sightingTime(values)) errors.when = true;
	return errors;
}

/** The C4 body the outbox stores: only what was asked, the coarsened point, never where the animal is kept. */
export function outboxPayload(
	values: FoundValues & { species: Species; location: LatLng },
	linked?: Linked
): OutboxPayload {
	const note = values.note.trim();
	const finderEmail = values.email.trim();
	return {
		type: linked || values.situation === 'seen' ? 'sighted' : 'found',
		species: values.species,
		...(values.size && { size: values.size }),
		...(values.colours.length > 0 && { colours: values.colours }),
		location: values.location,
		...(note && { circumstances: note }),
		// The short sighting flow asks no email (P7 S1).
		...(!linked && finderEmail && { finder_email: finderEmail }),
		...(linked && { linked_report_id: linked.id }),
	};
}

/** The original capture time (C17 `captured_at` → `event_at`), so a report sent later still matches its moment. */
export function capturedAt(values: FoundValues, linked: boolean, now = Date.now()): string {
	if (linked) return (sightingTime(values, now) ?? new Date(now)).toISOString();
	const taken = values.takenAt ? Date.parse(values.takenAt) : NaN;
	return new Date(taken <= now + FUTURE_SLACK_MS ? taken : Date.parse(values.startedAt)).toISOString();
}

type Draft = { step: Step; values: FoundValues };

async function loadDraft(id: string): Promise<Draft | null> {
	const db = await getDb();
	const row = await db.getFirstAsync<{ data: string }>('select data from drafts where id = ?', id);
	try {
		const draft = row ? (JSON.parse(row.data) as Partial<Draft>) : null;
		return draft?.step && draft.values ? { step: draft.step, values: draft.values } : null;
	} catch {
		return null;
	}
}

/** Writes `data` only; PhotoPicker owns `photo_paths`. The location in it is the coarsened point (C6). */
async function saveDraft(id: string, kind: DraftKind, draft: Draft): Promise<void> {
	const db = await getDb();
	await db.runAsync(
		`insert into drafts (id, kind, data, photo_paths, updated_at) values (?, ?, ?, '[]', ?)
		on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at`,
		id,
		kind,
		JSON.stringify(draft),
		Date.now()
	);
}

async function dropDraft(id: string): Promise<void> {
	await clearPhotoDraft(id);
	await (await getDb()).runAsync('delete from drafts where id = ?', id);
}

/** A point offered for "Kje": the raw one stays in memory for the picker, the row and the form get `coarse` (C6). */
type Offered = { raw: LatLng; coarse: LatLng };
const offer = (raw: LatLng): Offered => ({ raw, coarse: coarsenPoint(raw, random) });

/**
 * A GPS point for "Kje" (P7 M3) when the location permission is already granted: it never prompts (the picker's
 * "Uporabi mojo lokacijo" does, after the P2 primer).
 */
function useGpsFix(): { fix?: Offered; locating: boolean } {
	const [state, setState] = React.useState<{ fix?: Offered; locating: boolean }>({ locating: true });
	React.useEffect(() => {
		let alive = true;
		let timer: ReturnType<typeof setTimeout> | undefined;
		(async () => {
			if (!(await Location.getForegroundPermissionsAsync()).granted) return undefined;
			const position =
				(await Location.getLastKnownPositionAsync({ maxAge: FIX_MAX_AGE_MS })) ??
				(await Promise.race([
					Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
					new Promise<never>(
						(_, reject) => (timer = setTimeout(() => reject(new Error('timeout')), FIX_WAIT_MS))
					),
				]));
			return offer({ lat: position.coords.latitude, lng: position.coords.longitude });
		})()
			.then(
				(fix) => alive && setState({ fix, locating: false }),
				() => alive && setState({ locating: false })
			)
			.finally(() => clearTimeout(timer));
		return () => {
			alive = false;
		};
	}, []);
	return state;
}

/** The lost pet a sighting is about (P7 S1): 48 px photo, name, status word, on every step. */
function LinkedPet({ code, onSpecies }: { code: string; onSpecies: (species: Species) => void }) {
	const { data } = useReport(code);
	const species = data?.species;
	React.useEffect(() => {
		if (species) onSpecies(species);
	}, [species, onSpecies]);
	if (!data) return null;
	const thumb = 'photos' in data ? data.photos[0]?.thumb_url : data.thumb_url;
	return (
		<View className="mb-6 flex-row items-center gap-3">
			{thumb ? (
				<Image aria-hidden source={{ uri: thumb }} className="size-12 rounded-xl bg-muted" />
			) : (
				<View aria-hidden className="size-12 items-center justify-center rounded-xl bg-muted">
					<Icon as={PawPrintIcon} size={24} className="text-muted-foreground" />
				</View>
			)}
			<View className="min-w-0 flex-1">
				{data.name ? <Text className="font-sans-bold">{data.name}</Text> : null}
				<StatusWord report={data} />
			</View>
		</View>
	);
}

function StepBars({ current, total }: { current: number; total: number }) {
	const t = useTranslations('report_found');
	return (
		<View
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

type StepProps = {
	values: FoundValues;
	set: (change: Partial<FoundValues>) => void;
	errors: ReturnType<typeof stepErrors>;
};

/** Step 2 without AI (P7 C1): species is the one required answer; size and colour are optional pills. */
function WhatStep({ values, set, errors }: StepProps) {
	const t = useTranslations('report_found');
	const ta = useTranslations('attributes');
	const sizes = values.species === 'cat' ? CAT_SIZES : SIZES;
	return (
		<View>
			<RadioGroup
				value={values.species ?? ''}
				onValueChange={(species) =>
					set({
						species: species as Species,
						...(species === 'cat' &&
							values.size &&
							!CAT_SIZES.includes(values.size) && { size: undefined }),
					})
				}
				aria-label={t('species_title')}
				className="mt-6 gap-3"
			>
				<ChoiceRow value="dog" title={t('species_dog')} icon={<Icon as={DogIcon} size={24} />} />
				<ChoiceRow value="cat" title={t('species_cat')} icon={<Icon as={CatIcon} size={24} />} />
			</RadioGroup>
			{errors.species ? <FieldError className="mt-3">{t('species_required')}</FieldError> : null}
			<Text role="heading" className={groupTitle}>
				{t('size_label')}
			</Text>
			<View role="radiogroup" aria-label={t('size_label')} className="flex-row flex-wrap gap-2">
				{sizes.map((size) => (
					<Pill
						key={size}
						role="radio"
						selected={values.size === size}
						onPress={() => set({ size: values.size === size ? undefined : size })}
					>
						{ta(`size.${size}`)}
					</Pill>
				))}
			</View>
			<Text role="heading" className={groupTitle}>
				{t('colour_label')}
			</Text>
			<View role="group" aria-label={t('colour_label')} className="flex-row flex-wrap gap-2">
				{COLOURS.map((colour) => (
					<Pill
						key={colour}
						selected={values.colours.includes(colour)}
						onPress={() =>
							set({
								colours: values.colours.includes(colour)
									? values.colours.filter((c) => c !== colour)
									: [...values.colours, colour],
							})
						}
					>
						{ta(`colours.${colour}`)}
					</Pill>
				))}
			</View>
		</View>
	);
}

/** Step 3 (P7 M3): the place read from the photo or GPS, its address and "Spremeni"; the picker comes on top. */
function WhereRow({
	where,
	address,
	locating,
	onChange,
}: {
	where?: { source?: Source };
	address: string;
	locating: boolean;
	onChange: () => void;
}) {
	const t = useTranslations('report_found');
	if (!where) return locating ? <Skeleton className="mt-8 h-[104px] w-full rounded-row" /> : null;
	const from = where.source === 'exif' ? t('where_from_photo') : where.source === 'gps' ? t('where_from_gps') : null;
	return (
		<>
			<View className="mt-8 flex-row items-center gap-4 rounded-row bg-card py-3 pl-3 pr-2">
				<View aria-hidden className="size-20 items-center justify-center rounded-2xl bg-map-land">
					<Icon as={MapPinIcon} weight="fill" size={32} className="text-primary" />
				</View>
				<View accessible className="min-w-0 flex-1">
					<Text className="font-sans-bold">{address}</Text>
					{from ? <Text className="mt-0.5 text-sm text-muted-foreground">{from}</Text> : null}
				</View>
				<Button variant="text" onPress={onChange}>
					{t('where_change')}
				</Button>
			</View>
			<Line icon={ShieldCheckIcon} className="mt-5">
				{t('where_note')}
			</Line>
		</>
	);
}

function NoteField({ values, set, errors, sighting }: StepProps & { sighting?: boolean }) {
	const t = useTranslations('report_found');
	return (
		<FormField
			label={t(sighting ? 'sighting_note' : 'note_label')}
			hint={t('note_help')}
			error={errors.note ? t('note_too_long', { max: NOTE_MAX }) : undefined}
			className="mt-8"
		>
			<Textarea
				value={values.note}
				onChangeText={(note) => set({ note })}
				placeholder={t(sighting ? 'sighting_note_placeholder' : 'note_placeholder')}
			/>
		</FormField>
	);
}

/** Step 4 (P7 M4): have it or only saw it (nothing preselected for a find), the public note, the optional email. */
function SituationStep(props: StepProps) {
	const t = useTranslations('report_found');
	const { values, set, errors } = props;
	return (
		<View>
			<RadioGroup
				value={values.situation ?? ''}
				onValueChange={(situation) => set({ situation: situation as 'have' | 'seen' })}
				aria-label={t('situation_title')}
				className="mt-6 gap-3"
			>
				<ChoiceRow
					value="have"
					title={t('situation_have')}
					description={t('situation_have_desc')}
					icon={<Icon as={HandHeartIcon} size={24} />}
				/>
				<ChoiceRow
					value="seen"
					title={t('situation_seen')}
					description={t('situation_seen_desc')}
					icon={<Icon as={EyeIcon} size={24} />}
				/>
			</RadioGroup>
			{errors.situation ? <FieldError className="mt-3">{t('situation_required')}</FieldError> : null}
			<NoteField {...props} />
			<FormField
				label={t('email_label')}
				hint={t('email_help')}
				error={errors.email ? t('email_invalid') : undefined}
				className="mt-8"
			>
				<Input
					value={values.email}
					onChangeText={(next) => set({ email: next })}
					keyboardType="email-address"
					inputMode="email"
					autoComplete="email"
					autoCapitalize="none"
					autoCorrect={false}
				/>
			</FormField>
		</View>
	);
}

/** Sighting step 2: Pravkar, Danes (the time) or Drugič (the date and the time), prefilled with now. */
function WhenStep({ values, set, errors }: StepProps) {
	const t = useTranslations('report_found');
	const locale = useLocale();
	const choose = (when: When) => {
		const now = new Date();
		set({
			when,
			...(when !== 'now' && !values.time && { time: formatTime(now, locale) }),
			...(when === 'other' && !values.date && { date: formatDay(now, locale) }),
		});
	};
	return (
		<View>
			<RadioGroup
				value={values.when}
				onValueChange={(when) => choose(when as When)}
				aria-label={t('sighting_when')}
				className="mt-6 gap-3"
			>
				{WHEN.map((when) => (
					<ChoiceRow key={when} value={when} title={t(`sighting_when_${when}`)} />
				))}
			</RadioGroup>
			{values.when !== 'now' ? (
				<View className="mt-5 flex-row flex-wrap gap-5">
					{values.when === 'other' ? (
						<FormField label={t('sighting_date')} className="min-w-40 flex-1">
							<Input
								value={values.date}
								onChangeText={(date) => set({ date })}
								keyboardType="numbers-and-punctuation"
								autoComplete="off"
								style={{ fontVariant: ['tabular-nums'] }}
							/>
						</FormField>
					) : null}
					<FormField label={t('sighting_time')} className="w-32">
						<Input
							value={values.time}
							onChangeText={(time) => set({ time })}
							keyboardType="numbers-and-punctuation"
							autoComplete="off"
							style={{ fontVariant: ['tabular-nums'] }}
						/>
					</FormField>
				</View>
			) : null}
			{errors.when ? <FieldError className="mt-3">{t('sighting_when_invalid')}</FieldError> : null}
		</View>
	);
}

/** Publish (P7 M5): one line per answer, each with "Uredi". */
function SummaryRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
	const tc = useTranslations('common');
	return (
		<View className="flex-row items-start gap-3">
			<View accessible className="min-w-0 flex-1">
				<Text className="font-sans-bold text-sm text-muted-foreground">{label}</Text>
				{typeof children === 'string' ? <Text className="mt-0.5">{children}</Text> : children}
			</View>
			<Button variant="text" className="-mr-3 -mt-2" aria-label={`${tc('edit')}: ${label}`} onPress={onEdit}>
				{tc('edit')}
			</Button>
		</View>
	);
}

/** Why Publish did not go through (P7 C3): a rate limit disables it until `until`; a failed check retries itself. */
type SendError = { text: string; until?: number; captcha?: boolean };

/**
 * P7 report found or sighted, without an account (FR-006). `entry` `found` or `sighted` (the Report sheet) runs the
 * five steps; `linked` (P9 "Sporoči opažanje", `?type=sighted&linked_report_id=`) the short sighting flow with the
 * lost pet on top. Photos upload while the flow goes on; the draft (C17) is saved on each step and restored on return.
 * Publish stores the report in the outbox (C17 submitReport) with the original capture time; online it is sent at
 * once and M6 shows the private link (the token stays in secure storage), offline Q1 waits and turns into M6 when sent.
 */
export function FoundFlow({ entry, linked }: { entry: 'found' | 'sighted'; linked?: Linked }) {
	const t = useTranslations('report_found');
	const tc = useTranslations('common');
	const tl = useTranslations('location');
	const tp = useTranslations('permissions');
	const ta = useTranslations('attributes');
	const tph = useTranslations('photos');
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const te = useTranslations('errors');
	/** The C1 code's sentence (errors.<code>), INTERNAL for anything unknown. */
	const errorText = (code: string) => te(code in en.errors ? (code as keyof typeof en.errors) : 'INTERNAL');
	const online = isOnline(useNetworkState());
	const steps = linked ? SIGHTING_STEPS : FOUND_STEPS;
	const last = steps[steps.length - 1]!;
	const photoStep: Step = linked ? 'extra' : 'photo';
	const draftId = linked ? `sighted-${linked.id}` : entry;
	const kind: DraftKind = linked || entry === 'sighted' ? 'sighted' : 'found';
	const mode = linked || entry === 'sighted' ? 'sighted' : 'found';

	const [values, setValues] = React.useState<FoundValues>(() => ({
		colours: [],
		note: '',
		email: '',
		when: 'now',
		date: '',
		time: '',
		startedAt: new Date().toISOString(),
		...(entry === 'sighted' && !linked && { situation: 'seen' as const }),
	}));
	const set = (change: Partial<FoundValues>) => setValues((prev) => ({ ...prev, ...change }));
	const [step, setStep] = React.useState<Step>(steps[0]!);
	const index = steps.indexOf(step);
	const [attempted, setAttempted] = React.useState(false);
	const [toReview, setToReview] = React.useState(false);
	const [photos, setPhotos] = React.useState<PickedPhoto[]>([]);
	const picker = React.useRef<PhotoPickerHandle>(null);
	const [primer, setPrimer] = React.useState(false);
	const primerResult = React.useRef<(granted: boolean) => void>(null);
	const [cameraDenied, setCameraDenied] = React.useState(false);
	// The photo's place wins over GPS; both are coarsened once when they arrive (C6).
	const [exif, setExif] = React.useState<Offered>();
	// The listing's species, when the link did not carry it.
	const [listed, setListed] = React.useState<Species>();
	const { fix, locating } = useGpsFix();
	const [picking, setPicking] = React.useState(false);
	const [closing, setClosing] = React.useState(false);
	const [sending, setSending] = React.useState(false);
	const sendingRef = React.useRef(false);
	const [sendError, setSendError] = React.useState<SendError>();
	const [submitted, setSubmitted] = React.useState<Submitted>();
	const [done, setDone] = React.useState<Submitted>();
	const scroll = React.useRef<ScrollView>(null);
	const { items, remove } = useOutbox();
	const item = submitted ? items.find((i) => i.id === submitted.outboxId) : undefined;
	const doneItem = done ? items.find((i) => i.id === done.outboxId) : undefined;

	React.useEffect(() => track('report_found_start'), []);

	React.useEffect(() => {
		let alive = true;
		loadDraft(draftId)
			.then((draft) => {
				if (!alive || !draft) return;
				// The draft keeps its own startedAt: the capture time without a photo time is when the flow started.
				setValues((prev) => ({ ...prev, ...draft.values }));
				if (steps.includes(draft.step)) setStep(draft.step);
			})
			.catch(() => {});
		ImagePicker.getCameraPermissionsAsync().then(
			(permission) => alive && setCameraDenied(!permission.granted && !permission.canAskAgain),
			() => {}
		);
		return () => {
			alive = false;
		};
		// Once per flow: the draft id and its steps do not change while it is open.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// "Kje": the chosen place, else the photo's, else the GPS fix; with none of them the picker opens at once.
	const where: { point: LatLng; source?: Source } | undefined = values.location
		? { point: values.location, source: values.source }
		: exif
			? { point: exif.coarse, source: 'exif' }
			: fix && { point: fix.coarse, source: 'gps' };
	const suggested = exif ? { ...exif.raw, source: 'exif' as const } : fix && { ...fix.raw, source: 'gps' as const };
	const showPicker = step === 'where' && (picking || (!where && !locating));

	const reverse = useReversePlaceQuery(online && where ? where.point : skipToken);
	const address = !where
		? ''
		: !online
			? tl(where.source === 'gps' ? 'offline_gps_set' : 'address_unknown')
			: reverse.currentData === undefined && !reverse.isError
				? tc('loading')
				: (reverse.currentData?.label ?? tl('address_unknown'));

	const go = (next: Step) => {
		setAttempted(false);
		setPicking(false);
		setStep(next);
		scroll.current?.scrollTo({ y: 0, animated: false });
	};
	const advance = (current = values) => {
		const target = toReview ? last : steps[index + 1]!;
		if (target === last) setToReview(false);
		go(target);
		void saveDraft(draftId, kind, { step: target, values: current }).catch(() => {});
	};
	const next = () => {
		setAttempted(true);
		if (Object.keys(stepErrors(step, values)).length > 0) return;
		// Naprej on "Kje" takes the offered place into the form.
		if (step === 'where' && !values.location && where) {
			const current = { ...values, location: where.point, source: where.source };
			setValues(current);
			return advance(current);
		}
		advance();
	};
	const edit = (target: Step) => {
		setToReview(true);
		go(target);
	};
	const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
	const back = () => {
		if (done) return leave();
		if (picking) return setPicking(false);
		if (index > 0) return go(steps[index - 1]!);
		setClosing(true);
	};
	const hardwareBack = React.useEffectEvent(back);
	React.useEffect(() => {
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			hardwareBack();
			return true;
		});
		return () => subscription.remove();
	}, []);

	const cameraPrimer = () =>
		new Promise<boolean>((resolve) => {
			primerResult.current = resolve;
			setPrimer(true);
		});

	const publish = async () => {
		if (sending || sendingRef.current || sendError?.until) return;
		setSendError(undefined);
		for (const s of steps) {
			if (Object.keys(stepErrors(s, values)).length > 0) {
				edit(s);
				return setAttempted(true);
			}
		}
		// Found reports need a photo (C4: 1 to 5); a sighting may have none.
		if (!linked && photos.length === 0) return edit('photo');
		const species = linked ? (linked.species ?? listed) : values.species;
		const location = values.location;
		if (!species || !location) return setSendError({ text: errorText('VALIDATION') });
		// A ref too: two presses in one tick both see `sending` false.
		sendingRef.current = true;
		setSending(true);
		try {
			const { outboxId } = await submitReport(
				{ ...outboxPayload({ ...values, species, location }, linked), photos },
				{ capturedAt: capturedAt(values, Boolean(linked)) }
			);
			setSubmitted({
				outboxId,
				point: location,
				kind: !linked && values.situation === 'have' ? 'found' : 'sighted',
				linked: Boolean(linked),
				emailed: !linked && values.email.trim() !== '',
			});
		} catch {
			sendingRef.current = false;
			setSending(false);
			setSendError({ text: errorText('INTERNAL') });
		}
	};

	// The outbox answers Publish: sent (M6) or waiting for the network (Q1) closes the flow; a rate limit, a failed
	// check or a refusal keeps the form, and that outbox item goes so the next Publish sends the edited answers.
	const settling = React.useRef<string>(null);
	const settle = React.useEffectEvent((current: OutboxItem) => {
		if (!submitted || settling.current === current.id) return;
		settling.current = current.id;
		const code = current.last_error_code;
		if (current.status === 'sent' || (current.status === 'queued' && code !== 'RATE_LIMITED')) {
			void dropDraft(draftId)
				.catch(() => {})
				.then(() => setDone(submitted));
			return;
		}
		let error: SendError;
		if (code === 'RATE_LIMITED') {
			const until = current.next_attempt_at ?? Date.now();
			const minutes = Math.max(1, Math.ceil((until - Date.now()) / 60_000));
			error = { text: minutes > 60 ? t('limit_day') : t('limit_hour', { minutes }), until };
		} else if (code === 'CAPTCHA_REQUIRED') error = { text: t('captcha_failed'), captcha: true };
		else error = { text: errorText(code ?? 'INTERNAL') };
		void remove(current.id)
			.catch(() => {})
			.then(() => {
				sendingRef.current = false;
				setSending(false);
				setSubmitted(undefined);
				setSendError(error);
			});
	});
	React.useEffect(() => {
		if (item && (item.status === 'sent' || (item.attempts > 0 && item.status !== 'sending'))) settle(item);
	}, [item]);

	const retryPublish = React.useEffectEvent(() => void publish());
	const clearLimit = React.useEffectEvent(() => setSendError(undefined));
	React.useEffect(() => {
		if (step !== last || !sendError) return;
		if (sendError.captcha) {
			const timer = setTimeout(retryPublish, CAPTCHA_RETRY_MS);
			return () => clearTimeout(timer);
		}
		if (sendError.until) {
			const timer = setTimeout(clearLimit, Math.max(0, sendError.until - Date.now()));
			return () => clearTimeout(timer);
		}
	}, [sendError, step, last]);

	// P7 M5: "Preverjamo …" once the Turnstile check has run for 2 s.
	const captchaId = useCaptchaRequest();
	const [slowCaptcha, setSlowCaptcha] = React.useState<number | null>(null);
	React.useEffect(() => {
		if (captchaId === null) return;
		const timer = setTimeout(() => setSlowCaptcha(captchaId), CAPTCHA_LINE_MS);
		return () => clearTimeout(timer);
	}, [captchaId]);
	const checking = captchaId !== null && slowCaptcha === captchaId;

	if (done)
		return (
			<FoundDone
				submitted={done}
				item={doneItem}
				onLeave={leave}
				onCancel={() => void remove(done.outboxId).finally(leave)}
			/>
		);

	const errors = attempted ? stepErrors(step, values) : {};
	const stepProps = { values, set, errors };
	// The limit's timer clears the note when the time is up.
	const blocked = sendError?.until !== undefined;
	const titles: Record<Step, string> = {
		photo: t('photo_title'),
		what: t('species_title'),
		where: linked ? t('sighting_where') : tl(mode === 'sighted' ? 'title_sighted' : 'title_found'),
		situation: t('situation_title'),
		send: t('send_title'),
		when: t('sighting_when'),
		extra: t('sighting_photo'),
	};
	const animal = [
		values.species && t(`species_${values.species}`),
		values.size && ta(`size.${values.size}`),
		values.colours.map((colour) => ta(`colours.${colour}`)).join(', '),
	]
		.filter(Boolean)
		.join(' · ');
	const emptyPhotos = step === 'photo' && photos.length === 0;

	return (
		<>
			<SafeAreaView edges={['top']} className="flex-1 bg-background">
				<View className="h-14 flex-row items-center gap-2 px-3">
					<Button variant="ghost" size="icon" aria-label={tc('back')} onPress={back}>
						<Icon as={CaretLeftIcon} size={24} />
					</Button>
					<StepBars current={index + 1} total={steps.length} />
					<Button variant="ghost" size="icon" aria-label={tc('close')} onPress={() => setClosing(true)}>
						<Icon as={XIcon} size={24} />
					</Button>
				</View>

				{showPicker ? (
					<LocationPicker
						mode={mode}
						value={values.location && { point: values.location }}
						suggested={suggested}
						onChange={({ point, source }) => {
							set({ location: point, source });
							advance({ ...values, location: point, source });
						}}
					/>
				) : null}

				{/* Never unmounted while the flow is open, so photo uploads go on behind the later steps. */}
				<KeyboardAvoidingView behavior="padding" className="flex-1" style={showPicker ? hidden : undefined}>
					<ScrollView
						ref={scroll}
						keyboardShouldPersistTaps="handled"
						contentContainerClassName="grow px-5 pb-8 pt-2"
					>
						{linked?.code ? <LinkedPet code={linked.code} onSpecies={setListed} /> : null}
						{emptyPhotos ? (
							<View className="mb-6">
								<Spot icon={CameraIcon} />
							</View>
						) : null}
						<Heading key={step}>{titles[step]}</Heading>
						{step === 'photo' ? <Text className="mt-3 text-lg">{t('photo_help')}</Text> : null}
						{emptyPhotos ? (
							<Line icon={TimerIcon} weight="bold" className="mt-6">
								{t('intro_note')}
							</Line>
						) : null}
						{step === 'extra' ? <Text className="mt-3 text-lg">{t('sighting_photo_help')}</Text> : null}
						<View style={step === photoStep ? undefined : hidden}>
							{emptyPhotos && cameraDenied ? (
								<Note
									icon={CameraSlashIcon}
									iconClassName="text-foreground"
									role="status"
									className="mt-6"
								>
									{tp('camera_denied')}
								</Note>
							) : null}
							<PhotoPicker
								ref={picker}
								draft={draftId}
								kind={kind}
								tiles={!emptyPhotos}
								cameraPrimer={cameraPrimer}
								onChange={setPhotos}
								onExif={({ lat, lng, takenAt }) => {
									if (lat !== undefined && lng !== undefined)
										setExif((prev) => prev ?? offer({ lat, lng }));
									if (takenAt)
										setValues((prev) =>
											prev.takenAt && Date.parse(prev.takenAt) <= takenAt.getTime()
												? prev
												: { ...prev, takenAt: takenAt.toISOString() }
										);
								}}
								className="mt-6"
							/>
							{step === 'extra' ? <NoteField {...stepProps} sighting /> : null}
						</View>
						{step === 'what' ? <WhatStep {...stepProps} /> : null}
						{step === 'where' ? (
							<WhereRow
								where={where}
								address={address}
								locating={locating}
								onChange={() => setPicking(true)}
							/>
						) : null}
						{step === 'situation' ? <SituationStep {...stepProps} /> : null}
						{step === 'when' ? <WhenStep {...stepProps} /> : null}
						{step === 'send' ? (
							<View className="mt-8 gap-5">
								<SummaryRow label={t('summary_photo')} onEdit={() => edit('photo')}>
									{photos[0] ? (
										<Image
											source={{ uri: photos[0].thumb.uri }}
											alt={tph('thumb_alt', { n: 1, total: photos.length })}
											className="mt-1 size-[72px] rounded-xl bg-muted"
										/>
									) : null}
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
							</View>
						) : null}
					</ScrollView>

					<View className="gap-4 px-5 pt-4" style={{ paddingBottom: Math.max(44, insets.bottom + 8) }}>
						{step === last && sendError ? (
							<Note
								icon={sendError.until ? HourglassMediumIcon : WarningCircleIcon}
								iconClassName={sendError.until ? 'text-foreground' : 'text-destructive'}
								role="alert"
							>
								{sendError.text}
							</Note>
						) : step === 'send' ? (
							<Line icon={ShieldCheckIcon}>{t('privacy_line')}</Line>
						) : null}
						{step === last && sending && checking ? (
							<Text aria-live="polite" className="text-sm text-muted-foreground">
								{t('captcha_checking')}
							</Text>
						) : null}
						{emptyPhotos ? (
							<View className="gap-1">
								{cameraDenied ? null : (
									<Button size="lg" onPress={() => void picker.current?.pick('camera')}>
										<Icon as={CameraIcon} />
										{t('photo_take')}
									</Button>
								)}
								<Button
									size={cameraDenied ? 'lg' : undefined}
									variant={cameraDenied ? 'default' : 'text'}
									onPress={() => void picker.current?.pick('gallery')}
								>
									<Icon as={ImagesIcon} />
									{t('photo_gallery')}
								</Button>
							</View>
						) : step === last ? (
							<Button
								size="lg"
								loading={sending}
								disabled={blocked}
								aria-busy={sending}
								onPress={() => void publish()}
							>
								{linked ? t('sighting_send') : sending ? t('publishing') : t('publish')}
							</Button>
						) : (
							<Button size="lg" disabled={step === 'where' && !where} onPress={next}>
								{tc('next')}
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
			<AlertDialog open={closing} onOpenChange={setClosing}>
				<AlertDialogContent>
					<AlertDialogTitle>{t('close_title')}</AlertDialogTitle>
					<AlertDialogDescription>{t('close_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogAction
							variant="secondary"
							onPress={() => {
								// "Osnutek ostane shranjen": the answers of this step too.
								void saveDraft(draftId, kind, { step, values }).catch(() => {});
								leave();
							}}
						>
							{tc('close')}
						</AlertDialogAction>
						<AlertDialogCancel>{tc('continue')}</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
