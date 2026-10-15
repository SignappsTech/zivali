// AuditDao.write (inside and outside a transaction) and the platform purge (C1 retention: 48 h / 24 h).
import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { AuditDao, PlatformDao } from '../../domains/platform/index.ts';
import { prisma } from '../../prisma/prisma.ts';

const target = randomUUID();
const prefix = `test.${randomUUID()}`;

afterAll(async () => {
	await prisma.audit_log.deleteMany({ where: { target_id: target } });
	await prisma.rate_limits.deleteMany({ where: { name: { startsWith: prefix } } });
});

describe('AuditDao.write', () => {
	it('records who, what, target and the note', async () => {
		const actor = randomUUID();
		await AuditDao.write(undefined, {
			actor_id: actor,
			action: 'user.role.set',
			target_type: 'profile',
			target_id: target,
			diff: { role: { from: 'USER', to: 'MODERATOR' } },
			note: 'promoted after onboarding',
		});
		const row = await prisma.audit_log.findFirst({ where: { target_id: target, action: 'user.role.set' } });
		expect(row).toMatchObject({
			actor_id: actor,
			target_type: 'profile',
			diff: { role: { from: 'USER', to: 'MODERATOR' }, note: 'promoted after onboarding' },
		});
	});

	it('writes inside the caller transaction (rolled back with it)', async () => {
		await expect(
			prisma.$transaction(async (tx) => {
				await AuditDao.write(tx, {
					actor_id: null,
					action: 'report.hide',
					target_type: 'report',
					target_id: target,
				});
				throw new Error('rollback');
			})
		).rejects.toThrow('rollback');
		expect(await prisma.audit_log.count({ where: { target_id: target, action: 'report.hide' } })).toBe(0);
	});
});

describe('PlatformDao.purgeExpired', () => {
	it('drops rate-limit windows after 48 h and idempotency keys after 24 h, keeps fresh rows', async () => {
		const now = new Date();
		const ago = (hours: number) => new Date(now.getTime() - hours * 3600_000);
		const [oldKey, freshKey] = [randomUUID(), randomUUID()];
		await prisma.rate_limits.createMany({
			data: [
				{ name: `${prefix}.old`, key: 'k', window_start: ago(49), count: 1 },
				{ name: `${prefix}.fresh`, key: 'k', window_start: ago(47), count: 1 },
			],
		});
		await prisma.idempotency_keys.createMany({
			data: [
				{ key: oldKey, user_id: randomUUID(), route: 'POST /x', created_at: ago(25) },
				{ key: freshKey, user_id: randomUUID(), route: 'POST /x', created_at: ago(23) },
			],
		});
		await PlatformDao.purgeExpired(now);
		expect(
			(await prisma.rate_limits.findMany({ where: { name: { startsWith: prefix } } })).map((r) => r.name)
		).toEqual([`${prefix}.fresh`]);
		const left = await prisma.idempotency_keys.findMany({ where: { key: { in: [oldKey, freshKey] } } });
		expect(left.map((row) => row.key)).toEqual([freshKey]);
		await prisma.idempotency_keys.deleteMany({ where: { key: freshKey } });
	});
});
