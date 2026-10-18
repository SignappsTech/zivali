import { describe, expect, test } from 'vitest';

import { aiExtractionJsonSchema, aiExtractionSchema, photoAttributesSchema } from '../src/ai.ts';
import { MatchReason } from '../src/matches.schema.ts';

const extraction = {
	animal: 'dog',
	animal_count: 1,
	species_confidence: 0.98,
	breeds: [
		{ code: 'dog.labrador_retriever', confidence: 0.81 },
		{ code: 'dog.mixed', confidence: 0.4 },
	],
	colours: { values: ['black', 'white'], confidence: 0.9 },
	pattern: { value: 'bicolour', confidence: 0.77 },
	size: { value: 'm', confidence: 0.4 },
	collar: { present: true, confidence: 0.88 },
	marks: ['white chest', 'torn left ear'],
	moderation: { person_prominent: false, nsfw: false, violence: false, text_contact_info: false },
};
const issues = (value: unknown) =>
	aiExtractionSchema.safeParse(value).error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];

describe('aiExtractionSchema', () => {
	test('accepts the model output for a dog, a cat and no animal', () => {
		expect(issues(extraction)).toEqual([]);
		const cat = { ...extraction, animal: 'cat', breeds: [{ code: 'cat.european_shorthair', confidence: 0.7 }] };
		expect(issues(cat)).toEqual([]);
		const none = {
			...extraction,
			animal: 'none',
			animal_count: 0,
			breeds: [],
			colours: null,
			pattern: null,
			size: null,
		};
		expect(issues(none)).toEqual([]);
	});

	test('rejects breed codes of the other species, and any breed without a dog or cat', () => {
		expect(issues({ ...extraction, animal: 'cat' })).toEqual([
			'breeds.0.code: Breed of another species',
			'breeds.1.code: Breed of another species',
		]);
		const catOnDog = { ...extraction, breeds: [{ code: 'cat.siamese', confidence: 0.9 }] };
		expect(issues(catOnDog)).toEqual(['breeds.0.code: Breed of another species']);
		expect(issues({ ...extraction, animal: 'other' })).toHaveLength(2);
	});

	test('rejects bounds the JSON schema cannot carry, unknown codes and missing fields', () => {
		const bad = [
			{ species_confidence: 1.2 },
			{ animal_count: 3 },
			{ animal_count: 1.5 },
			{ breeds: Array(4).fill(extraction.breeds[0]) },
			{ breeds: [{ code: 'dog.wolf', confidence: 0.9 }] },
			{ colours: { values: [], confidence: 0.9 } },
			{ colours: { values: ['black', 'white', 'tan', 'red'], confidence: 0.9 } },
			{ colours: { values: ['purple'], confidence: 0.9 } },
			{ pattern: { value: 'stripes', confidence: 0.5 } },
			{ size: { value: 'xxl', confidence: 0.5 } },
			{ marks: Array(6).fill('spot') },
			{ marks: ['x'.repeat(101)] },
			{ animal: 'rabbit' },
			{ moderation: { person_prominent: false, nsfw: false, violence: false } },
			{ collar: undefined },
			{ breeds: null, animal: 'cat' }, // the species refine never sees a malformed list
		];
		for (const patch of bad) expect(issues({ ...extraction, ...patch }), JSON.stringify(patch)).not.toEqual([]);
	});
});

describe('aiExtractionJsonSchema (output_config.format)', () => {
	test('matches the snapshot', () => {
		expect(aiExtractionJsonSchema).toMatchSnapshot();
	});

	test('only keywords structured outputs support: closed objects, every field required, no bounds or $defs', () => {
		const walk = (node: unknown, visit: (o: Record<string, unknown>) => void): void => {
			if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
			else if (node && typeof node === 'object') {
				visit(node as Record<string, unknown>);
				Object.values(node).forEach((n) => walk(n, visit));
			}
		};
		const keys = new Set<string>();
		walk(aiExtractionJsonSchema, (o) => {
			if (o.type === 'object') {
				expect(o.additionalProperties).toBe(false);
				expect(o.required).toEqual(Object.keys(o.properties as object));
			}
			for (const key of Object.keys(o)) keys.add(key);
		});
		for (const key of ['minimum', 'maximum', 'maxItems', 'maxLength', '$schema', '$defs', '$ref'])
			expect(keys, key).not.toContain(key);
		// field names survive the keyword strip
		expect(Object.keys((aiExtractionJsonSchema.properties as object) ?? {})).toEqual(Object.keys(extraction));
	});

	test('animal_count is an enum the model cannot exceed (a bound would be stripped), and two parses', () => {
		const count = (aiExtractionJsonSchema.properties as Record<string, { enum?: unknown }>).animal_count;
		expect(count?.enum).toEqual([0, 1, 2]);
		expect(issues({ ...extraction, animal_count: 2 })).toEqual([]);
		expect(issues({ ...extraction, animal_count: 3 })).not.toEqual([]);
	});
});

describe('photoAttributesSchema', () => {
	test('pending, unavailable and the C19 example', () => {
		expect(photoAttributesSchema.parse({ status: 'pending' })).toEqual({ status: 'pending' });
		expect(photoAttributesSchema.parse({ status: 'unavailable' })).toEqual({ status: 'unavailable' });
		const ready = {
			status: 'ready',
			notice: null,
			species: { value: 'dog', confidence: 0.98 },
			breed_codes: { value: ['dog.labrador_retriever'], confidence: 0.81 },
			colours: { value: ['black'], confidence: 0.93 },
			pattern: { value: 'solid', confidence: 0.77 },
			size: { value: null, confidence: 0.41 },
			collar: { value: true, confidence: 0.88 },
		};
		expect(photoAttributesSchema.parse(ready)).toEqual(ready);
		const nothing = { ...ready, notice: 'no_animal', species: null, breed_codes: null, colours: null };
		expect(photoAttributesSchema.parse({ ...nothing, pattern: null, size: null, collar: null })).toBeTruthy();
	});

	test('rejects unknown statuses and notices, more than 2 breeds, other species, and extra fields stay out', () => {
		const ready = { status: 'ready', notice: null, species: null, breed_codes: null, colours: null };
		const base = { ...ready, pattern: null, size: null, collar: null };
		expect(photoAttributesSchema.safeParse({ status: 'failed' }).success).toBe(false);
		expect(photoAttributesSchema.safeParse({ ...base, notice: 'blurry' }).success).toBe(false);
		expect(photoAttributesSchema.safeParse({ ...base, species: { value: 'other', confidence: 1 } }).success).toBe(
			false
		);
		const breeds = ['dog.akita', 'dog.samoyed', 'dog.whippet'];
		expect(
			photoAttributesSchema.safeParse({ ...base, breed_codes: { value: breeds, confidence: 1 } }).success
		).toBe(false);
		expect(photoAttributesSchema.safeParse({ status: 'ready' }).success).toBe(false);
		// moderation, marks and model never reach clients
		const parsed = photoAttributesSchema.parse({ ...base, marks: ['x'], moderation: {}, model: 'm' });
		expect(parsed).toEqual(base);
	});
});

describe('MatchReason (C8)', () => {
	const ids = {
		lost_photo_id: '9b0e2c4a-1f3d-4b5e-8a7c-6d2e1f0a9b00',
		other_photo_id: 'c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e00',
	};
	test('the visual reason needs a band and both photo ids', () => {
		expect(MatchReason.parse({ code: 'visual', band: 'very_similar', ...ids })).toEqual({
			code: 'visual',
			band: 'very_similar',
			...ids,
		});
		expect(MatchReason.safeParse({ code: 'visual', band: 'similar' }).success).toBe(false);
		expect(MatchReason.safeParse({ code: 'visual', band: '1to3', ...ids }).success).toBe(false);
		expect(MatchReason.safeParse({ code: 'distance', band: 'similar' }).success).toBe(false);
		expect(MatchReason.parse({ code: 'distance', band: '1to3' })).toEqual({ code: 'distance', band: '1to3' });
	});
});
