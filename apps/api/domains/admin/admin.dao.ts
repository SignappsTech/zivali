// Prisma access for the admin console: users and roles (C3), the audit log (C1) and read-only pg-boss state (ADR-022).
// Lists are keyset-paginated on (created_at desc, id desc); the cursor is the last item's id.
import { Prisma } from '../../generated/client.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

export type AdminUserRow = {
	id: string;
	display_name: string | null;
	role: USER_ROLE;
	is_anonymous: boolean;
	created_at: Date;
	email: string | null;
};

/** `query` matches the display name or the email (case-insensitive substring, LIKE wildcards escaped). */
export async function listUsers(input: { query?: string; cursor?: string; take: number }, tx?: Tx) {
	const db = tx ?? prisma;
	const like = input.query ? `%${input.query.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : undefined;
	return db.$queryRaw<AdminUserRow[]>`
		select p.id::text as id, p.display_name, p.role::text as role, p.is_anonymous, p.created_at, u.email
		from app.profiles p left join auth.users u on u.id = p.id
		where true
		${like ? Prisma.sql`and (p.display_name ilike ${like} or u.email ilike ${like})` : Prisma.empty}
		${
			input.cursor
				? Prisma.sql`and (p.created_at, p.id) < (select created_at, id from app.profiles where id = ${input.cursor}::uuid)`
				: Prisma.empty
		}
		order by p.created_at desc, p.id desc
		limit ${input.take}`;
}

/** Locks every ADMIN row until the transaction ends, so two concurrent demotions cannot remove the last admin. */
export async function lockAdminIds(tx: Tx): Promise<string[]> {
	const rows = await tx.$queryRaw<
		{ id: string }[]
	>`select id::text as id from app.profiles where role = 'ADMIN' for update`;
	return rows.map((row) => row.id);
}

export async function getRole(id: string, tx?: Tx): Promise<USER_ROLE | null> {
	const db = tx ?? prisma;
	const row = await db.profiles.findUnique({ where: { id }, select: { role: true } });
	return row?.role ?? null;
}

export async function setRole(id: string, role: USER_ROLE, tx?: Tx): Promise<void> {
	const db = tx ?? prisma;
	await db.profiles.update({ where: { id }, data: { role }, select: { id: true } });
}

export type AuditLogFilters = { actor_id?: string; action?: string; target_type?: string; target_id?: string };

export async function listAuditLog(input: AuditLogFilters & { cursor?: string; take: number }, tx?: Tx) {
	const db = tx ?? prisma;
	const { cursor, take, ...where } = input;
	return db.audit_log.findMany({
		where,
		orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
		take,
		...(cursor && { cursor: { id: cursor }, skip: 1 }),
	});
}

export type QueueRow = {
	name: string;
	created: number;
	retry: number;
	active: number;
	completed: number;
	cancelled: number;
	failed: number;
};
export type FailedJobRow = {
	id: string;
	name: string;
	retry_count: number;
	created_on: Date;
	completed_on: Date | null;
	output: unknown;
};

/** pg-boss state (TASK-6.3 owns the schema; it is created at runtime). null while its tables do not exist yet. */
export async function getQueueState(failedLimit: number, tx?: Tx) {
	const db = tx ?? prisma;
	const [{ ready }] = await db.$queryRaw<{ ready: boolean }[]>`
		select to_regclass('pgboss.queue') is not null and to_regclass('pgboss.job') is not null as ready`;
	if (!ready) return null;
	const queues = await db.$queryRaw<QueueRow[]>`
		select q.name,
			count(j.id) filter (where j.state = 'created')::int as created,
			count(j.id) filter (where j.state = 'retry')::int as retry,
			count(j.id) filter (where j.state = 'active')::int as active,
			count(j.id) filter (where j.state = 'completed')::int as completed,
			count(j.id) filter (where j.state = 'cancelled')::int as cancelled,
			count(j.id) filter (where j.state = 'failed')::int as failed
		from pgboss.queue q left join pgboss.job j on j.name = q.name
		group by q.name
		order by q.name`;
	const failed = await db.$queryRaw<FailedJobRow[]>`
		select id::text as id, name, retry_count, created_on, completed_on, output
		from pgboss.job
		where state = 'failed'
		order by completed_on desc nulls last, id
		limit ${failedLimit}`;
	return { queues, failed };
}

export default { listUsers, lockAdminIds, getRole, setRole, listAuditLog, getQueueState };
