import { zodResolver } from '@hookform/resolvers/zod';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { CatIcon } from 'phosphor-react-native/src/icons/Cat';
import { DogIcon } from 'phosphor-react-native/src/icons/Dog';
import { LockSimpleIcon } from 'phosphor-react-native/src/icons/LockSimple';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import * as React from 'react';
import { type DefaultValues, useController, useForm, useFormContext, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useLocale, useTranslations } from 'use-intl';
import type { z } from 'zod';

import {
	type BreedCode,
	CHIP_REGISTERED_CRHZ,
	COLOURS,
	LIFESTYLES,
	type Pattern,
	SEXES,
	SIZES,
	type Size,
	type Species,
} from '@zivali/types';
import { breedsFor, isBreedOf } from '@zivali/validation/breeds';
import { normalizeChip } from '@zivali/validation/chip';
import { PetInput } from '@zivali/validation/pets.schema';
import { FieldError, FormField, useAnnounceError } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Pill } from '@/components/ui/pill';
import { ChoiceRow, ChoiceRowBody, choiceRowClass, RadioGroup } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type PetFormValues = z.input<typeof PetInput>;

/**
 * Where the section sits. `profile` (P8) adds birth year, the CRHŽ question and private notes, and clears fields to
 * null (the API's clear); `report` (P6 lost flow) shows only what a report carries and clears to undefined.
 */
export type PetFieldsVariant = 'profile' | 'report';

/** The pet profile form: react-hook-form with the C4 PetInput schema. */
export function usePetForm(defaultValues?: DefaultValues<PetFormValues>) {
	return useForm<PetFormValues, unknown, z.output<typeof PetInput>>({
		resolver: zodResolver(PetInput),
		defaultValues: { colours: [], breed_codes: [], ...defaultValues },
	});
}

// Glossary §7: patterns and sizes shown per species ("tigrasta" means brindle for dogs and tabby for cats).
const PATTERNS: Record<Species, readonly Pattern[]> = {
	dog: ['solid', 'bicolour', 'tricolour', 'brindle', 'merle', 'spotted', 'other'],
	cat: ['solid', 'bicolour', 'tabby', 'tortoiseshell', 'calico', 'spotted', 'pointed', 'other'],
};
const sizesFor = (species?: Species): readonly Size[] => (species === 'dog' ? SIZES : ['s', 'm', 'l']);

/** Digits only (spaces, dashes, dots and letters dropped), grouped as typed: "705 1234 5678 9012". */
export function formatChip(input: string) {
	const digits = input.replace(/\D/g, '').slice(0, 20);
	return [digits.slice(0, 3), ...(digits.slice(3).match(/\d{1,4}/g) ?? [])].filter(Boolean).join(' ');
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const emptyOf = (variant: PetFieldsVariant) => (variant === 'report' ? undefined : null);

/** A group of choices under a 20/28 label (P8 "gh"): the label names the group, the error is announced. */
function Group({
	title,
	hint,
	error,
	children,
}: {
	title: string;
	hint?: string;
	error?: string;
	children: React.ReactNode;
}) {
	useAnnounceError(error);
	return (
		<View className="gap-3">
			<Text role="heading" className="font-display-semibold text-xl tracking-[-0.2px]">
				{title}
			</Text>
			{children}
			{hint ? <Text className="text-sm text-muted-foreground">{hint}</Text> : null}
			{error ? <FieldError>{error}</FieldError> : null}
		</View>
	);
}

type PillRadiosProps<T extends string> = {
	title: string;
	options: readonly T[];
	label: (option: T) => string;
	value: unknown;
	onChange: (option: T) => void;
	hint?: string;
};

/** One-of pills under a group label (sex, size, lifestyle, ear tip, CRHŽ). */
function PillRadios<T extends string>({ title, options, label, value, onChange, hint }: PillRadiosProps<T>) {
	return (
		<Group title={title} hint={hint}>
			<View role="radiogroup" aria-label={title} className="flex-row flex-wrap gap-2">
				{options.map((option) => (
					<Pill key={option} role="radio" selected={value === option} onPress={() => onChange(option)}>
						{label(option)}
					</Pill>
				))}
			</View>
		</Group>
	);
}

/** PillRadios bound to a form field. */
function FieldPills<T extends string>({
	name,
	...props
}: Omit<PillRadiosProps<T>, 'value' | 'onChange'> & { name: 'sex' | 'size' | 'lifestyle' | 'chip_registered_crhz' }) {
	const { field } = useController<PetFormValues>({ name });
	return <PillRadios {...props} value={field.value} onChange={field.onChange} />;
}

const ANSWERS = ['yes', 'no', 'unknown'] as const;

/** Cats only: ear tip as yes / no / not sure; "not sure" stores no value, like an unanswered question. */
function EarTipField({ empty }: { empty: null | undefined }) {
	const t = useTranslations('pets');
	const { field } = useController<PetFormValues, 'ear_tip'>({ name: 'ear_tip' });
	const [unsure, setUnsure] = React.useState(false);
	const value = field.value === true ? 'yes' : field.value === false ? 'no' : unsure ? 'unknown' : undefined;
	return (
		<PillRadios
			title={t('ear_tip_label')}
			options={ANSWERS}
			label={(answer) => t(`answer_${answer}`)}
			value={value}
			onChange={(answer) => {
				setUnsure(answer === 'unknown');
				field.onChange(answer === 'unknown' ? empty : answer === 'yes');
			}}
			hint={t('ear_tip_help')}
		/>
	);
}

/** Select value for "Ne vem", which stores no value. */
const NONE = 'none';

/** Calm note (system §10 Note): muted surface, radius 20, icon 22, 15/22; announced politely. */
function Note({ icon, children }: { icon: PhosphorIcon; children: string }) {
	return (
		<View
			role="status"
			aria-live="polite"
			accessible
			className="flex-row gap-3 rounded-row bg-muted px-[18px] py-4"
		>
			<Icon as={icon} size={22} className="mt-0.5" />
			<Text className="min-w-0 flex-1 text-control leading-[22px]">{children}</Text>
		</View>
	);
}

/** Basics: species (choice rows), name, sex; cats add where they live; profiles add the birth year. */
export function PetBasicsFields({ variant = 'profile' }: { variant?: PetFieldsVariant }) {
	const t = useTranslations('pets');
	const ta = useTranslations('attributes');
	const tc = useTranslations('common');
	const { setValue, getValues } = useFormContext<PetFormValues>();
	const species = useController<PetFormValues, 'species'>({ name: 'species' });
	const name = useController<PetFormValues, 'name'>({ name: 'name' });
	const birthYear = useController<PetFormValues, 'birth_year'>({ name: 'birth_year' });
	const empty = emptyOf(variant);

	// Fields of the other species go with the switch: breeds, patterns and sizes it does not have, the cat fields.
	const changeSpecies = (next: Species) => {
		species.field.onChange(next);
		setValue(
			'breed_codes',
			(getValues('breed_codes') ?? []).filter((code) => isBreedOf(code, next))
		);
		const pattern = getValues('pattern');
		if (pattern && !PATTERNS[next].includes(pattern)) setValue('pattern', empty);
		const size = getValues('size');
		if (size && !sizesFor(next).includes(size)) setValue('size', empty);
		if (next === 'dog') {
			setValue('ear_tip', empty);
			setValue('lifestyle', empty);
		}
	};

	const thisYear = new Date().getFullYear();
	const years = Array.from({ length: thisYear - 1990 + 1 }, (_, i) => String(thisYear - i));

	return (
		<View className="gap-8">
			<Group title={t('species_label')} error={species.fieldState.error && t('species_required')}>
				<RadioGroup
					value={species.field.value}
					onValueChange={(value) => changeSpecies(value as Species)}
					aria-label={t('species_label')}
					className="gap-3"
				>
					<ChoiceRow value="dog" title={ta('species.dog')} icon={<Icon as={DogIcon} size={24} />} />
					<ChoiceRow value="cat" title={ta('species.cat')} icon={<Icon as={CatIcon} size={24} />} />
				</RadioGroup>
			</Group>

			<FormField label={t('name_label')} error={name.fieldState.error && t('name_required')}>
				<Input
					ref={(el) => name.field.ref(el)}
					value={name.field.value ?? ''}
					onChangeText={(value) => name.field.onChange(value.trim() ? value : empty)}
					onBlur={name.field.onBlur}
					autoCapitalize="words"
					autoComplete="off"
					maxLength={60}
				/>
			</FormField>

			<FieldPills name="sex" title={t('sex_label')} options={SEXES} label={(sex) => ta(`sex.${sex}`)} />

			{species.field.value === 'cat' ? (
				<FieldPills
					name="lifestyle"
					title={t('lifestyle_label')}
					options={LIFESTYLES}
					label={(lifestyle) => t(`lifestyle.${lifestyle}`)}
				/>
			) : null}

			{variant === 'profile' ? (
				<FormField label={t('birth_year_label')}>
					<Select
						value={birthYear.field.value == null ? undefined : String(birthYear.field.value)}
						onValueChange={(year) => birthYear.field.onChange(year === NONE ? empty : Number(year))}
					>
						<SelectTrigger>
							<SelectValue placeholder={t('birth_year_placeholder')} />
						</SelectTrigger>
						<SelectContent closeLabel={tc('close')}>
							<SelectItem value={NONE}>{t('not_sure')}</SelectItem>
							{years.map((year) => (
								<SelectItem key={year} value={year}>
									{year}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>
			) : null}
		</View>
	);
}

const isFallback = (code: BreedCode) => /\.(mixed|unknown)$/.test(code);

/**
 * Breed as a searchable select (P8 C4): typing lists up to 6 matching breeds of the chosen species (accents and case
 * ignored, alphabetical) as choice rows (64 px, above the 44 px minimum), then Mixed breed and Not sure; with no match
 * the hint says so. The search text goes on blur without a pick and with a species change, so the field only ever
 * shows the saved breed. One breed per pet in the form (`breed_codes` holds up to 5).
 */
function BreedField({ species }: { species?: Species }) {
	const t = useTranslations('pets');
	const tb = useTranslations('breeds');
	const locale = useLocale();
	const reduceMotion = useReducedMotion();
	const { field } = useController<PetFormValues, 'breed_codes'>({ name: 'breed_codes' });
	const [query, setQuery] = React.useState<string | null>(null);
	const [searchedSpecies, setSearchedSpecies] = React.useState(species);
	if (species !== searchedSpecies) {
		setSearchedSpecies(species);
		setQuery(null);
	}
	const chosen = field.value?.[0];
	const options: readonly BreedCode[] = species ? breedsFor(species) : [];
	const needle = fold(query?.trim() ?? '');
	const matches = needle
		? options
				.filter((code) => !isFallback(code) && fold(tb(code)).includes(needle))
				.sort((a, b) => tb(a).localeCompare(tb(b), locale))
				.slice(0, 6)
		: [];
	const none = Boolean(needle) && matches.length === 0;
	const rows = needle ? [...matches, ...options.filter(isFallback)] : [];

	return (
		<View className="gap-3">
			<FormField
				label={t('breed_label')}
				hint={!species ? t('species_first') : none ? t('breed_none') : undefined}
				disabled={!species}
			>
				<View className="justify-center">
					<Input
						ref={(el) => field.ref(el)}
						value={query ?? (chosen ? tb(chosen) : '')}
						onChangeText={setQuery}
						onBlur={() => {
							setQuery(null);
							field.onBlur();
						}}
						placeholder={t('breed_search')}
						autoCorrect={false}
						autoComplete="off"
						className="pl-8"
					/>
					<View pointerEvents="none" className="absolute left-0.5">
						<Icon as={MagnifyingGlassIcon} className="text-muted-foreground" />
					</View>
				</View>
			</FormField>
			{rows.length > 0 ? (
				<View role="radiogroup" aria-label={t('breed_label')} className="gap-2">
					{rows.map((code) => {
						const selected = code === chosen;
						return (
							<Pressable
								key={code}
								role="radio"
								aria-checked={selected}
								onPress={() => {
									field.onChange([code]);
									setQuery(null);
								}}
								className={choiceRowClass({ selected, disabled: false, reduceMotion })}
							>
								<ChoiceRowBody title={tb(code)} selected={selected} disabled={false} />
							</Pressable>
						);
					})}
				</View>
			) : null}
		</View>
	);
}

/** Looks: breed, colours (several), pattern and size per species; cats add the ear tip. The lost flow requires a colour. */
export function PetLooksFields({
	variant = 'profile',
	colourError,
}: {
	variant?: PetFieldsVariant;
	colourError?: string;
}) {
	const t = useTranslations('pets');
	const ta = useTranslations('attributes');
	const tc = useTranslations('common');
	const species = useWatch<PetFormValues, 'species'>({ name: 'species' });
	const colours = useController<PetFormValues, 'colours'>({ name: 'colours' });
	const pattern = useController<PetFormValues, 'pattern'>({ name: 'pattern' });
	const picked = colours.field.value ?? [];
	const empty = emptyOf(variant);

	return (
		<View className="gap-8">
			<BreedField species={species} />

			<Group title={t('colour_label')} error={colourError}>
				<View role="group" aria-label={t('colour_label')} className="flex-row flex-wrap gap-2">
					{COLOURS.map((colour) => {
						const selected = picked.includes(colour);
						return (
							<Pill
								key={colour}
								selected={selected}
								onPress={() =>
									colours.field.onChange(
										selected ? picked.filter((c) => c !== colour) : [...picked, colour]
									)
								}
							>
								{ta(`colours.${colour}`)}
							</Pill>
						);
					})}
				</View>
			</Group>

			<FormField label={t('pattern_label')} hint={species ? undefined : t('species_first')} disabled={!species}>
				<Select
					value={pattern.field.value ?? undefined}
					onValueChange={(code) => pattern.field.onChange(code === NONE ? empty : (code as Pattern))}
				>
					<SelectTrigger>
						<SelectValue placeholder={t('not_sure')} />
					</SelectTrigger>
					<SelectContent closeLabel={tc('close')}>
						<SelectItem value={NONE}>{t('not_sure')}</SelectItem>
						{(species ? PATTERNS[species] : []).map((code) => (
							<SelectItem key={code} value={code}>
								{ta(`patterns.${code}`)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormField>

			<FieldPills
				name="size"
				title={t('size_label')}
				options={sizesFor(species)}
				label={(size) => ta(`size.${size}`)}
				hint={species === 'dog' ? ta('size_help_dog') : undefined}
			/>

			{species === 'cat' ? <EarTipField empty={empty} /> : null}
		</View>
	);
}

/**
 * Chip, equally prominent for dogs and cats: digits grouped as typed; a number that is not 9 to 15 digits shows the
 * warning note once the field is left (or on save) and never blocks saving: the API stores it as unknown. Profiles ask
 * whether CRHŽ has the owner's current phone number, with the vet reminder on "no" and "not sure". The register line
 * is plain text with no link.
 */
export function PetChipFields({ variant = 'profile' }: { variant?: PetFieldsVariant }) {
	const t = useTranslations('pets');
	const { formState } = useFormContext<PetFormValues>();
	const chip = useController<PetFormValues, 'chip'>({ name: 'chip' });
	const crhz = useWatch<PetFormValues, 'chip_registered_crhz'>({ name: 'chip_registered_crhz' });
	const invalid = normalizeChip(chip.field.value).status === 'invalid';
	const warn = invalid && (chip.fieldState.isTouched || formState.isSubmitted);
	const empty = emptyOf(variant);

	return (
		<View className="gap-8">
			<View className="gap-3">
				<FormField label={t('chip_label')} hint={t('chip_help')}>
					<Input
						ref={(el) => chip.field.ref(el)}
						value={chip.field.value ?? ''}
						onChangeText={(text) => chip.field.onChange(formatChip(text) || empty)}
						onBlur={chip.field.onBlur}
						keyboardType="number-pad"
						autoComplete="off"
						className="tabular-nums"
					/>
				</FormField>
				{warn ? <Note icon={WarningIcon}>{t('chip_warning')}</Note> : null}
			</View>
			{variant === 'profile' ? (
				<FieldPills
					name="chip_registered_crhz"
					title={t('crhz_label')}
					options={CHIP_REGISTERED_CRHZ}
					label={(answer) => t(`answer_${answer}`)}
					hint={crhz === 'no' || crhz === 'unknown' ? t('crhz_reminder') : undefined}
				/>
			) : null}
			<Text className="text-sm text-muted-foreground">{t('chip_register_note')}</Text>
		</View>
	);
}

/** Collar; profiles add the private notes (C4 has one notes field) with the lock line. */
export function PetNotesFields({ variant = 'profile' }: { variant?: PetFieldsVariant }) {
	const t = useTranslations('pets');
	const collar = useController<PetFormValues, 'collar'>({ name: 'collar' });
	const notes = useController<PetFormValues, 'notes'>({ name: 'notes' });
	const empty = emptyOf(variant);
	// Blank text is no value: the schema rejects an empty string, and null clears the field on PATCH.
	const text = (value: string) => (value.trim() ? value : empty);

	return (
		<View className="gap-6">
			<FormField label={t('collar_label')}>
				<Textarea
					ref={(el) => collar.field.ref(el)}
					value={collar.field.value ?? ''}
					onChangeText={(value) => collar.field.onChange(text(value))}
					onBlur={collar.field.onBlur}
					placeholder={t('collar_placeholder')}
					maxLength={200}
				/>
			</FormField>
			{variant === 'profile' ? (
				<>
					<FormField label={t('notes_label')}>
						<Textarea
							ref={(el) => notes.field.ref(el)}
							value={notes.field.value ?? ''}
							onChangeText={(value) => notes.field.onChange(text(value))}
							onBlur={notes.field.onBlur}
							placeholder={t('notes_placeholder')}
							maxLength={1000}
						/>
					</FormField>
					<View className="flex-row items-start gap-2">
						<Icon as={LockSimpleIcon} size={18} className="mt-0.5 text-muted-foreground" />
						<Text className="shrink text-sm text-muted-foreground">{t('notes_private')}</Text>
					</View>
				</>
			) : null}
		</View>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<View className="gap-6">
			<Text role="heading" className="font-display text-2xl tracking-[-0.36px]">
				{title}
			</Text>
			{children}
		</View>
	);
}

/**
 * The pet form section shared by pet profiles (P8) and the lost flow (P6), inside a react-hook-form FormProvider
 * (`usePetForm()` for profiles). Mobile screens that show one part per screen use the parts directly, under the
 * screen's h1: PetBasicsFields, PetLooksFields, PetChipFields, PetNotesFields. Photos are PhotoPicker's. The
 * surrounding ScrollView needs `keyboardShouldPersistTaps="handled"`, so a tap on a breed row picks it before the search
 * field blurs (blur clears the search).
 */
export function PetFields({ variant = 'profile', className }: { variant?: PetFieldsVariant; className?: string }) {
	const t = useTranslations('pets');
	return (
		<View className={cn('gap-10', className)}>
			<Section title={t('section_basics')}>
				<PetBasicsFields variant={variant} />
			</Section>
			<Section title={t('section_looks')}>
				<PetLooksFields variant={variant} />
			</Section>
			<Section title={t('section_chip')}>
				<PetChipFields variant={variant} />
			</Section>
			<Section title={t('section_notes')}>
				<PetNotesFields variant={variant} />
			</Section>
		</View>
	);
}
