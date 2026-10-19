'use client';

import { CatIcon } from '@phosphor-icons/react/dist/ssr/Cat';
import { DogIcon } from '@phosphor-icons/react/dist/ssr/Dog';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { useTranslations } from 'next-intl';
import { RadioGroup as RadioGroupPrimitive, ToggleGroup } from 'radix-ui';
import { useId, useState } from 'react';
import { Controller, type DefaultValues, useController, useFormContext, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { isBreedOf } from '@zivali/validation/breeds';
import { normalizeChip } from '@zivali/validation/chip';
import { ChipRegisteredCrhz, Colour, Lifestyle, Sex, Size } from '@zivali/validation/enums';
import type { PetInput } from '@zivali/validation/pets.schema';
import { AiFieldNote, AiHint, SuggestedMark } from '@/components/ai/ai-parts';
import type { AiField } from '@/components/ai/prefill';
import type { Prefill } from '@/components/ai/use-prefill';
import { BreedField } from '@/components/pets/breed-field';
import { PATTERNS, SIZES } from '@/components/pets/species-options';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PillCheck, pillClass } from '@/components/ui/pill';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** The form values PetFields binds to (C4 PetInput, before parsing); the parent form owns schema and submit. */
export type PetFieldValues = z.input<typeof PetInput>;
type Species = PetFieldValues['species'];
/** The AI pre-fill of these fields (TASK-41.2): the "Predlog" marks, the hints and the species hint. */
export type PetFieldsAi = Pick<Prefill, 'marks' | 'confidence' | 'hints' | 'differs' | 'refill'>;
/** What the AI pre-fill may fill or hint here, in the fields' order ("Preveri predloge" goes to the first mark). */
export const PET_AI_FIELDS: readonly AiField[] = ['species', 'breed_codes', 'pattern', 'colours', 'size', 'collar'];

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

const headingClass = 'font-display text-xl font-semibold tracking-[-0.01em]';
const groupLabelClass = 'text-control font-bold';
const hintClass = 'text-sm text-muted-foreground';

type PillRadiosProps<T extends string> = {
	label: React.ReactNode;
	value: T | null | undefined;
	onChange: (value: T) => void;
	options: readonly (readonly [T, React.ReactNode])[];
	hint?: React.ReactNode;
	/** Say why in `hint`. */
	disabled?: boolean;
	/** On the first pill, for the form's setFocus ("Preveri predloge"). */
	itemRef?: React.Ref<HTMLButtonElement>;
};

/** Single choice as pills (sex, size, yes/no): a labelled radiogroup with arrow-key navigation. */
function PillRadios<T extends string>({
	label,
	value,
	onChange,
	options,
	hint,
	disabled,
	itemRef,
}: PillRadiosProps<T>) {
	const id = useId();
	return (
		<div className="grid gap-2">
			<p id={`${id}-label`} className={cn(groupLabelClass, disabled && 'text-muted-foreground')}>
				{label}
			</p>
			<RadioGroupPrimitive.Root
				aria-labelledby={`${id}-label`}
				aria-describedby={hint ? `${id}-hint` : undefined}
				value={value ?? ''}
				onValueChange={(next) => onChange(next as T)}
				disabled={disabled}
				className="flex flex-wrap gap-2"
			>
				{options.map(([option, text], index) => (
					<RadioGroupPrimitive.Item
						key={option}
						ref={index === 0 ? itemRef : undefined}
						value={option}
						className={pillClass}
					>
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
	/**
	 * `profile` (P8) adds birth year, the CRHŽ question and the private notes; `report` (P6 lost flow) shows only what
	 * a report carries (C4 CreateReportInput).
	 */
	variant?: 'profile' | 'report';
	/** Shown under the colours, which the caller's schema may require (the lost flow does). */
	colourError?: string;
	/** The AI pre-fill (useFormPrefill): marks after the labels, hints under the fields, the species hint. */
	ai?: PetFieldsAi;
	className?: string;
};

/**
 * The pet attribute section shared by the pet profile form (P8) and the lost flow (P6): basics, looks, chip, collar
 * and notes. It renders inside the caller's react-hook-form `FormProvider` (resolver `zodResolver(PetInput)` or a
 * schema with the same field names) and has no form, submit, photos or page layout of its own.
 */
export function PetFields({ headingLevel = 2, variant = 'profile', colourError, ai, className }: PetFieldsProps) {
	const profile = variant === 'profile';
	const t = useTranslations('pets');
	const ta = useTranslations('attributes');
	const tai = useTranslations('ai_prefill');
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

	// AI pre-fill: the mark (with its confidence) after a label, and the field's AI description (the suggestion while
	// marked, else the hint).
	const marked = (field: AiField) => Boolean(ai?.marks.has(field));
	const mark = (field: AiField) => marked(field) && <SuggestedMark confidence={ai?.confidence.get(field)} />;
	const aiNote = (field: AiField, hint = tai('low_confidence')) =>
		marked(field) || ai?.hints.has(field) ? (
			<AiFieldNote
				marked={marked(field)}
				confidence={ai?.confidence.get(field)}
				hint={ai?.hints.has(field) && hint}
			/>
		) : undefined;

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
						render={({ field, fieldState }) => {
							const note = aiNote('species');
							const differs = ai?.differs;
							return (
								<div className="grid gap-2">
									<p id={`${id}-species`} className={groupLabelClass}>
										{t('species_label')}
										{mark('species')}
									</p>
									<RadioGroup
										aria-labelledby={`${id}-species`}
										aria-describedby={
											cn(
												fieldState.error && `${id}-species-error`,
												(note || differs) && `${id}-species-ai`
											) || undefined
										}
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
									{differs ? (
										// Never switched by itself: the person's choice stays until they press the button.
										<div className="grid justify-items-start">
											<AiHint id={`${id}-species-ai`}>
												{tai('species_differs', { species: differs })}
											</AiHint>
											<Button
												type="button"
												variant="text"
												className="-ml-3"
												onClick={() => {
													field.onChange(differs);
													changeSpecies(differs);
													ai?.refill();
												}}
											>
												{tai('species_switch', { species: differs })}
											</Button>
										</div>
									) : (
										note && (
											<p id={`${id}-species-ai`} className={hintClass}>
												{note}
											</p>
										)
									)}
								</div>
							);
						}}
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
						{profile && (
							<Controller
								control={control}
								name="birth_year"
								render={({ field }) => (
									<FormField label={t('birth_year_label')}>
										<Select
											value={field.value ? String(field.value) : ''}
											onValueChange={(next) =>
												field.onChange(next === NONE ? null : Number(next))
											}
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
						)}
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
						<Controller
							control={control}
							name="breed_codes"
							render={({ field }) => (
								<BreedField
									species={species}
									value={field.value?.[0]}
									onChange={(code) => field.onChange(code ? [code] : [])}
									onBlur={field.onBlur}
									inputRef={field.ref}
									name={field.name}
									mark={mark('breed_codes')}
									note={aiNote('breed_codes', tai('low_confidence_breed'))}
								/>
							)}
						/>
						<Controller
							control={control}
							name="pattern"
							render={({ field }) => (
								<FormField
									label={
										<>
											{t('pattern_label')}
											{mark('pattern')}
										</>
									}
									disabled={!species}
									hint={species ? aiNote('pattern') : t('species_first')}
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
						render={({ field }) => {
							const note = aiNote('colours');
							return (
								<div className="grid gap-2">
									<p id={`${id}-colours`} className={groupLabelClass}>
										{t('colour_label')}
										{mark('colours')}
									</p>
									<ToggleGroup.Root
										type="multiple"
										aria-labelledby={`${id}-colours`}
										aria-describedby={
											cn(colourError && `${id}-colours-error`, note && `${id}-colours-ai`) ||
											undefined
										}
										value={field.value ?? []}
										onValueChange={field.onChange}
										className="flex flex-wrap gap-2"
									>
										{Colour.options.map((colour, index) => (
											<ToggleGroup.Item
												key={colour}
												ref={index === 0 ? field.ref : undefined}
												value={colour}
												className={pillClass}
											>
												<PillCheck />
												{ta(`colours.${colour}`)}
											</ToggleGroup.Item>
										))}
									</ToggleGroup.Root>
									{note && (
										<p id={`${id}-colours-ai`} className={hintClass}>
											{note}
										</p>
									)}
									{colourError && <FieldError id={`${id}-colours-error`}>{colourError}</FieldError>}
								</div>
							);
						}}
					/>
					<Controller
						control={control}
						name="size"
						render={({ field }) => {
							const help = species === 'dog' && ta('size_help_dog');
							const note = aiNote('size');
							return (
								<PillRadios
									label={
										<>
											{t('size_label')}
											{mark('size')}
										</>
									}
									value={field.value}
									onChange={field.onChange}
									itemRef={field.ref}
									// Disabled like breed and pattern until a species is chosen, then that species' sizes.
									options={(species ? SIZES[species] : Size.options).map(
										(size) => [size, ta(`size.${size}`)] as const
									)}
									disabled={!species}
									hint={
										!species
											? t('species_first')
											: (help || note) && (
													<>
														{help}
														{note}
													</>
												)
									}
								/>
							);
						}}
					/>
					{species === 'cat' && <EarTipField />}
				</>
			)}

			{section(
				'chip',
				t('section_chip'),
				<>
					<ChipField />
					{!profile && <p className={hintClass}>{t('chip_register_note')}</p>}
					{profile && (
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
					)}
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
						hint={aiNote('collar', tai('collar_hint'))}
					/>
					{profile && (
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
					)}
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

/**
 * Cats only: ear tip as yes / no / not sure. "Not sure" is UI-only: it stores null, like an unanswered question, so a
 * saved pet opens again with no answer chosen.
 */
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
