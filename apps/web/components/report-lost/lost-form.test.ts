import { describe, expect, it } from 'vitest';

import { pet } from '@zivali/api/__fixtures__/pets';

import {
	createBody,
	eventAt,
	initialValues,
	isOld,
	lostErrors,
	type LostValues,
	NEW_PET,
	reportFields,
	stepsFor,
} from './lost-form';

// 16 Oct 2026, 14:20 in the test's clock.
const NOW = new Date(2026, 9, 16, 14, 20).getTime();
const values = (change: Partial<LostValues> = {}): LostValues => ({
	...initialValues,
	pet: NEW_PET,
	species: 'dog',
	colours: ['brown'],
	location: { lat: 46.0702, lng: 14.4874 },
	radius_m: 500,
	...change,
});

describe('stepsFor', () => {
	it('takes seven steps for a new pet and skips only the details for a saved one (photos stay, C5)', () => {
		expect(stepsFor(NEW_PET, true)).toEqual(['pet', 'photos', 'details', 'where', 'when', 'what', 'review']);
		expect(stepsFor('pet-1', true)).toEqual(['pet', 'photos', 'where', 'when', 'what', 'review']);
	});

	it('starts at the photos with the new-pet path when there are no saved pets to choose from', () => {
		const steps = ['photos', 'details', 'where', 'when', 'what', 'review'];
		expect(stepsFor(NEW_PET, false)).toEqual(steps);
		// A `?pet=` link of a pet this visitor has not (signed out, another account): still the new-pet path.
		expect(stepsFor('pet-1', false)).toEqual(steps);
		expect(stepsFor(undefined, false)).toEqual(steps);
	});
});

describe('eventAt and isOld', () => {
	it('reads Pravkar as now, Danes and Včeraj with a time, Drugič with the picked date and time', () => {
		expect(eventAt({ when: 'now', date: '', time: '' }, NOW)?.getTime()).toBe(NOW);
		expect(eventAt({ when: 'today', date: '', time: '09:05' }, NOW)).toEqual(new Date(2026, 9, 16, 9, 5));
		expect(eventAt({ when: 'yesterday', date: '', time: '23:40' }, NOW)).toEqual(new Date(2026, 9, 15, 23, 40));
		expect(eventAt({ when: 'other', date: '2026-09-10', time: '18:30' }, NOW)).toEqual(
			new Date(2026, 8, 10, 18, 30)
		);
		expect(eventAt({ when: 'other', date: '', time: '18:30' }, NOW)).toBeNull();
		expect(eventAt({ when: 'other', date: '2026-02-30', time: '18:30' }, NOW)).toBeNull();
	});

	it('warns after 30 days, never blocks', () => {
		expect(isOld(new Date(2026, 8, 10), NOW)).toBe(true);
		expect(isOld(new Date(2026, 9, 1), NOW)).toBe(false);
		expect(lostErrors(values({ when: 'other', date: '2025-01-01', time: '10:00' }), NOW)).toEqual({});
	});
});

describe('lostErrors', () => {
	it('asks for the pet, species and a colour', () => {
		expect(lostErrors({ ...initialValues }, NOW)).toEqual({
			pet: 'pet_required',
			species: 'species_required',
			colours: 'colour_required',
		});
	});

	it('rejects a future time on the field that holds it, allowing the API 10 minutes of clock slack', () => {
		expect(lostErrors(values({ when: 'today', time: '14:29' }), NOW)).toEqual({});
		expect(lostErrors(values({ when: 'today', time: '14:31' }), NOW)).toEqual({ time: 'when_future' });
		expect(lostErrors(values({ when: 'other', date: '2026-10-17', time: '08:00' }), NOW)).toEqual({
			date: 'when_future',
		});
		expect(lostErrors(values({ when: 'other', date: '', time: '08:00' }), NOW)).toEqual({ date: 'when_invalid' });
	});

	it('checks the display-only reward: whole euros 1 to 10 000, a note without contact data, one of the two', () => {
		expect(lostErrors(values({ reward: true }), NOW)).toEqual({ reward: 'reward_empty' });
		expect(lostErrors(values({ reward: true, reward_eur: '12,5' }), NOW)).toEqual({
			reward_eur: 'reward_amount_invalid',
		});
		expect(lostErrors(values({ reward: true, reward_eur: '10001' }), NOW)).toEqual({
			reward_eur: 'reward_amount_max',
		});
		expect(lostErrors(values({ reward: true, reward_note: 'Pokličite me na 041 123 456' }), NOW)).toEqual({
			reward_note: 'reward_note_contact_data',
		});
		expect(lostErrors(values({ reward: true, reward_note: 'www.najdi.si' }), NOW)).toEqual({
			reward_note: 'reward_note_contact_data',
		});
		expect(lostErrors(values({ reward: true, reward_eur: '100', reward_note: 'Tudi za podatek' }), NOW)).toEqual(
			{}
		);
	});

	it('limits the circumstances to 1000 characters', () => {
		expect(lostErrors(values({ circumstances: 'a'.repeat(1001) }), NOW)).toEqual({
			circumstances: 'circumstances_too_long',
		});
	});
});

describe('createBody', () => {
	const at = new Date(NOW);

	it('sends the details entered in the flow, trimmed, with blanks left out', () => {
		const body = createBody(
			values({
				name: ' Medo ',
				size: 'm',
				chip: '705 1234 5678 9012',
				collar: null,
				circumstances: ' Ob bajerju. ',
				reward: true,
				reward_eur: '100',
				reward_note: '',
			}),
			{ photoIds: ['ph-1'], at }
		);
		expect(body).toEqual({
			type: 'lost',
			species: 'dog',
			name: 'Medo',
			breed_codes: [],
			colours: ['brown'],
			pattern: undefined,
			size: 'm',
			sex: undefined,
			chip: '705 1234 5678 9012',
			collar: undefined,
			ear_tip: undefined,
			lifestyle: undefined,
			location: { lat: 46.0702, lng: 14.4874 },
			requested_radius_m: 500,
			event_at: at.toISOString(),
			circumstances: 'Ob bajerju.',
			contact_pref: 'chat_only',
			reward_eur: 100,
			reward_note: null,
			photo_ids: ['ph-1'],
		});
	});

	it('names a saved pet by id, or inline without the id next to an open search', () => {
		const saved = createBody(values({ pet: pet.id }), { photoIds: ['ph-1'], at, pet });
		expect(saved).toMatchObject({ type: 'lost', pet_id: pet.id, species: pet.species });
		expect(saved).not.toHaveProperty('colours');

		const inline = createBody(values({ pet: pet.id }), { photoIds: ['ph-1'], at, pet, inline: true });
		expect(inline).not.toHaveProperty('pet_id');
		expect(inline).toMatchObject({ species: pet.species, name: pet.name, colours: pet.colours });
	});

	it('clears a reward with null when it is switched off (PATCH of an open search)', () => {
		const fields = reportFields(values({ reward: false, reward_eur: '50', reward_note: 'x' }), [], at);
		expect(fields).toMatchObject({ reward_eur: null, reward_note: null });
	});
});
