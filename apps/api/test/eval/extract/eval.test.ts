// Extraction evaluation (TASK-40.5 AC#2): the ADR-012 scoring on recorded replies, the synthetic set on the mock adapter
// (mechanics only) and the real-photo switch: off by default, recorded replies are enough, nothing reaches Anthropic.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import sharp from 'sharp';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AI_PROMPT_VERSION, type AiAdapter, type AiExtraction } from '../../../adapters/ai/index.ts';
import { MOCK_TOKENS, mockAi } from '../../../adapters/ai/mock.ts';
import { costUsd } from '../../../domains/ai/pricing.ts';
import { BARS, LabelSet, report, score, type EvalReply, type Label, type Scored } from './harness.ts';
import { realRun, REAL_DIR } from './real.ts';
import { syntheticItems, syntheticSet } from './synthetic.ts';

const MODEL = 'claude-haiku-5-5';

const label = (l: Partial<Label> & Pick<Label, 'animal'>): Label => ({
	file: 'a.jpg',
	licence: 'CC0 1.0',
	source: 'test',
	breed: null,
	colours: [],
	person_prominent: false,
	poor_light: false,
	...l,
});
const extraction = (x: Partial<AiExtraction> & Pick<AiExtraction, 'animal'>): AiExtraction => ({
	animal_count: 1,
	species_confidence: 0.9,
	breeds: [],
	colours: null,
	pattern: null,
	size: null,
	collar: { present: false, confidence: 0.9 },
	marks: [],
	moderation: { person_prominent: false, nsfw: false, violence: false, text_contact_info: false },
	...x,
});
const ok = (x: AiExtraction, latency_ms = 100): EvalReply => ({
	outcome: 'ok',
	input_tokens: 2400,
	output_tokens: 400,
	latency_ms,
	extraction: x,
});

describe('ADR-012 scoring', () => {
	// A: right on every field. B: a mixed dog with a confident wrong beagle, half its colours, its person missed.
	// C: a Siamese as a confident mixed (safe) with the true breed second, no colours. D: no animal, read as a cat.
	// E: refused, slow.
	const items: Scored[] = [
		{
			label: label({ animal: 'dog', breed: 'dog.labrador_retriever', colours: ['black'] }),
			reply: ok(
				extraction({
					animal: 'dog',
					breeds: [{ code: 'dog.labrador_retriever', confidence: 0.9 }],
					colours: { values: ['black'], confidence: 0.9 },
				})
			),
		},
		{
			label: label({ animal: 'dog', breed: 'dog.mixed', colours: ['brown', 'white'], person_prominent: true }),
			reply: ok(
				extraction({
					animal: 'dog',
					breeds: [{ code: 'dog.beagle', confidence: 0.7 }],
					colours: { values: ['brown'], confidence: 0.8 },
				}),
				200
			),
		},
		{
			label: label({ animal: 'cat', breed: 'cat.siamese', colours: ['cream', 'brown'] }),
			reply: ok(
				extraction({
					animal: 'cat',
					breeds: [
						{ code: 'cat.mixed', confidence: 0.8 },
						{ code: 'cat.siamese', confidence: 0.3 },
					],
				}),
				300
			),
		},
		{ label: label({ animal: 'none' }), reply: ok(extraction({ animal: 'cat' }), 400) },
		{
			label: label({ animal: 'dog', breed: 'dog.beagle', colours: ['tan'] }),
			reply: { outcome: 'refused', input_tokens: 2400, output_tokens: 5, latency_ms: 7000 },
		},
	];

	it('scores each field as ADR-012 defines it', () => {
		expect(score(items)).toEqual({
			species: { value: 3 / 4, n: 4 },
			colours: { value: (1 + 0.5 + 0) / 3, n: 3 },
			breed: { value: 1, n: 2 },
			wrong_breed: { value: 1 / 3, n: 3 },
			person: { value: 0, n: 1 },
			latency: { value: 7, n: 5 },
			refusals: { value: 1 / 5, n: 5 },
		});
	});

	it('reports every bar, the mean cost per photo and the gate', () => {
		const { pass, text } = report('test', 'claude-sonnet-5-5', items);
		expect(pass).toBe(false);
		for (const { name } of Object.values(BARS)) expect(text).toContain(`| ${name} |`);
		expect(text).toContain('| species correct | 0.750 | 4 | ≥ 0.97 | FAIL |');
		expect(text).toContain('| true breed among the suggestions (pure breeds) | 1.000 | 2 | ≥ 0.6 | PASS |');
		expect(text).toContain('| p95 latency (s) | 7.000 | 5 | ≤ 6 | FAIL |');
		// Sonnet 5.5: (4 × (2400 × 2 + 400 × 10) + 2400 × 2 + 5 × 10) / 1e6 / 5
		expect(text).toContain('Mean cost per photo: USD 0.008010');
		expect(text).toContain(`claude-sonnet-5-5, prompt ${AI_PROMPT_VERSION}`);
		expect(text).toMatch(/Gate \(every ADR-012 bar\): FAIL \(species correct; colours mean Jaccard; .*refusals\)/);
	});

	it('passes only when every bar is met; a bar without photos to score is missed', () => {
		const perfect = items.slice(0, 1);
		const { pass, text } = report('test', MODEL, perfect);
		expect(pass).toBe(false);
		expect(text).toContain('| person_prominent recall | n/a | 0 | ≥ 0.9 | FAIL |');
		const person = {
			label: label({ animal: 'none', person_prominent: true }),
			reply: ok(
				extraction({
					animal: 'none',
					moderation: { ...extraction({ animal: 'none' }).moderation, person_prominent: true },
				})
			),
		};
		expect(report('test', MODEL, [...perfect, person]).pass).toBe(true);
	});
});

describe('labels.json', () => {
	const labels = () => syntheticSet().map((p) => p.label);

	it('the synthetic set has the composition of AC#1', () => {
		expect(() => LabelSet.parse({ photos: labels() })).not.toThrow();
	});

	it('refuses a photo without a licence, an unknown licence, a breed of another species or too few photos', () => {
		const [first, ...rest] = labels();
		const { licence: _, ...unlicensed } = first!;
		expect(() => LabelSet.parse({ photos: [unlicensed, ...rest] })).toThrow();
		expect(() => LabelSet.parse({ photos: [{ ...first, licence: 'all rights reserved' }, ...rest] })).toThrow();
		expect(() => LabelSet.parse({ photos: [{ ...first, breed: 'cat.siamese' }, ...rest] })).toThrow();
		expect(() => LabelSet.parse({ photos: [{ ...first, breed: 'dog.unknown' }, ...rest] })).toThrow();
		expect(() => LabelSet.parse({ photos: rest.slice(0, 39) })).toThrow(/photos: 39, at least 40/);
		expect(() => LabelSet.parse({ photos: [first, first, ...rest] })).toThrow(/listed twice/);
	});
});

describe('synthetic set on the mock adapter (mechanics only)', () => {
	let items: Scored[];
	beforeAll(async () => {
		items = await syntheticItems(MODEL);
	});

	it('runs every photo and counts every outcome', () => {
		expect(items).toHaveLength(42);
		const outcomes = items.map((i) => i.reply.outcome);
		expect(outcomes.filter((o) => o === 'refused')).toHaveLength(1);
		expect(outcomes.filter((o) => o === 'invalid')).toHaveLength(1);
		const result = score(items);
		expect(result.refusals).toEqual({ value: 1 / 42, n: 42 });
		// The mock's derived reply is always a dog: of 40 ok replies, 18 are labelled dogs.
		expect(result.species).toEqual({ value: 18 / 40, n: 40 });
		// Photo 2 gets the person fixture, 5 and 30 the derived reply without a person.
		expect(result.person).toEqual({ value: 1 / 3, n: 3 });
		expect(result.latency.n).toBe(42);
	});

	it('prints the report with the mock tokens priced for the model', () => {
		const { text } = report('synthetic', MODEL, items);
		for (const { name } of Object.values(BARS)) expect(text).toContain(`| ${name} |`);
		expect(text).toContain(
			'42 photos (20 dogs, 18 cats, 2 without an animal, 8 mixed breeds, 6 in poor light, 3 with'
		);
		expect(text).toContain('replies: 40 ok, 1 refused, 1 invalid');
		expect(text).toContain(
			`Mean cost per photo: USD ${costUsd(MODEL, MOCK_TOKENS.input_tokens, MOCK_TOKENS.output_tokens)}`
		);
	});
});

describe('real-photo set', () => {
	const dirs: string[] = [];
	const fetchSpy = vi.fn(() => Promise.reject(new Error('no network in tests')));
	afterEach(() => {
		vi.unstubAllGlobals();
		fetchSpy.mockClear();
		for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
	});

	const tmp = () => {
		const dir = mkdtempSync(join(tmpdir(), 'eval-extract-'));
		dirs.push(dir);
		return dir;
	};
	/** The synthetic labels as real/labels.json, each with a tiny generated JPEG (never a real photo). */
	async function makeSet(opts: { photos?: boolean } = {}) {
		const dir = tmp();
		const photos = syntheticSet().map((p) => p.label);
		writeFileSync(join(dir, 'labels.json'), JSON.stringify({ photos }));
		if (opts.photos !== false)
			for (const [i, { file }] of photos.entries())
				writeFileSync(
					join(dir, file),
					await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: i, g: 0, b: 0 } } })
						.jpeg()
						.toBuffer()
				);
		return pathToFileURL(`${dir}/`);
	}
	/** The mock adapter in place of Anthropic, counting calls; the key it gets is checked. */
	const mockFor = () => {
		const calls: string[] = [];
		const make = (apiKey: string, model: string): AiAdapter => {
			expect(apiKey).toBe('dummy');
			const ai = mockAi(model);
			return {
				provider: 'mock',
				extract: (image) => {
					calls.push(image.sha256);
					return ai.extract(image);
				},
			};
		};
		return { calls, make };
	};
	const ON = { EVAL_EXTRACT: 'anthropic', ANTHROPIC_API_KEY: 'dummy' };

	it('is a placeholder until real/labels.json exists (the committed real/ has none)', async () => {
		vi.stubGlobal('fetch', fetchSpy);
		expect((await realRun({}, MODEL, pathToFileURL(`${tmp()}/`))).text).toContain('None yet');
		expect((await realRun({}, MODEL, REAL_DIR)).pass).toBeNull();
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('skips photos without a recorded reply while EVAL_EXTRACT is off, even with a key set', async () => {
		vi.stubGlobal('fetch', fetchSpy);
		const { calls, make } = mockFor();
		const { pass, text } = await realRun({ ANTHROPIC_API_KEY: 'dummy' }, MODEL, await makeSet(), make);
		expect(pass).toBeNull();
		expect(text).toContain(`42 of 42 photos have no recorded ${MODEL} reply`);
		expect(calls).toHaveLength(0);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('refuses the switch without ANTHROPIC_API_KEY, and a model id that is not one', async () => {
		vi.stubGlobal('fetch', fetchSpy);
		const dir = await makeSet();
		await expect(realRun({ EVAL_EXTRACT: 'anthropic' }, MODEL, dir)).rejects.toThrow('needs ANTHROPIC_API_KEY');
		await expect(realRun(ON, '../labels', dir)).rejects.toThrow('not a model id');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('sends nothing while a file in real/ has no labels.json entry (licence)', async () => {
		const dir = await makeSet();
		writeFileSync(new URL('stray.jpg', dir), 'unlicensed');
		const { calls, make } = mockFor();
		await expect(realRun(ON, MODEL, dir, make)).rejects.toThrow('no labels.json entry (licence) for stray.jpg');
		expect(calls).toHaveLength(0);
	});

	it('records each reply once, then scores from the recorded replies alone', async () => {
		const dir = await makeSet();
		const first = mockFor();
		const { pass, text } = await realRun(ON, MODEL, dir, first.make);
		expect(first.calls).toHaveLength(42);
		expect(pass).toBe(false); // the mock reads every photo as a dog
		expect(text).toContain('replies: 42 ok, 0 refused, 0 invalid');
		const recorded = JSON.parse(readFileSync(new URL(`replies/${MODEL}.json`, dir), 'utf8'));
		expect(recorded).toMatchObject({ model: MODEL, prompt_version: AI_PROMPT_VERSION });
		expect(Object.keys(recorded.replies)).toHaveLength(42);

		// A changed photo is sent again; the others are not.
		const white = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } })
			.jpeg()
			.toBuffer();
		writeFileSync(new URL('synthetic-07.jpg', dir), white);
		const second = mockFor();
		const again = await realRun(ON, MODEL, dir, second.make);
		expect(second.calls).toHaveLength(1);

		// Without the photos (another checkout) and with the switch off, the recorded replies are enough.
		const away = pathToFileURL(`${tmp()}/`);
		mkdirSync(new URL('replies/', away));
		for (const file of ['labels.json', `replies/${MODEL}.json`])
			writeFileSync(new URL(file, away), readFileSync(new URL(file, dir)));
		vi.stubGlobal('fetch', fetchSpy);
		expect((await realRun({}, MODEL, away)).text).toBe(again.text);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('counts replies recorded with another prompt version as missing', async () => {
		const dir = await makeSet();
		await realRun(ON, MODEL, dir, mockFor().make);
		const file = new URL(`replies/${MODEL}.json`, dir);
		writeFileSync(file, readFileSync(file, 'utf8').replace(AI_PROMPT_VERSION, '2000-01-01.1'));
		expect((await realRun({}, MODEL, dir)).text).toContain('42 of 42 photos have no recorded');
	});

	it('stops on a rejected request without recording that photo', async () => {
		const dir = await makeSet();
		const failing = (): AiAdapter => ({
			provider: 'mock',
			extract: async () => ({
				outcome: 'failed',
				model: MODEL,
				input_tokens: 0,
				output_tokens: 0,
				error: 'NotFoundError',
			}),
		});
		await expect(realRun(ON, MODEL, dir, failing)).rejects.toThrow('request rejected (NotFoundError)');
		expect(() => readFileSync(new URL(`replies/${MODEL}.json`, dir))).toThrow();
	});
});
