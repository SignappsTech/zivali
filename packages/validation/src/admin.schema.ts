// Admin console (TASK-34.2): GET /v1/admin/audit-log and GET /v1/admin/queues. Users and roles: me.schema.ts (C3).
import { IsoDateTime, limit, nullOr, page, Uuid } from './common.schema.ts';
import { z } from './zod.ts';

const filter = z.string().trim().min(1).max(100);

export const AuditLogEntry = z
	.object({
		id: Uuid,
		actor_id: Uuid.nullable(),
		action: z.string(),
		target_type: z.string(),
		target_id: z.string().nullable(),
		diff: z.record(z.string(), z.unknown()).nullable(),
		created_at: IsoDateTime,
	})
	.openapi('AuditLogEntry', { description: 'actor_id is null for system actions; diff.note is the staff note.' });
export const AuditLogQuery = z.object({
	actor_id: Uuid.optional(),
	action: filter.optional(),
	target_type: filter.optional(),
	target_id: filter.optional(),
	cursor: Uuid.optional(),
	limit: limit(50),
});
export const AuditLogList = page(AuditLogEntry).openapi('AuditLogList');

export const QueueCounts = z
	.object({
		name: z.string(),
		created: z.number().int(),
		retry: z.number().int(),
		active: z.number().int(),
		completed: z.number().int(),
		cancelled: z.number().int(),
		failed: z.number().int(),
	})
	.openapi('QueueCounts');
export const FailedJob = z
	.object({
		id: Uuid,
		queue: z.string(),
		error: z.string().nullable(),
		retry_count: z.number().int(),
		created_at: IsoDateTime,
		failed_at: nullOr(IsoDateTime),
	})
	.openapi('FailedJob', { description: 'No payload (it may hold personal data), only the error message.' });
export const AdminQueues = z
	.object({ available: z.boolean(), queues: z.array(QueueCounts), failed_jobs: z.array(FailedJob) })
	.openapi('AdminQueues', { description: 'available is false while pg-boss has not created its tables yet.' });
