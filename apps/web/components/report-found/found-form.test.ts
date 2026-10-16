import { describe, expect, it } from 'vitest';

import { ApiError } from '@zivali/api/client';

import {
	capturedAt,
	createBody,
	type FoundValues,
	initialValues,
	keepsSubmission,
	nextSubmission,
	sightingTime,
	stepErrors,
	type Submission,
} from './found-form';

const ID = '51aa3c2e-4b1d-4f6a-9e2c-8d7b5a1f3e10';
const START = '2026-10-16T08:00:00.000Z';
const NOW = Date.parse('2026-10-16T10:00:00.000Z');
const POINT = { lat: 46.0569, lng: 14.5058 };
const filled = (
	change: Partial<FoundValues> = {}
): FoundValues & Required<Pick<FoundValues, 'species' | 'location'>> => ({
	...initialValues('found', new Date(START)),
	species: 'dog',
	location: POINT,
	situation: 'have',
	...change,
});
let keys = 0;
const newKey = () => `key-${++keys}`;

describe('stepErrors', () => {
	it('needs the species, the situation, a note within 1000 characters and a valid email only when given', () => {
		const empty = initialValues('found');
		expect(stepErrors('what', empty)).toEqual({ species: true });
		expect(stepErrors('situation', empty)).toEqual({ situation: true });
		expect(stepErrors('situation', filled({ note: 'x'.repeat(1001), email: 'petra.k@gmail' }))).toEqual({
			note: true,
			email: true,
		});
		expect(stepErrors('situation', filled({ email: ' ana@primer.si ' }))).toEqual({});
		expect(stepErrors('photo', empty)).toEqual({});
	});

	it('starts a sighting entry on "Ne, žival ni pri meni"', () => {
		expect(initialValues('sighted').situation).toBe('seen');
		expect(initialValues('found').situation).toBeUndefined();
	});
});

describe('sightingTime', () => {
	it('is now for Pravkar, today at the time for Danes, the date and time for Drugič; never in the future', () => {
		expect(sightingTime({ when: 'now', date: '', time: '' }, NOW)?.getTime()).toBe(NOW);
		const today = sightingTime({ when: 'today', date: '', time: '09:15' }, NOW)!;
		expect([today.getHours(), today.getMinutes()]).toEqual([9, 15]);
		const other = sightingTime({ when: 'other', date: '2026-10-14', time: '18:30' }, NOW)!;
		expect([other.getFullYear(), other.getMonth(), other.getDate(), other.getHours()]).toEqual([2026, 9, 14, 18]);
		expect(sightingTime({ when: 'other', date: '2030-01-01', time: '10:00' }, NOW)).toBeNull();
		expect(sightingTime({ when: 'today', date: '', time: '' }, NOW)).toBeNull();
	});
});

describe('capturedAt', () => {
	it('is the earliest photo EXIF time, else when the flow started', () => {
		expect(capturedAt(filled({ takenAt: '2026-10-16T07:30:00.000Z' }), false, NOW).toISOString()).toBe(
			'2026-10-16T07:30:00.000Z'
		);
		expect(capturedAt(filled(), false, NOW).toISOString()).toBe(START);
		// A camera clock in the future is not believed.
		expect(capturedAt(filled({ takenAt: '2030-01-01T00:00:00.000Z' }), false, NOW).toISOString()).toBe(START);
	});

	it('is the sighting time for a linked sighting', () => {
		expect(capturedAt(filled({ when: 'now' }), true, NOW).getTime()).toBe(NOW);
	});
});

describe('createBody (C4)', () => {
	it('sends what was asked, the coarsened point and never where the animal is kept', () => {
		const body = createBody(
			filled({ size: 'm', colours: ['brown', 'white'], note: ' Prijazen je. ', email: ' ana@primer.si ' }),
			{ photoIds: ['p1'], at: new Date(START), account: false }
		);
		expect(body).toEqual({
			type: 'found',
			species: 'dog',
			size: 'm',
			colours: ['brown', 'white'],
			location: POINT,
			event_at: START,
			circumstances: 'Prijazen je.',
			finder_email: 'ana@primer.si',
			photo_ids: ['p1'],
		});
	});

	it('is a sighting for "Ne, žival ni pri meni" and for a linked sighting, which asks no email', () => {
		const at = new Date(START);
		expect(createBody(filled({ situation: 'seen' }), { photoIds: [], at, account: false }).type).toBe('sighted');
		const linked = createBody(filled({ email: 'ana@primer.si' }), {
			photoIds: [],
			at,
			account: false,
			linked: { id: ID },
		});
		expect(linked).toMatchObject({ type: 'sighted', linked_report_id: ID, photo_ids: [] });
		expect(linked).not.toHaveProperty('finder_email');
	});

	it('sends no finder email for a signed-in finder (anonymous only, C4)', () => {
		const body = createBody(filled({ email: 'ana@primer.si' }), {
			photoIds: ['p1'],
			at: new Date(),
			account: true,
		});
		expect(body).not.toHaveProperty('finder_email');
	});
});

describe('nextSubmission (one Idempotency-Key per exact body)', () => {
	const make = (values: ReturnType<typeof filled>) => (at: Date) =>
		createBody(values, { photoIds: ['p1'], at, account: false });

	it('repeats the same key for the same body and takes a new one for any edit', () => {
		const first = nextSubmission(null, make(filled()), { at: new Date(START), now: false, newKey });
		expect(nextSubmission(first, make(filled()), { at: new Date(START), now: false, newKey })).toBe(first);
		const edited = nextSubmission(first, make(filled({ note: 'ovratnica' })), {
			at: new Date(START),
			now: false,
			newKey,
		});
		expect(edited.key).not.toBe(first.key);
	});

	it('keeps the first press time while it is "Pravkar" both times, so a repeat later is the same body', () => {
		const first = nextSubmission(null, make(filled()), { at: new Date(NOW), now: true, newKey });
		const later = nextSubmission(first, make(filled()), { at: new Date(NOW + 60_000), now: true, newKey });
		expect(later).toBe(first);
		expect(JSON.parse(later.body).event_at).toBe(new Date(NOW).toISOString());
	});

	it('treats a time-only edit as a change (TASK-29.3 review b)', () => {
		const first = nextSubmission(null, make(filled()), { at: new Date(NOW), now: true, newKey });
		// Pravkar → Danes 09:15: only event_at differs, and it must not be replaced by the old one.
		const today = new Date('2026-10-16T09:15:00.000Z');
		const edited = nextSubmission(first, make(filled()), { at: today, now: false, newKey });
		expect(edited.key).not.toBe(first.key);
		expect(JSON.parse(edited.body).event_at).toBe(today.toISOString());
		// Danes 09:15 → 09:45: a new time, a new submission.
		const again = nextSubmission(edited, make(filled()), {
			at: new Date('2026-10-16T09:45:00.000Z'),
			now: false,
			newKey,
		});
		expect(again.key).not.toBe(edited.key);
	});

	it('takes a new capture time (an earlier photo) as a change, not the old one', () => {
		const first = nextSubmission(null, make(filled()), { at: new Date(START), now: false, newKey });
		const earlier = new Date('2026-10-16T07:00:00.000Z');
		const next: Submission = nextSubmission(first, make(filled()), { at: earlier, now: false, newKey });
		expect(next.key).not.toBe(first.key);
		expect(JSON.parse(next.body).event_at).toBe(earlier.toISOString());
	});
});

describe('keepsSubmission (TASK-29.3 review a)', () => {
	it('keeps the key when the API may have stored the report: no answer, 5xx, a rate limit, a failed captcha', () => {
		expect(keepsSubmission({ status: 0, data: { code: 'NETWORK' } })).toBe(true);
		expect(keepsSubmission({ status: 502, data: { code: 'INTERNAL' } })).toBe(true);
		expect(keepsSubmission({ status: 503, data: { code: 'SERVICE_UNAVAILABLE' } })).toBe(true);
		expect(keepsSubmission({ status: 429, data: { code: 'RATE_LIMITED' } })).toBe(true);
		expect(keepsSubmission(new ApiError('NETWORK', 'NETWORK'))).toBe(true);
		expect(keepsSubmission(new ApiError('CAPTCHA_FAILED', 'CAPTCHA_FAILED'))).toBe(true);
		expect(keepsSubmission({ status: 409, data: { code: 'CONFLICT' } })).toBe(true);
		expect(keepsSubmission(new ApiError('CONFLICT', 'CONFLICT'))).toBe(true);
	});

	it('ends the submission on a definitive refusal', () => {
		expect(keepsSubmission({ status: 422, data: { code: 'VALIDATION' } })).toBe(false);
		expect(keepsSubmission({ status: 403, data: { code: 'FORBIDDEN' } })).toBe(false);
		expect(keepsSubmission(new ApiError('VALIDATION', 'VALIDATION'))).toBe(false);
	});
});
