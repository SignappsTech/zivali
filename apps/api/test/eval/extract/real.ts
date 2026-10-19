// The real-photo set (TASK-40.5 AC#1 and AC#3; layout and the switch in README.md): real/labels.json with a licence
// per photo, the photos next to it (real/.gitignore keeps them out of git) and real/replies/<model>.json, the replies
// of one approved Anthropic run per model, so later runs send nothing. Offline unless EVAL_EXTRACT=anthropic; the key
// is read from the environment only then, never logged.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { z } from 'zod';

import { AI_PROMPT_VERSION, parseExtraction, type AiAdapter } from '../../../adapters/ai/index.ts';
import { anthropicAi } from '../../../adapters/ai/anthropic.ts';
import { LabelSet, report, timedExtract, type Scored } from './harness.ts';

export const REAL_DIR = new URL('./real/', import.meta.url);
/** The model id names its replies file. */
const MODEL_ID = /^[a-z0-9][a-z0-9.-]*$/;
/** Files in real/ that are not photos; every other file needs a labels.json entry (its licence). */
const NOT_PHOTOS = new Set(['.gitignore', 'labels.json', 'replies']);
/** As loadImage in ai.domain.ts: at most a 1024 px long edge, JPEG quality 80. */
const VISION_PX = 1024;

const Recorded = z.object({
	/** Of the photo file the reply was made from: a changed file counts as missing. */
	sha256: z.string().regex(/^[0-9a-f]{64}$/),
	outcome: z.enum(['ok', 'refused', 'invalid']),
	input_tokens: z.number().int().nonnegative(),
	output_tokens: z.number().int().nonnegative(),
	latency_ms: z.number().nonnegative(),
	extraction: z.unknown().optional(),
});
const Replies = z.object({ model: z.string(), prompt_version: z.string(), replies: z.record(z.string(), Recorded) });
type Replies = z.infer<typeof Replies>;
export type MakeAdapter = (apiKey: string, model: string) => AiAdapter;

/** The production adapter and prompt, with createAi's client settings (no SDK retries, 20 s timeout), effort low. */
const anthropicFor: MakeAdapter = (apiKey, model) =>
	anthropicAi(new Anthropic({ apiKey, maxRetries: 0, timeout: 20_000 }), model, 'low');

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

/** Upright (EXIF orientation, as photo.process), downscaled like ai.domain.ts; sharp drops all metadata (GPS). */
async function loadImage(file: URL): Promise<string> {
	const jpeg = await sharp(readFileSync(file))
		.rotate()
		.resize(VISION_PX, VISION_PX, { fit: 'inside', withoutEnlargement: true })
		.jpeg({ quality: 80 })
		.toBuffer();
	return jpeg.toString('base64');
}

const note = (text: string) => ({ pass: null, text: `## Real-photo set\n\n${text}\n` });

/**
 * The real-photo report for one model: a note when there is no set yet or photos have no recorded reply and the
 * switch is off; otherwise the evaluation from the recorded replies (`pass` null: nothing evaluated).
 * EVAL_EXTRACT=anthropic first sends the photos without a reply, one at a time, writing the replies after each so a
 * failed run resumes; before anything is sent every file in real/ must have a labels.json entry with its licence.
 */
export async function realRun(
	env: Record<string, string | undefined>,
	model: string,
	dir: URL = REAL_DIR,
	makeAdapter: MakeAdapter = anthropicFor
): Promise<{ pass: boolean | null; text: string }> {
	if (!MODEL_ID.test(model)) throw new Error(`--model ${JSON.stringify(model)} is not a model id`);
	const labelsFile = new URL('labels.json', dir);
	if (!existsSync(labelsFile)) return note('None yet: see test/eval/extract/README.md.');
	const { photos } = LabelSet.parse(JSON.parse(readFileSync(labelsFile, 'utf8')));
	// null: the photo is not here (another checkout); its recorded reply still counts.
	const shaOf = new Map(
		photos.map((p) => {
			const file = new URL(p.file, dir);
			return [p.file, existsSync(file) ? sha256(readFileSync(file)) : null];
		})
	);
	const repliesFile = new URL(`replies/${model}.json`, dir);
	const stored = existsSync(repliesFile) ? Replies.parse(JSON.parse(readFileSync(repliesFile, 'utf8'))) : null;
	const cache: Replies =
		stored?.model === model && stored.prompt_version === AI_PROMPT_VERSION
			? stored
			: { model, prompt_version: AI_PROMPT_VERSION, replies: {} };
	const current = (file: string) => {
		const reply = cache.replies[file];
		const sha = shaOf.get(file);
		return reply && (sha === null || reply.sha256 === sha) ? reply : undefined;
	};
	const missing = photos.filter((p) => !current(p.file)).map((p) => p.file);
	if (missing.length) {
		if (env.EVAL_EXTRACT !== 'anthropic')
			return note(
				`${missing.length} of ${photos.length} photos have no recorded ${model} reply for prompt ${AI_PROMPT_VERSION}: skipped (EVAL_EXTRACT=anthropic records them, after the owner's approval).`
			);
		if (!env.ANTHROPIC_API_KEY)
			throw new Error('EVAL_EXTRACT=anthropic needs ANTHROPIC_API_KEY in the environment');
		const listed = new Set(photos.map((p) => p.file));
		const unlisted = readdirSync(dir).filter((f) => !NOT_PHOTOS.has(f) && !listed.has(f));
		if (unlisted.length) throw new Error(`no labels.json entry (licence) for ${unlisted.join(', ')}: nothing sent`);
		const absent = missing.filter((f) => !shaOf.get(f));
		if (absent.length) throw new Error(`not in real/: ${absent.join(', ')}: nothing sent`);
		const ai = makeAdapter(env.ANTHROPIC_API_KEY, model);
		mkdirSync(new URL('replies/', dir), { recursive: true });
		for (const file of missing) {
			const sha = shaOf.get(file)!;
			const reply = await timedExtract(ai, { jpegBase64: await loadImage(new URL(file, dir)), sha256: sha });
			cache.replies[file] = { sha256: sha, ...reply };
			writeFileSync(repliesFile, `${JSON.stringify(cache, null, '\t')}\n`);
		}
	}
	const items: Scored[] = photos.map((label) => {
		const { sha256: _, extraction: raw, ...reply } = current(label.file)!;
		if (reply.outcome !== 'ok') return { label, reply };
		const extraction = parseExtraction(raw);
		if (!extraction) throw new Error(`replies/${model}.json: ${label.file} has no valid extraction`);
		return { label, reply: { ...reply, extraction } };
	});
	return report(`Real-photo set (${photos.length} photos)`, model, items);
}
