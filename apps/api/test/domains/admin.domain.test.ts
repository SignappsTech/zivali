// AdminDomain.setUserRole (last admin protected, audited) and the `pnpm admin:create` bootstrap (ADR-018) against the
// local database and Supabase Auth Admin API.
import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { AdminDomain, AdminMapper } from '../../domains/admin/index.ts';
import { config } from '../../lib/config.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { adminApi, adminCreate, isLocalTarget, main, PRODUCTION_FLAG } from '../../scripts/admin-create.ts';
import { createAuthUser, deleteAuthUsers } from '../helpers/token.ts';

const ids: string[] = [];
async function profile(role: 'USER' | 'ADMIN', options?: Parameters<typeof createAuthUser>[0]) {
	const id = await createAuthUser(options);
	ids.push(id);
	await prisma.profiles.create({ data: { id, role } });
	return id;
}

afterAll(async () => {
	await prisma.audit_log.deleteMany({ where: { target_id: { in: ids } } });
	await deleteAuthUsers(ids);
});

/** Runs `fn` in a transaction that is always rolled back, so the shared database keeps its other admins. */
async function inRollback(fn: (ctx: ReturnType<typeof systemCtx>) => Promise<void>) {
	const rollback = new Error('rollback');
	await expect(
		prisma.$transaction(async (tx) => {
			await fn(systemCtx({ tx }));
			throw rollback;
		})
	).rejects.toBe(rollback);
}

describe('AdminDomain.setUserRole', () => {
	it('refuses to demote the last admin (CONFLICT), allows it while another admin remains', async () => {
		const last = await profile('ADMIN');
		const other = await profile('ADMIN');
		await inRollback(async (ctx) => {
			await ctx.tx!.profiles.updateMany({
				where: { role: 'ADMIN', id: { notIn: [last, other] } },
				data: { role: 'USER' },
			});
			await expect(AdminDomain.setUserRole({ id: other, role: 'USER', note: 'n' }, ctx)).resolves.toEqual({
				id: other,
				role: 'USER',
			});
			await expect(
				AdminDomain.setUserRole({ id: last, role: 'MODERATOR', note: 'n' }, ctx)
			).rejects.toMatchObject({
				code: 'CONFLICT',
			});
			// Keeping the role of the last admin is no demotion.
			await expect(AdminDomain.setUserRole({ id: last, role: 'ADMIN', note: 'n' }, ctx)).resolves.toBeTruthy();
		});
	});

	it('writes who, what, target and note to the audit log (actor null for system calls)', async () => {
		const id = await profile('USER');
		await AdminDomain.setUserRole({ id, role: 'MODERATOR', note: 'why' }, systemCtx());
		const entry = await prisma.audit_log.findFirst({ where: { target_id: id } });
		expect(entry).toMatchObject({
			actor_id: null,
			action: 'user.role.set',
			target_type: 'profile',
			diff: { from: 'USER', to: 'MODERATOR', note: 'why' },
		});
	});
});

describe('AdminMapper.maskEmail', () => {
	it('keeps the first character and the domain', () => {
		expect(AdminMapper.maskEmail('ana@example.si')).toBe('a***@example.si');
		expect(AdminMapper.maskEmail('@odd')).toBe('***');
		expect(AdminMapper.maskEmail(null)).toBeNull();
	});
});

// Created through the Admin API: GoTrue lists only its own complete rows, not the bare ones of createAuthUser.
async function listedAuthUser(email_confirm = true) {
	const id = randomUUID();
	await adminApi('/users', 'POST', { id, email: `${id}@test.invalid`, password: randomUUID(), email_confirm });
	ids.push(id);
	return id;
}

describe('pnpm admin:create', () => {
	it('promotes an existing confirmed account to ADMIN through the Auth Admin API, audited', async () => {
		const id = await listedAuthUser();
		await expect(adminCreate(`  ${id.toUpperCase()}@TEST.INVALID `)).resolves.toEqual({ id, role: 'ADMIN' });
		expect(await prisma.profiles.findUnique({ where: { id }, select: { role: true } })).toEqual({ role: 'ADMIN' });
		const entry = await prisma.audit_log.findFirst({ where: { target_id: id } });
		expect(entry).toMatchObject({ actor_id: null, diff: { to: 'ADMIN', note: 'pnpm admin:create' } });
	});

	it('refuses an unknown email and an unconfirmed account', async () => {
		await expect(adminCreate('nobody-here@test.invalid')).rejects.toThrow(/No account/);
		const id = await listedAuthUser(false);
		await expect(adminCreate(`${id}@test.invalid`)).rejects.toThrow(/confirmed email/);
		expect(await prisma.profiles.findUnique({ where: { id } })).toBeNull();
	});

	it('is local only unless the production flag is passed (and then confirmed at an interactive prompt)', async () => {
		const db = 'postgresql://postgres:x@127.0.0.1:55322/postgres?schema=app';
		expect(isLocalTarget({ APP_ENV: 'local', SUPABASE_URL: 'http://127.0.0.1:55321', DATABASE_URL: db })).toBe(
			true
		);
		expect(isLocalTarget({ APP_ENV: 'production', SUPABASE_URL: 'http://127.0.0.1:55321', DATABASE_URL: db })).toBe(
			false
		);
		expect(isLocalTarget({ APP_ENV: 'local', SUPABASE_URL: 'https://x.supabase.co', DATABASE_URL: db })).toBe(
			false
		);

		expect(await main([])).toBe(2);
		expect(await main(['not-an-email'])).toBe(2);
		expect(await main(['a@b.si', '--force'])).toBe(2);

		const saved = config.APP_ENV;
		config.APP_ENV = 'production';
		try {
			const id = await createAuthUser();
			ids.push(id);
			expect(await main([`${id}@test.invalid`])).toBe(1);
			// Tests have no TTY: the confirmation prompt cannot be answered, so the flag alone never promotes.
			expect(await main([`${id}@test.invalid`, PRODUCTION_FLAG])).toBe(1);
			expect(await prisma.profiles.findUnique({ where: { id } })).toBeNull();
		} finally {
			config.APP_ENV = saved;
		}
	});
});
