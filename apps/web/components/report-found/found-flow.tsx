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
import { TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { skipToken } from '@reduxjs/toolkit/query';
import { del, get, set as idbSet } from 'idb-keyval';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { type EventParams, getConsent, track } from '@zivali/analytics';
import { ApiError } from '@zivali/api/client';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { reportsApi, useCreateReportMutation, useGetReportQuery } from '@zivali/api/reports';
import type { QueryError } from '@zivali/api/rtk';
import { COLOURS, type CreateReportResponse, SIZES, type Size, type Species } from '@zivali/types';
import { coarsenPoint } from '@zivali/validation/geo';
import { errorCode, useErrorText } from '@/components/auth/parts';
import { useCaptcha } from '@/components/auth/turnstile';
import { LocationPicker } from '@/components/location/location-picker';
import { useAutoRetry } from '@/components/manage/use-auto-retry';
import type { LatLng } from '@/components/map/map-view';
import { PhotoPicker } from '@/components/photos/photo-picker';
import { clearPhotoDraft, type PickedPhoto } from '@/components/photos/use-photo-uploads';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Pill } from '@/components/ui/pill';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusLabel } from '@/components/ui/status-label';
import { Textarea } from '@/components/ui/textarea';
import { saveManageToken } from '@/lib/manage-link';
import { cn } from '@/lib/utils';

import { FoundDone } from './found-done';
import {
	capturedAt,
	createBody,
	FOUND_STEPS,
	type FoundValues,
	initialValues,
	isoDay,
	isoTime,
	keepsSubmission,
	type Linked,
	nextSubmission,
	NOTE_MAX,
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

const WHEN: readonly When[] = ['now', 'today', 'other'];
const CAT_SIZES: readonly Size[] = ['s', 'm', 'l'];
/** A GPS fix this fresh is good enough for "Kje"; a weak one must not hold the step. */
const FIX_MAX_AGE_MS = 10 * 60_000;
const FIX_WAIT_MS = 5000;
/** "Preverjamo …" once the Turnstile check has run this long (P7 M5). */
const CAPTCHA_LINE_MS = 2000;

const titleClass =
	'font-display text-[34px] leading-10 font-bold tracking-[-0.02em] text-balance outline-none lg:text-5xl lg:leading-[52px]';
const groupTitleClass = 'mt-8 mb-3 font-display text-xl font-semibold tracking-[-0.01em]';
const noteIconClass = 'mt-px size-[22px] shrink-0';

/** C4 §Drafts: idb-keyval `draft:<kind>:<id>`. The location in it is the coarsened point (C6); EXIF never goes in. */
type Draft = { step: Step; values: FoundValues };

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
function LinkedPet({ code, onSpecies }: { code: string; onSpecies: (species: Species) => void }) {
	const t = useTranslations('browse');
	const { data } = useGetReportQuery({ code });
	const species = data?.species;
	React.useEffect(() => {
		if (species) onSpecies(species);
	}, [species, onSpecies]);
	if (!data) return null;
	const thumb = data.photos[0]?.thumb_url;
	return (
		<div className="mt-6 flex items-center gap-3 lg:mt-8">
			{thumb ? (
				// eslint-disable-next-line @next/next/no-img-element -- the API's sized thumbnail (C5)
				<img src={thumb} alt="" width={48} height={48} className="size-12 rounded-xl bg-muted object-cover" />
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

/** Step 2 without AI (P7 C1): species is the one required answer; size and colour are optional pills. */
function WhatStep({ values, set, errors, labelledBy }: StepProps) {
	const t = useTranslations('report_found');
	const ta = useTranslations('attributes');
	const sizes = values.species === 'cat' ? CAT_SIZES : SIZES;
	return (
		<div className="mt-6">
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
				aria-labelledby={labelledBy}
				aria-invalid={errors.species || undefined}
				className="gap-3"
			>
				<ChoiceRow value="dog" title={t('species_dog')} icon={<DogIcon weight="bold" aria-hidden="true" />} />
				<ChoiceRow value="cat" title={t('species_cat')} icon={<CatIcon weight="bold" aria-hidden="true" />} />
			</RadioGroup>
			{errors.species && <FieldError className="mt-3">{t('species_required')}</FieldError>}
			<h2 className={groupTitleClass}>{t('size_label')}</h2>
			<div role="group" aria-label={t('size_label')} className="flex flex-wrap gap-2">
				{sizes.map((size) => (
					<Pill
						key={size}
						pressed={values.size === size}
						onPressedChange={(on) => set({ size: on ? size : undefined })}
					>
						{ta(`size.${size}`)}
					</Pill>
				))}
			</div>
			<h2 className={groupTitleClass}>{t('colour_label')}</h2>
			<div role="group" aria-label={t('colour_label')} className="flex flex-wrap gap-2">
				{COLOURS.map((colour) => (
					<Pill
						key={colour}
						pressed={values.colours.includes(colour)}
						onPressedChange={(on) =>
							set({
								colours: on ? [...values.colours, colour] : values.colours.filter((c) => c !== colour),
							})
						}
					>
						{ta(`colours.${colour}`)}
					</Pill>
				))}
			</div>
		</div>
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

function NoteField({ values, set, errors, sighting = false }: Omit<StepProps, 'labelledBy'> & { sighting?: boolean }) {
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
				onChange={(event) => set({ note: event.target.value })}
				rows={3}
				placeholder={t(sighting ? 'sighting_note_placeholder' : 'note_placeholder')}
			/>
		</FormField>
	);
}

/** Step 4 (P7 M4): have it or only saw it (nothing preselected for a find), the public note, the optional email. */
function SituationStep({ account, ...props }: StepProps & { account: boolean }) {
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
			<NoteField {...props} />
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
	linked,
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
	const tph = useTranslations('photos');
	const errorText = useErrorText();
	const trackSubmit = useTrackSubmit();
	const steps = linked ? SIGHTING_STEPS : FOUND_STEPS;
	const last = steps[steps.length - 1]!;
	const photoStep: Step = linked ? 'extra' : 'photo';
	const kind = linked || entry === 'sighted' ? 'sighted' : 'found';
	const draftId = linked ? `sighted-${linked.id}` : entry;
	const draftKey = `draft:${kind}:${draftId}`;

	const [values, setValues] = React.useState<FoundValues>(() => initialValues(entry));
	const set = React.useCallback((change: Partial<FoundValues>) => setValues((prev) => ({ ...prev, ...change })), []);
	const [step, setStep] = React.useState<Step>(steps[0]!);
	const index = steps.indexOf(step);
	const [attempted, setAttempted] = React.useState(false);
	const [toReview, setToReview] = React.useState(false);
	const [photos, setPhotos] = React.useState<PickedPhoto[]>([]);
	// The photo's place wins over GPS; both are coarsened once when they arrive (C6).
	const [exif, setExif] = React.useState<Offered>();
	const { fix, locating } = useGpsFix();
	const [picking, setPicking] = React.useState(false);
	// The listing's species, when the link did not carry it.
	const [listed, setListed] = React.useState<Species>();
	const [limit, setLimit] = React.useState<{ until: number; text: string }>();
	const [checking, setChecking] = React.useState(false);
	const root = React.useRef<HTMLElement>(null);
	const headingId = React.useId();

	React.useEffect(() => track('report_found_start'), []);

	// Restored silently, as on mobile; without a photo time the capture time is when the finder returned.
	React.useEffect(() => {
		let live = true;
		get<Draft>(draftKey)
			.then((draft) => {
				if (!live || !draft?.step || !draft.values) return;
				setValues((prev) => ({
					...prev,
					...draft.values,
					...(!draft.values.takenAt && { startedAt: new Date().toISOString() }),
				}));
				if (steps.includes(draft.step)) setStep(draft.step);
			})
			.catch(() => {});
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
	const reverse = useReversePlaceQuery(where ? where.point : skipToken);
	const address = !where
		? ''
		: reverse.currentData === undefined && !reverse.isError
			? tc('loading')
			: (reverse.currentData?.label ?? tl('address_unknown'));

	// Submit: the anonymous session (shared by the photo uploads, so there is only ever one sign-in), then create.
	const captcha = useCaptcha({ lazy: true });
	const { getToken } = captcha;
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
	const species = linked ? (linked.species ?? listed) : values.species;
	const send = React.useCallback(async (): Promise<CreateReportResponse> => {
		await session();
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
			if (errorCode(error) === 'RATE_LIMITED') {
				const seconds = Number((error as QueryError).data?.details?.retry_after_s) || 60;
				const minutes = Math.max(1, Math.ceil(seconds / 60));
				setLimit({
					until: Date.now() + seconds * 1000,
					text: minutes > 60 ? t('limit_day') : t('limit_hour', { minutes }),
				});
			}
			throw error;
		}
	}, [session, values, species, photoIds, linked, account, createReport, t]);
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
		const heading = root.current?.querySelector('h1');
		if (!heading) return;
		heading.tabIndex = -1;
		heading.focus();
	}, [step, inlinePicker, result]);

	const go = (next: Step) => {
		setAttempted(false);
		setPicking(false);
		setStep(next);
	};
	const advance = (current = values) => {
		const target = toReview ? last : steps[index + 1]!;
		if (target === last) setToReview(false);
		go(target);
		idbSet(draftKey, { step: target, values: current } satisfies Draft).catch(() => {});
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
	const back = () => index > 0 && go(steps[index - 1]!);
	const edit = (target: Step) => {
		setToReview(true);
		go(target);
	};
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
			for (const s of steps) {
				if (Object.keys(stepErrors(s, values)).length > 0) {
					edit(s);
					return setAttempted(true);
				}
			}
			// Found reports need a photo (C4: 1 to 5); a sighting may have none. Uploads still running finish first.
			if (uploading) return;
			if (!linked && photoIds.length === 0) return edit('photo');
			if (!values.location) return edit('where');
			if (!species) return;
			await submit.run();
		} finally {
			busy.current = false;
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

	const errors = attempted ? stepErrors(step, values) : {};
	const stepProps = { values, set, errors, labelledBy: headingId };
	const titles: Record<Step, string> = {
		photo: t('photo_title'),
		what: t('species_title'),
		where: linked ? t('sighting_where') : tl(kind === 'sighted' ? 'title_sighted' : 'title_found'),
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
	// The rate limit speaks through its own note while it lasts; any other failure keeps its note until the next try.
	const failure =
		submit.error && errorCode(submit.error) !== 'RATE_LIMITED'
			? errorCode(submit.error) === 'CAPTCHA_FAILED'
				? t('captcha_failed')
				: errorText(submit.error)
			: undefined;
	const noteId = `${headingId}-send-note`;

	return (
		<main id="main" ref={root} className="mx-auto box-content max-w-[560px] px-5 pt-6 pb-16 lg:pt-8 lg:pb-24">
			{captcha.widget}
			<StepBars current={index + 1} total={steps.length} />
			{linked?.code && <LinkedPet code={linked.code} onSpecies={setListed} />}

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
				<h1 key={step} id={headingId} className={cn(titleClass, 'mt-8 lg:mt-10')}>
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
						draft={draftId}
						onChange={setPhotos}
						beforeUpload={session}
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
					{step === 'extra' && <NoteField {...stepProps} sighting />}
				</div>
				{step === 'what' && <WhatStep {...stepProps} />}
				{step === 'where' &&
					(where ? (
						<WhereRow source={where.source} address={address} onChange={() => setPicking(true)} />
					) : (
						<div className="mt-8">
							<p className="sr-only">{tc('loading')}</p>
							<Skeleton aria-hidden="true" className="h-[104px] w-full rounded-row" />
						</div>
					))}
				{step === 'situation' && <SituationStep {...stepProps} account={account} />}
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
									className="mt-1 size-[72px] rounded-xl bg-muted object-cover"
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

				<div className="mt-10 grid gap-4 max-lg:sticky max-lg:bottom-0 max-lg:bg-background max-lg:pt-4 max-lg:pb-11">
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
					<p aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
						{step === last && sending && checking ? t('captcha_checking') : ''}
					</p>
					<div className="flex items-center gap-4">
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
									className="flex-1 lg:flex-none"
								>
									{tc('next')}
								</Button>
							)
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
		</main>
	);
}
