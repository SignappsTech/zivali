// `pnpm --filter api jobs:send <queue> '<json>'`: sends one job by hand, e.g. the embedding backfill of a model change
// (C20 §Jobs): jobs:send embedding.backfill '{"model":"…"}'. The worker runs it; its handler validates the data.
import { jobs, QUEUES, stopJobs, type QueueName } from '../lib/jobs.ts';
import { logger } from '../lib/logger.ts';
import { prisma } from '../prisma/prisma.ts';

const [queue = '', json = '{}'] = process.argv.slice(2);
const data: unknown = JSON.parse(json);
if (!QUEUES.includes(queue as QueueName) || !data || typeof data !== 'object' || Array.isArray(data)) {
	throw new Error(`usage: jobs:send <queue> '<json object>'; queues: ${QUEUES.join(', ')}`);
}
const id = await jobs.send(queue as QueueName, data);
logger.info({ queue, job_id: id }, 'job sent');
await stopJobs();
await prisma.$disconnect();
