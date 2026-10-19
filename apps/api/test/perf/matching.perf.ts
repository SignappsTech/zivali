// Reverse-search budget of the matching engine v3 (C8 §Visual similarity 7, TASK-43.2): a new found report against
// 1000 open lost reports in range, each with 2 photos and their mock vectors, finishes match.report in under 5 s on the
// local stack. On demand only (`pnpm --filter api test:perf`, a worktree sets TEST_DATABASE_URL to its scratch
// database), never in pnpm verify: wall-clock budgets are fine here, unlike the regular suite (test/README.md).
import { performance } from 'node:perf_hooks';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { mockEmbedder } from '../../adapters/embedder/mock.ts';
import { MatchingDomain } from '../../domains/matching/index.ts';
import { config } from '../../lib/config.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { startJobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';

const LOST = 1000;
const PHOTOS = 2; // per report
const BATCH = 500;
const BUDGET_MS = 5000;
// Fixed, so a run that died half-way is cleaned up by the next one.
const OWNER = '00000000-0000-4000-8000-000000043002';
const FINDER = '00000000-0000-4000-8000-000000043003';
const OWNERS = [OWNER, FINDER];
// A 17th-century day: no other data falls into the 30-day window.
const AT = new Date(Date.UTC(1650, 5, 1));

let found: string;

async function cleanup() {
	await prisma.$executeRaw`
		delete from app.matches where lost_report_id in (select id from app.reports where created_by = any(${OWNERS}::uuid[]))`;
	await prisma.$executeRaw`delete from pgboss.job where name = 'notify.send' and data->>'user_id' = ${OWNER}`;
	await prisma.$executeRaw`delete from app.reports where created_by = any(${OWNERS}::uuid[])`;
	// Photos and their vectors go with the profiles (on delete cascade).
	await prisma.$executeRaw`delete from app.profiles where id = any(${OWNERS}::uuid[])`;
}

async function seed(model: string) {
	await cleanup();
	await prisma.profiles.createMany({ data: OWNERS.map((id) => ({ id })) });
	// Lost dogs with varied attributes up to 25 days before the find, within about 23 km of Ljubljana (all in range).
	await prisma.$executeRaw`
		insert into app.reports (id, short_code, type, species, status, moderation_state, event_at, exact_point,
			public_point, public_radius_m, in_slovenia, created_by, sex, size, colours, pattern)
		select gen_random_uuid(), 'mp' || lpad(g::text, 6, '0'), 'lost', 'dog', 'open', 'visible',
			${AT}::timestamptz - make_interval(hours => g % 600), pt, pt, 500, true, ${OWNER}::uuid,
			(array['female', 'male', null])[1 + g % 3]::app."SEX", (array['m', 's', 'l', null])[1 + g % 4]::app."SIZE",
			(case g % 3 when 0 then array['black', 'white'] when 1 then array['brown', 'white'] else array['golden'] end)::app."COLOUR"[],
			(array['bicolour', 'solid', null])[1 + g % 3]::app."PATTERN"
		from (
			select g, extensions.st_setsrid(extensions.st_makepoint(14.5061 + (random() - 0.5) * 0.4,
				46.0514 + (random() - 0.5) * 0.3), 4326)::extensions.geography as pt
			from generate_series(1, ${LOST}::int) g
		) s`;
	await prisma.$executeRaw`
		insert into app.report_managers (report_id, user_id, role)
		select id, ${OWNER}::uuid, 'owner' from app.reports where created_by = ${OWNER}::uuid`;
	[{ id: found }] = await prisma.$queryRaw<{ id: string }[]>`
		insert into app.reports (id, short_code, type, species, status, moderation_state, event_at, exact_point,
			public_point, public_radius_m, in_slovenia, created_by, sex, size, colours, pattern)
		select gen_random_uuid(), 'mpfound1', 'found', 'dog', 'open', 'visible', ${AT}::timestamptz, pt, pt, 500, true,
			${FINDER}::uuid, 'female', 'm', array['black', 'white']::app."COLOUR"[], 'bicolour'
		from (select extensions.st_setsrid(extensions.st_makepoint(14.5061, 46.0514), 4326)::extensions.geography as pt) s
		returning id`;
	await prisma.$executeRaw`
		insert into app.photos (id, owner_id, report_id, position, sha256, width, height, bytes, status)
		select gen_random_uuid(), r.created_by, r.id, i, md5(random()::text) || md5(random()::text), 1600, 1200, 1, 'published'
		from app.reports r cross join generate_series(0, ${PHOTOS - 1}::int) i
		where r.created_by = any(${OWNERS}::uuid[])`;
	const photos = await prisma.$queryRaw<{ id: string; sha256: string; report_id: string; code: string }[]>`
		select p.id, p.sha256, p.report_id, r.short_code as code
		from app.photos p join app.reports r on r.id = p.report_id where p.owner_id = any(${OWNERS}::uuid[])`;
	const vectors = await mockEmbedder().embed(
		photos.map((p) => ({ jpegBase64: '', sha256: p.sha256 })),
		model
	);
	// Every 20th lost report shows the found dog (the found photo's vector), so the visual term and lifted vetoes run.
	const foundVector = vectors[photos.findIndex((p) => p.report_id === found)]!;
	const lookalike = (code: string) => code !== 'mpfound1' && Number(code.slice(2)) % 20 === 0;
	const literals = photos.map(
		(p, i) => `[${(lookalike(p.code) ? foundVector : vectors[i]!).map((x) => x.toFixed(6)).join(',')}]`
	);
	for (let i = 0; i < photos.length; i += BATCH) {
		await prisma.$executeRaw`
			insert into app.photo_embeddings (photo_id, model, embedding)
			select id, ${model}, v::extensions.vector
			from unnest(${photos.slice(i, i + BATCH).map((p) => p.id)}::uuid[], ${literals.slice(i, i + BATCH)}::text[]) as t(id, v)`;
	}
	await prisma.$executeRaw`vacuum analyze app.reports, app.photos, app.photo_embeddings`;
}

beforeAll(async () => {
	if (!['127.0.0.1', 'localhost'].includes(new URL(config.DATABASE_URL).hostname))
		throw new Error('test:perf runs on the local stack only');
	await startJobs();
	await seed(String(await configStore.get('embedding.model')));
});

afterAll(async () => {
	await cleanup();
});

describe('reverse search (C8 §Visual similarity 7)', () => {
	it(`a new found report against ${LOST} open lost reports with photos: match.report < ${BUDGET_MS / 1000} s`, async () => {
		const started = performance.now();
		const { stored } = await MatchingDomain.matchReport({ report_id: found }, systemCtx());
		const ms = performance.now() - started;
		const [visual] = await prisma.$queryRaw<{ count: number }[]>`
			select count(*)::int as count from app.matches
			where other_report_id = ${found}::uuid and reasons @> '[{"code": "visual"}]'`;
		process.stdout.write(
			`[perf] match.report: ${LOST} lost reports, ${stored} stored, ${visual!.count} with a visual reason, ${Math.round(ms)} ms\n`
		);
		expect(stored).toBeGreaterThan(0);
		expect(visual!.count).toBeGreaterThan(0);
		expect(ms).toBeLessThan(BUDGET_MS);
	});
});
