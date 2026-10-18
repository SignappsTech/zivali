// Matching evaluation gate (TASK-43.3 AC#1) on the synthetic set with the mock embedder, and the real-photo switch:
// off by default, the cached vectors are enough, nothing reaches Voyage.
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { EMBED_DIM } from '../../../adapters/embedder/index.ts';
import { evaluate, notWorse, prepare, SHIPPED, sweep, V2, type EvalReport, type Prepared } from './harness.ts';
import { MODEL, realRun } from './real.ts';
import { syntheticSet, syntheticVector } from './synthetic.ts';

describe('synthetic set (mock embedder labels)', () => {
	let prep: Prepared;
	beforeAll(() => {
		prep = prepare(syntheticSet(), syntheticVector);
	});

	it('has at least 100 labelled pairs: at least 50 positives and 50 hard negatives', () => {
		expect(prep.positives).toBeGreaterThanOrEqual(50);
		expect(prep.hardNegatives).toBeGreaterThanOrEqual(50);
		expect(prep.positives + prep.hardNegatives).toBeGreaterThanOrEqual(100);
		expect(prep.lostWithPositive).toBe(60);
	});

	it('shipped v3 is not worse than v2 on recall@10 and on precision at notify_min_strength', () => {
		const v2 = evaluate(prep, V2);
		const v3 = evaluate(prep, SHIPPED);
		expect(v3.recall10).toBeGreaterThanOrEqual(v2.recall10);
		expect(v3.precision).toBeGreaterThanOrEqual(v2.precision);
		expect(notWorse(v3, v2)).toBe(true);
		// The mock keeps different animals about 0.1 apart, so no look-alike is notified on its photo.
		expect(v3.hardNegativesNotified).toBeLessThanOrEqual(v2.hardNegativesNotified);
	});

	it('the sweep returns a configuration not worse than v2 inside the grid', () => {
		const v2 = evaluate(prep, V2);
		const best = sweep(prep, v2)!;
		expect(notWorse(best.metrics, v2)).toBe(true);
		expect(best.variant.visual!.ceiling).toBeGreaterThan(best.variant.visual!.floor);
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

	const report = (id: string, type: EvalReport['type'], photo: string): EvalReport => ({
		id,
		type,
		animal: 'rex',
		species: 'dog',
		x_km: 0,
		y_km: type === 'lost' ? 0 : 0.5,
		hours: type === 'lost' ? 0 : 5,
		size: 'm',
		sex: 'male',
		colours: ['black'],
		pattern: 'solid',
		photos: [photo],
	});
	/** A set of one lost and one found report; the "JPEGs" are never decoded unless the switch is on. */
	function makeSet(opts: { licence?: boolean; vectors?: boolean }) {
		const dir = mkdtempSync(join(tmpdir(), 'eval-real-'));
		dirs.push(dir);
		const photos = ['a.jpg', 'b.jpg'];
		for (const file of photos) writeFileSync(join(dir, file), `not a jpeg: ${file}`);
		const set = {
			photos: photos.map((file) => ({ file, ...(opts.licence !== false && { licence: 'CC0', source: 'test' }) })),
			reports: [report('l', 'lost', 'a.jpg'), report('f', 'found', 'b.jpg')],
		};
		writeFileSync(join(dir, 'set.json'), JSON.stringify(set));
		return pathToFileURL(`${dir}/`);
	}

	it('is a placeholder until real/set.json exists', async () => {
		vi.stubGlobal('fetch', fetchSpy);
		const tmp = mkdtempSync(join(tmpdir(), 'eval-real-'));
		dirs.push(tmp);
		const dir = pathToFileURL(`${tmp}/`);
		expect(await realRun({}, dir)).toContain('None yet');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('skips photos without a cached vector while EVAL_EMBED is off, even with a key set', async () => {
		vi.stubGlobal('fetch', fetchSpy);
		const text = await realRun({ VOYAGE_API_KEY: 'dummy' }, makeSet({}));
		expect(text).toContain('2 of 2 photos have no cached');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('refuses EVAL_EMBED=voyage without VOYAGE_API_KEY', async () => {
		vi.stubGlobal('fetch', fetchSpy);
		await expect(realRun({ EVAL_EMBED: 'voyage' }, makeSet({}))).rejects.toThrow('needs VOYAGE_API_KEY');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('refuses a photo without a licence', async () => {
		await expect(realRun({}, makeSet({ licence: false }))).rejects.toThrow();
	});

	it('evaluates from cached vectors only, sending nothing', async () => {
		vi.stubGlobal('fetch', fetchSpy);
		const dir = makeSet({});
		const sha = (file: string) => createHash('sha256').update(`not a jpeg: ${file}`).digest('hex');
		const unit = Array.from({ length: EMBED_DIM }, (_, i) => (i === 0 ? 1 : 0));
		const vectors = { [sha('a.jpg')]: unit, [sha('b.jpg')]: unit };
		writeFileSync(new URL('vectors.json', dir), JSON.stringify({ model: MODEL, vectors }));
		const text = await realRun({ EVAL_EMBED: 'voyage', VOYAGE_API_KEY: 'dummy' }, dir);
		expect(text).toContain('| v3 shipped | 1.000 |');
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
