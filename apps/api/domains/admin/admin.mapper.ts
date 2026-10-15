// Admin DTOs: masked emails and no phone for users (C3); failed jobs without their payload (it may hold personal data).
import type { z } from 'zod';

import { AdminQueues, AdminUser, AuditLogEntry } from '@zivali/validation';

import type { audit_log } from '../../generated/client.ts';
import type { AdminUserRow, FailedJobRow, QueueRow } from './admin.dao.ts';

const ERROR_MAX = 500;

/** `ana@example.si` → `a***@example.si`. */
export function maskEmail(email: string | null): string | null {
	if (!email) return null;
	const at = email.lastIndexOf('@');
	return at < 1 ? '***' : `${email[0]}***${email.slice(at)}`;
}

export function toAdminUserDto(row: AdminUserRow): z.infer<typeof AdminUser> {
	return AdminUser.parse({ ...row, email_masked: maskEmail(row.email), created_at: row.created_at.toISOString() });
}

export function toAuditLogEntryDto(row: audit_log): z.infer<typeof AuditLogEntry> {
	return AuditLogEntry.parse({ ...row, created_at: row.created_at.toISOString() });
}

/** pg-boss stores a failed job's error as output { message, stack }; only the message goes out. */
function errorMessage(output: unknown): string | null {
	const message = (output as { message?: unknown } | null)?.message;
	return typeof message === 'string' ? message.slice(0, ERROR_MAX) : null;
}

export function toAdminQueuesDto(
	state: { queues: QueueRow[]; failed: FailedJobRow[] } | null
): z.infer<typeof AdminQueues> {
	return AdminQueues.parse({
		available: state !== null,
		queues: state?.queues ?? [],
		failed_jobs: (state?.failed ?? []).map((job) => ({
			id: job.id,
			queue: job.name,
			error: errorMessage(job.output),
			retry_count: job.retry_count,
			created_at: job.created_on.toISOString(),
			failed_at: job.completed_on?.toISOString() ?? null,
		})),
	});
}

export default { maskEmail, toAdminUserDto, toAuditLogEntryDto, toAdminQueuesDto };
