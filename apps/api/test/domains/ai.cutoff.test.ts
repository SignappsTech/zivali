// TASK-40.11: no photo created before app_config ai.photos_since (the AI switch-on) reaches the ai or the embedder
// adapter, by any path: a new upload, a report edit's photo.publish and match.report, the backfill and seeder 41, a
// retried or resent job. A missing or invalid cutoff sends nothing at all and turns the public ai.enabled off; an
// excluded photo's attributes are unavailable at once. The switch-on migration. Spied mock adapters, the local database.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { RateLimitError } from '@anthropic-ai/sdk';
import { pino } from 'pino';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { AiDomain } from '../../domains/ai/index.ts';
import { ConfigDomain } from '../../domains/config/index.ts';
import { EmbeddingsDomain } from '../../domains/embeddings/index.ts';
import { uploadRef, VARIANT_NAMES, VARIANTS, variantRef } from '../../domains/photos/photo-objects.ts';
import { PhotosDomain } from '../../domains/photos/index.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import type { PHOTO_STATUS } from '../../generated/enums.ts';
import { runJob } from '../../jobs/index.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { drain, jobs, type Jobs, type QueueName } from '../../lib/jobs.ts';
import { loggerOptions } from '../../lib/logger.ts';
import { prisma } from '../../prisma/prisma.ts';

// The switch-on as the other AI tests set it; OLD is a photo from just before it.
const SINCE = '2026-10-19T00:00:00Z';
const OLD = new Date(Date.parse(SINCE) - 1);
const actor = (): Actor => ({
	user_id: randomUUID(),
	role: 'USER',
	is_anonymous: false,
	aal: 'aal1',
	email_verified: true,
	locale: 'sl',
});
const owner = actor();
const other = actor();
const sha256s: string[] = [];
const realGet = configStore.get;

async function setConfig(key: string, value: unknown) {
	await prisma.$executeRaw`update app.app_config set value = ${JSON.stringify(value)}::jsonb where key = ${key}`;
	configStore.invalidate();
}

/** ai.photos_since reads as `value` (a stored JSON value; undefined = no row), every other key as stored. */
const cutoff = (value: unknown) =>
	vi.spyOn(configStore, 'get').mockImplementation(async (key) => (key === 'ai.photos_since' ? value : realGet(key)));

/** A distinct JPEG each call (noise: solid colours a shade apart can encode to the same bytes). */
const jpeg = () =>
	sharp(randomBytes(320 * 240 * 3), { raw: { width: 320, height: 240, channels: 3 } })
		.jpeg()
		.toBuffer();
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/** A photo row with its variants and, when `clean`, a clean ai_results row for its image (as if already extracted). */
async function photo({
	created_at = new Date(),
	status = 'published' as PHOTO_STATUS,
	report_id = null as string | null,
	owner_id = owner.user_id,
	id = randomUUID() as string,
	body = undefined as Buffer | undefined,
	clean = true,
} = {}) {
	const image = body ?? (await jpeg());
	const sha256 = sha(image);
	sha256s.push(sha256);
	const row = await prisma.photos.create({
		data: { id, owner_id, report_id, sha256, width: 320, height: 240, bytes: image.length, status, created_at },
	});
	for (const v of VARIANT_NAMES) await adapters.storage.put(variantRef(row.id, v), image, VARIANTS[v]);
	if (clean && !(await prisma.ai_results.findUnique({ where: { sha256 } })))
		await prisma.ai_results.create({
			data: {
				sha256,
				model: 'test',
				prompt_version: 'test',
				result: { animal: 'dog', animal_count: 1, species_confidence: 0.9 },
				moderation: { person_prominent: false, nsfw: false, violence: false, text_contact_info: false },
			},
		});
	return row;
}

const newReport = () =>
	ReportsDomain.insertReport(
		{ type: 'lost', species: 'dog', location: { lat: 46.0569, lng: 14.5058 }, event_at: new Date() },
		userCtx(owner)
	);

/** Spies on both adapters; calls(sha256) counts the ones that carried that image. */
function spies() {
	const extract = vi.spyOn(adapters.ai, 'extract');
	const embed = vi.spyOn(adapters.embedder, 'embed');
	return {
		extract,
		embed,
		calls: (sha256: string) =>
			extract.mock.calls.filter(([image]) => image.sha256 === sha256).length +
			embed.mock.calls.filter(([images]) => images.some((image) => image.sha256 === sha256)).length,
	};
}

/** Nothing about the photo was sent or stored: no ledger row, no vector. */
async function untouched(photo_id: string) {
	expect(await prisma.ai_calls.count({ where: { photo_id } })).toBe(0);
	expect(await prisma.$queryRaw`select 1 from app.photo_embeddings where photo_id = ${photo_id}::uuid`).toEqual([]);
}

/** A system ctx that records the jobs it sends and the log lines it writes. */
function recording() {
	const sent: { queue: QueueName; data: Record<string, unknown> }[] = [];
	const lines: string[] = [];
	const recorder: Jobs = {
		async send(queue, data) {
			sent.push({ queue, data: data as Record<string, unknown> });
			return randomUUID();
		},
	};
	const logger = pino({ ...loggerOptions, level: 'info' }, { write: (line: string) => void lines.push(line) });
	const ctx = systemCtx({ logger, jobs: recorder });
	const msgs = () => lines.map((line) => (JSON.parse(line) as { msg: string }).msg);
	return { ctx, sent, msgs };
}

beforeAll(async () => {
	await prisma.profiles.createMany({ data: [{ id: owner.user_id }, { id: other.user_id }] });
	await setConfig('ai.photos_since', SINCE);
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	const ids = [owner.user_id, other.user_id];
	await prisma.reports.deleteMany({ where: { created_by: { in: ids } } });
	await prisma.ai_calls.deleteMany({ where: { photo: { owner_id: { in: ids } } } });
	await prisma.profiles.deleteMany({ where: { id: { in: ids } } });
	await prisma.ai_results.deleteMany({ where: { sha256: { in: sha256s } } });
});

describe('ai.photos_since', () => {
	it('is a JSON string, ISO 8601 with Z or an offset, from 2026-10-19 on; anything else is null (fail closed)', async () => {
		const cases: [unknown, string | null][] = [
			[SINCE, '2026-10-19T00:00:00.000Z'],
			['2026-10-19T14:03:12.123456+02:00', '2026-10-19T12:03:12.123Z'],
			[undefined, null],
			[null, null],
			['', null],
			[Date.parse('2026-10-20T00:00:00Z'), null],
			['2026-10-20', null],
			['2026-10-20T10:00:00', null], // no zone
			['tomorrow', null],
			['2026-10-18T23:59:59Z', null], // before the owner's decision
			['1970-01-01T00:00:00Z', null],
		];
		for (const [value, expected] of cases) {
			cutoff(value);
			expect((await AiDomain.photosSince())?.toISOString() ?? null, String(value)).toBe(expected);
		}
	});

	it('the switch-on migration sets an unset cutoff to the time it runs, once; a set one never moves', async () => {
		const switchOn = readFileSync(
			new URL(
				'../../prisma/schemas/migrations/20261019110000_task_40_11_ai_switch_on/migration.sql',
				import.meta.url
			),
			'utf8'
		);
		const stored = async () =>
			(
				await prisma.$queryRaw<{ value: unknown; is_public: boolean }[]>`
					select value, is_public from app.app_config where key = 'ai.photos_since'`
			)[0];
		try {
			await setConfig('ai.photos_since', null);
			expect(await AiDomain.photosSince()).toBeNull();
			await prisma.$executeRawUnsafe(switchOn);
			configStore.invalidate();
			const since = await AiDomain.photosSince();
			expect(Math.abs(since!.getTime() - Date.now())).toBeLessThan(60_000);
			const first = await stored();
			expect(first).toMatchObject({ value: expect.any(String), is_public: false });
			// Applied again (or on a database whose cutoff is set): unchanged.
			await prisma.$executeRawUnsafe(switchOn);
			expect(await stored()).toEqual(first);
			await setConfig('ai.photos_since', SINCE);
			await prisma.$executeRawUnsafe(switchOn);
			expect((await stored())!.value).toBe(SINCE);
		} finally {
			await setConfig('ai.photos_since', SINCE);
		}
	});
});

describe('a new upload', () => {
	it('after the switch-on: photo.process → ai.extract → photo.embed send the image once to each adapter', async () => {
		const { calls, extract, embed } = spies();
		const body = await jpeg();
		const row = await photo({ body, status: 'uploaded', clean: false });
		await adapters.storage.put(uploadRef(row), body, 'image/jpeg');
		await PhotosDomain.processPhoto({ photo_id: row.id }, systemCtx());
		await drain(runJob);
		expect(extract.mock.calls.filter(([image]) => image.sha256 === row.sha256)).toHaveLength(1);
		expect(embed.mock.calls.filter(([images]) => images[0]!.sha256 === row.sha256)).toHaveLength(1);
		expect(calls(row.sha256)).toBe(2);
	});

	it('a row from before the switch-on (upload begun before, completed after): accepted, nothing sent', async () => {
		const { calls } = spies();
		const body = await jpeg();
		const row = await photo({ body, status: 'uploaded', created_at: OLD, clean: false });
		await adapters.storage.put(uploadRef(row), body, 'image/jpeg');
		await PhotosDomain.processPhoto({ photo_id: row.id }, systemCtx());
		await drain(runJob);
		expect(await prisma.photos.findUnique({ where: { id: row.id } })).toMatchObject({ status: 'accepted' });
		expect(calls(row.sha256)).toBe(0);
		await untouched(row.id);
		expect(await prisma.ai_results.findUnique({ where: { sha256: row.sha256 } })).toBeNull();
	});
});

describe('a report edit (TASK-114.32)', () => {
	it('photo_ids and a matching field on a report with an older photo: photo.publish and match.report run, nothing sent', async () => {
		const { calls } = spies();
		const report = await newReport();
		const old = await photo({ status: 'accepted', created_at: OLD });
		await ReportsDomain.updateReport(
			{ code: report.short_code, photo_ids: [old.id], colours: ['black'] },
			userCtx(owner)
		);
		await drain(runJob);
		// The edit's jobs ran: the old photo is public on the report.
		expect(await prisma.photos.findUnique({ where: { id: old.id } })).toMatchObject({
			report_id: report.id,
			status: 'published',
		});
		expect(calls(old.sha256)).toBe(0);
		await untouched(old.id);
	});
});

describe('the backfill and seeder 41', () => {
	it('pages only photos created after the switch-on; photo.embed of an older one neither calls nor copies', async () => {
		const { calls } = spies();
		const report = await newReport();
		// Adjacent ids, so both fall in the page that starts after `after`.
		const prefix = randomUUID().slice(0, 35);
		const body = await jpeg();
		const fresh = await photo({ id: `${prefix}2`, report_id: report.id, body });
		// The same image, an older photo of another owner: a vector to copy and a clean result exist for it.
		const old = await photo({
			id: `${prefix}1`,
			report_id: report.id,
			body,
			owner_id: other.user_id,
			created_at: OLD,
		});
		const { ctx, sent } = recording();
		await EmbeddingsDomain.backfill({ after: `${prefix}0` }, ctx);
		const embeds = sent.filter((job) => job.queue === 'photo.embed').map((job) => job.data.photo_id);
		expect(embeds).toContain(fresh.id);
		expect(embeds).not.toContain(old.id);

		await EmbeddingsDomain.embedPhoto({ photo_id: fresh.id }, ctx);
		expect(calls(fresh.sha256)).toBe(1);
		await EmbeddingsDomain.embedPhoto({ photo_id: old.id, last_attempt: true }, ctx);
		expect(calls(fresh.sha256)).toBe(1);
		await untouched(old.id);
	});
});

describe('a retried or resent job', () => {
	it('ai.extract and photo.embed of an older photo, through the queue, on the last attempt or failing: nothing sent', async () => {
		const { calls, extract } = spies();
		const old = await photo({ created_at: OLD });
		await jobs.send('ai.extract', { photo_id: old.id });
		await jobs.send('photo.embed', { photo_id: old.id });
		await drain(runJob);
		// A provider that fails would make a job retry; the check comes first, so the job completes.
		extract.mockRejectedValue(new RateLimitError(429, {}, 'slow', new Headers()));
		await expect(AiDomain.extractPhoto({ photo_id: old.id }, systemCtx())).resolves.toBeUndefined();
		await AiDomain.extractPhoto({ photo_id: old.id, last_attempt: true }, systemCtx());
		await EmbeddingsDomain.embedPhoto({ photo_id: old.id, last_attempt: true }, systemCtx());
		expect(calls(old.sha256)).toBe(0);
		await untouched(old.id);
	});
});

describe('GET /v1/photos/:id/attributes and the public ai.enabled', () => {
	it('a photo from before the switch-on answers unavailable at once (an older presign or row), a new one pending', async () => {
		const view = (id: string) => AiDomain.getPhotoAttributes({ id }, userCtx(owner));
		// Presigned before the switch-on and completed after, or the same image again (upsertByHash keeps the old row).
		for (const status of ['pending', 'uploaded', 'accepted', 'published'] as PHOTO_STATUS[]) {
			const old = await photo({ status, created_at: OLD, clean: false });
			expect(await view(old.id), status).toEqual({ status: 'unavailable' });
		}
		const fresh = await photo({ status: 'uploaded', clean: false });
		expect(await view(fresh.id)).toEqual({ status: 'pending' });
		cutoff(null);
		expect(await view(fresh.id)).toEqual({ status: 'unavailable' });
	});

	it('GET /v1/config/public reports ai.enabled false while there is no valid cutoff, so forms do not poll', async () => {
		const enabled = async () => (await ConfigDomain.getPublicConfig(undefined, systemCtx()))['ai.enabled'];
		expect(await enabled()).toBe(true);
		for (const value of [undefined, null, 'soon']) {
			cutoff(value);
			expect(await enabled(), String(value)).toBe(false);
			vi.restoreAllMocks();
		}
	});
});

describe('a missing or invalid ai.photos_since fails closed', () => {
	it.each([undefined, null, 'soon', '1970-01-01T00:00:00Z'])(
		'%s: a new photo is neither extracted nor embedded; the backfill and seeder 41 queue nothing',
		async (value) => {
			const { calls } = spies();
			const report = await newReport();
			const fresh = await photo({ report_id: report.id });
			cutoff(value);
			const { ctx, sent, msgs } = recording();
			await AiDomain.extractPhoto({ photo_id: fresh.id }, ctx);
			await EmbeddingsDomain.embedPhoto({ photo_id: fresh.id }, ctx);
			await EmbeddingsDomain.backfill({}, ctx);
			expect(await EmbeddingsDomain.queueBackfill(ctx)).toBe(false);
			expect(sent).toEqual([]);
			expect(msgs()).toEqual(
				expect.arrayContaining(['ai.extract.cutoff', 'photo.embed.cutoff', 'embedding.backfill.cutoff'])
			);
			expect(calls(fresh.sha256)).toBe(0);
			await untouched(fresh.id);
		}
	);
});
