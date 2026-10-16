// pg-boss (ADR-022) in schema pgboss of the app database: the producer behind ctx.jobs, the worker loop, the cron
// schedules and drain() for tests and `pnpm jobs:drain`. Handlers live in jobs/<queue>.job.ts, registered in
// jobs/index.ts.
import { fromPrisma, PgBoss, type Job, type SendOptions as BossSendOptions } from 'pg-boss';

import type { Prisma } from '../prisma/prisma.ts';
import { config } from './config.ts';
import { logger } from './logger.ts';
import { lockDownPgboss } from './pgboss-lockdown.ts';

/** Every queue, in C1 order; jobs/index.ts registers one handler per queue. */
export const QUEUES = [
	'match.report',
	'notify.send',
	'alerts.fanout',
	'photo.process',
	'photo.publish',
	'report.lifecycle',
	'retention.purge',
	'retention.blur_location',
	'partners.stats',
	'payment.effects',
	'fiscal.resubmit',
	'directory.reminder',
	'db.keepalive',
	'db.backup',
] as const;
export type QueueName = (typeof QUEUES)[number];

/** Cron schedules in Europe/Ljubljana, created (idempotently, keyed by queue) when the worker starts. */
export const SCHEDULES: Partial<Record<QueueName, string>> = {
	'report.lifecycle': '0 * * * *',
	'retention.purge': '30 3 * * *',
	'retention.blur_location': '45 3 * * *',
	'partners.stats': '15 * * * *',
	// FAILED and stale PENDING fiscal invoices again, well inside the FURS deadline of 2 working days (TASK-92.3).
	'fiscal.resubmit': '25 * * * *',
	// After 31 March: the yearly directory refresh (C18).
	'directory.reminder': '0 8 1 4 *',
	// Supabase Free pauses a project without database activity.
	'db.keepalive': '0 */6 * * *',
	'db.backup': '0 2 * * *',
};
export const SCHEDULE_TZ = 'Europe/Ljubljana';

// Queue defaults, inherited by every job sent or scheduled: 5 retries with exponential backoff, then failed.
const RETRY = { retryLimit: 5, retryBackoff: true };

/** pg-boss send options; `tx` sends inside that Prisma transaction, so the job exists only if the write commits. */
export type SendOptions = Omit<BossSendOptions, 'db'> & { tx?: Prisma.TransactionClient };
export type Jobs = {
	send(queue: QueueName, data: object, options?: SendOptions): Promise<string | null>;
};
export type Runner = (queue: QueueName, job: Job<object>) => Promise<void>;

let started: Promise<PgBoss> | undefined;

/**
 * Starts pg-boss once per process: installs or migrates schema pgboss, creates the queues, then enables RLS on the
 * tables that created (CH-106). Rejects when any step fails; the caller must refuse to run. Only the worker runs
 * maintenance and the cron pass; the API just produces.
 */
export function startJobs(role: 'api' | 'worker' = 'api'): Promise<PgBoss> {
	started ??= (async () => {
		const worker = role === 'worker';
		const boss = new PgBoss({
			connectionString: config.DATABASE_URL,
			schema: 'pgboss',
			max: 3,
			application_name: `zivali-${role}`,
			supervise: worker,
			schedule: worker,
			// Stays off: the supervisor would create daily queue_stats partitions after start, outside the lockdown.
			persistQueueStats: false,
		});
		boss.on('error', (err) => logger.error({ err }, 'pg-boss error'));
		await boss.start();
		for (const queue of QUEUES) await boss.createQueue(queue, RETRY);
		await lockDownPgboss();
		return boss;
	})();
	return started;
}

export async function stopJobs(): Promise<void> {
	const boss = await started?.catch(() => undefined);
	started = undefined;
	await boss?.stop();
}

export const jobs: Jobs = {
	async send(queue, data, { tx, ...options } = {}) {
		const boss = await startJobs();
		return boss.send(queue, data, tx ? { ...options, db: fromPrisma(tx) } : options);
	},
};

export async function createSchedules(): Promise<void> {
	const boss = await startJobs('worker');
	for (const [queue, cron] of Object.entries(SCHEDULES)) await boss.schedule(queue, cron, null, { tz: SCHEDULE_TZ });
}

/** The worker: schedules, then one pg-boss poller per queue; a throw fails the attempt and pg-boss retries it. */
export async function work(run: Runner): Promise<void> {
	const boss = await startJobs('worker');
	await createSchedules();
	for (const queue of QUEUES) await boss.work<object>(queue, async ([job]) => run(queue, job));
}

/**
 * Runs every queued job, retries and deferred ones included, until all queues are empty (tests and
 * `pnpm jobs:drain`). Returns the number of attempts.
 */
export async function drain(run: Runner): Promise<number> {
	const boss = await startJobs();
	let attempts = 0;
	for (;;) {
		// One query for the queues with work, instead of a fetch per queue on every pass.
		const { rows } = await boss
			.getDb()
			.executeSql(
				`select distinct name from pgboss.job where state < 'active' and not blocked and name = any($1)`,
				[QUEUES]
			);
		let fetched = 0;
		for (const { name: queue } of rows as { name: QueueName }[]) {
			const batch = await boss.fetch<object>(queue, { batchSize: 100, ignoreStartAfter: true });
			fetched += batch.length;
			for (const job of batch) {
				attempts++;
				try {
					await run(queue, job);
					await boss.complete(queue, job.id);
				} catch (err) {
					// Settled like pg-boss's own worker: retry with backoff, failed after the last attempt.
					await boss.fail(queue, job.id, { message: err instanceof Error ? err.message : String(err) });
				}
			}
		}
		if (!fetched) return attempts;
	}
}
