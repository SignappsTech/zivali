'use client';

import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import { CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { ImageSquareIcon } from '@phosphor-icons/react/dist/ssr/ImageSquare';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { NextIntlClientProvider, useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { useCreateAdMutation, useRequestAdImageUploadMutation, useUpdateAdMutation } from '@zivali/api/ads';
import { xhrPut } from '@zivali/api/photos';
import type { QueryError } from '@zivali/api/rtk';
import { type Ad, AD_SLOTS, type AdminAd, type AdSlot, type AdStatus, LOCALES, REGION_SLUGS } from '@zivali/types';
import { AdView } from '@/components/ads/ad-view';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Pill } from '@/components/ui/pill';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/client-navigation';
import { cn } from '@/lib/utils';

import { adminH1Class, ErrorNote, noteClass, noteIconClass, useErrorText } from '../directory/parts';
import { AdLoader } from './ad-detail';
import {
	type AdForm as FormState,
	adPhase,
	formOf,
	type ImageMeta,
	imageOk,
	LIMITS,
	type Problem,
	type Problems,
	serverProblems,
	toInput,
	validate,
} from './format';
import { MUNICIPALITIES } from './municipalities';
import { type AdMessages, type RegionNames, useNow } from './parts';

const sectionClass = 'grid gap-5';
const headingClass = 'font-display text-xl leading-7 font-semibold tracking-[-0.005em]';
const groupLabelClass = 'text-control font-bold';
const hintClass = 'text-sm text-muted-foreground';

type Picked = { file: File; url: string; meta: ImageMeta };

async function readImage(file: File): Promise<ImageMeta> {
	const size = await createImageBitmap(file).then(
		(bitmap) => {
			const { width, height } = bitmap;
			bitmap.close();
			return { width, height };
		},
		() => ({ width: 0, height: 0 })
	);
	return { ...size, bytes: file.size, type: file.type };
}

async function sha256(file: Blob): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const issuesOf = (error: unknown) => {
	const data = (error as Partial<QueryError> | undefined)?.data;
	return data?.code === 'VALIDATION' ? data.issues : undefined;
};

/** A required-or-not multi choice as filter pills (system §10.4) with its label, help and error. */
function PillGroup<T extends string | number>({
	label,
	options,
	value,
	onChange,
	hint,
	error,
	invalid,
}: {
	label: string;
	options: { value: T; label: string }[];
	value: T[];
	onChange: (value: T[]) => void;
	hint?: string;
	error?: string;
	/** Marks the group for the first-error focus. */
	invalid?: boolean;
}) {
	const id = React.useId();
	return (
		<div
			role="group"
			aria-labelledby={`${id}-label`}
			aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined}
			data-invalid={invalid || undefined}
			className="grid gap-2"
		>
			<span id={`${id}-label`} className={groupLabelClass}>
				{label}
			</span>
			<div className="flex flex-wrap gap-2">
				{options.map((option) => (
					<Pill
						key={option.value}
						pressed={value.includes(option.value)}
						onPressedChange={(pressed) =>
							onChange(pressed ? [...value, option.value] : value.filter((item) => item !== option.value))
						}
					>
						{option.label}
					</Pill>
				))}
			</div>
			{hint && (
				<p id={`${id}-hint`} className={hintClass}>
					{hint}
				</p>
			)}
			{error && <FieldError id={`${id}-error`}>{error}</FieldError>}
		</div>
	);
}

/** "37 / 140" beside the help text; screen readers get the limit from the help and the error. */
function Hint({ text, count, max }: { text?: string; count?: number; max?: number }) {
	const t = useTranslations('admin');
	return (
		<span className="flex items-start justify-between gap-4">
			<span>{text}</span>
			{max !== undefined && (
				<span
					aria-hidden="true"
					className={cn('shrink-0 tabular-nums', count! > max && 'font-bold text-destructive')}
				>
					{t('ads_char_count', { count: count!, max })}
				</span>
			)}
		</span>
	);
}

/**
 * The P21 unit drawn from the form (no request, no impression): any of the four slots, in SL or EN, light or dark.
 * The labels come from the `ads` catalogue of the chosen language.
 */
export function AdPreview({ ad, messages }: { ad: Ad; messages: AdMessages }) {
	const t = useTranslations('admin');
	const [slot, setSlot] = React.useState<AdSlot>('detail');
	const [locale, setLocale] = React.useState(useLocale() as 'sl' | 'en');
	const [dark, setDark] = React.useState(false);
	const choice = <T,>(label: string, options: { value: T; label: string }[], value: T, set: (value: T) => void) => (
		<div role="group" aria-label={label} className="flex flex-wrap gap-2">
			{options.map((option) => (
				<Pill key={option.label} pressed={option.value === value} onPressedChange={() => set(option.value)}>
					{option.label}
				</Pill>
			))}
		</div>
	);
	return (
		<div className="grid gap-4">
			{choice(
				t('ads_preview_slot'),
				AD_SLOTS.map((value) => ({ value, label: t(`ads_slot_${value}`) })),
				slot,
				setSlot
			)}
			{choice(
				t('ads_languages'),
				LOCALES.map((value) => ({ value, label: value.toUpperCase() })),
				locale,
				setLocale
			)}
			{choice(
				t('ads_preview_theme'),
				[
					{ value: false, label: t('ads_preview_light') },
					{ value: true, label: t('ads_preview_dark') },
				],
				dark,
				setDark
			)}
			<div
				lang={locale}
				className={cn(
					'flex justify-center rounded-card bg-background p-4 text-foreground inset-ring inset-ring-input/45',
					dark && 'dark'
				)}
			>
				<NextIntlClientProvider
					locale={locale}
					messages={{ ads: messages[locale] }}
					timeZone="Europe/Ljubljana"
				>
					<AdView ad={ad} slot={slot} className="w-full" />
				</NextIntlClientProvider>
			</div>
		</div>
	);
}

/**
 * P20 create and edit (one page, sections stacked) with the live preview; also the house-ad form (`house`: the
 * creative only, slots locked). Checks run on blur and on save, the server's per field after; the first problem gets
 * the focus. A new ad's image goes up after the ad exists (C14: the upload needs its id), so a new ad with a file is
 * created as a draft, the file uploaded, and the ad then saved with its image and status. Every write goes through
 * the admin API, which audits it.
 */
export function AdForm({
	ad,
	from,
	house = false,
	regions,
	messages,
	readOnly = false,
	onDone,
	onCancel,
}: {
	/** The ad being edited */
	ad?: AdminAd;
	/** The ad being duplicated (its image stays with it: keys belong to one ad) */
	from?: AdminAd;
	house?: boolean;
	regions: RegionNames;
	messages: AdMessages;
	/** An ended ad: shown, not changed (P20 states). */
	readOnly?: boolean;
	onDone: (id: string) => void;
	onCancel: () => void;
}) {
	const t = useTranslations('admin');
	const tCommon = useTranslations('common');
	const errorText = useErrorText();
	const formRef = React.useRef<HTMLFormElement>(null);
	const fileInput = React.useRef<HTMLInputElement>(null);
	const ids = React.useId();
	const [initial] = React.useState(() => formOf(ad ?? from, Boolean(from)));
	const [form, setForm] = React.useState(initial);
	const [problems, setProblems] = React.useState<Problems>({});
	const [failure, setFailure] = React.useState<string>();
	const [picked, setPicked] = React.useState<Picked | null>(null);
	const [removed, setRemoved] = React.useState(false);
	const [uploadFailed, setUploadFailed] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [leaving, setLeaving] = React.useState(false);
	const [query, setQuery] = React.useState('');
	// A new ad keeps the id it got on its first save, so a retry after a failed upload does not create it again.
	const [adId, setAdId] = React.useState(ad?.id);
	const [createAd] = useCreateAdMutation();
	const [updateAd] = useUpdateAdMutation();
	const [requestUpload] = useRequestAdImageUploadMutation();

	const dirty = JSON.stringify(form) !== JSON.stringify(initial) || Boolean(picked) || removed;
	React.useEffect(() => {
		if (!dirty || saving) return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	}, [dirty, saving]);
	React.useEffect(() => {
		if (picked) return () => URL.revokeObjectURL(picked.url);
	}, [picked]);

	const say = (problem?: Problem) =>
		problem ? t(problem.key as 'ads_err_too_long', problem.values as never) : undefined;
	const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
		setForm((current) => ({ ...current, [field]: value }));
	const text = (field: 'title' | 'body' | 'cta' | 'link_url' | 'image_alt') => ({
		value: form[field],
		onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(field, event.target.value),
		// On blur: this field's check only, so untouched fields stay quiet.
		onBlur: () => setProblems((current) => ({ ...current, [field]: validate(form, house)[field] })),
	});
	const imageUrl = picked?.url ?? (removed ? null : (ad?.image_url ?? null));

	async function pick(file: File | undefined) {
		if (!file) return;
		const meta = await readImage(file);
		if (!imageOk(meta)) {
			setProblems((current) => ({ ...current, image: { key: 'ads_err_image' } }));
			return;
		}
		setPicked({ file, url: URL.createObjectURL(file), meta });
		setRemoved(false);
		setUploadFailed(false);
		setProblems((current) => ({ ...current, image: undefined }));
	}

	function focusFirst() {
		requestAnimationFrame(() =>
			formRef.current?.querySelector<HTMLElement>('[aria-invalid=true], [data-invalid] button')?.focus()
		);
	}

	/** Presigned PUT of the picked file; the key it returns goes into the next save. */
	async function upload(id: string, { file, meta }: Picked): Promise<string> {
		const { upload: target, image } = await requestUpload({
			id,
			body: {
				sha256: await sha256(file),
				width: meta.width,
				height: meta.height,
				bytes: meta.bytes,
				content_type: meta.type as 'image/jpeg' | 'image/png',
			},
		}).unwrap();
		await xhrPut(target, file, {});
		return image;
	}

	async function save(status?: AdStatus) {
		const next = status ? { ...form, status } : form;
		const local = validate(next, house);
		const all = { ...local, ...(problems.image && { image: problems.image }) };
		setProblems(all);
		setFailure(undefined);
		if (Object.keys(all).length) return focusFirst();
		if (status) setForm(next);
		const body = toInput(next, house, ctaDefault);
		setSaving(true);
		try {
			let id = adId;
			const created = !id;
			if (!id) {
				id = (await createAd(picked ? { ...body, status: 'draft' } : body).unwrap()).id;
				setAdId(id);
			}
			let image: string | null | undefined = removed ? null : undefined;
			if (picked) {
				try {
					image = await upload(id, picked);
				} catch (error) {
					if (issuesOf(error)) throw error;
					setUploadFailed(true);
					return;
				}
			}
			setUploadFailed(false);
			// Created just now without a file: the create saved it all.
			if (!created || image !== undefined)
				await updateAd({ id, body: image === undefined ? body : { ...body, image } }).unwrap();
			toast.success(t('saved_logged'));
			onDone(id);
		} catch (error) {
			const issues = issuesOf(error);
			if (issues?.length) {
				const { problems: server, other } = serverProblems(issues, next);
				setProblems(server);
				if (other.length) setFailure(errorText(error));
				focusFirst();
			} else setFailure(errorText(error));
		} finally {
			setSaving(false);
		}
	}

	// The unit's own default in the ad's language (SL first): what an empty button text is saved as.
	const ctaDefault = messages[form.locales.includes('sl') || !form.locales.length ? 'sl' : 'en'].learn_more ?? '';
	const preview: Ad = {
		id: ad?.id ?? 'preview',
		title: form.title,
		body: form.body,
		cta: form.cta.trim() || ctaDefault,
		image_url: imageUrl,
		image_alt: form.image_alt,
		click_url: '',
		is_house: house,
		label: 'Oglas',
	};
	const chosen = MUNICIPALITIES.filter(([id]) => form.municipality_ids.includes(id));
	const addable = MUNICIPALITIES.filter(([id]) => !form.municipality_ids.includes(id));
	const imageError = say(problems.image) ?? (uploadFailed ? t('ads_upload_failed') : undefined);

	return (
		<div className={cn(!house && 'lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-12')}>
			<form
				ref={formRef}
				noValidate
				aria-label={house ? `${t('ads_action_edit')}: ${form.title}` : undefined}
				onSubmit={(event) => {
					event.preventDefault();
					void save();
				}}
				className="grid min-w-0 gap-10"
			>
				{failure && <ErrorNote>{failure}</ErrorNote>}

				<fieldset disabled={readOnly} className="grid min-w-0 gap-10">
					<section aria-labelledby={`${ids}-creative`} className={sectionClass}>
						<h2 id={`${ids}-creative`} className={headingClass}>
							{t('ads_section_creative')}
						</h2>

						<div
							role="group"
							aria-labelledby={`${ids}-image`}
							aria-describedby={`${ids}-image-help${imageError ? ` ${ids}-image-error` : ''}`}
							data-invalid={imageError ? true : undefined}
							className="grid gap-3"
						>
							<span id={`${ids}-image`} className={groupLabelClass}>
								{t('ads_image')}
							</span>
							{imageUrl ? (
								<div className="flex items-center gap-4">
									{/* eslint-disable-next-line @next/next/no-img-element -- a local object URL or the API's media URL */}
									<img
										src={imageUrl}
										alt={form.image_alt}
										width={160}
										height={120}
										className="aspect-[4/3] w-40 shrink-0 rounded-row bg-muted object-cover"
									/>
									<div className="min-w-0">
										{picked && (
											<>
												<p className="truncate font-bold">{picked.file.name}</p>
												<p className={cn(hintClass, 'tabular-nums')}>
													{picked.meta.type === 'image/png' ? 'PNG' : 'JPG'} ·{' '}
													{picked.meta.width} × {picked.meta.height} ·{' '}
													{Math.round(picked.meta.bytes / 1024)} KB
												</p>
											</>
										)}
										<div className="-ml-3 flex flex-wrap gap-1">
											<Button
												type="button"
												variant="text"
												size="sm"
												onClick={() => fileInput.current?.click()}
											>
												<ArrowsClockwiseIcon weight="bold" aria-hidden="true" />
												{t('ads_image_replace')}
											</Button>
											{(picked || house) && (
												<Button
													type="button"
													variant="text"
													size="sm"
													onClick={() => {
														if (picked) setPicked(null);
														else setRemoved(true);
													}}
												>
													<TrashIcon weight="bold" aria-hidden="true" />
													{t('ads_image_remove')}
												</Button>
											)}
										</div>
									</div>
								</div>
							) : (
								<div
									onDragOver={(event) => event.preventDefault()}
									onDrop={(event) => {
										event.preventDefault();
										void pick(event.dataTransfer.files[0]);
									}}
									className="flex flex-col items-center gap-3 rounded-row bg-muted p-6 text-center"
								>
									<ImageSquareIcon aria-hidden="true" className="size-8 text-muted-foreground" />
									<p>{t('ads_image_drop')}</p>
									<Button
										type="button"
										variant="secondary"
										size="sm"
										onClick={() => fileInput.current?.click()}
									>
										{t('ads_image_choose')}
									</Button>
								</div>
							)}
							<input
								ref={fileInput}
								type="file"
								accept="image/jpeg,image/png"
								tabIndex={-1}
								aria-hidden="true"
								className="sr-only"
								onChange={(event) => {
									void pick(event.target.files?.[0]);
									event.target.value = '';
								}}
							/>
							<p id={`${ids}-image-help`} className={hintClass}>
								{t('ads_image_help')}
							</p>
							{imageError && (
								<FieldError id={`${ids}-image-error`}>
									{imageError}
									{uploadFailed && !problems.image && (
										<Button
											type="button"
											variant="text"
											size="sm"
											className="ml-1"
											loading={saving}
											onClick={() => void save()}
										>
											{t('retry')}
										</Button>
									)}
								</FieldError>
							)}
						</div>

						<FormField
							label={t('ads_alt')}
							hint={<Hint text={t('ads_alt_help')} count={form.image_alt.trim().length} max={140} />}
							error={say(problems.image_alt)}
						>
							<Textarea rows={2} required {...text('image_alt')} />
						</FormField>
						<FormField
							label={t('ads_title_label')}
							hint={<Hint count={form.title.trim().length} max={LIMITS.title} />}
							error={say(problems.title)}
						>
							<Input required {...text('title')} />
						</FormField>
						<FormField
							label={t('ads_text_label')}
							hint={<Hint count={form.body.trim().length} max={LIMITS.body} />}
							error={say(problems.body)}
						>
							<Textarea rows={2} required {...text('body')} />
						</FormField>
						<FormField
							label={t('ads_cta_label')}
							hint={<Hint text={t('ads_cta_help')} count={form.cta.trim().length} max={LIMITS.cta} />}
							error={say(problems.cta)}
						>
							<Input placeholder={ctaDefault} {...text('cta')} />
						</FormField>
						<FormField
							label={t('ads_link')}
							hint={
								<>
									<ArrowSquareOutIcon
										weight="bold"
										aria-hidden="true"
										className="inline size-4 align-[-2px]"
									/>{' '}
									{t('ads_link_help')}
								</>
							}
							error={say(problems.link_url)}
						>
							<Input type="url" inputMode="url" autoComplete="off" required {...text('link_url')} />
						</FormField>
					</section>

					<section aria-labelledby={`${ids}-where`} className={sectionClass}>
						<h2 id={`${ids}-where`} className={headingClass}>
							{t('ads_section_where')}
						</h2>
						{house ? (
							<>
								<fieldset disabled className="min-w-0">
									<PillGroup
										label={t('ads_slots')}
										options={AD_SLOTS.map((value) => ({ value, label: t(`ads_slot_${value}`) }))}
										value={form.slots}
										onChange={() => undefined}
									/>
								</fieldset>
								<div className={noteClass} role="note">
									<LockSimpleIcon weight="fill" aria-hidden="true" className={noteIconClass} />
									<p>{t('house_locked')}</p>
								</div>
							</>
						) : (
							<>
								<PillGroup
									label={t('ads_slots')}
									options={AD_SLOTS.map((value) => ({ value, label: t(`ads_slot_${value}`) }))}
									value={form.slots}
									onChange={(slots) => {
										set('slots', slots);
										if (slots.length) setProblems((current) => ({ ...current, slots: undefined }));
									}}
									error={say(problems.slots)}
									invalid={Boolean(problems.slots)}
								/>
								<PillGroup
									label={t('ads_languages')}
									options={LOCALES.map((value) => ({ value, label: value.toUpperCase() }))}
									value={form.locales}
									onChange={(locales) => {
										set('locales', locales);
										if (locales.length)
											setProblems((current) => ({ ...current, locales: undefined }));
									}}
									error={say(problems.locales)}
									invalid={Boolean(problems.locales)}
								/>
							</>
						)}
					</section>

					{!house && (
						<>
							<section aria-labelledby={`${ids}-who`} className={sectionClass}>
								<h2 id={`${ids}-who`} className={headingClass}>
									{t('ads_section_who')}
								</h2>
								<PillGroup
									label={t('ads_regions')}
									options={REGION_SLUGS.map((slug, index) => ({
										value: index + 1,
										label: regions[slug] ?? slug,
									}))}
									value={form.region_ids}
									onChange={(region_ids) => set('region_ids', region_ids)}
								/>
								<div className="grid gap-2">
									<FormField label={t('ads_municipalities')}>
										<div className="relative">
											<MagnifyingGlassIcon
												weight="bold"
												aria-hidden="true"
												className="pointer-events-none absolute top-1/2 left-0.5 size-5 -translate-y-1/2 text-muted-foreground"
											/>
											<Input
												type="search"
												list={`${ids}-municipalities`}
												autoComplete="off"
												placeholder={t('ads_municipality_search')}
												className="pl-8"
												value={query}
												onChange={(event) => {
													const match = addable.find(
														([, name]) => name === event.target.value
													);
													if (match)
														set('municipality_ids', [...form.municipality_ids, match[0]]);
													setQuery(match ? '' : event.target.value);
												}}
											/>
										</div>
									</FormField>
									<datalist id={`${ids}-municipalities`}>
										{addable.map(([id, name]) => (
											<option key={id} value={name} />
										))}
									</datalist>
									{chosen.length > 0 && (
										<ul aria-label={t('ads_municipalities')} className="flex flex-wrap gap-2">
											{chosen.map(([id, name]) => (
												<li key={id}>
													<Button
														type="button"
														variant="secondary"
														size="sm"
														aria-label={t('ads_municipality_remove', { name })}
														className="rounded-chip text-control"
														onClick={() =>
															set(
																'municipality_ids',
																form.municipality_ids.filter((other) => other !== id)
															)
														}
													>
														{name}
														<XIcon weight="bold" aria-hidden="true" className="size-4" />
													</Button>
												</li>
											))}
										</ul>
									)}
								</div>
								<PillGroup
									label={t('ads_species')}
									options={[
										{ value: 'dog' as const, label: t('ads_species_dogs') },
										{ value: 'cat' as const, label: t('ads_species_cats') },
									]}
									value={form.species}
									onChange={(species) => set('species', species)}
									hint={t('ads_all_hint')}
								/>
							</section>

							<section aria-labelledby={`${ids}-when`} className={sectionClass}>
								<h2 id={`${ids}-when`} className={headingClass}>
									{t('ads_section_when')}
								</h2>
								<div className="grid gap-6 sm:grid-cols-2">
									<FormField label={t('ads_start')}>
										<Input
											type="date"
											className="tabular-nums"
											value={form.start}
											onChange={(event) => set('start', event.target.value)}
										/>
									</FormField>
									<FormField label={t('ads_end')} error={say(problems.end)}>
										<Input
											type="date"
											className="tabular-nums"
											value={form.end}
											min={form.start || undefined}
											onChange={(event) => set('end', event.target.value)}
											onBlur={() =>
												setProblems((current) => ({ ...current, end: validate(form).end }))
											}
										/>
									</FormField>
								</div>
								<FormField label={t('ads_status')}>
									<Select
										value={form.status}
										onValueChange={(status) => set('status', status as AdStatus)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="draft">{t('ads_status_draft')}</SelectItem>
											<SelectItem value="active">{t('ads_status_scheduled')}</SelectItem>
											{initial.status === 'paused' && (
												<SelectItem value="paused">{t('ads_status_paused')}</SelectItem>
											)}
										</SelectContent>
									</Select>
								</FormField>
								<div className="grid gap-1">
									<label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
										<Checkbox
											checked={form.exclusive}
											onCheckedChange={(checked) => set('exclusive', checked === true)}
											aria-invalid={problems.exclusive ? true : undefined}
											aria-describedby={`${ids}-exclusive-help${problems.exclusive ? ` ${ids}-exclusive-error` : ''}`}
										/>
										<span className="font-bold">{t('ads_exclusive')}</span>
									</label>
									<p id={`${ids}-exclusive-help`} className={cn(hintClass, 'ml-9')}>
										{t('ads_exclusive_help')}
									</p>
									{problems.exclusive && (
										<FieldError id={`${ids}-exclusive-error`} className="ml-9">
											{say(problems.exclusive)}
										</FieldError>
									)}
								</div>
							</section>
						</>
					)}
				</fieldset>

				<div
					role="group"
					aria-label={t('row_actions')}
					className="sticky bottom-0 z-[2] flex flex-wrap items-center gap-x-3 gap-y-2 rounded-row bg-card px-4 py-3"
				>
					{!readOnly && (
						<Button type="submit" size="lg" loading={saving}>
							{t('ads_save')}
						</Button>
					)}
					{!house && !readOnly && (
						<Button type="button" variant="text" disabled={saving} onClick={() => void save('draft')}>
							{t('ads_save_draft')}
						</Button>
					)}
					<Button type="button" variant="text" onClick={() => (dirty ? setLeaving(true) : onCancel())}>
						{t('ads_cancel')}
					</Button>
					{!house && (
						<Sheet>
							<SheetTrigger asChild>
								<Button type="button" variant="secondary" size="sm" className="ml-auto lg:hidden">
									<EyeIcon weight="bold" aria-hidden="true" />
									{t('ads_preview')}
								</Button>
							</SheetTrigger>
							<SheetContent closeLabel={tCommon('close')} aria-describedby={undefined}>
								<SheetTitle className="mt-4 mb-4">{t('ads_preview')}</SheetTitle>
								<AdPreview ad={preview} messages={messages} />
							</SheetContent>
						</Sheet>
					)}
				</div>
			</form>

			{!house && (
				<aside aria-labelledby={`${ids}-preview`} className="sticky top-6 max-lg:hidden">
					<h2 id={`${ids}-preview`} className={cn(headingClass, 'mb-4')}>
						{t('ads_preview')}
					</h2>
					<AdPreview ad={preview} messages={messages} />
				</aside>
			)}

			<AlertDialog open={leaving} onOpenChange={setLeaving}>
				<AlertDialogContent>
					<AlertDialogTitle>{tCommon('discard_title')}</AlertDialogTitle>
					<AlertDialogDescription>{tCommon('discard_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogAction variant="destructive" onClick={onCancel}>
							{tCommon('discard_confirm')}
						</AlertDialogAction>
						<AlertDialogCancel className={buttonVariants({ variant: 'text' })}>
							{tCommon('keep_editing')}
						</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

/** P20 "ended ads read only": the note with Duplicate above the form, which cannot be changed. */
export function EndedNote({ onDuplicate }: { onDuplicate: () => void }) {
	const t = useTranslations('admin');
	return (
		<div className={noteClass} role="note">
			<InfoIcon weight="fill" aria-hidden="true" className={noteIconClass} />
			<div>
				<p>{t('ads_ended_note')}</p>
				<Button type="button" variant="text" size="sm" className="mt-1 -ml-3" onClick={onDuplicate}>
					<CopyIcon weight="bold" aria-hidden="true" />
					{t('ads_action_duplicate')}
				</Button>
			</div>
		</div>
	);
}

type PageProps = { regions: RegionNames; messages: AdMessages };

/** Back to the detail (or the list) on cancel, to the detail after a save. */
function useEditorNavigation() {
	const router = useRouter();
	const detail = (id: string) => router.push({ pathname: '/admin/ads/[id]', params: { id } });
	return {
		detail,
		list: () => router.push('/admin/ads'),
		duplicate: (id: string) => router.push({ pathname: '/admin/ads/new', query: { from: id } }),
	};
}

/** P20 "Nov oglas" (/admin/oglasi/nov); `?from=<id>` starts from a copy of that ad, as a draft. */
export function NewAd({ from, ...props }: PageProps & { from?: string }) {
	const t = useTranslations('admin');
	const go = useEditorNavigation();
	const form = (source?: AdminAd) => (
		<AdForm key={source?.id} from={source} {...props} onDone={go.detail} onCancel={go.list} />
	);
	return (
		<>
			<h1 className={adminH1Class}>{t('ads_new')}</h1>
			{from ? <AdLoader id={from}>{form}</AdLoader> : form()}
		</>
	);
}

/** P20 edit (/admin/oglasi/[id]/uredi); an ended ad is shown read only with Duplicate. */
export function EditAd({ id, ...props }: PageProps & { id: string }) {
	const t = useTranslations('admin');
	const go = useEditorNavigation();
	const now = useNow();
	return (
		<AdLoader id={id}>
			{(ad) => {
				const ended = adPhase(ad, now) === 'ended';
				return (
					<>
						<h1 className={cn(adminH1Class, 'break-words')}>
							{t('ads_action_edit')}: {ad.title}
						</h1>
						{ended && <EndedNote onDuplicate={() => go.duplicate(ad.id)} />}
						<AdForm
							key={ad.id}
							ad={ad}
							house={ad.is_house}
							readOnly={ended}
							{...props}
							onDone={go.detail}
							onCancel={() => go.detail(ad.id)}
						/>
					</>
				);
			}}
		</AdLoader>
	);
}
