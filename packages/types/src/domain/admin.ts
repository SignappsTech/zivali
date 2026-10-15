// Admin console (TASK-34.2): audit log and job queue views (admins, aal2). Users and roles are in me.ts (C3).
import type { IsoDateTime, Page, Uuid } from './common.ts';

/** One audit_log row (C1). actor_id is null for system actions (jobs, scripts); diff.note holds the staff note. */
export type AuditLogEntry = {
	id: Uuid;
	actor_id: Uuid | null;
	action: string;
	target_type: string;
	target_id: string | null;
	diff: Record<string, unknown> | null;
	created_at: IsoDateTime;
};
/** Exact-match filters; `cursor` is the last item's id. */
export type AuditLogQuery = {
	actor_id?: Uuid;
	action?: string;
	target_type?: string;
	target_id?: string;
	cursor?: Uuid;
	limit?: number;
};
export type AuditLogList = Page<AuditLogEntry>;

/** Jobs per state in one pg-boss queue. */
export type QueueCounts = {
	name: string;
	created: number;
	retry: number;
	active: number;
	completed: number;
	cancelled: number;
	failed: number;
};
/** A job in the failed state: no payload (it may hold personal data), only the error message. */
export type FailedJob = {
	id: Uuid;
	queue: string;
	error: string | null;
	retry_count: number;
	created_at: IsoDateTime;
	failed_at: IsoDateTime | null;
};
/** `available` is false while pg-boss has not created its tables yet. */
export type AdminQueues = { available: boolean; queues: QueueCounts[]; failed_jobs: FailedJob[] };
