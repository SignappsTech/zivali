// Admin console (C3, C1, ADR-018). The routes guard role and aal2; every call here writes an audit entry (C1), with
// the staff member from ctx.actor (null = system, e.g. `pnpm admin:create`).
import type { AdminUserQuery, AuditLogQuery, SetRoleInput, UserRole } from '@zivali/types';

import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { AuditDao } from '../platform/index.ts';
import AdminDao from './admin.dao.ts';

const PAGE = 50;
const FAILED_JOBS = 50;

const actorId = (ctx: Ctx) => ctx.actor?.user_id ?? null;

/** One page plus whether there is a next one: fetch one row more than asked. */
function pageOf<T extends { id: string }>(rows: T[], limit: number) {
	const items = rows.slice(0, limit);
	return { items, next_cursor: rows.length > limit ? items[items.length - 1]!.id : null };
}

export async function listUsers(input: AdminUserQuery, ctx: Ctx) {
	const limit = input.limit ?? PAGE;
	const rows = await AdminDao.listUsers(
		{ query: input.query || undefined, cursor: input.cursor, take: limit + 1 },
		ctx.tx
	);
	// The search text may be an email: it is not stored in the audit entry.
	await AuditDao.write(ctx.tx, { actor_id: actorId(ctx), action: 'admin.users.list', target_type: 'profile' });
	return pageOf(rows, limit);
}

/**
 * Sets a profile's role (destructive: the note is required by the schema and kept in the audit entry). The last
 * admin cannot be demoted: the ADMIN rows stay locked until the change commits. The caller drops the cached role
 * (invalidateProfile) so it takes effect on the next request.
 */
export async function setUserRole(
	input: SetRoleInput & { id: string },
	ctx: Ctx
): Promise<{ id: string; role: UserRole }> {
	const { id, role, note } = input;
	const run = async (tx: Prisma.TransactionClient) => {
		const admins = await AdminDao.lockAdminIds(tx);
		const from = await AdminDao.getRole(id, tx);
		if (!from) throw new AppError('NOT_FOUND', 'User not found');
		if (from === 'ADMIN' && role !== 'ADMIN' && admins.length <= 1)
			throw new AppError('CONFLICT', 'The last admin cannot be demoted');
		await AdminDao.setRole(id, role, tx);
		await AuditDao.write(tx, {
			actor_id: actorId(ctx),
			action: 'user.role.set',
			target_type: 'profile',
			target_id: id,
			diff: { from, to: role },
			note,
		});
		return { id, role };
	};
	return ctx.tx ? run(ctx.tx) : prisma.$transaction(run);
}

export async function listAuditLog(input: AuditLogQuery, ctx: Ctx) {
	const { cursor, limit = PAGE, ...filters } = input;
	const rows = await AdminDao.listAuditLog({ ...filters, cursor, take: limit + 1 }, ctx.tx);
	await AuditDao.write(ctx.tx, {
		actor_id: actorId(ctx),
		action: 'admin.audit_log.list',
		target_type: 'audit_log',
		diff: { filters },
	});
	return pageOf(rows, limit);
}

export async function getQueues(_input: void, ctx: Ctx) {
	const state = await AdminDao.getQueueState(FAILED_JOBS, ctx.tx);
	await AuditDao.write(ctx.tx, { actor_id: actorId(ctx), action: 'admin.queues.view', target_type: 'queue' });
	return state;
}

export default { listUsers, setUserRole, listAuditLog, getQueues };
