// enqueueNotification stub (C10, TASK-6.3): sends notify.send, inside the caller's transaction when ctx.tx is set.
import { randomUUID } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import { NotificationsDomain } from '../../domains/notifications/index.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { startJobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';

beforeAll(() => startJobs(), 30_000);

const queued = (dedupe_key: string) =>
	prisma.$queryRaw<{ name: string; data: object }[]>`
		select name, data from pgboss.job where data->>'dedupe_key' = ${dedupe_key}`;

describe('NotificationsDomain.enqueueNotification', () => {
	it('sends notify.send with the input as payload', async () => {
		const input = {
			user_id: randomUUID(),
			type: 'match_found',
			payload: { report_code: 'AB12' },
			dedupe_key: randomUUID(),
		};
		await NotificationsDomain.enqueueNotification(input, systemCtx());
		expect(await queued(input.dedupe_key)).toEqual([{ name: 'notify.send', data: input }]);
		await prisma.$executeRaw`delete from pgboss.job where data->>'dedupe_key' = ${input.dedupe_key}`;
	});

	it('rolls back with the caller transaction', async () => {
		const dedupe_key = randomUUID();
		await expect(
			prisma.$transaction(async (tx) => {
				const input = { user_id: randomUUID(), type: 'match_found', payload: {}, dedupe_key };
				await NotificationsDomain.enqueueNotification(input, systemCtx({ tx }));
				throw new Error('rollback');
			})
		).rejects.toThrow('rollback');
		expect(await queued(dedupe_key)).toEqual([]);
	});
});
