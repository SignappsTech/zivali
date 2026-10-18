// Deterministic mock (C19 §Mock; the default locally and in CI). An image gets test/fixtures/ai/<sha256>.json when
// present, else the fixture its sha256 names in fixtures/ai/index.json (refusal, invalid, person), else a result derived
// from the hash: a dog of one breed at 0.82, black and white at 0.9, size m at 0.4 (the low-confidence path). A fixture
// is { stop_reason?: 'refusal', output?: <raw model JSON> }; the output goes through the same parseExtraction as a
// real reply. Usage tokens are fixed; ai.extract books no cost for the mock.
import { existsSync, readFileSync } from 'node:fs';

import { DOG_BREEDS } from '@zivali/validation/breeds';

import { parseExtraction, type AiAdapter, type AiReply } from './index.ts';

type Fixture = { stop_reason?: 'refusal'; output?: unknown };

const DIR = new URL('../../test/fixtures/ai/', import.meta.url);
const SHA256 = /^[0-9a-f]{64}$/;
export const MOCK_TOKENS = { input_tokens: 1500, output_tokens: 200 };

// Not in a build (dist/): the fixtures are test files, and the mock never runs in staging or production.
const read = (name: string): Fixture | undefined => {
	const file = new URL(`${name}.json`, DIR);
	return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Fixture) : undefined;
};
let index: Record<string, string> | undefined;
const named = (sha256: string): Fixture | undefined => {
	index ??= (read('index') as Record<string, string> | undefined) ?? {};
	return Object.hasOwn(index, sha256) ? read(index[sha256]!) : undefined;
};

function derived(sha256: string): Fixture {
	const n = parseInt(sha256.slice(0, 8), 16) || 0;
	return {
		output: {
			animal: 'dog',
			animal_count: 1,
			species_confidence: 0.97,
			breeds: [{ code: DOG_BREEDS[n % DOG_BREEDS.length], confidence: 0.82 }],
			colours: { values: ['black', 'white'], confidence: 0.9 },
			pattern: { value: 'bicolour', confidence: 0.75 },
			size: { value: 'm', confidence: 0.4 },
			collar: { present: n % 2 === 0, confidence: 0.85 },
			marks: [],
			moderation: { person_prominent: false, nsfw: false, violence: false, text_contact_info: false },
		},
	};
}

export function mockAi(model: string): AiAdapter {
	return {
		provider: 'mock',
		async extract({ sha256 }): Promise<AiReply> {
			// The hash names a file: anything but 64 hex characters never reaches the file system.
			const fixture = (SHA256.test(sha256) && (read(sha256) ?? named(sha256))) || derived(sha256);
			const usage = { model, ...MOCK_TOKENS };
			if (fixture.stop_reason === 'refusal') return { ...usage, outcome: 'refused' };
			const extraction = parseExtraction(fixture.output);
			return extraction ? { ...usage, outcome: 'ok', extraction } : { ...usage, outcome: 'invalid' };
		},
	};
}
