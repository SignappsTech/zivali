// 50k-photo performance check of the vector queries (C20 §Queries, NFR-SCALE; TASK-42.2). On demand only, never in
// pnpm verify: `pnpm --filter api test:perf` on the local stack (a worktree sets TEST_DATABASE_URL to its scratch
// database). Seeds 10k reports with 5 photos each and their mock vectors (adapters/embedder/mock.ts), measures, prints
// the plans and deletes the seed again. Wall-clock budgets are fine here, unlike the regular suite (test/README.md).
import { performance } from 'node:perf_hooks';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { mockEmbedder } from '../../adapters/embedder/mock.ts';
import EmbeddingsDao, {
	hnswSettings,
	nearestSql,
	pgvectorVersion,
	type NearestInput,
} from '../../domains/embeddings/embeddings.dao.ts';
import { Prisma } from '../../generated/client.ts';
import { config } from '../../lib/config.ts';
import { prisma } from '../../prisma/prisma.ts';

const MODEL = 'voyage-multimodal-3.5';
const REPORTS = 10_000;
const PHOTOS = 5; // per report: 50k photos and vectors
const BATCH = 500;
const SEED_CONNECTIONS = 4; // of the pool's 5
// Fixed, so a run that died half-way is cleaned up by the next one.
const OWNER = '00000000-0000-4000-8000-000000042002';
const RADII_KM = [5, 10, 25, 50, 100, 250];
const RUNS_PER_RADIUS = 20;

type Seeded = { id: string; type: string; species: string };
let reports: Seeded[] = [];
let photoIds: string[] = [];

async function cleanup() {
	await prisma.$executeRaw`delete from app.reports where created_by = ${OWNER}::uuid`;
	// Photos and their vectors go with the profile (on delete cascade).
	await prisma.$executeRaw`delete from app.profiles where id = ${OWNER}::uuid`;
}

/** A random point inside Slovenia's bounding box. */
const randomPoint = () => ({ lat: 45.5 + Math.random() * 1.3, lng: 13.5 + Math.random() * 2.9 });
const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]!;
const hnswLine = (plan: string) => plan.split('\n').find((line) => line.includes('photo_embeddings_hnsw')) ?? '';
const p95 = (ms: number[]) => [...ms].sort((a, b) => a - b)[Math.ceil(ms.length * 0.95) - 1]!;

async function explain(input: NearestInput): Promise<string> {
	return prisma.$transaction(
		async (tx) => {
			for (const setting of hnswSettings(await pgvectorVersion(tx))) await tx.$executeRaw(setting);
			const rows = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(
				Prisma.sql`explain (analyze, buffers) ${nearestSql(input, MODEL)}`
			);
			return rows.map((r) => r['QUERY PLAN']).join('\n');
		},
		{ timeout: 120_000 }
	);
}

/** 10k reports (lost/found/sighted, dog/cat, 10 % closed, 10 % matched, 5 % hidden) with 5 photos and vectors each. */
async function seed() {
	await cleanup();
	await prisma.profiles.create({ data: { id: OWNER } });
	await prisma.$executeRaw`
		insert into app.reports (id, short_code, type, species, status, moderation_state, event_at, exact_point,
			public_point, public_radius_m, in_slovenia, created_by)
		select gen_random_uuid(), 'perf' || lpad(g::text, 4, '0'),
			(array['lost', 'found', 'sighted'])[1 + g % 3]::app."REPORT_TYPE",
			(array['dog', 'cat'])[1 + (g / 3) % 2]::app."SPECIES",
			(case g % 10 when 0 then 'closed' when 1 then 'matched' else 'open' end)::app."REPORT_STATUS",
			(case when g % 20 = 7 then 'hidden' else 'visible' end)::app."MODERATION_STATE",
			now() - make_interval(days => g % 60), pt, pt, 500, true, ${OWNER}::uuid
		from (
			select g, extensions.st_setsrid(extensions.st_makepoint(13.5 + random() * 2.9, 45.5 + random() * 1.3),
				4326)::extensions.geography as pt
			from generate_series(0, ${REPORTS - 1}) g
		) s`;
	await prisma.$executeRaw`
		insert into app.photos (id, owner_id, report_id, position, sha256, width, height, bytes, status)
		select gen_random_uuid(), ${OWNER}::uuid, r.id, i, md5(random()::text) || md5(random()::text), 1600, 1200, 1, 'published'
		from app.reports r cross join generate_series(0, ${PHOTOS - 1}) i
		where r.created_by = ${OWNER}::uuid`;
	const rows = await prisma.$queryRaw<{ id: string; sha256: string }[]>`
		select id, sha256 from app.photos where owner_id = ${OWNER}::uuid order by id`;
	const embedder = mockEmbedder();
	const started = performance.now();
	// Inserting into the HNSW index dominates the seed, so batches go in over several connections.
	let next = 0;
	const insertBatches = async () => {
		for (let i = next; i < rows.length; i = next) {
			next += BATCH;
			const batch = rows.slice(i, i + BATCH);
			const vectors = await embedder.embed(
				batch.map((p) => ({ jpegBase64: '', sha256: p.sha256 })),
				MODEL
			);
			const literals = vectors.map((v) => `[${v.map((x) => x.toFixed(6)).join(',')}]`);
			await prisma.$executeRaw`
				insert into app.photo_embeddings (photo_id, model, embedding)
				select id, ${MODEL}, v::extensions.vector
				from unnest(${batch.map((p) => p.id)}::uuid[], ${literals}::text[]) as t(id, v)`;
		}
	};
	await Promise.all(Array.from({ length: SEED_CONNECTIONS }, insertBatches));
	await prisma.$executeRaw`analyze app.reports`;
	await prisma.$executeRaw`analyze app.photos`;
	await prisma.$executeRaw`analyze app.photo_embeddings`;
	process.stdout.write(
		`[perf] seeded ${REPORTS} reports, ${rows.length} vectors in ${Math.round(performance.now() - started)} ms\n`
	);
}

beforeAll(async () => {
	if (!['127.0.0.1', 'localhost'].includes(new URL(config.DATABASE_URL).hostname))
		throw new Error('test:perf runs on the local stack only');
	await seed();
	reports = await prisma.$queryRaw<Seeded[]>`
		select id, type::text, species::text from app.reports where created_by = ${OWNER}::uuid`;
	photoIds = (await prisma.photos.findMany({ where: { owner_id: OWNER }, select: { id: true } })).map((p) => p.id);
});

afterAll(cleanup);

describe('vector queries at 50k photos (C20 §Queries)', () => {
	it('nearest: p95 < 300 ms over radii 5–250 km, through the HNSW index', async () => {
		const nationwide: NearestInput = {
			photoId: pick(photoIds),
			species: 'dog',
			point: { lat: 46.05, lng: 14.5 },
			radiusKm: 250,
			types: ['found', 'sighted'],
			k: 20,
		};
		// Nationwide: thousands of candidates, so the HNSW scan runs; 5 km: a few dozen, ranked exactly.
		const plan = await explain(nationwide);
		process.stdout.write(`[perf] EXPLAIN nearest (250 km):\n${plan}\n`);
		expect(hnswLine(plan)).toMatch(/Index Scan using photo_embeddings_hnsw .*\(actual time/);
		const local = await explain({ ...nationwide, radiusKm: 5 });
		process.stdout.write(`[perf] EXPLAIN nearest (5 km):\n${local}\n`);
		expect(hnswLine(local)).toContain('never executed');

		const ms: number[] = [];
		for (const radiusKm of RADII_KM) {
			const perRadius: number[] = [];
			for (let i = 0; i < RUNS_PER_RADIUS; i++) {
				const lost = Math.random() < 0.5;
				const input: NearestInput = {
					photoId: pick(photoIds),
					species: pick(['dog', 'cat'] as const),
					point: randomPoint(),
					radiusKm,
					types: lost ? ['found', 'sighted'] : ['lost'],
					k: 20,
				};
				const t = performance.now();
				await EmbeddingsDao.nearest(input, MODEL);
				perRadius.push(performance.now() - t);
			}
			process.stdout.write(`[perf] nearest ${radiusKm} km: p95 ${p95(perRadius).toFixed(1)} ms\n`);
			ms.push(...perRadius);
		}
		process.stdout.write(`[perf] nearest overall: p95 ${p95(ms).toFixed(1)} ms over ${ms.length} queries\n`);
		expect(p95(ms)).toBeLessThan(300);
	});

	it('similarity: one lost report with 5 photos against 1000 reports with 5 photos each < 1 s', async () => {
		const lost = reports.find((r) => r.type === 'lost')!;
		const others = reports.filter((r) => r.id !== lost.id).slice(0, 1000);
		const ids = others.map((r) => r.id);
		await EmbeddingsDao.similarity(lost.id, ids, MODEL); // warm-up
		for (let run = 0; run < 3; run++) {
			const t = performance.now();
			const rows = await EmbeddingsDao.similarity(lost.id, ids, MODEL);
			const elapsed = performance.now() - t;
			process.stdout.write(`[perf] similarity 1000 × 25 pairs: ${elapsed.toFixed(1)} ms\n`);
			expect(rows).toHaveLength(1000);
			expect(elapsed).toBeLessThan(1000);
		}
	});
});
