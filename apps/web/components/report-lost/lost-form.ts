import type { FieldErrors, Resolver } from 'react-hook-form';

import type { ContactPref, CreateReportInput, Pet, Species, UpdateReportInput } from '@zivali/types';
import { containsContactData } from '@zivali/validation/text';
import type { LatLng } from '@/components/map/map-view';
import type { PetFieldValues } from '@/components/pets/pet-fields';

// The P6 lost flow's form (C4 CreateReportInput): values, the checks per step and the request bodies. Pure, so the
// rules are tested without the screens. Mirrors apps/mobile/components/report-lost/lost-form.ts; the web takes the
// date and time from native pickers (YYYY-MM-DD, HH:MM) instead of typed text.

export type Step = 'pet' | 'photos' | 'details' | 'where' | 'when' | 'what' | 'review';
export type When = 'now' | 'today' | 'yesterday' | 'other';

/** "Druga žival", or no saved pets: the details are entered in the flow. */
export const NEW_PET = 'new';
export const REWARD_MAX = 10_000;
export const NOTE_MAX = 80;
export const CIRCUMSTANCES_MAX = 1000;
const FUTURE_SLACK_MS = 10 * 60_000; // the API accepts event_at up to 10 min ahead (C4)
const OLD_MS = 30 * 86_400_000;

export type LostValues = Omit<PetFieldValues, 'species' | 'name'> & {
	species?: Species;
	name?: string;
	/** NEW_PET or a saved pet's id */
	pet?: string;
	/** The point LocationPicker coarsened (C6); never the raw one. */
	location?: LatLng;
	radius_m?: number;
	when: When;
	/** From the native date picker: YYYY-MM-DD */
	date: string;
	/** From the native time picker: HH:MM */
	time: string;
	circumstances?: string;
	contact_pref: ContactPref;
	reward: boolean;
	reward_eur: string;
	reward_note: string;
};

export const initialValues: LostValues = {
	name: '',
	breed_codes: [],
	colours: [],
	pattern: null,
	size: null,
	sex: null,
	chip: '',
	ear_tip: null,
	lifestyle: null,
	collar: null,
	when: 'now',
	date: '',
	time: '',
	circumstances: '',
	contact_pref: 'chat_only',
	reward: false,
	reward_eur: '',
	reward_note: '',
};

/**
 * The pet step asks only when there are saved pets (`hasPets`); without them the flow starts at the photos with the
 * new-pet path. A saved pet skips the details, which come from the pet. Its photos go on the report (C5), so with
 * `skipPhotos` (the pet has photos) the photo step is skipped too; the review's Uredi still reaches it.
 */
export const stepsFor = (pet: string | undefined, hasPets: boolean, skipPhotos = false): Step[] =>
	!hasPets
		? ['photos', 'details', 'where', 'when', 'what', 'review']
		: pet && pet !== NEW_PET
			? ['pet', ...(skipPhotos ? [] : (['photos'] as const)), 'where', 'when', 'what', 'review']
			: ['pet', 'photos', 'details', 'where', 'when', 'what', 'review'];

/** The form fields each step checks on Naprej (photos are the PhotoPicker's, checked by the flow). */
export const STEP_FIELDS: Record<Step, (keyof LostValues)[]> = {
	pet: ['pet'],
	photos: [],
	details: ['species', 'colours'],
	where: [],
	when: ['date', 'time'],
	what: ['circumstances', 'reward', 'reward_eur', 'reward_note'],
	review: [],
};

/** report_lost.* message key per field. */
export type LostError =
	| 'pet_required'
	| 'species_required'
	| 'colour_required'
	| 'when_invalid'
	| 'when_future'
	| 'circumstances_too_long'
	| 'reward_amount_invalid'
	| 'reward_amount_max'
	| 'reward_note_contact_data'
	| 'reward_note_too_long'
	| 'reward_empty';

const pad = (n: number) => String(n).padStart(2, '0');
/** A day and a time in the device's clock, as the native pickers take them. */
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isoTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** The time as the copy writes it: "18.30" in SL, "18:30" in EN. */
export const formatTime = (d: Date, locale: string) =>
	`${pad(d.getHours())}${locale === 'en' ? ':' : '.'}${pad(d.getMinutes())}`;

function parseDay(text: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (!match) return null;
	const [y, m, d] = match.slice(1).map(Number) as [number, number, number];
	const date = new Date(y, m - 1, d);
	return date.getDate() === d && date.getMonth() === m - 1 ? date : null;
}

function parseTime(text: string): [number, number] | null {
	const match = /^(\d{2}):(\d{2})/.exec(text);
	if (!match) return null;
	const [h, m] = [Number(match[1]), Number(match[2])];
	return h < 24 && m < 60 ? [h, m] : null;
}

/** When the pet was last seen, or null while the date or time is missing. */
export function eventAt(values: Pick<LostValues, 'when' | 'date' | 'time'>, now = Date.now()): Date | null {
	if (values.when === 'now') return new Date(now);
	const day = values.when === 'other' ? parseDay(values.date) : new Date(now);
	const time = parseTime(values.time);
	if (!day || !time) return null;
	if (values.when === 'yesterday') day.setDate(day.getDate() - 1);
	day.setHours(time[0], time[1], 0, 0);
	return day;
}

/** Older than 30 days: accepted, with the warning note (C4 `OLD_EVENT`). */
export const isOld = (at: Date | null, now = Date.now()) => at !== null && now - at.getTime() > OLD_MS;

/** Every rule of the flow; the flow shows only those of the step being left. */
export function lostErrors(values: LostValues, now = Date.now()): Partial<Record<keyof LostValues, LostError>> {
	const errors: Partial<Record<keyof LostValues, LostError>> = {};
	if (!values.pet) errors.pet = 'pet_required';
	if (!values.species) errors.species = 'species_required';
	if (!values.colours?.length) errors.colours = 'colour_required';

	if (values.when !== 'now') {
		const field = values.when === 'other' ? 'date' : 'time';
		if (values.when === 'other' && !parseDay(values.date)) errors.date = 'when_invalid';
		else if (!parseTime(values.time)) errors.time = 'when_invalid';
		else if (eventAt(values, now)!.getTime() > now + FUTURE_SLACK_MS) errors[field] = 'when_future';
	}

	if ((values.circumstances?.length ?? 0) > CIRCUMSTANCES_MAX) errors.circumstances = 'circumstances_too_long';

	if (values.reward) {
		const eur = values.reward_eur.trim();
		const note = values.reward_note.trim();
		if (eur && (!/^\d+$/.test(eur) || Number(eur) < 1)) errors.reward_eur = 'reward_amount_invalid';
		else if (Number(eur) > REWARD_MAX) errors.reward_eur = 'reward_amount_max';
		if (containsContactData(note)) errors.reward_note = 'reward_note_contact_data';
		else if (note.length > NOTE_MAX) errors.reward_note = 'reward_note_too_long';
		if (!eur && !note) errors.reward = 'reward_empty';
	}
	return errors;
}

/** react-hook-form resolver over lostErrors(); `message` is the report_lost key. */
export const lostResolverAt =
	(now: () => number): Resolver<LostValues> =>
	async (values) => {
		const found = Object.entries(lostErrors(values, now()));
		if (!found.length) return { values, errors: {} };
		const errors = Object.fromEntries(found.map(([name, message]) => [name, { type: 'validate', message }]));
		return { values: {}, errors: errors as FieldErrors<LostValues> };
	};
export const lostResolver = lostResolverAt(Date.now);

const orUndefined = <T>(value: T | null | undefined) => value ?? undefined;
const text = (value?: string | null) => value?.trim() || undefined;

/** A saved pet's attributes inline, without `pet_id` ("Ustvari novo prijavo" next to an open search). */
export const petAttributes = (pet: Pet) => ({
	species: pet.species,
	name: pet.name,
	breed_codes: pet.breed_codes,
	colours: pet.colours,
	pattern: orUndefined(pet.pattern),
	size: orUndefined(pet.size),
	sex: orUndefined(pet.sex),
	chip: orUndefined(pet.chip_number),
	collar: orUndefined(pet.collar),
	ear_tip: orUndefined(pet.ear_tip),
	lifestyle: orUndefined(pet.lifestyle),
});

/** Where, when, what and the photos: the part of the report that a repeat or an update carries too. */
export function reportFields(values: LostValues, photoIds: string[], at: Date): UpdateReportInput {
	const eur = values.reward ? values.reward_eur.trim() : '';
	return {
		location: values.location!,
		requested_radius_m: values.radius_m,
		event_at: at.toISOString(),
		circumstances: text(values.circumstances),
		contact_pref: values.contact_pref,
		// null clears a reward an open search had (update), and is no reward on create.
		reward_eur: eur ? Number(eur) : null,
		reward_note: (values.reward && text(values.reward_note)) || null,
		photo_ids: photoIds,
	};
}

/**
 * POST /v1/reports body. `pet` is the saved pet (its id, or with `inline` its attributes without the id); otherwise
 * the details entered in the flow.
 */
export function createBody(
	values: LostValues,
	{ photoIds, at, pet, inline = false }: { photoIds: string[]; at: Date; pet?: Pet; inline?: boolean }
): CreateReportInput {
	const fields = reportFields(values, photoIds, at) as Omit<CreateReportInput, 'type' | 'species'>;
	if (pet)
		return inline
			? { type: 'lost', ...petAttributes(pet), ...fields }
			: { type: 'lost', pet_id: pet.id, species: pet.species, ...fields };
	return {
		type: 'lost',
		species: values.species!,
		name: text(values.name),
		breed_codes: values.breed_codes,
		colours: values.colours,
		pattern: orUndefined(values.pattern),
		size: orUndefined(values.size),
		sex: orUndefined(values.sex),
		chip: text(values.chip),
		collar: text(values.collar),
		ear_tip: orUndefined(values.ear_tip),
		lifestyle: orUndefined(values.lifestyle),
		...fields,
	};
}
