'use client';

import { CatIcon } from '@phosphor-icons/react/dist/ssr/Cat';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { DogIcon } from '@phosphor-icons/react/dist/ssr/Dog';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { useLocale, useTranslations } from 'next-intl';
import { RadioGroup as RadioGroupPrimitive, ToggleGroup } from 'radix-ui';
import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, type DefaultValues, useController, useFormContext, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { breedsFor, isBreedOf } from '@zivali/validation/breeds';
import { normalizeChip } from '@zivali/validation/chip';
import { ChipRegisteredCrhz, Colour, Lifestyle, Sex, Size } from '@zivali/validation/enums';
import type { PetInput } from '@zivali/validation/pets.schema';
import { noteClass } from '@/components/shelters/classes';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** The form values PetFields binds to (C4 PetInput, before parsing); the parent form owns schema and submit. */
export type PetFieldValues = z.input<typeof PetInput>;
type Species = PetFieldValues['species'];
type Pattern = NonNullable<PetFieldValues['pattern']>;
type SizeValue = z.infer<typeof Size>;

/** Blank values for a new pet, for `useForm({ defaultValues })`. */
export const emptyPetFields: DefaultValues<PetFieldValues> = {
	name: '',
	breed_codes: [],
	colours: [],
	pattern: null,
	size: null,
	sex: null,
	birth_year: null,
	chip: '',
	chip_registered_crhz: null,
	ear_tip: null,
	lifestyle: null,
	collar: null,
	notes: null,
};

// Glossary §7.3: patterns per species, so "Tigrasta" never means two things. §7.1: cats show only s, m, l.
const PATTERNS: Record<Species, readonly Pattern[]> = {
	dog: ['solid', 'bicolour', 'tricolour', 'brindle', 'merle', 'spotted', 'other'],
	cat: ['solid', 'bicolour', 'tabby', 'tortoiseshell', 'calico', 'spotted', 'pointed', 'other'],
};
const SIZES: Record<Species, readonly SizeValue[]> = { dog: Size.options, cat: ['s', 'm', 'l'] };
const FIRST_BIRTH_YEAR = 1990;
/** Select value for "Not sure", which stores null (Radix Select items cannot have an empty value). */
const NONE = 'none';

/** Digits only, grouped like the number on a chip label: 705 1234 5678 9012 (three, then fours). */
export function groupChip(input: string): string {
	const digits = input.replace(/\D/g, '');
	return [digits.slice(0, 3), ...(digits.slice(3).match(/\d{1,4}/g) ?? [])].filter(Boolean).join(' ');
}

/** Index in `grouped` just after its `count`-th digit, so the caret stays put when spaces move. */
function caretAfterDigits(grouped: string, count: number): number {
	if (count === 0) return 0;
	let seen = 0;
	for (let i = 0; i < grouped.length; i++) if (/\d/.test(grouped[i]!) && ++seen === count) return i + 1;
	return grouped.length;
}

/** Case- and diacritics-blind search text ("sarp" finds "Šarplaninec"). */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const headingClass = 'font-display text-xl font-semibold tracking-[-0.01em]';
const groupLabelClass = 'text-control font-bold';
const hintClass = 'text-sm text-muted-foreground';

// System §10.4 pill: 44 px, secondary fill; selected primary plus a check (radio pills and toggle pills).
const pillClass =
	'group/pill inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-chip bg-secondary px-4.5 text-control font-bold whitespace-nowrap text-secondary-foreground transition-transform duration-[80ms] hover:bg-secondary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:hover:bg-primary-hover data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary-hover motion-reduce:transition-none motion-reduce:active:scale-100';

function PillCheck() {
	return (
		<CheckIcon
			weight="bold"
			aria-hidden="true"
			className="hidden size-4.5 group-data-[state=checked]/pill:inline group-data-[state=on]/pill:inline"
		/>
	);
}

type PillRadiosProps<T extends string> = {
	label: React.ReactNode;
	value: T | null | undefined;
	onChange: (value: T) => void;
	options: readonly (readonly [T, React.ReactNode])[];
	hint?: React.ReactNode;
};

/** Single choice as pills (sex, size, yes/no): a labelled radiogroup with arrow-key navigation. */
function PillRadios<T extends string>({ label, value, onChange, options, hint }: PillRadiosProps<T>) {
	const id = useId();
	return (
		<div className="grid gap-2">
			<p id={`${id}-label`} className={groupLabelClass}>
				{label}
			</p>
			<RadioGroupPrimitive.Root
				aria-labelledby={`${id}-label`}
				aria-describedby={hint ? `${id}-hint` : undefined}
				value={value ?? ''}
				onValueChange={(next) => onChange(next as T)}
				className="flex flex-wrap gap-2"
			>
				{options.map(([option, text]) => (
					<RadioGroupPrimitive.Item key={option} value={option} className={pillClass}>
						<PillCheck />
						{text}
					</RadioGroupPrimitive.Item>
				))}
			</RadioGroupPrimitive.Root>
			{hint && (
				<p id={`${id}-hint`} className={hintClass}>
					{hint}
				</p>
			)}
		</div>
	);
}

type PetFieldsProps = {
	/** Section headings: h2 under a page h1 (P8 profile form), h3 inside a flow step (P6). */
	headingLevel?: 2 | 3;
	className?: string;
};

/**
 * The pet attribute section shared by the pet profile form (P8) and the lost flow (P6): basics, looks, chip, collar
 * and notes. It renders inside the caller's react-hook-form `FormProvider` (resolver `zodResolver(PetInput)` or a
 * schema with the same field names) and has no form, submit, photos or page layout of its own.
 */
export function PetFields({ headingLevel = 2, className }: PetFieldsProps) {
	const t = useTranslations('pets');
	const ta = useTranslations('attributes');
	const { control, getValues, setValue } = useFormContext<PetFieldValues>();
	const species = useWatch({ control, name: 'species' });
	const id = useId();
	const Heading = `h${headingLevel}` as const;
	const thisYear = new Date().getFullYear();
	const years = Array.from({ length: thisYear - FIRST_BIRTH_YEAR + 1 }, (_, i) => thisYear - i);

	// Breeds, patterns, sizes and the cat-only fields depend on the species; drop what no longer fits.
	const changeSpecies = (next: Species) => {
		const { breed_codes, pattern, size } = getValues();
		if (breed_codes?.some((code) => !isBreedOf(code, next))) setValue('breed_codes', []);
		if (pattern && !PATTERNS[next].includes(pattern)) setValue('pattern', null);
		if (size && !SIZES[next].includes(size)) setValue('size', null);
		if (next === 'dog') {
			setValue('ear_tip', null);
			setValue('lifestyle', null);
		}
	};

	const section = (key: string, title: string, children: React.ReactNode) => (
		<section aria-labelledby={`${id}-${key}`} className="grid gap-6">
			<Heading id={`${id}-${key}`} className={headingClass}>
				{title}
			</Heading>
			{children}
		</section>
	);

	return (
		<div className={cn('grid gap-10', className)}>
			{section(
				'basics',
				t('section_basics'),
				<>
					<Controller
						control={control}
						name="species"
						render={({ field, fieldState }) => (
							<div className="grid gap-2">
								<p id={`${id}-species`} className={groupLabelClass}>
									{t('species_label')}
								</p>
								<RadioGroup
									aria-labelledby={`${id}-species`}
									aria-describedby={fieldState.error ? `${id}-species-error` : undefined}
									aria-invalid={fieldState.error ? true : undefined}
									value={field.value ?? ''}
									onValueChange={(next) => {
										field.onChange(next);
										changeSpecies(next as Species);
									}}
									className="gap-3 sm:grid-cols-2"
								>
									<ChoiceRow
										ref={field.ref}
										value="dog"
										title={ta('species.dog')}
										icon={<DogIcon weight="bold" aria-hidden="true" />}
									/>
									<ChoiceRow
										value="cat"
										title={ta('species.cat')}
										icon={<CatIcon weight="bold" aria-hidden="true" />}
									/>
								</RadioGroup>
								{fieldState.error && (
									<FieldError id={`${id}-species-error`}>{t('species_required')}</FieldError>
								)}
							</div>
						)}
					/>
					<Controller
						control={control}
						name="name"
						render={({ field, fieldState }) => (
							<FormField label={t('name_label')} error={fieldState.error && t('name_required')}>
								<Input {...field} value={field.value ?? ''} autoComplete="off" maxLength={60} />
							</FormField>
						)}
					/>
					<div className="grid gap-6 sm:grid-cols-2">
						<Controller
							control={control}
							name="sex"
							render={({ field }) => (
								<PillRadios
									label={t('sex_label')}
									value={field.value}
									onChange={field.onChange}
									options={Sex.options.map((sex) => [sex, ta(`sex.${sex}`)] as const)}
								/>
							)}
						/>
						<Controller
							control={control}
							name="birth_year"
							render={({ field }) => (
								<FormField label={t('birth_year_label')}>
									<Select
										value={field.value ? String(field.value) : ''}
										onValueChange={(next) => field.onChange(next === NONE ? null : Number(next))}
									>
										<SelectTrigger ref={field.ref} onBlur={field.onBlur}>
											<SelectValue placeholder={t('birth_year_placeholder')} />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NONE}>{t('not_sure')}</SelectItem>
											{years.map((year) => (
												<SelectItem key={year} value={String(year)}>
													{year}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormField>
							)}
						/>
					</div>
					{species === 'cat' && (
						<Controller
							control={control}
							name="lifestyle"
							render={({ field }) => (
								<PillRadios
									label={t('lifestyle_label')}
									value={field.value}
									onChange={field.onChange}
									options={Lifestyle.options.map(
										(value) => [value, t(`lifestyle.${value}`)] as const
									)}
								/>
							)}
						/>
					)}
				</>
			)}

			{section(
				'looks',
				t('section_looks'),
				<>
					<div className="grid gap-6 sm:grid-cols-2">
						<BreedField species={species} />
						<Controller
							control={control}
							name="pattern"
							render={({ field }) => (
								<FormField
									label={t('pattern_label')}
									disabled={!species}
									hint={!species && t('species_first')}
								>
									<Select
										value={field.value ?? ''}
										onValueChange={(next) => field.onChange(next === NONE ? null : next)}
									>
										<SelectTrigger ref={field.ref} onBlur={field.onBlur}>
											<SelectValue placeholder={t('not_sure')} />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NONE}>{t('not_sure')}</SelectItem>
											{species &&
												PATTERNS[species].map((pattern) => (
													<SelectItem key={pattern} value={pattern}>
														{ta(`patterns.${pattern}`)}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
								</FormField>
							)}
						/>
					</div>
					<Controller
						control={control}
						name="colours"
						render={({ field }) => (
							<div className="grid gap-2">
								<p id={`${id}-colours`} className={groupLabelClass}>
									{t('colour_label')}
								</p>
								<ToggleGroup.Root
									type="multiple"
									aria-labelledby={`${id}-colours`}
									value={field.value ?? []}
									onValueChange={field.onChange}
									className="flex flex-wrap gap-2"
								>
									{Colour.options.map((colour) => (
										<ToggleGroup.Item key={colour} value={colour} className={pillClass}>
											<PillCheck />
											{ta(`colours.${colour}`)}
										</ToggleGroup.Item>
									))}
								</ToggleGroup.Root>
							</div>
						)}
					/>
					<Controller
						control={control}
						name="size"
						render={({ field }) => (
							<PillRadios
								label={t('size_label')}
								value={field.value}
								onChange={field.onChange}
								options={SIZES[species ?? 'cat'].map((size) => [size, ta(`size.${size}`)] as const)}
								hint={species === 'dog' && ta('size_help_dog')}
							/>
						)}
					/>
					{species === 'cat' && <EarTipField />}
				</>
			)}

			{section(
				'chip',
				t('section_chip'),
				<>
					<ChipField />
					<Controller
						control={control}
						name="chip_registered_crhz"
						render={({ field }) => (
							<PillRadios
								label={t('crhz_label')}
								value={field.value}
								onChange={field.onChange}
								options={ChipRegisteredCrhz.options.map(
									(answer) => [answer, t(`answer_${answer}`)] as const
								)}
								hint={
									<>
										{(field.value === 'no' || field.value === 'unknown') && (
											<span className="mb-2 block font-bold text-foreground">
												{t('crhz_reminder')}
											</span>
										)}
										{t('chip_register_note')}
									</>
								}
							/>
						)}
					/>
				</>
			)}

			{section(
				'notes',
				t('section_notes'),
				<>
					<NullableTextarea
						name="collar"
						label={t('collar_label')}
						placeholder={t('collar_placeholder')}
						maxLength={200}
					/>
					<NullableTextarea
						name="notes"
						label={t('notes_label')}
						placeholder={t('notes_placeholder')}
						maxLength={1000}
						hint={
							<span className="flex items-center gap-2">
								<LockSimpleIcon weight="bold" aria-hidden="true" className="size-4.5 shrink-0" />
								{t('notes_private')}
							</span>
						}
					/>
				</>
			)}
		</div>
	);
}

/** Textarea whose blank value is null (PetInput rejects empty collar and notes strings). */
function NullableTextarea({
	name,
	label,
	hint,
	...props
}: { name: 'collar' | 'notes'; label: string; hint?: React.ReactNode } & React.ComponentProps<'textarea'>) {
	const { control } = useFormContext<PetFieldValues>();
	const {
		field: { ref, ...field },
	} = useController({ control, name });
	return (
		<FormField label={label} hint={hint}>
			<Textarea
				{...props}
				ref={ref}
				name={field.name}
				rows={2}
				value={field.value ?? ''}
				onChange={(event) => field.onChange(event.target.value.trim() ? event.target.value : null)}
				onBlur={field.onBlur}
			/>
		</FormField>
	);
}

/** Chip number (C4): grouped as typed; a short or odd number gets a warning note and is never blocked. */
function ChipField() {
	const t = useTranslations('pets');
	const { control } = useFormContext<PetFieldValues>();
	const {
		field: { ref, ...field },
		fieldState,
		formState,
	} = useController({ control, name: 'chip' });
	const id = useId();
	const value = field.value ?? '';
	const warn = (fieldState.isTouched || formState.isSubmitted) && normalizeChip(value).status === 'invalid';

	return (
		<FormField id={id} label={t('chip_label')}>
			<Input
				ref={ref}
				name={field.name}
				value={value}
				onChange={(event) => {
					const input = event.target;
					const digitsBefore = input.value.slice(0, input.selectionStart ?? 0).replace(/\D/g, '').length;
					const grouped = groupChip(input.value);
					field.onChange(grouped);
					const caret = caretAfterDigits(grouped, digitsBefore);
					requestAnimationFrame(() => input.setSelectionRange(caret, caret));
				}}
				onBlur={field.onBlur}
				inputMode="numeric"
				autoComplete="off"
				maxLength={40}
				aria-describedby={cn(`${id}-help`, warn && `${id}-warning`)}
				className="tabular-nums"
			/>
			<p id={`${id}-help`} className={hintClass}>
				{t('chip_help')}
			</p>
			<div id={`${id}-warning`} role="status">
				{warn && (
					<div className={cn(noteClass, 'mt-1.5')}>
						<WarningIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
						<p>{t('chip_warning')}</p>
					</div>
				)}
			</div>
		</FormField>
	);
}

/** Cats only: ear tip as yes / no / not sure; "not sure" stores null, like an unanswered question. */
function EarTipField() {
	const t = useTranslations('pets');
	const { control } = useFormContext<PetFieldValues>();
	const { field } = useController({ control, name: 'ear_tip' });
	const [unsure, setUnsure] = useState(false);
	const value = field.value === true ? 'yes' : field.value === false ? 'no' : unsure ? 'unknown' : null;
	return (
		<PillRadios
			label={t('ear_tip_label')}
			value={value}
			onChange={(answer) => {
				setUnsure(answer === 'unknown');
				field.onChange(answer === 'unknown' ? null : answer === 'yes');
			}}
			options={(['yes', 'no', 'unknown'] as const).map((answer) => [answer, t(`answer_${answer}`)] as const)}
			hint={t('ear_tip_help')}
		/>
	);
}

/**
 * Breed as a searchable select (ARIA 1.2 combobox with a listbox): localised names in alphabetical order, with
 * "Mixed breed" and "Not sure" always listed last. One breed per pet in the form (`breed_codes` holds up to 5).
 */
function BreedField({ species }: { species: Species | undefined }) {
	const t = useTranslations('pets');
	const tb = useTranslations('breeds');
	const locale = useLocale();
	const { control } = useFormContext<PetFieldValues>();
	const {
		field: { ref, ...field },
	} = useController({ control, name: 'breed_codes' });
	const id = useId();
	const chosen = field.value?.[0];
	const [text, setText] = useState<string | null>(null); // null while not typing: the field shows the chosen name
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);

	const breeds = useMemo(() => {
		const all = species ? breedsFor(species).map((code) => ({ code, label: tb(code) })) : [];
		const last = (code: string) => code.endsWith('.mixed') || code.endsWith('.unknown');
		const named = all.filter((b) => !last(b.code)).sort((a, b) => a.label.localeCompare(b.label, locale));
		return { named, last: all.filter((b) => last(b.code)) };
	}, [species, tb, locale]);

	const query = fold(text?.trim() ?? '');
	const matches = query ? breeds.named.filter((b) => fold(b.label).includes(query)) : breeds.named;
	const options = [...matches, ...breeds.last];
	const expanded = open && options.length > 0;
	const noMatch = Boolean(query) && matches.length === 0;

	useEffect(() => {
		if (expanded) document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: 'nearest' });
	}, [expanded, active, id]);

	const choose = (code: (typeof options)[number]['code']) => {
		field.onChange([code]);
		setText(null);
		setOpen(false);
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const step = event.key === 'ArrowDown' ? 1 : -1;
			setActive(expanded ? (active + step + options.length) % options.length : 0);
			setOpen(true);
		} else if (event.key === 'Enter' && expanded) {
			event.preventDefault();
			choose(options[active]!.code);
		} else if (event.key === 'Escape') {
			setOpen(false);
		}
	};

	return (
		<FormField
			id={`${id}-input`}
			label={t('breed_label')}
			disabled={!species}
			hint={!species && t('species_first')}
		>
			<div className="relative">
				<MagnifyingGlassIcon
					weight="bold"
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 left-0.5 size-[22px] -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					ref={ref}
					name={field.name}
					type="text"
					role="combobox"
					aria-autocomplete="list"
					aria-expanded={expanded}
					aria-controls={`${id}-listbox`}
					aria-activedescendant={expanded ? `${id}-option-${active}` : undefined}
					aria-describedby={noMatch ? `${id}-none` : !species ? `${id}-input-hint` : undefined}
					autoComplete="off"
					placeholder={t('breed_search')}
					value={text ?? (chosen ? tb(chosen) : '')}
					onChange={(event) => {
						setText(event.target.value);
						setActive(0);
						setOpen(true);
					}}
					onClick={() => setOpen(true)}
					onKeyDown={onKeyDown}
					onBlur={() => {
						setOpen(false);
						if (text?.trim() === '') field.onChange([]);
						setText(null);
						field.onBlur();
					}}
					className="pl-[34px]"
				/>
				<ul
					id={`${id}-listbox`}
					role="listbox"
					aria-label={t('breed_label')}
					hidden={!expanded}
					className="absolute inset-x-0 top-[calc(100%+8px)] z-10 grid max-h-80 gap-1 overflow-y-auto rounded-xl bg-popover p-2 text-popover-foreground shadow-pop"
				>
					{options.map((breed, index) => (
						<li
							key={breed.code}
							id={`${id}-option-${index}`}
							role="option"
							aria-selected={index === active}
							// mousedown, not click: the input keeps focus, so its blur does not close the list first.
							onMouseDown={(event) => {
								event.preventDefault();
								choose(breed.code);
							}}
							onMouseMove={() => setActive(index)}
							className={cn(
								'flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-sm px-3 aria-selected:bg-foreground/10',
								breed.code === chosen && 'font-bold'
							)}
						>
							{breed.label}
							{breed.code === chosen && <CheckIcon weight="bold" aria-hidden="true" className="size-5" />}
						</li>
					))}
				</ul>
			</div>
			<div role="status">
				{noMatch && (
					<p id={`${id}-none`} className={cn(hintClass, 'flex gap-2')}>
						<InfoIcon weight="bold" aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
						{t('breed_none')}
					</p>
				)}
			</div>
		</FormField>
	);
}
