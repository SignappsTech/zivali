// The real-photo set (TASK-43.3 AC#2; layout and the switch in README.md): real/set.json, its JPEGs next to it with a
// licence per file, and real/vectors.json, the Voyage vectors of one approved run keyed by each file's sha256, so later
// runs send nothing. Offline unless EVAL_EMBED=voyage; the key is read from the environment only then, never logged.
// Lead rule (TASK-40.11): no pilot photo created on or before ai.photos_since is ever sent; the paid evals TASK-40.9 and
// TASK-43.7 need the owner's sign-off on the photo set. The set is local files only (never read from the database).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import sharp from 'sharp';
import { z } from 'zod';

import { EMBED_DIM } from '../../../adapters/embedder/index.ts';
import { voyageEmbedder } from '../../../adapters/embedder/voyage.ts';
import { EvalReport, prepare, run } from './harness.ts';

export const REAL_DIR = new URL('./real/', import.meta.url);
/** C20 §Config keys `embedding.model`; vectors cached for another model count as missing. */
export const MODEL = 'voyage-multimodal-3.5';
/** embedding.backfill_per_minute (6): one image every 10 s stays inside Voyage's limits without a payment method. */
const SPACING_MS = 10_000;
/** As loadImage in embeddings.domain.ts: at most 1024 px, JPEG quality 80. */
const EMBED_PX = 1024;

const RealSet = z
	.object({
		photos: z
			.array(
				z.object({
					file: z.string().regex(/^[\w-]+\.jpe?g$/i),
					/** e.g. "CC BY 4.0" or "pilot, owner consent 2026-…" */
					licence: z.string().min(1),
					/** Where it comes from (URL and author, or the pilot report). */
					source: z.string().min(1),
				})
			)
			.min(1),
		reports: z.array(EvalReport).min(1),
	})
	.superRefine((set, ctx) => {
		const files = new Set(set.photos.map((p) => p.file));
		for (const r of set.reports)
			for (const p of r.photos)
				if (!files.has(p))
					ctx.addIssue({ code: 'custom', message: `${r.id}: ${p} has no photos entry (licence)` });
	});
const Cache = z.object({ model: z.string(), vectors: z.record(z.string(), z.array(z.number()).length(EMBED_DIM)) });
type Cache = z.infer<typeof Cache>;

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');
const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

/** One Voyage call per missing photo, 10 s apart; the cache is written after each, so a failed run resumes. */
async function embedMissing(dir: URL, missing: string[], sha: Map<string, string>, cache: Cache, apiKey: string) {
	const voyage = voyageEmbedder(apiKey);
	for (const [i, file] of missing.entries()) {
		if (i) await sleep(SPACING_MS);
		const jpeg = await sharp(readFileSync(new URL(file, dir)))
			.rotate()
			.resize(EMBED_PX, EMBED_PX, { fit: 'inside', withoutEnlargement: true })
			.jpeg({ quality: 80 })
			.toBuffer();
		const [vector] = await voyage.embed([{ jpegBase64: jpeg.toString('base64'), sha256: sha.get(file)! }], MODEL);
		cache.vectors[sha.get(file)!] = vector!.map(round6);
		writeFileSync(new URL('vectors.json', dir), `${JSON.stringify(cache)}\n`);
	}
}

/**
 * The real-photo report: a note when there is no set yet (the placeholder) or photos lack a cached vector and the
 * switch is off; otherwise the evaluation of the set. EVAL_EMBED=voyage embeds the missing photos first.
 */
export async function realRun(env: Record<string, string | undefined>, dir: URL = REAL_DIR): Promise<string> {
	const setFile = new URL('set.json', dir);
	if (!existsSync(setFile)) return '## Real-photo set\n\nNone yet: see test/eval/matching/README.md.\n';
	const set = RealSet.parse(JSON.parse(readFileSync(setFile, 'utf8')));
	const sha = new Map(set.photos.map((p) => [p.file, sha256(readFileSync(new URL(p.file, dir)))]));
	const cacheFile = new URL('vectors.json', dir);
	const stored = existsSync(cacheFile) ? Cache.parse(JSON.parse(readFileSync(cacheFile, 'utf8'))) : null;
	const cache: Cache = stored?.model === MODEL ? stored : { model: MODEL, vectors: {} };
	const missing = set.photos.map((p) => p.file).filter((file) => !cache.vectors[sha.get(file)!]);
	if (missing.length) {
		if (env.EVAL_EMBED !== 'voyage')
			return `## Real-photo set\n\n${missing.length} of ${set.photos.length} photos have no cached ${MODEL} vector: skipped (EVAL_EMBED=voyage embeds them, after the owner's approval).\n`;
		if (!env.VOYAGE_API_KEY) throw new Error('EVAL_EMBED=voyage needs VOYAGE_API_KEY in the environment');
		await embedMissing(dir, missing, sha, cache, env.VOYAGE_API_KEY);
	}
	const vectorOf = (file: string) => cache.vectors[sha.get(file) ?? ''];
	return run(`Real-photo set (${MODEL}, ${set.photos.length} photos)`, prepare(set.reports, vectorOf)).text;
}
