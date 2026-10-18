// TASK-40.1: the M3 AI tables (C19 §Models, C20 §Model) and settings. Guards the hand-written SQL Prisma cannot model:
// a later `prisma migrate dev` generates `DROP INDEX photo_embeddings_hnsw`, which must be deleted from that migration.
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../../prisma/prisma.ts';

const OWNER = randomUUID();
const vector = (value: number, dim = 1024) => `[${Array(dim).fill(value).join(',')}]`;
const newPhoto = () =>
	prisma.photos.create({
		data: { owner_id: OWNER, sha256: randomUUID(), width: 1600, height: 1200, bytes: 1000, status: 'accepted' },
	});
const embed = (photoId: string, model: string, value: string) =>
	prisma.$executeRaw`
		insert into app.photo_embeddings (photo_id, model, embedding)
		values (${photoId}::uuid, ${model}, ${value}::extensions.vector)`;
const call = (photoId: string, provider: string, model = 'm') =>
	prisma.ai_calls.create({
		data: {
			photo_id: photoId,
			provider,
			model,
			outcome: 'ok',
			input_tokens: 1,
			output_tokens: 1,
			cost_usd: 0,
			latency_ms: 1,
		},
	});

describe('AI tables (TASK-40.1)', () => {
	beforeAll(async () => {
		await prisma.profiles.create({ data: { id: OWNER } });
	});
	afterAll(async () => {
		await prisma.photos.deleteMany({ where: { owner_id: OWNER } });
		await prisma.ai_calls.deleteMany({ where: { photo_id: null, model: { startsWith: 'test-' } } });
		await prisma.profiles.deleteMany({ where: { id: OWNER } });
	});

	it('has the HNSW cosine index on photo_embeddings (m 16, ef_construction 64)', async () => {
		const rows = await prisma.$queryRaw<{ indexdef: string }[]>`
			select indexdef from pg_indexes where schemaname = 'app' and indexname = 'photo_embeddings_hnsw'`;
		expect(rows).toHaveLength(1);
		expect(rows[0].indexdef).toMatch(/USING hnsw \(embedding (extensions\.)?vector_cosine_ops\)/);
		expect(rows[0].indexdef).toContain("WITH (m='16', ef_construction='64')");
	});

	it('stores 1024-d vectors, one per photo and model, and deletes them with the photo', async () => {
		const photo = await newPhoto();
		await embed(photo.id, 'test-a', vector(0.1));
		await embed(photo.id, 'test-b', vector(0.2));
		await expect(embed(photo.id, 'test-a', vector(0.3))).rejects.toThrow();
		await expect(embed(photo.id, 'test-c', vector(0.1, 512))).rejects.toThrow(/dimensions/);
		const count = () => prisma.photo_embeddings.count({ where: { photo_id: photo.id } });
		expect(await count()).toBe(2);
		await prisma.photos.delete({ where: { id: photo.id } });
		expect(await count()).toBe(0);
	});

	it('keeps ai_calls for the budget when the photo goes, unique per photo, provider and model', async () => {
		const photo = await newPhoto();
		const row = await call(photo.id, 'anthropic', 'test-haiku');
		await call(photo.id, 'voyage', 'test-haiku');
		await expect(call(photo.id, 'anthropic', 'test-haiku')).rejects.toThrow();
		await expect(call(photo.id, 'openai', 'test-other')).rejects.toThrow(/ai_calls_provider_check/);
		await prisma.photos.delete({ where: { id: photo.id } });
		expect(await prisma.ai_calls.findUnique({ where: { id: row.id } })).toMatchObject({ photo_id: null });
	});

	it('inserts the C19 and C20 settings; only ai.enabled and ai.min_confidence are public', async () => {
		const rows = await prisma.app_config.findMany({
			where: { OR: [{ key: { startsWith: 'ai.' } }, { key: { startsWith: 'embedding.' } }] },
			select: { key: true, value: true, is_public: true },
			orderBy: { key: 'asc' },
		});
		expect(rows).toEqual([
			{ key: 'ai.daily_photos_anonymous', value: 10, is_public: false },
			{ key: 'ai.daily_photos_user', value: 30, is_public: false },
			{ key: 'ai.enabled', value: true, is_public: true },
			{ key: 'ai.min_confidence', value: 0.6, is_public: true },
			{ key: 'ai.monthly_budget_usd', value: 20, is_public: false },
			{ key: 'embedding.backfill_per_minute', value: 6, is_public: false },
			{ key: 'embedding.model', value: 'voyage-multimodal-3.5', is_public: false },
			{ key: 'embedding.monthly_budget_usd', value: 5, is_public: false },
			{ key: 'embedding.next_model', value: null, is_public: false },
		]);
	});
});
