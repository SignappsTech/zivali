// Queue registry (ADR-022): one handler per queue in jobs/<queue>.job.ts. Feature tasks replace their queue's stub
// file; a new queue needs its name in QUEUES (lib/jobs.ts) and a line here.
import type { Job } from 'pg-boss';

import { systemCtx, type Ctx } from '../lib/ctx.ts';
import { jobs, type Jobs, type QueueName } from '../lib/jobs.ts';
import { logger } from '../lib/logger.ts';
import { prisma } from '../prisma/prisma.ts';
import * as alertsFanout from './alerts.fanout.job.ts';
import * as dbBackup from './db.backup.job.ts';
import * as dbKeepalive from './db.keepalive.job.ts';
import * as directoryReminder from './directory.reminder.job.ts';
import * as matchReport from './match.report.job.ts';
import * as notifySend from './notify.send.job.ts';
import * as partnersStats from './partners.stats.job.ts';
import * as paymentEffects from './payment.effects.job.ts';
import * as photoProcess from './photo.process.job.ts';
import * as photoPublish from './photo.publish.job.ts';
import * as reportLifecycle from './report.lifecycle.job.ts';
import * as retentionPurge from './retention.purge.job.ts';

/** C1 job ctx: a system ctx, so handlers pass it straight to domain functions, plus prisma and send. */
export type JobCtx = Ctx & { prisma: typeof prisma; send: Jobs['send'] };
/** Payloads come from the database: a handler parses `data` before use. */
export type JobHandler = (data: unknown, ctx: JobCtx) => Promise<void>;

export const handlers: Record<QueueName, JobHandler> = {
	'match.report': matchReport.handle,
	'notify.send': notifySend.handle,
	'alerts.fanout': alertsFanout.handle,
	'photo.process': photoProcess.handle,
	'photo.publish': photoPublish.handle,
	'report.lifecycle': reportLifecycle.handle,
	'retention.purge': retentionPurge.handle,
	'partners.stats': partnersStats.handle,
	'payment.effects': paymentEffects.handle,
	'directory.reminder': directoryReminder.handle,
	'db.keepalive': dbKeepalive.handle,
	'db.backup': dbBackup.handle,
};

/** Runs one attempt with a fresh ctx whose logger carries queue and job_id; a throw makes pg-boss retry it. */
export async function runJob(queue: QueueName, job: Job<object>): Promise<void> {
	const ctx: JobCtx = {
		...systemCtx({ logger: logger.child({ queue, job_id: job.id }) }),
		prisma,
		send: jobs.send,
	};
	try {
		await handlers[queue](job.data, ctx);
	} catch (err) {
		ctx.logger.warn({ err, retry_count: job.retryCount }, 'job attempt failed');
		throw err;
	}
}
