import { describe, expect, it } from 'vitest';

import { prisma } from '../../prisma/prisma.ts';
import { ensureScratchDb, isScratchUrl, scratchName } from './scratch-db';

const local = (db: string) => `postgresql://postgres:postgres@127.0.0.1:55322/${db}?schema=app`;

describe('scratch database guard (TASK-114.36)', () => {
	it('accepts task_<id> on a local server only', () => {
		expect(scratchName(local('task_114_36'))).toBe('task_114_36');
		expect(scratchName('postgresql://postgres:x@localhost:5432/task_qa_9_5')).toBe('task_qa_9_5');
		for (const url of [
			local('postgres'),
			local('postgres_test'),
			local('template1'),
			local('Task_1'),
			local('task_'),
			local('task_1%22;drop%20database%20postgres;--'),
			'postgresql://postgres:x@db.example.com:5432/task_1?schema=app',
		])
			expect(() => scratchName(url), url).toThrow(/Refusing/);
	});

	it('refuses before connecting', async () => {
		await expect(ensureScratchDb(local('postgres'))).rejects.toThrow(/Refusing database "postgres"/);
	});

	it('marks only task_* URLs for global-setup', () => {
		expect(isScratchUrl(local('task_1'))).toBe(true);
		expect(isScratchUrl(local('postgres'))).toBe(false);
		expect(isScratchUrl(local('postgres_test'))).toBe(false);
	});

	it.runIf(isScratchUrl(process.env.DATABASE_URL ?? local('postgres')))(
		'gives the test database the auth schema and a realtime.send that accepts a broadcast',
		async () => {
			expect(await ensureScratchDb(process.env.DATABASE_URL!)).toEqual([]);
			const [row] = await prisma.$queryRaw<
				{ users: boolean }[]
			>`select to_regclass('auth.users') is not null as users`;
			expect(row!.users).toBe(true);
			await prisma.$executeRaw`select realtime.send('{"probe":true}'::jsonb, 'probe', 'user:x', true)`;
		}
	);
});
