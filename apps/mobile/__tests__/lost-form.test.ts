import { pet } from '@zivali/api/__fixtures__/pets';
import {
	createBody,
	eventAt,
	formatDay,
	formatTime,
	initialValues,
	isOld,
	lostErrors,
	type LostValues,
	NEW_PET,
	reportFields,
	stepsFor,
} from '@/components/report-lost/lost-form';

const NOW = new Date(2026, 9, 16, 14, 30).getTime();
const filled: LostValues = {
	...initialValues,
	pet: NEW_PET,
	species: 'dog',
	name: 'Medo',
	colours: ['brown'],
	location: { lat: 46.07, lng: 14.48 },
	radius_m: 500,
};
const errors = (patch: Partial<LostValues>) => lostErrors({ ...filled, ...patch }, NOW);

describe('lost flow form', () => {
	test('a new pet takes seven steps, a saved pet six (its photos cannot join a report, C5)', () => {
		expect(stepsFor(undefined)).toHaveLength(7);
		expect(stepsFor(NEW_PET)).toEqual(['pet', 'photos', 'details', 'where', 'when', 'what', 'review']);
		expect(stepsFor(pet.id)).toEqual(['pet', 'photos', 'where', 'when', 'what', 'review']);
	});

	test('a filled report has no errors; pet, species and a colour are required', () => {
		expect(lostErrors(filled, NOW)).toEqual({});
		expect(errors({ pet: undefined, species: undefined, colours: [] })).toEqual({
			pet: 'pet_required',
			species: 'species_required',
			colours: 'colour_required',
		});
	});

	test('when: the typed date and time are read day first, never in the future; older than 30 days only warns', () => {
		expect(eventAt({ when: 'now', date: '', time: '' }, NOW)?.getTime()).toBe(NOW);
		expect(eventAt({ when: 'today', date: '', time: '13.40' }, NOW)).toEqual(new Date(2026, 9, 16, 13, 40));
		expect(eventAt({ when: 'yesterday', date: '', time: '18:05' }, NOW)).toEqual(new Date(2026, 9, 15, 18, 5));
		expect(eventAt({ when: 'other', date: '10. 9. 2026', time: '18.30' }, NOW)).toEqual(
			new Date(2026, 8, 10, 18, 30)
		);
		expect(eventAt({ when: 'other', date: '10/9/26', time: '1830' }, NOW)).toEqual(new Date(2026, 8, 10, 18, 30));

		expect(errors({ when: 'today', time: '25.00' })).toEqual({ time: 'when_invalid' });
		expect(errors({ when: 'other', date: '31. 2. 2026', time: '10.00' })).toEqual({ date: 'when_invalid' });
		expect(errors({ when: 'today', time: '16.00' })).toEqual({ time: 'when_future' });
		expect(errors({ when: 'other', date: '17. 10. 2026', time: '09.00' })).toEqual({ date: 'when_future' });
		// Within the API's 10 minutes of clock skew.
		expect(errors({ when: 'today', time: '14.35' })).toEqual({});

		expect(isOld(eventAt({ when: 'other', date: '10. 9. 2026', time: '18.30' }, NOW), NOW)).toBe(true);
		expect(isOld(eventAt({ when: 'yesterday', date: '', time: '18.30' }, NOW), NOW)).toBe(false);
	});

	test('the default date and time are written the way the fields read them back', () => {
		const at = new Date(2026, 9, 6, 8, 5);
		expect(formatDay(at, 'sl')).toBe('6. 10. 2026');
		expect(formatDay(at, 'en')).toBe('6/10/2026');
		expect(formatTime(at, 'sl')).toBe('08.05');
		expect(formatTime(at, 'en')).toBe('08:05');
		for (const locale of ['sl', 'en'])
			expect(eventAt({ when: 'other', date: formatDay(at, locale), time: formatTime(at, locale) }, NOW)).toEqual(
				at
			);
	});

	test('reward: whole euros 1 to 10 000, a note without contact data, at least one of them while on', () => {
		const reward = (reward_eur: string, reward_note = '') => errors({ reward: true, reward_eur, reward_note });
		expect(reward('', '')).toEqual({ reward: 'reward_empty' });
		expect(reward('100')).toEqual({});
		expect(reward('', 'Tudi za podatek, ki pomaga pri iskanju')).toEqual({});
		expect(reward('50,5')).toEqual({ reward_eur: 'reward_amount_invalid' });
		expect(reward('0')).toEqual({ reward_eur: 'reward_amount_invalid' });
		expect(reward('10001')).toEqual({ reward_eur: 'reward_amount_max' });
		expect(reward('', 'Pokličite me na 041 123 456')).toEqual({ reward_note: 'reward_note_contact_data' });
		expect(reward('', 'luna@example.si')).toEqual({ reward_note: 'reward_note_contact_data' });
		expect(reward('', 'www.najdi.si')).toEqual({ reward_note: 'reward_note_contact_data' });
		// Off: nothing is checked (the values are dropped with the switch).
		expect(errors({ reward: false, reward_eur: 'x', reward_note: '041 123 456' })).toEqual({});
	});

	test('a new pet sends its details; a saved pet its id; "Ustvari novo prijavo" the pet inline without the id', () => {
		const at = new Date(NOW);
		const body = createBody(
			{
				...filled,
				chip: '705 1234',
				circumstances: '  ',
				reward: true,
				reward_eur: '100',
				reward_note: ' Hvala ',
			},
			{ photoIds: ['ph1'], at }
		);
		expect(body).toEqual({
			type: 'lost',
			species: 'dog',
			name: 'Medo',
			breed_codes: [],
			colours: ['brown'],
			chip: '705 1234',
			location: { lat: 46.07, lng: 14.48 },
			requested_radius_m: 500,
			event_at: at.toISOString(),
			contact_pref: 'chat_only',
			reward_eur: 100,
			reward_note: 'Hvala',
			photo_ids: ['ph1'],
		});

		const saved = createBody({ ...filled, pet: pet.id }, { photoIds: ['ph1'], at, pet });
		expect(saved).toMatchObject({ type: 'lost', pet_id: pet.id, species: 'dog', reward_eur: null });
		expect(saved).not.toHaveProperty('name');

		const inline = createBody({ ...filled, pet: pet.id }, { photoIds: ['ph1'], at, pet, inline: true });
		expect(inline).not.toHaveProperty('pet_id');
		expect(inline).toMatchObject({ name: 'Runo', chip: pet.chip_number, colours: ['golden'], size: 'l' });

		// An update clears a reward that was switched off.
		expect(reportFields({ ...filled, reward: false, reward_eur: '5' }, ['ph1'], at)).toMatchObject({
			reward_eur: null,
			reward_note: null,
		});
	});
});
