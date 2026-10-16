import type { Colour, CreateReportInput, Size, Species } from '@zivali/types';
import type { LatLng } from '@/components/map/map-view';

// P7 found or sighted report on the web (FR-006, TASK-30.2): the steps, their checks and the C4 body, kept apart from
// the screens so they are tested on their own. Mirrors apps/mobile/components/report-found/found-flow.tsx.

export type Step = 'photo' | 'what' | 'where' | 'situation' | 'send' | 'when' | 'extra';
export type Source = 'gps' | 'pin' | 'search' | 'exif';
export type When = 'now' | 'today' | 'other';

/** Found: photo, which animal, where, is it with you, publish. Sighting of a listed lost pet: where, when, photo. */
export const FOUND_STEPS: Step[] = ['photo', 'what', 'where', 'situation', 'send'];
export const SIGHTING_STEPS: Step[] = ['where', 'when', 'extra'];
/** `circumstances` limit (C4, `@zivali/validation` reports schema). */
export const NOTE_MAX = 1000;
const FUTURE_SLACK_MS = 10 * 60_000; // the API accepts event_at up to 10 min ahead (C4)
// A light check: the API validates for real (zod stays out of this page's first-load JS, see lib/store.ts).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FoundValues = {
	species?: Species;
	size?: Size;
	colours: Colour[];
	/** The coarsened point (C6): the raw GPS or EXIF point never gets here, nor into the draft or the request. */
	location?: LatLng;
	source?: Source;
	situation?: 'have' | 'seen';
	note: string;
	email: string;
	when: When;
	/** Native date input: "2026-10-15" */
	date: string;
	/** Native time input: "18:30" */
	time: string;
	/** ISO: the earliest photo EXIF time, the capture time kept for matching. */
	takenAt?: string;
	/** ISO: when the finder opened the flow, the capture time without EXIF. */
	startedAt: string;
};
/** The lost report a sighting is about (P9 "Sporoči opažanje"); `species` from the link or read from the listing. */
export type Linked = { id: string; code?: string; species?: Species };
export type FieldErrorKey = 'species' | 'situation' | 'note' | 'email' | 'when';

export const initialValues = (entry: 'found' | 'sighted', now = new Date()): FoundValues => ({
	colours: [],
	note: '',
	email: '',
	when: 'now',
	date: '',
	time: '',
	startedAt: now.toISOString(),
	...(entry === 'sighted' && { situation: 'seen' as const }),
});

const pad = (n: number) => String(n).padStart(2, '0');
/** "2026-10-15" and "18:30" in local time, as the native inputs take them. */
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isoTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** When the sighting was, or null while the date or time is missing or lies in the future. */
export function sightingTime(values: Pick<FoundValues, 'when' | 'date' | 'time'>, now = Date.now()): Date | null {
	if (values.when === 'now') return new Date(now);
	const day = values.when === 'other' ? values.date : isoDay(new Date(now));
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(values.time)) return null;
	const at = new Date(`${day}T${values.time}`);
	return Number.isNaN(at.getTime()) || at.getTime() > now + FUTURE_SLACK_MS ? null : at;
}

/** The checks Naprej (or Publish) runs on a step; each key names the field and its message. */
export function stepErrors(step: Step, values: FoundValues): Partial<Record<FieldErrorKey, true>> {
	const errors: Partial<Record<FieldErrorKey, true>> = {};
	if (step === 'what' && !values.species) errors.species = true;
	if (step === 'situation' && !values.situation) errors.situation = true;
	if ((step === 'situation' || step === 'extra') && values.note.trim().length > NOTE_MAX) errors.note = true;
	if (
		step === 'situation' &&
		values.email.trim() &&
		(values.email.trim().length > 254 || !EMAIL.test(values.email.trim()))
	)
		errors.email = true;
	if (step === 'when' && !sightingTime(values)) errors.when = true;
	return errors;
}

/**
 * The original capture time (C4 `event_at`): the sighting's time for a linked sighting, else the earliest photo EXIF
 * time, else when the flow started.
 */
export function capturedAt(values: FoundValues, linked: boolean, now = Date.now()): Date {
	if (linked) return sightingTime(values, now) ?? new Date(now);
	const taken = values.takenAt ? Date.parse(values.takenAt) : NaN;
	return new Date(taken <= now + FUTURE_SLACK_MS ? taken : Date.parse(values.startedAt));
}

/**
 * One submission (C1 `Idempotency-Key`, deduped by the API beyond 24 h, TASK-86.5): the key, the exact body sent with
 * it and whether its time was "Pravkar" (the moment Publish was pressed).
 */
export type Submission = { key: string; body: string; at: string; now: boolean };

/**
 * The submission to send: the previous one, key and all, while the body is the same; any edit is a new one. A
 * "Pravkar" time stays the first press's when it is "Pravkar" again, so a repeat is the same body; every other time
 * is read from the answers, so a time-only edit is a change.
 */
export function nextSubmission(
	previous: Submission | null,
	make: (at: Date) => CreateReportInput,
	{ at, now, newKey }: { at: Date; now: boolean; newKey: () => string }
): Submission {
	const time = previous?.now && now ? new Date(previous.at) : at;
	const body = JSON.stringify(make(time));
	if (previous && previous.body === body) return previous;
	return { key: newKey(), body, at: time.toISOString(), now };
}

/**
 * Whether a failed send keeps its submission for the retry: no answer (NETWORK), a server fault (5xx), a rate limit,
 * a failed captcha or a CONFLICT (the first request with this key is still running, C1) may mean nothing or the report itself was stored, and the API keeps none of those answers, so
 * the same key is what keeps a repeat from creating a second report. Only a definitive refusal (another 4xx) ends it.
 */
export function keepsSubmission(error: unknown): boolean {
	const failure = error as { status?: number; code?: string; data?: { code?: string } } | null;
	const status = failure?.status ?? 0;
	const code = failure?.code ?? failure?.data?.code;
	return status === 0 || status >= 500 || code === 'RATE_LIMITED' || code === 'CAPTCHA_FAILED' || code === 'CONFLICT';
}

/**
 * The C4 body: only what was asked, the coarsened point and never where the animal is kept. `account`: a signed-in
 * finder, who gets no manage link, so no `finder_email` (anonymous only).
 */
export function createBody(
	values: FoundValues & { species: Species; location: LatLng },
	{ photoIds, at, linked, account }: { photoIds: string[]; at: Date; linked?: Linked; account: boolean }
): CreateReportInput {
	const note = values.note.trim();
	const finderEmail = values.email.trim();
	return {
		type: linked || values.situation === 'seen' ? 'sighted' : 'found',
		species: values.species,
		...(values.size && { size: values.size }),
		...(values.colours.length > 0 && { colours: values.colours }),
		location: values.location,
		event_at: at.toISOString(),
		...(note && { circumstances: note }),
		// The short sighting flow asks no email (P7 S1).
		...(!linked && !account && finderEmail && { finder_email: finderEmail }),
		...(linked && { linked_report_id: linked.id }),
		photo_ids: photoIds,
	};
}
