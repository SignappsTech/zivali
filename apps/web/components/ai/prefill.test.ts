import { describe, expect, it } from 'vitest';

import {
	attributesLowConfidence,
	attributesMultipleAnimals,
	attributesNoAnimal,
	attributesOtherAnimal,
	attributesReady,
} from '@zivali/api/__fixtures__/ai';

import { type AiField, type AiResult, announcementFor, planPrefill } from './prefill';

const PET: AiField[] = ['species', 'breed_codes', 'pattern', 'colours', 'size', 'collar'];
const ready = (result: unknown) => result as AiResult;
const empty = { breed_codes: [], colours: [], pattern: null, size: null, collar: null };
const plan = (result: unknown, values = {}, options: Partial<Parameters<typeof planPrefill>[2]> = {}) =>
	planPrefill(ready(result), { ...empty, ...values }, { fields: PET, touched: new Set(), ...options });

describe('planPrefill (C19 §Client rules)', () => {
	it('fills the empty fields with marks; a value below the minimum confidence leaves a hint, the collar a hint', () => {
		expect(plan(attributesReady)).toEqual({
			fill: { species: 'dog', breed_codes: ['dog.labrador_retriever'], colours: ['black'], pattern: 'solid' },
			marks: ['species', 'breed_codes', 'colours', 'pattern'],
			hints: ['size', 'collar'],
		});
	});

	it('never overwrites a touched or filled field, and adds no hint lines once the person changed something', () => {
		const result = plan(
			attributesReady,
			{ species: 'dog', colours: ['white'] },
			{ touched: new Set<AiField>(['colours']), late: true }
		);
		expect(result.fill).toEqual({ breed_codes: ['dog.labrador_retriever'], pattern: 'solid' });
		expect(result.marks).toEqual(['breed_codes', 'pattern']);
		expect(result.hints).toEqual([]);
	});

	it('a cleared suggestion is touched: it stays empty and gets no hint', () => {
		const result = plan(attributesReady, {}, { touched: new Set<AiField>(['colours', 'size']) });
		expect(result.fill.colours).toBeUndefined();
		expect(result.hints).toEqual(['collar']);
	});

	it('shows a different species as a hint, never switches it, and fills only values valid for the chosen one', () => {
		const result = plan(attributesReady, { species: 'cat' });
		expect(result.differs).toBe('dog');
		expect(result.fill).toEqual({ colours: ['black'], pattern: 'solid' });
		// No dog breed in a cat form, and no breed hint about the other species.
		expect(result.marks).not.toContain('breed_codes');
		expect(result.hints).not.toContain('breed_codes');
	});

	it('fills an unknown or mixed breed as the form choice, never a guess, and drops sizes the species has not', () => {
		const result = plan({
			...attributesReady,
			species: { value: 'cat', confidence: 0.9 },
			breed_codes: { value: ['cat.unknown'], confidence: 0.7 },
			size: { value: 'xl', confidence: 0.8 },
		});
		expect(result.fill.breed_codes).toEqual(['cat.unknown']);
		expect(result.fill.size).toBeUndefined();
	});

	it('hints every field below the minimum confidence, the breed with its own hint', () => {
		const result = plan(attributesLowConfidence);
		expect(result.fill).toEqual({ species: 'cat' });
		expect(result.hints).toEqual(['breed_codes', 'colours', 'size']);
	});

	it('fills nothing for no animal or another animal; several animals fill as usual', () => {
		expect(plan(attributesNoAnimal)).toEqual({ fill: {}, marks: [], hints: [] });
		expect(plan(attributesOtherAnimal)).toEqual({ fill: {}, marks: [], hints: [] });
		expect(plan(attributesMultipleAnimals).fill).toEqual({
			species: 'dog',
			breed_codes: ['dog.border_collie'],
			colours: ['black', 'white'],
			pattern: 'bicolour',
			size: 'm',
		});
	});

	it('a field still marked from an earlier first photo counts as untouched when the new one is checked', () => {
		const result = plan(
			attributesMultipleAnimals,
			{ species: 'dog', colours: ['black'] },
			{ marked: new Set<AiField>(['colours']) }
		);
		expect(result.fill.colours).toEqual(['black', 'white']);
		expect(result.fill.species).toBeUndefined();
	});

	it('only fills the fields the form has (P7: species, size, colours)', () => {
		const result = planPrefill(
			ready(attributesMultipleAnimals),
			{ colours: [] },
			{ fields: ['species', 'size', 'colours', 'collar'], touched: new Set() }
		);
		expect(result.fill).toEqual({ species: 'dog', colours: ['black', 'white'], size: 'm' });
	});
});

describe('announcementFor', () => {
	it('counts the filled fields, says when nothing was certain enough, and reads the notice title', () => {
		expect(announcementFor(ready(attributesReady), plan(attributesReady))).toEqual({ kind: 'arrived', count: 4 });
		const low = ready({ ...attributesLowConfidence, species: { value: null, confidence: 0.4 } });
		expect(announcementFor(low, plan(low))).toEqual({ kind: 'none' });
		expect(announcementFor(ready(attributesOtherAnimal), plan(attributesOtherAnimal))).toEqual({
			kind: 'notice',
			notice: 'other_animal',
		});
		// Everything already filled in by the person: nothing to say.
		const all = plan(attributesReady, {}, { touched: new Set(PET) });
		expect(announcementFor(ready(attributesReady), all)).toBeUndefined();
	});
});
