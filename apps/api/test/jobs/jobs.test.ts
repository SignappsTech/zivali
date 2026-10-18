// pg-boss (ADR-022) against the local database: the registry, send (also inside a Prisma transaction), drain to
// completion, retry with backoff to the failed state, idempotent schedules and the retention handler.
import { randomUUID } from 'node:crypto';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { handlers, runJob, type JobCtx } from '../../jobs/index.ts';
import { systemCtx } from '../../lib/ctx.ts';
import {
	createSchedules,
	drain,
	jobs,
	QUEUES,
	SCHEDULE_TZ,
	SCHEDULES,
	startJobs,
	work,
	type QueueName,
} from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';

type JobRow = {
	name: string;
	state: string;
	retry_count: number;
	retry_limit: number;
	retry_delay: number;
	retry_backoff: boolean;
};

const jobRow = async (id: string) =>
	(
		await prisma.$queryRaw<JobRow[]>`
			select name, state::text as state, retry_count, retry_limit, retry_delay, retry_backoff
			from pgboss.job where id = ${id}::uuid`
	)[0];

const countMarked = async (marker: string) =>
	(
		await prisma.$queryRaw<{ count: number }[]>`
			select count(*)::int as count from pgboss.job where data->>'marker' = ${marker}`
	)[0].count;

// Many round trips per test (and installing schema pgboss on a fresh database): the 5 s default is too tight while
// `pnpm verify` builds the apps in parallel.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });
beforeAll(() => startJobs());

describe('queue registry', () => {
	it('has a handler for every C1 queue, in C1 order', () => {
		expect(Object.keys(handlers)).toEqual([...QUEUES]);
	});
});

describe('send → handler → completion', () => {
	it('runs one job per queue through its registered handler and completes it', async () => {
		const marker = randomUUID();
		const ids = new Map<string, QueueName>();
		for (const queue of QUEUES) {
			const id = await jobs.send(queue, { marker });
			expect(id).toBeTruthy();
			ids.set(id!, queue);
		}
		const seen: string[] = [];
		await drain(async (queue, job) => {
			if (ids.has(job.id)) seen.push(queue);
			await runJob(queue, job);
		});
		expect(seen.sort()).toEqual([...QUEUES].sort());
		for (const [id, queue] of ids) expect(await jobRow(id)).toMatchObject({ name: queue, state: 'completed' });
	});
});

describe('failure → retry → failed', () => {
	it('retries 5 times with backoff, then leaves the job in the failed state', async () => {
		const id = (await jobs.send('match.report', { marker: randomUUID() }))!;
		expect(await jobRow(id)).toMatchObject({ retry_limit: 5, retry_backoff: true });
		let attempts = 0;
		await drain(async (queue, job) => {
			if (job.id !== id) return runJob(queue, job);
			attempts++;
			throw new Error('boom');
		});
		expect(attempts).toBe(6);
		expect(await jobRow(id)).toMatchObject({ state: 'failed', retry_count: 5 });
	});

	it('retries ai.extract twice, 2 s apart without backoff, then fails it (C19)', async () => {
		const id = (await jobs.send('ai.extract', { marker: randomUUID() }))!;
		expect(await jobRow(id)).toMatchObject({ retry_limit: 2, retry_delay: 2, retry_backoff: false });
		let attempts = 0;
		await drain(async (queue, job) => {
			if (job.id !== id) return runJob(queue, job);
			attempts++;
			throw new Error('boom');
		});
		expect(attempts).toBe(3);
		expect(await jobRow(id)).toMatchObject({ state: 'failed', retry_count: 2 });
	});
});

describe('worker', () => {
	it('polls ai.extract with 4 local workers, photo.embed and every other queue with 1', async () => {
		const boss = await startJobs();
		const spy = vi.spyOn(boss, 'work').mockResolvedValue('');
		try {
			await work(async () => {});
			const options = Object.fromEntries(spy.mock.calls.map(([queue, opts]) => [queue, opts]));
			expect(Object.keys(options)).toEqual([...QUEUES]);
			expect(options['ai.extract']).toEqual({ localConcurrency: 4 });
			expect(options['photo.embed']).toEqual({ localConcurrency: 1 });
			expect(options['match.report']).toEqual({ localConcurrency: 1 });
		} finally {
			spy.mockRestore();
		}
	});
});

describe('send inside a Prisma transaction', () => {
	it('keeps the job only when the transaction commits', async () => {
		const rolledBack = randomUUID();
		await expect(
			prisma.$transaction(async (tx) => {
				await jobs.send('db.keepalive', { marker: rolledBack }, { tx });
				throw new Error('rollback');
			})
		).rejects.toThrow('rollback');
		expect(await countMarked(rolledBack)).toBe(0);

		const committed = randomUUID();
		await prisma.$transaction(async (tx) => {
			await jobs.send('db.keepalive', { marker: committed }, { tx });
		});
		expect(await countMarked(committed)).toBe(1);
		await drain(runJob);
	});
});

describe('schedules', () => {
	it('are created idempotently, one per scheduled queue, in Europe/Ljubljana', async () => {
		await createSchedules();
		await createSchedules();
		const rows = await prisma.$queryRaw<{ name: string; cron: string; timezone: string }[]>`
			select name, cron, timezone from pgboss.schedule order by name`;
		expect(rows).toEqual(
			Object.entries(SCHEDULES)
				.map(([name, cron]) => ({ name, cron, timezone: SCHEDULE_TZ }))
				.sort((a, b) => a.name.localeCompare(b.name))
		);
	});
});

describe('retention.purge', () => {
	it('purges rate-limit windows after 48 h and idempotency keys after 24 h (PlatformDao.purgeExpired)', async () => {
		const name = `test.${randomUUID()}`;
		const now = new Date();
		const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600_000);
		await prisma.rate_limits.createMany({
			data: [
				{ name, key: 'old', window_start: hoursAgo(49) },
				{ name, key: 'fresh', window_start: hoursAgo(1) },
			],
		});
		const [oldKey, freshKey] = [randomUUID(), randomUUID()];
		await prisma.idempotency_keys.createMany({
			data: [
				{ key: oldKey, user_id: randomUUID(), route: 'POST /v1/test', created_at: hoursAgo(25) },
				{ key: freshKey, user_id: randomUUID(), route: 'POST /v1/test', created_at: hoursAgo(1) },
			],
		});
		const ctx: JobCtx = { ...systemCtx({ now }), prisma, send: jobs.send };
		await handlers['retention.purge']({}, ctx);
		const limits = await prisma.rate_limits.findMany({ where: { name }, select: { key: true } });
		expect(limits).toEqual([{ key: 'fresh' }]);
		const keys = await prisma.idempotency_keys.findMany({ where: { key: { in: [oldKey, freshKey] } } });
		expect(keys.map((row) => row.key)).toEqual([freshKey]);
		await prisma.rate_limits.deleteMany({ where: { name } });
		await prisma.idempotency_keys.deleteMany({ where: { key: freshKey } });
	});
});
