// Synthetic extraction set (mechanics only; README.md): 42 labels with the composition of AC#1, keyed by made-up
// sha256s for the mock adapter (C19 §Mock). Photos 0, 1 and 2 carry the hashes test/fixtures/ai/index.json names
// refusal, invalid and person, so every outcome occurs; the rest get the mock's derived reply (always a black and
// white dog). The mock never looks at a photo, so these scores say nothing about a model.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import type { BreedCode, Colour } from '@zivali/types';

import { mockAi } from '../../../adapters/ai/mock.ts';
import { timedExtract, type Label, type Scored } from './harness.ts';

const INDEX = new URL('../../fixtures/ai/index.json', import.meta.url);

const DOGS: [BreedCode, Colour[]][] = [
	['dog.labrador_retriever', ['black']],
	['dog.golden_retriever', ['golden']],
	['dog.german_shepherd', ['black', 'tan']],
	['dog.border_collie', ['black', 'white']],
	['dog.beagle', ['white', 'tan', 'brown']],
	['dog.jack_russell_terrier', ['white', 'brown']],
	['dog.dachshund', ['red']],
	['dog.siberian_husky', ['grey', 'white']],
	['dog.mixed', ['brown']],
	['dog.mixed', ['black', 'white']],
];
const CATS: [BreedCode, Colour[]][] = [
	['cat.european_shorthair', ['grey']],
	['cat.british_shorthair', ['blue_grey']],
	['cat.maine_coon', ['brown']],
	['cat.persian', ['white']],
	['cat.siamese', ['cream', 'brown']],
	['cat.mixed', ['black']],
	['cat.mixed', ['red', 'white']],
	['cat.european_shorthair', ['black', 'white']],
	['cat.european_shorthair', ['red']],
];
/** Photos labelled with a prominent person: 2 gets the mock's person fixture, 5 and 30 its derived reply. */
const PERSON = new Set([2, 5, 30]);

export type SyntheticPhoto = { sha256: string; label: Label };

export function syntheticSet(): SyntheticPhoto[] {
	const shaOf = Object.fromEntries(
		Object.entries(JSON.parse(readFileSync(INDEX, 'utf8')) as Record<string, string>).map(([sha, name]) => [
			name,
			sha,
		])
	);
	const pet =
		(animal: 'dog' | 'cat') =>
		([breed, colours]: [BreedCode, Colour[]]): Pick<Label, 'animal' | 'breed' | 'colours'> => ({
			animal,
			breed,
			colours,
		});
	const none: Pick<Label, 'animal' | 'breed' | 'colours'> = { animal: 'none', breed: null, colours: [] };
	const other: typeof none = { animal: 'other', breed: null, colours: [] };
	const truths = [
		...[...DOGS, ...DOGS].map(pet('dog')),
		...[...CATS, ...CATS].map(pet('cat')),
		none,
		none,
		other,
		other,
	];
	return truths.map((truth, i) => ({
		sha256:
			[shaOf.refusal, shaOf.invalid, shaOf.person][i] ??
			createHash('sha256').update(`synthetic-extract-${i}`).digest('hex'),
		label: {
			file: `synthetic-${String(i).padStart(2, '0')}.jpg`,
			licence: 'CC0 1.0',
			source: 'synthetic (no photo)',
			...truth,
			person_prominent: PERSON.has(i),
			poor_light: i % 7 === 3,
		},
	}));
}

/** Every synthetic photo through the mock adapter, one after another, timed like a real run. */
export async function syntheticItems(model: string): Promise<Scored[]> {
	const ai = mockAi(model);
	const items: Scored[] = [];
	for (const { sha256, label } of syntheticSet())
		items.push({ label, reply: await timedExtract(ai, { jpegBase64: '', sha256 }) });
	return items;
}
