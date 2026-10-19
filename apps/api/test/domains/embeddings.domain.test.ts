// photo.embed (C20 §Jobs) against the local database, the in-memory storage and the mock embedder: one vector per
// photo and active model, hash reuse, safety-check and status skips (CH-562), the monthly budget, the off adapter,
// retries and the dead-letter log (refused requests at once, database errors too), the call's provider (mock or voyage).
// The backfill and the model change: test/domains/embeddings.backfill.test.ts.
import { randomBytes, randomUUID } from 'node:crypto';

import { pino } from 'pino';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { EmbedderError, type EmbedderAdapter } from '../../adapters/embedder/index.ts';
import { adapters } from '../../adapters/index.ts';
import { offAdapter } from '../../adapters/select.ts';
import EmbeddingsDao from '../../domains/embeddings/embeddings.dao.ts';
import { EmbeddingsDomain } from '../../domains/embeddings/index.ts';
import { variantRef } from '../../domains/photos/photo-objects.ts';
import type { PHOTO_STATUS } from '../../generated/enums.ts';
import { runJob } from '../../jobs/index.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { drain, jobs } from '../../lib/jobs.ts';
import { loggerOptions } from '../../lib/logger.ts';
import { prisma } from '../../prisma/prisma.ts';

const MODEL = 'voyage-multimodal-3.5';
const owners = [randomUUID(), randomUUID()];
const sha256s: string[] = [];

type Safety = { animal?: string; person_prominent?: boolean; nsfw?: boolean } | null;

/** A photo row with its display.jpg (1600 × 1200 unless given) and, unless `ai` is null, its ai_results row. */
async function photo({
	sha256 = randomBytes(32).toString('hex'),
	status = 'accepted' as PHOTO_STATUS,
	owner = owners[0]!,
	ai = {} as Safety,
	width = 1600,
	height = 1200,
} = {}) {
	sha256s.push(sha256);
	const row = await prisma.photos.create({ data: { owner_id: owner, sha256, width, height, bytes: 1, status } });
	const jpeg = await sharp({ create: { width, height, channels: 3, background: { r: 120, g: 80, b: 40 } } })
		.jpeg()
		.toBuffer();
	await adapters.storage.put(variantRef(row.id, 'display.jpg'), jpeg, 'image/jpeg');
	if (ai) {
		const { animal = 'dog', person_prominent = false, nsfw = false } = ai;
		await prisma.ai_results.upsert({
			where: { sha256 },
			create: {
				sha256,
				model: 'claude-haiku-5-5',
				prompt_version: 'test',
				result: { animal, animal_count: 1, species_confidence: 0.9 },
				moderation: { person_prominent, nsfw, violence: false, text_contact_info: false },
			},
			update: {},
		});
	}
	return row;
}

const vectors = (photo_id: string) =>
	prisma.$queryRaw<{ model: string; dims: number; norm: number; v: string }[]>`
		select model, extensions.vector_dims(embedding) as dims, extensions.vector_norm(embedding) as norm,
			embedding::text as v
		from app.photo_embeddings where photo_id = ${photo_id}::uuid order by model`;

async function setConfig(key: string, value: unknown) {
	await prisma.$executeRaw`update app.app_config set value = ${JSON.stringify(value)}::jsonb where key = ${key}`;
	configStore.invalidate();
}

/** A system ctx whose logger lines are captured; `embedder` replaces the mock. */
function testCtx(embedder: EmbedderAdapter = adapters.embedder) {
	const lines: string[] = [];
	const logger = pino({ ...loggerOptions, level: 'info' }, { write: (line: string) => void lines.push(line) });
	const ctx = systemCtx({ logger, adapters: { ...adapters, embedder } });
	const logs = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
	return { ctx, lines, logs };
}

beforeAll(async () => {
	await prisma.profiles.createMany({ data: owners.map((id) => ({ id })) });
});

afterEach(async () => {
	vi.restoreAllMocks();
	await setConfig('embedding.model', MODEL);
	await setConfig('embedding.next_model', null);
	await setConfig('embedding.monthly_budget_usd', 5);
});

afterAll(async () => {
	await prisma.ai_calls.deleteMany({ where: { photo: { owner_id: { in: owners } } } });
	await prisma.profiles.deleteMany({ where: { id: { in: owners } } });
	await prisma.ai_results.deleteMany({ where: { sha256: { in: sha256s } } });
});

describe('photo.embed', () => {
	it('stores one L2-normalised 1024-d vector for embedding.model and one ai_calls row (mock, pixels, cost)', async () => {
		const p = await photo();
		const embed = vi.spyOn(adapters.embedder, 'embed');
		const { ctx } = testCtx();
		await EmbeddingsDomain.embedPhoto({ photo_id: p.id }, ctx);

		const rows = await vectors(p.id);
		expect(rows).toMatchObject([{ model: MODEL, dims: 1024 }]);
		expect(rows[0]!.norm).toBeCloseTo(1, 5);
		// The 1600 × 1200 display.jpg went out as a 1024 px long-edge JPEG, with the photo's hash for the mock.
		expect(embed).toHaveBeenCalledTimes(1);
		const [[image], model] = embed.mock.calls[0]!;
		expect(model).toBe(MODEL);
		expect(image!.sha256).toBe(p.sha256);
		expect(await sharp(Buffer.from(image!.jpegBase64, 'base64')).metadata()).toMatchObject({
			format: 'jpeg',
			width: 1024,
			height: 768,
		});
		const calls = await prisma.ai_calls.findMany({ where: { photo_id: p.id } });
		expect(calls).toHaveLength(1);
		// The mock's call is provider mock (TASK-42.1 review): it never counts toward the Voyage budget.
		expect(calls[0]).toMatchObject({ provider: 'mock', model: MODEL, outcome: 'ok', pixels: 786432n });
		expect(calls[0]!.cost_usd.toString()).toBe('0.000472');

		// Again: the vector exists, so no second call and no second row.
		await EmbeddingsDomain.embedPhoto({ photo_id: p.id }, ctx);
		expect(embed).toHaveBeenCalledTimes(1);
		expect(await vectors(p.id)).toHaveLength(1);
	});

	it('also stores a vector for embedding.next_model when set', async () => {
		await setConfig('embedding.next_model', 'voyage-next-test');
		const p = await photo();
		await EmbeddingsDomain.embedPhoto({ photo_id: p.id }, testCtx().ctx);
		expect((await vectors(p.id)).map((r) => r.model)).toEqual([MODEL, 'voyage-next-test']);
		expect(await prisma.ai_calls.count({ where: { photo_id: p.id, provider: 'mock' } })).toBe(2);
	});

	it('records a voyage call as provider voyage', async () => {
		const p = await photo();
		const voyage: EmbedderAdapter = {
			provider: 'voyage',
			embed: (images, model) => adapters.embedder.embed(images, model),
		};
		await EmbeddingsDomain.embedPhoto({ photo_id: p.id }, testCtx(voyage).ctx);
		expect(await prisma.ai_calls.findMany({ where: { photo_id: p.id } })).toMatchObject([{ provider: 'voyage' }]);
	});

	it('reuses the vector of another photo with the same sha256, with no adapter call', async () => {
		const first = await photo();
		await EmbeddingsDomain.embedPhoto({ photo_id: first.id }, testCtx().ctx);
		const second = await photo({ sha256: first.sha256, owner: owners[1] });
		const embed = vi.spyOn(adapters.embedder, 'embed');
		await EmbeddingsDomain.embedPhoto({ photo_id: second.id }, testCtx().ctx);
		expect(embed).not.toHaveBeenCalled();
		expect((await vectors(second.id))[0]!.v).toBe((await vectors(first.id))[0]!.v);
		expect(await prisma.ai_calls.count({ where: { photo_id: second.id } })).toBe(0);
	});

	it('embeds published photos; skips other statuses, photos without a safety check and flagged photos', async () => {
		const published = await photo({ status: 'published' });
		const skipped = await Promise.all([
			photo({ status: 'uploaded' }),
			photo({ status: 'rejected' }),
			photo({ status: 'unpublished' }),
			// CH-562: no ai_results row (ai.extract stubbed, failed or skipped) = never embedded.
			photo({ ai: null }),
			photo({ ai: { person_prominent: true } }),
			photo({ ai: { nsfw: true } }),
			photo({ ai: { animal: 'none' } }),
			photo({ ai: { animal: 'other' } }),
		]);
		const embed = vi.spyOn(adapters.embedder, 'embed');
		const { ctx } = testCtx();
		for (const p of [published, ...skipped]) await EmbeddingsDomain.embedPhoto({ photo_id: p.id }, ctx);
		expect(await vectors(published.id)).toHaveLength(1);
		expect(embed).toHaveBeenCalledTimes(1);
		for (const p of skipped) expect(await vectors(p.id)).toEqual([]);
		// An unknown photo id is a no-op too.
		await EmbeddingsDomain.embedPhoto({ photo_id: randomUUID() }, ctx);
	});

	it('over the monthly Voyage budget: skipped with a photo.embed.budget log line, no call', async () => {
		const spend = await prisma.ai_calls.create({
			data: {
				provider: 'voyage',
				model: MODEL,
				outcome: 'ok',
				input_tokens: 0,
				output_tokens: 0,
				cost_usd: '0.01',
				latency_ms: 1,
			},
		});
		try {
			await setConfig('embedding.monthly_budget_usd', 0.005);
			const p = await photo();
			const embed = vi.spyOn(adapters.embedder, 'embed');
			const { ctx, logs } = testCtx();
			await EmbeddingsDomain.embedPhoto({ photo_id: p.id }, ctx);
			expect(embed).not.toHaveBeenCalled();
			expect(await vectors(p.id)).toEqual([]);
			expect(logs()).toContainEqual(
				expect.objectContaining({ msg: 'photo.embed.budget', photo_id: p.id, model: MODEL })
			);
		} finally {
			await prisma.ai_calls.delete({ where: { id: spend.id } });
		}
	});

	it('mock calls never count toward the Voyage budget', async () => {
		const spend = await prisma.ai_calls.create({
			data: {
				provider: 'mock',
				model: MODEL,
				outcome: 'ok',
				input_tokens: 0,
				output_tokens: 0,
				cost_usd: '100',
				latency_ms: 1,
			},
		});
		try {
			const p = await photo();
			await EmbeddingsDomain.embedPhoto({ photo_id: p.id }, testCtx().ctx);
			expect(await vectors(p.id)).toHaveLength(1);
		} finally {
			await prisma.ai_calls.delete({ where: { id: spend.id } });
		}
	});

	it('with the embedder off: skipped with a log line, nothing thrown', async () => {
		const p = await photo();
		const { ctx, logs } = testCtx(offAdapter<EmbedderAdapter>('EMBEDDER_PROVIDER'));
		await EmbeddingsDomain.embedPhoto({ photo_id: p.id }, ctx);
		expect(await vectors(p.id)).toEqual([]);
		expect(logs()).toContainEqual(expect.objectContaining({ msg: 'photo.embed.off', photo_id: p.id }));
	});

	it('a provider error throws for retry; the last attempt logs photo.embed.dead_letter without image data', async () => {
		const p = await photo();
		vi.spyOn(adapters.embedder, 'embed').mockRejectedValue(new EmbedderError('http_429', 0));
		const { ctx, lines, logs } = testCtx();
		await expect(EmbeddingsDomain.embedPhoto({ photo_id: p.id }, ctx)).rejects.toMatchObject({ code: 'http_429' });
		expect(logs().map((l) => l.msg)).not.toContain('photo.embed.dead_letter');

		await expect(EmbeddingsDomain.embedPhoto({ photo_id: p.id, last_attempt: true }, ctx)).rejects.toThrow(
			EmbedderError
		);
		const dead = logs().filter((l) => l.msg === 'photo.embed.dead_letter');
		expect(dead).toEqual([expect.objectContaining({ photo_id: p.id, model: MODEL, code: 'http_429' })]);
		// JPEG base64 starts with /9j/: no image data in any line.
		expect(lines.join('\n')).not.toContain('/9j/');
		expect(await vectors(p.id)).toEqual([]);
		expect(await prisma.ai_calls.count({ where: { photo_id: p.id } })).toBe(0);
	});

	it('a refused request (400, 401) logs photo.embed.dead_letter at once and ends without a retry', async () => {
		for (const code of ['http_400', 'http_401']) {
			const p = await photo();
			vi.spyOn(adapters.embedder, 'embed').mockRejectedValue(new EmbedderError(code));
			const { ctx, logs } = testCtx();
			await expect(EmbeddingsDomain.embedPhoto({ photo_id: p.id }, ctx)).resolves.toBeUndefined();
			expect(logs().filter((l) => l.msg === 'photo.embed.dead_letter')).toEqual([
				expect.objectContaining({ photo_id: p.id, model: MODEL, code }),
			]);
			expect(await vectors(p.id)).toEqual([]);
		}
	});

	it('a database error before the model loop still logs photo.embed.dead_letter on the last attempt', async () => {
		const p = await photo();
		const lost = Object.assign(new Error('connection lost'), { code: 'P1001' });
		vi.spyOn(EmbeddingsDao, 'findPhoto').mockRejectedValue(lost);
		const { ctx, logs } = testCtx();
		await expect(EmbeddingsDomain.embedPhoto({ photo_id: p.id }, ctx)).rejects.toBe(lost);
		expect(logs().map((l) => l.msg)).not.toContain('photo.embed.dead_letter');
		await expect(EmbeddingsDomain.embedPhoto({ photo_id: p.id, last_attempt: true }, ctx)).rejects.toBe(lost);
		expect(logs().filter((l) => l.msg === 'photo.embed.dead_letter')).toEqual([
			expect.objectContaining({ photo_id: p.id, code: 'P1001' }),
		]);
	});

	it('waits out a short Retry-After before it throws', async () => {
		const p = await photo();
		vi.spyOn(adapters.embedder, 'embed').mockRejectedValue(new EmbedderError('http_429', 1));
		const started = Date.now();
		await expect(EmbeddingsDomain.embedPhoto({ photo_id: p.id }, testCtx().ctx)).rejects.toThrow(EmbedderError);
		expect(Date.now() - started).toBeGreaterThanOrEqual(950);
	});
});

describe('photo.embed job', () => {
	it('a photo.embed { photo_id } job stores the vector with the mock embedder', async () => {
		const p = await photo();
		await jobs.send('photo.embed', { photo_id: p.id });
		await drain(runJob);
		expect(await vectors(p.id)).toHaveLength(1);
	});

	it('fails 6 times (5 retries); only the last attempt is marked as the last', async () => {
		const p = await photo();
		vi.spyOn(adapters.embedder, 'embed').mockRejectedValue(new EmbedderError('http_503'));
		const embedPhoto = vi.spyOn(EmbeddingsDomain, 'embedPhoto');
		const id = (await jobs.send('photo.embed', { photo_id: p.id }))!;
		await drain(runJob);
		const attempts = embedPhoto.mock.calls.filter(([input]) => input.photo_id === p.id);
		expect(attempts.map(([input]) => input.last_attempt)).toEqual([false, false, false, false, false, true]);
		const [row] = await prisma.$queryRaw<
			{ state: string }[]
		>`select state::text from pgboss.job where id = ${id}::uuid`;
		expect(row).toEqual({ state: 'failed' });
	});

	it('a refused request (401) ends the job after one attempt', async () => {
		const p = await photo();
		vi.spyOn(adapters.embedder, 'embed').mockRejectedValue(new EmbedderError('http_401'));
		const embedPhoto = vi.spyOn(EmbeddingsDomain, 'embedPhoto');
		const id = (await jobs.send('photo.embed', { photo_id: p.id }))!;
		await drain(runJob);
		expect(embedPhoto.mock.calls.filter(([input]) => input.photo_id === p.id)).toHaveLength(1);
		const [row] = await prisma.$queryRaw<
			{ state: string }[]
		>`select state::text from pgboss.job where id = ${id}::uuid`;
		expect(row).toEqual({ state: 'completed' });
	});
});
