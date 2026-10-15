// enqueueNotification (C10, TASK-6.3, TASK-6.17): sends notify.send with a typed ids-only payload, inside the caller's
// transaction when ctx.tx is set.
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
			type: 'match_chip' as const,
			payload: { template: 'match_chip' as const, report_id: randomUUID() },
			dedupe_key: randomUUID(),
		};
		await NotificationsDomain.enqueueNotification(input, systemCtx());
		expect(await queued(input.dedupe_key)).toEqual([{ name: 'notify.send', data: input }]);
		await prisma.$executeRaw`delete from pgboss.job where data->>'dedupe_key' = ${input.dedupe_key}`;
	});

	it.each([
		['free-form keys', { template: 'match_chip', report_code: 'AB12' }],
		['personal data', { template: 'match_chip', email: 'a@b.si' }],
		['non-uuid ids', { template: 'match_chip', report_id: 'not-a-uuid' }],
		['unknown template', { template: 'free text' }],
	])('rejects a payload with %s and stores nothing', async (_name, payload) => {
		const dedupe_key = randomUUID();
		const input = { user_id: randomUUID(), type: 'match_chip', payload, dedupe_key };
		await expect(NotificationsDomain.enqueueNotification(input as never, systemCtx())).rejects.toThrow();
		expect(await queued(dedupe_key)).toEqual([]);
	});

	it('rolls back with the caller transaction', async () => {
		const dedupe_key = randomUUID();
		await expect(
			prisma.$transaction(async (tx) => {
				const input = {
					user_id: randomUUID(),
					type: 'match_chip' as const,
					payload: { template: 'match_chip' as const },
					dedupe_key,
				};
				await NotificationsDomain.enqueueNotification(input, systemCtx({ tx }));
				throw new Error('rollback');
			})
		).rejects.toThrow('rollback');
		expect(await queued(dedupe_key)).toEqual([]);
	});
});
