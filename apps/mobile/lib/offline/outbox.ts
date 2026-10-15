import * as SecureStore from 'expo-secure-store';

import { getDb } from '@/lib/db';

// Outbox (C17, TASK-86): submitReport, send and useOutbox land here.

/** Secure-store key (default options) of the manage token for a report sent from this device. */
export const manageTokenKey = (reportId: string): string => `manage_token.${reportId}`;

/** Secure-store key of the JSON array of report ids that have a manage token: the wipe needs it for tokens without an outbox row (claimed links). */
export const MANAGE_TOKENS_INDEX = 'manage_tokens';

export async function listManageTokenIds(): Promise<string[]> {
	try {
		const ids: unknown = JSON.parse((await SecureStore.getItemAsync(MANAGE_TOKENS_INDEX)) ?? '[]');
		return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
	} catch {
		return []; // a corrupt index names nothing
	}
}

/** The one way a manage token is saved (C7, C17): the token, then its id in the index. */
export async function saveManageToken(reportId: string, token: string): Promise<void> {
	await SecureStore.setItemAsync(manageTokenKey(reportId), token);
	const ids = await listManageTokenIds();
	if (!ids.includes(reportId))
		await SecureStore.setItemAsync(MANAGE_TOKENS_INDEX, JSON.stringify([...ids, reportId]));
}

/** Items not sent yet (queued, sending, failed, needs action); asked about before sign-out. */
export async function pendingCount(): Promise<number> {
	const db = await getDb();
	const row = await db.getFirstAsync<{ n: number }>(`select count(*) as n from outbox where status != 'sent'`);
	return row?.n ?? 0;
}
