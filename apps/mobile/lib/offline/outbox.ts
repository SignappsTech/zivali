import { getDb } from '@/lib/db';

// Outbox (C17, TASK-86): submitReport, send and useOutbox land here.

/** Secure-store key (default options) of the manage token for a report sent from this device. */
export const manageTokenKey = (reportId: string): string => `manage_token.${reportId}`;

/** Items not sent yet (queued, sending, failed, needs action); asked about before sign-out. */
export async function pendingCount(): Promise<number> {
	const db = await getDb();
	const row = await db.getFirstAsync<{ n: number }>(`select count(*) as n from outbox where status != 'sent'`);
	return row?.n ?? 0;
}
