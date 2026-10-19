// Extraction evaluation (ADR-012 §Model decision, gate; TASK-40.5): a labelled photo set and one reply per photo from
// the vision adapter (the mock, or the recorded replies of one approved Anthropic run), scored against the ADR-012
// bars. Pure and offline: the caller supplies the replies.
import { z } from 'zod';

import { AI_ANIMALS, BREED_CODES, COLOURS } from '@zivali/types';
import { isBreedOf } from '@zivali/validation/breeds';

import { AI_PROMPT_VERSION, type AiAdapter, type AiExtraction, type AiImage } from '../../../adapters/ai/index.ts';
import { costUsd } from '../../../domains/ai/pricing.ts';

/** CC0, CC BY (with its version) or owner-provided (a pilot photo with the reporter's consent; never committed). */
export const LICENCE = /^(CC0 1\.0|CC BY [1-4]\.0|owner-provided)$/;

/** One photo's truth, as a person labelled it, with its licence and source (AC#1). */
export const Label = z
	.object({
		file: z.string().regex(/^[\w-]+\.(jpe?g|png|webp)$/i),
		licence: z.string().regex(LICENCE, 'licence must be CC0 1.0, CC BY <version> or owner-provided'),
		/** URL and author, or the pilot report and the consent date. */
		source: z.string().min(1),
		/** The main animal, named as aiExtractionSchema names it. */
		animal: z.enum(AI_ANIMALS),
		/** A dog's or cat's breed code (`<species>.mixed` when not a pure breed; never `.unknown`); null otherwise. */
		breed: z.enum(BREED_CODES).nullable(),
		/** A dog's or cat's colours (1 to 3); empty otherwise. */
		colours: z.array(z.enum(COLOURS)).max(3),
		person_prominent: z.boolean(),
		poor_light: z.boolean(),
	})
	.superRefine((l, ctx) => {
		const issue = (message: string) => ctx.addIssue({ code: 'custom', message: `${l.file}: ${message}` });
		if (l.animal === 'dog' || l.animal === 'cat') {
			if (!l.breed || !isBreedOf(l.breed, l.animal) || l.breed.endsWith('.unknown'))
				issue(`breed must be a ${l.animal} code other than ${l.animal}.unknown`);
			if (!l.colours.length) issue('a dog or cat needs its colours');
		} else if (l.breed || l.colours.length) issue(`no breed or colours for animal ${l.animal}`);
	});
export type Label = z.infer<typeof Label>;

/** The least a set holds (TASK-40.5 AC#1). */
export const COMPOSITION = { photos: 40, dogs: 2, cats: 2, mixed: 2, poor_light: 2, person_prominent: 3, no_animal: 2 };

export const countsOf = (labels: Label[]): Record<keyof typeof COMPOSITION, number> => ({
	photos: labels.length,
	dogs: labels.filter((l) => l.animal === 'dog').length,
	cats: labels.filter((l) => l.animal === 'cat').length,
	mixed: labels.filter((l) => l.breed?.endsWith('.mixed')).length,
	poor_light: labels.filter((l) => l.poor_light).length,
	person_prominent: labels.filter((l) => l.person_prominent).length,
	no_animal: labels.filter((l) => l.animal === 'none').length,
});

/** labels.json: unique files, each with its licence, and at least COMPOSITION. */
export const LabelSet = z.object({ photos: z.array(Label) }).superRefine(({ photos }, ctx) => {
	const counts = countsOf(photos);
	for (const [key, min] of Object.entries(COMPOSITION) as [keyof typeof COMPOSITION, number][])
		if (counts[key] < min) ctx.addIssue({ code: 'custom', message: `${key}: ${counts[key]}, at least ${min}` });
	if (new Set(photos.map((p) => p.file)).size !== photos.length)
		ctx.addIssue({ code: 'custom', message: 'a file is listed twice' });
});

/** One reply as the eval keeps it: outcome, billed tokens and the call's wall time; the extraction when ok. */
export type EvalReply = {
	outcome: 'ok' | 'refused' | 'invalid';
	input_tokens: number;
	output_tokens: number;
	latency_ms: number;
	extraction?: AiExtraction;
};
export type Scored = { label: Label; reply: EvalReply };

/**
 * One timed adapter call. A rejected request (`failed`: key, model id) means the run is set up wrong: it throws and
 * nothing is kept for the photo. Retryable provider errors throw from the adapter itself.
 */
export async function timedExtract(ai: AiAdapter, image: AiImage): Promise<EvalReply> {
	const start = performance.now();
	const reply = await ai.extract(image);
	const latency_ms = Math.round(performance.now() - start);
	if (reply.outcome === 'failed') throw new Error(`${reply.model}: request rejected (${reply.error ?? 'no class'})`);
	const { outcome, input_tokens, output_tokens } = reply;
	return {
		outcome,
		input_tokens,
		output_tokens,
		latency_ms,
		...(outcome === 'ok' && { extraction: reply.extraction }),
	};
}

/** A breed suggested at this confidence or above fills the form (FR-013 R-013.2). */
export const CONFIDENT = 0.6;

/** The ADR-012 §Model decision bars (2026-10-18). Fields are scored on `ok` replies; refusals on all photos. */
export const BARS = {
	species: { name: 'species correct', min: 0.97 },
	colours: { name: 'colours mean Jaccard', min: 0.75 },
	breed: { name: 'true breed among the suggestions (pure breeds)', min: 0.6 },
	wrong_breed: { name: `wrong breed suggested at confidence ≥ ${CONFIDENT}`, max: 0.1 },
	person: { name: 'person_prominent recall', min: 0.9 },
	latency: { name: 'p95 latency (s)', max: 6 },
	refusals: { name: 'refusals', max: 0.02 },
} as const satisfies Record<string, { name: string; min?: number; max?: number }>;
export type Field = keyof typeof BARS;
/** value null: no photo to score it on (the bar counts as missed). */
export type Result = Record<Field, { value: number | null; n: number }>;

const share = (xs: boolean[]) => ({ value: xs.length ? xs.filter(Boolean).length / xs.length : null, n: xs.length });
const mean = (xs: number[]) => ({ value: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null, n: xs.length });
const jaccard = (a: string[], b: string[]) => {
	const union = new Set([...a, ...b]);
	return union.size ? a.filter((x) => b.includes(x)).length / union.size : 1;
};
/** `.mixed` and `.unknown` are the safe fallbacks (ADR-012): never counted as a wrong breed. */
const specific = (code: string) => !code.endsWith('.mixed') && !code.endsWith('.unknown');

/**
 * species: the main animal as labelled. colours: Jaccard of the values (null = none) with the labelled colours, dogs
 * and cats. breed: the labelled pure breed among the suggested codes at any confidence. wrong_breed: dogs and cats
 * with a specific breed other than the labelled one at ≥ CONFIDENT. person: person_prominent set on the photos
 * labelled so. latency: nearest-rank p95 over every reply. refusals: refused / all photos.
 */
export function score(items: Scored[]): Result {
	const ok = items.flatMap(({ label, reply }) => (reply.extraction ? [{ label, x: reply.extraction }] : []));
	const pets = ok.filter(({ label }) => label.breed !== null);
	const pure = pets.filter(({ label }) => specific(label.breed!));
	const latencies = items.map(({ reply }) => reply.latency_ms).sort((a, b) => a - b);
	return {
		species: share(ok.map(({ label, x }) => x.animal === label.animal)),
		colours: mean(pets.map(({ label, x }) => jaccard(x.colours?.values ?? [], label.colours))),
		breed: share(pure.map(({ label, x }) => x.breeds.some((b) => b.code === label.breed))),
		wrong_breed: share(
			pets.map(({ label, x }) =>
				x.breeds.some((b) => b.confidence >= CONFIDENT && specific(b.code) && b.code !== label.breed)
			)
		),
		person: share(ok.filter(({ label }) => label.person_prominent).map(({ x }) => x.moderation.person_prominent)),
		latency: {
			value: latencies.length ? latencies[Math.ceil(0.95 * latencies.length) - 1]! / 1000 : null,
			n: latencies.length,
		},
		refusals: share(items.map(({ reply }) => reply.outcome === 'refused')),
	};
}

export const passes = (field: Field, value: number | null): boolean => {
	const bar: { min?: number; max?: number } = BARS[field];
	return value !== null && (bar.min !== undefined ? value >= bar.min : value <= bar.max!);
};

/** A Markdown report: the set, outcomes, every ADR-012 bar, mean cost per photo; `pass` when every bar is met. */
export function report(name: string, model: string, items: Scored[]): { pass: boolean; result: Result; text: string } {
	const result = score(items);
	const c = countsOf(items.map((i) => i.label));
	const outcomes = (o: EvalReply['outcome']) => items.filter((i) => i.reply.outcome === o).length;
	const costs = items.map((i) => Number(costUsd(model, i.reply.input_tokens, i.reply.output_tokens)));
	const fields = Object.keys(BARS) as Field[];
	const missed = fields.filter((f) => !passes(f, result[f].value));
	const lines = [
		`## ${name}`,
		'',
		`${model}, prompt ${AI_PROMPT_VERSION}: ${c.photos} photos (${c.dogs} dogs, ${c.cats} cats, ${c.no_animal} without an animal, ${c.mixed} mixed breeds, ${c.poor_light} in poor light, ${c.person_prominent} with a prominent person); replies: ${outcomes('ok')} ok, ${outcomes('refused')} refused, ${outcomes('invalid')} invalid.`,
		'',
		'| field | result | n | ADR-012 bar | |',
		'|---|---|---|---|---|',
		...fields.map((f) => {
			const { value, n } = result[f];
			const bar: { min?: number; max?: number } = BARS[f];
			const limit = bar.min !== undefined ? `≥ ${bar.min}` : `≤ ${bar.max}`;
			return `| ${BARS[f].name} | ${value === null ? 'n/a' : value.toFixed(3)} | ${n} | ${limit} | ${passes(f, value) ? 'PASS' : 'FAIL'} |`;
		}),
		'',
		`Mean cost per photo: USD ${(costs.reduce((a, b) => a + b, 0) / (costs.length || 1)).toFixed(6)} (NFR-AI: at most EUR 0.05 per 5-photo report).`,
		'',
		`Gate (every ADR-012 bar): ${missed.length ? `FAIL (${missed.map((f) => BARS[f].name).join('; ')})` : 'PASS'}`,
		'',
	];
	return { pass: !missed.length, result, text: lines.join('\n') };
}
