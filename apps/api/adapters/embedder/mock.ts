// Deterministic mock (C20 §Adapter; the default locally and in CI). A photo whose sha256 is labelled in
// test/fixtures/embeddings/labels.json gets normalise(base(animal) + 0.35 · noise(animal, view)): the same animal
// scores about 0.9 cosine across views, different animals about 0.1 (bases share a small common part). Any other
// image gets a vector derived from its hash. The model name does not change the vector.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

import { EMBED_DIM, normalise, type EmbedderAdapter } from './index.ts';

type Label = { animal: string; view: string };

const LABELS = new URL('../../test/fixtures/embeddings/labels.json', import.meta.url);
const NOISE = 0.35;
// base(a)·base(b) ≈ SHARED for a ≠ b; after the noise that is ≈ 0.1 cosine.
const SHARED = 0.11;

let labels: Record<string, Label> | undefined;
// Not in a build (dist/): the fixture is a test file, and the mock never runs in staging or production.
const loadLabels = () =>
	(labels ??= existsSync(LABELS) ? (JSON.parse(readFileSync(LABELS, 'utf8')) as Record<string, Label>) : {});

/** EMBED_DIM pseudo-random values in [-1, 1) from a seed (sha512 in counter mode). */
function random(seed: string): number[] {
	const out: number[] = [];
	for (let i = 0; out.length < EMBED_DIM; i++) {
		const block = createHash('sha512').update(`${seed}:${i}`).digest();
		for (let j = 0; j < block.length; j += 4) out.push(block.readInt32LE(j) / 2 ** 31);
	}
	return normalise(out);
}

/** ka · a + kb · b */
const mix = (a: number[], ka: number, b: number[], kb: number) => a.map((x, i) => ka * x + kb * b[i]!);

/** The vector of a labelled photo; the synthetic matching set (TASK-43.3) labels its photos with it directly. */
export function labelledVector({ animal, view }: Label): number[] {
	const base = mix(random('shared'), Math.sqrt(SHARED), random(`animal:${animal}`), Math.sqrt(1 - SHARED));
	return normalise(mix(base, 1, random(`view:${animal}:${view}`), NOISE));
}

function vector(sha256: string): number[] {
	const label = loadLabels()[sha256];
	return label ? labelledVector(label) : random(`hash:${sha256}`);
}

export function mockEmbedder(): EmbedderAdapter {
	return { provider: 'mock', embed: async (images) => images.map((image) => vector(image.sha256)) };
}
