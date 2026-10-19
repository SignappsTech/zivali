// embedding.backfill and the model change (C20 §Jobs, TASK-42.3) against the local database, the in-memory storage and
// mock embedders. The jobs a run sends go to a small in-memory scheduler that runs them in startAfter order, as the
// worker would (pg-boss's drain() ignores startAfter); one test uses the real queue. Two models of this run only, so
// other tests' vectors never count: every photo that is not ours gets a vector for both first.
import { randomBytes, randomUUID } from 'node:crypto';

import { pino } from 'pino';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { normalise, type EmbedderAdapter, type EmbedImage } from '../../adapters/embedder/index.ts';
import { adapters } from '../../adapters/index.ts';
import { offAdapter } from '../../adapters/select.ts';
import EmbeddingsDao from '../../domains/embeddings/embeddings.dao.ts';
import { EmbeddingsDomain } from '../../domains/embeddings/index.ts';
import { variantRef } from '../../domains/photos/photo-objects.ts';
import { Prisma } from '../../generated/client.ts';
import type { PHOTO_STATUS } from '../../generated/enums.ts';
import { handle } from '../../jobs/embedding.backfill.job.ts';
import { runJob, type JobCtx } from '../../jobs/index.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx, type Ctx } from '../../lib/ctx.ts';
import { drain, type Jobs, type QueueName, type SendOptions } from '../../lib/jobs.ts';
import { loggerOptions } from '../../lib/logger.ts';
import { prisma } from '../../prisma/prisma.ts';

const A = `test-a-${randomUUID()}`;
const B = `test-b-${randomUUID()}`;
const owner = randomUUID();
const reportIds: string[] = [];
const sha256s: string[] = [];
const LJUBLJANA = { lat: 46.05, lng: 14.5 };
// Model B's mock: the same vector for every image, so two photos score cos 1 under B (A's mock: about 0).
const SAME = normalise(new Array<number>(1024).fill(1));

async function setConfig(key: string, value: unknown) {
	await prisma.$executeRaw`update app.app_config set value = ${JSON.stringify(value)}::jsonb where key = ${key}`;
	configStore.invalidate();
}

async function report(type = 'lost'): Promise<string> {
	const id = randomUUID();
	reportIds.push(id);
	const point = Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(${LJUBLJANA.lng}, ${LJUBLJANA.lat}), 4326)::extensions.geography`;
	await prisma.$executeRaw`
		insert into app.reports (id, short_code, type, species, status, moderation_state, event_at, exact_point,
			public_point, public_radius_m, in_slovenia)
		values (${id}::uuid, ${id.slice(0, 8)}, ${type}::app."REPORT_TYPE", 'dog'::app."SPECIES", 'open'::app."REPORT_STATUS",
			'visible'::app."MODERATION_STATE", now(), ${point}, ${point}, 500, true)`;
	return id;
}

type Safety = { animal?: string; nsfw?: boolean } | null;
/** A photo with its display.jpg and, unless `ai` is null, its ai_results row (clean by default). */
async function photo({
	report_id = null as string | null,
	pet_id = null as string | null,
	status = 'published' as PHOTO_STATUS,
	ai = {} as Safety,
} = {}): Promise<string> {
	const sha256 = randomBytes(32).toString('hex');
	sha256s.push(sha256);
	const { id } = await prisma.photos.create({
		data: { owner_id: owner, report_id, pet_id, sha256, width: 64, height: 48, bytes: 1, status },
	});
	const jpeg = await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 9, g: 9, b: 9 } } })
		.jpeg()
		.toBuffer();
	await adapters.storage.put(variantRef(id, 'display.jpg'), jpeg, 'image/jpeg');
	if (ai) {
		const { animal = 'dog', nsfw = false } = ai;
		await prisma.ai_results.create({
			data: {
				sha256,
				model: 'test',
				prompt_version: 'test',
				result: { animal, animal_count: 1, species_confidence: 0.9 },
				moderation: { person_prominent: false, nsfw, violence: false, text_contact_info: false },
			},
		});
	}
	return id;
}

const modelsOf = async (id: string) => (await EmbeddingsDao.modelsOf(id)).sort();

/** Mock embedders for A and B that record each call (sha256, model). */
function recordingEmbedder() {
	const calls: { sha256: string; model: string }[] = [];
	const embedder: EmbedderAdapter = {
		provider: 'mock',
		async embed(images: EmbedImage[], model: string) {
			calls.push(...images.map(({ sha256 }) => ({ sha256, model })));
			return model === B ? images.map(() => SAME) : adapters.embedder.embed(images, model);
		},
	};
	return { embedder, calls };
}

type Sent = { queue: QueueName; data: Record<string, unknown>; options: SendOptions; due: number };

/**
 * A ctx whose sent jobs wait in memory, each due `startAfter` seconds after the job that sent it ran. run() runs them
 * earliest first (ties in send order) until none are left; `sent` keeps every job sent.
 */
function scheduled(embedder: EmbedderAdapter = recordingEmbedder().embedder) {
	const sent: Sent[] = [];
	const pending: Sent[] = [];
	const lines: string[] = [];
	let clock = 0;
	const jobs: Jobs = {
		async send(queue, data, options = {}) {
			const job = {
				queue,
				data: data as Record<string, unknown>,
				options,
				due: clock + Number(options.startAfter ?? 0),
			};
			sent.push(job);
			pending.push(job);
			return randomUUID();
		},
	};
	const logger = pino({ ...loggerOptions, level: 'info' }, { write: (line: string) => void lines.push(line) });
	const ctx: Ctx = systemCtx({ logger, jobs, adapters: { ...adapters, embedder } });
	async function run() {
		while (pending.length) {
			const next = pending.reduce((best, job) => (job.due < best.due ? job : best));
			pending.splice(pending.indexOf(next), 1);
			clock = next.due;
			if (next.queue === 'photo.embed') await EmbeddingsDomain.embedPhoto(next.data as { photo_id: string }, ctx);
			if (next.queue === 'embedding.backfill') await EmbeddingsDomain.backfill(next.data, ctx);
		}
	}
	const logs = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
	const embeds = () => sent.filter((job) => job.queue === 'photo.embed');
	return { ctx, run, sent, embeds, logs };
}

/** Gives every photo but `except` a vector for each model, so only the photos under test lack one. */
async function fillOthers(models: string[], except: string[] = []) {
	await prisma.$executeRaw`
		insert into app.photo_embeddings (photo_id, model, embedding)
		select p.id, m, ${`[${SAME.join(',')}]`}::extensions.vector
		from app.photos p cross join unnest(${models}::text[]) m
		where p.id <> all(${except}::uuid[])
		on conflict do nothing`;
}

beforeAll(async () => {
	await fillOthers([A, B]);
	await prisma.profiles.create({ data: { id: owner } });
	await setConfig('embedding.model', A);
	await setConfig('embedding.next_model', null);
	await setConfig('embedding.backfill_per_minute', 2);
	// AI switched on for photos from 2026-10-19 (TASK-40.11; the cutoff itself: ai.cutoff.test.ts).
	await setConfig('ai.photos_since', '2026-10-19T00:00:00Z');
});

afterEach(async () => {
	await setConfig('embedding.model', A);
	await setConfig('embedding.next_model', null);
});

afterAll(async () => {
	await setConfig('embedding.model', 'voyage-multimodal-3.5');
	await setConfig('embedding.backfill_per_minute', 6);
	await prisma.$executeRaw`delete from app.photo_embeddings where model = any(${[A, B]}::text[])`;
	await prisma.ai_calls.deleteMany({ where: { photo: { owner_id: owner } } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await prisma.profiles.deleteMany({ where: { id: owner } }); // photos, pets and vectors cascade
	await prisma.ai_results.deleteMany({ where: { sha256: { in: sha256s } } });
});

describe('embedding.backfill', () => {
	it('embeds each eligible photo without a vector, at most backfill_per_minute a minute, then logs done with remaining 0; a second run makes no call', async () => {
		const lost = await report();
		const { id: pet_id } = await prisma.pets.create({ data: { owner_id: owner, species: 'dog', name: 'Test' } });
		const eligible = [
			await photo({ report_id: lost }),
			await photo({ report_id: lost, status: 'accepted' }),
			await photo({ pet_id }),
			await photo({ report_id: lost }),
			await photo({ report_id: lost }),
		].sort();
		const skipped = [
			await photo(), // on no report or pet
			await photo({ report_id: lost, ai: null }), // no safety check (CH-562)
			await photo({ report_id: lost, ai: { nsfw: true } }),
			await photo({ report_id: lost, ai: { animal: 'none' } }),
			await photo({ report_id: lost, status: 'uploaded' }),
		];
		const embedded = await photo({ report_id: lost });
		await EmbeddingsDomain.embedPhoto({ photo_id: embedded }, systemCtx());

		const { embedder, calls } = recordingEmbedder();
		const first = scheduled(embedder);
		await first.ctx.jobs.send('embedding.backfill', {});
		await first.run();

		// One photo.embed per eligible photo, in id order, keyed by photo id; at most 2 due in any minute.
		expect(first.embeds().map((job) => job.data.photo_id)).toEqual(eligible);
		for (const job of first.embeds()) {
			expect(job.options).toMatchObject({ singletonKey: job.data.photo_id, singletonSeconds: 3600 });
		}
		const minutes = first.embeds().map((job) => Math.floor(job.due / 60));
		expect(minutes).toEqual([0, 0, 1, 1, 2]);
		// The next page waits until this page's sends are due: 5 photos at 2 a minute.
		expect(first.sent.filter((job) => job.queue === 'embedding.backfill').map((job) => job.data)).toEqual([
			{},
			{ model: A, after: eligible.at(-1) },
		]);
		expect(first.sent.at(-1)!.options.startAfter).toBe(180);

		expect(calls).toHaveLength(eligible.length);
		expect(calls.every((call) => call.model === A)).toBe(true);
		for (const id of eligible) expect(await modelsOf(id)).toEqual([A]);
		for (const id of skipped) expect(await modelsOf(id)).toEqual([]);
		expect(first.logs()).toContainEqual(
			expect.objectContaining({ msg: 'embedding.backfill.done', model: A, remaining: 0 })
		);

		const second = scheduled(embedder);
		await second.ctx.jobs.send('embedding.backfill', {});
		await second.run();
		expect(second.embeds()).toEqual([]);
		expect(calls).toHaveLength(eligible.length);
		expect(second.logs()).toContainEqual(
			expect.objectContaining({ msg: 'embedding.backfill.done', model: A, remaining: 0 })
		);
	});

	it('pages 500 photos by id and resumes after the `after` id', async () => {
		const lost = await report();
		const rows = Array.from({ length: 501 }, () => ({
			id: randomUUID(),
			owner_id: owner,
			report_id: lost,
			sha256: randomBytes(32).toString('hex'),
			width: 1,
			height: 1,
			bytes: 1,
			status: 'published' as const,
		}));
		sha256s.push(...rows.map((row) => row.sha256));
		await prisma.photos.createMany({ data: rows });
		const clean = { result: { animal: 'cat' }, moderation: { person_prominent: false, nsfw: false } };
		await prisma.ai_results.createMany({
			data: rows.map(({ sha256 }) => ({ sha256, model: 'test', prompt_version: 'test', ...clean })),
		});
		const ids = rows.map((row) => row.id).sort();
		try {
			const page = scheduled();
			await EmbeddingsDomain.backfill({}, page.ctx);
			expect(page.embeds().map((job) => job.data.photo_id)).toEqual(ids.slice(0, 500));
			expect(page.sent.at(-1)).toMatchObject({
				queue: 'embedding.backfill',
				data: { model: A, after: ids[499] },
				options: { startAfter: 250 * 60 },
			});

			const resumed = scheduled();
			await EmbeddingsDomain.backfill({ model: A, after: ids[499] }, resumed.ctx);
			expect(resumed.embeds().map((job) => job.data.photo_id)).toEqual([ids[500]]);
		} finally {
			await prisma.photos.deleteMany({ where: { id: { in: ids } } });
		}
	});

	it('through the real queue, a backfill sent twice queues one photo.embed per photo (singleton key)', async () => {
		const lost = await report();
		const mine = [await photo({ report_id: lost }), await photo({ report_id: lost })];
		const ctx = systemCtx();
		await EmbeddingsDomain.backfill({}, ctx);
		await EmbeddingsDomain.backfill({}, ctx);
		const queued = await prisma.$queryRaw<{ key: string; n: number }[]>`
			select singleton_key as key, count(*)::int as n from pgboss.job
			where name = 'photo.embed' and singleton_key = any(${mine}::text[]) group by singleton_key order by 1`;
		expect(queued).toEqual(mine.sort().map((key) => ({ key, n: 1 })));

		await drain(runJob);
		for (const id of mine) expect(await modelsOf(id)).toEqual([A]);
	});

	it('logs only, and sends nothing, with the embedder off or for a model that is not active', async () => {
		await photo({ report_id: await report() });
		const off = scheduled(offAdapter<EmbedderAdapter>('EMBEDDER_PROVIDER'));
		await EmbeddingsDomain.backfill({}, off.ctx);
		expect(off.sent).toEqual([]);
		expect(off.logs()).toContainEqual(expect.objectContaining({ msg: 'embedding.backfill.off', model: A }));

		const inactive = scheduled();
		await EmbeddingsDomain.backfill({ model: 'not-configured' }, inactive.ctx);
		expect(inactive.sent).toEqual([]);
		expect(inactive.logs()).toContainEqual(
			expect.objectContaining({ msg: expect.stringMatching(/^embedding\.backfill\.inactive/) })
		);
	});

	it('the job handler drops invalid data and defaults empty data', async () => {
		const s = scheduled();
		const ctx = { ...s.ctx, prisma, send: s.ctx.jobs.send } as JobCtx;
		await handle({ model: 5 }, ctx);
		await handle({ after: 'not-a-uuid' }, ctx);
		expect(s.logs().filter((l) => l.msg === 'embedding.backfill: invalid job dropped')).toHaveLength(2);
		await handle(null, ctx);
		expect(s.logs().map((l) => l.msg)).toContain('embedding.backfill.page');
		// The page above sent the previous test's photo; run it so no photo is left without a vector.
		await s.run();
	});
});

describe('queueBackfill (seeder 41-embedding-backfill)', () => {
	it('queues embedding.backfill { model: embedding.model } only when the embedder is on and a photo lacks a vector', async () => {
		const none = scheduled();
		expect(await EmbeddingsDomain.queueBackfill(none.ctx)).toBe(false);
		expect(none.sent).toEqual([]);

		const id = await photo({ report_id: await report() });
		await setConfig('embedding.next_model', B);
		const off = scheduled(offAdapter<EmbedderAdapter>('EMBEDDER_PROVIDER'));
		expect(await EmbeddingsDomain.queueBackfill(off.ctx)).toBe(false);
		expect(off.sent).toEqual([]);

		const on = scheduled();
		expect(await EmbeddingsDomain.queueBackfill(on.ctx)).toBe(true);
		expect(on.sent).toMatchObject([{ queue: 'embedding.backfill', data: { model: A } }]);
		await on.run();
		expect(await modelsOf(id)).toEqual([A, B].sort());
	});
});

describe('model change (next_model, backfill, switch, prune) with two mock models', () => {
	it('new photos get both vectors, the backfill fills the new model, and similarity reads only embedding.model', async () => {
		const { embedder, calls } = recordingEmbedder();
		const lost = await report();
		const found = await report('found');
		const l1 = await photo({ report_id: lost });
		const f1 = await photo({ report_id: found });
		const similarity = async () =>
			EmbeddingsDao.similarity(lost, [found], (await configStore.get('embedding.model')) as string);

		// Before: the A vectors (mock: unrelated images, cos about 0).
		const before = scheduled(embedder);
		await EmbeddingsDomain.backfill({}, before.ctx);
		await before.run();
		const [a] = await similarity();
		expect(Math.abs(a!.cos)).toBeLessThan(0.3);

		// 1. next_model = B: a new photo gets both vectors; matching still reads A. (The other tests' photos get B
		// first, so the backfill below only has l1 and f1 to fill.)
		await fillOthers([B], [l1, f1]);
		await setConfig('embedding.next_model', B);
		const n1 = await photo({ report_id: await report('found') });
		await EmbeddingsDomain.embedPhoto({ photo_id: n1 }, before.ctx);
		expect(await modelsOf(n1)).toEqual([A, B].sort());
		expect((await similarity())[0]!.cos).toBeCloseTo(a!.cos, 6);

		// 2. The backfill (model defaults to next_model) gives the older photos B, with no new A call.
		calls.length = 0;
		const fill = scheduled(embedder);
		await fill.ctx.jobs.send('embedding.backfill', {});
		await fill.run();
		expect(calls.map((call) => call.model)).toEqual([B, B]);
		for (const id of [l1, f1]) expect(await modelsOf(id)).toEqual([A, B].sort());
		expect(fill.logs()).toContainEqual(
			expect.objectContaining({ msg: 'embedding.backfill.done', model: B, remaining: 0 })
		);
		expect((await similarity())[0]!.cos).toBeCloseTo(a!.cos, 6);

		// 3. The switch: embedding.model = B, next_model cleared. Matching reads B (cos 1 for SAME vectors).
		await setConfig('embedding.model', B);
		await setConfig('embedding.next_model', null);
		expect((await similarity())[0]!.cos).toBeCloseTo(1, 6);

		// 4. prune: only B is left. Run in a transaction that is rolled back, so the test never deletes the vectors
		// other tests (or a developer's local database) hold for other models.
		const prune = scheduled(embedder);
		const rollback = new Error('rollback');
		await prisma
			.$transaction(
				async (tx) => {
					await EmbeddingsDomain.backfill({ prune: true }, { ...prune.ctx, tx });
					const left = await tx.$queryRaw<{ model: string }[]>`
						select distinct model from app.photo_embeddings`;
					expect(left).toEqual([{ model: B }]);
					expect(await EmbeddingsDao.modelsOf(l1, tx)).toEqual([B]);
					throw rollback;
				},
				{ timeout: 30_000 }
			)
			.catch((err: unknown) => {
				if (err !== rollback) throw err;
			});
		expect(prune.logs()).toContainEqual(expect.objectContaining({ msg: 'embedding.backfill.pruned', kept: [B] }));
		expect(prune.logs()).toContainEqual(
			expect.objectContaining({ msg: 'embedding.backfill.done', model: B, remaining: 0 })
		);
		expect((await similarity())[0]!.cos).toBeCloseTo(1, 6);
	});
});
