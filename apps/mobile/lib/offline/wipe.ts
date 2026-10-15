import * as SecureStore from 'expo-secure-store';

import { getDb } from '@/lib/db';
import { draftsDir, outboxDir, thumbsDir } from '@/lib/db/files';
import { stopGeofencing } from '@/lib/offline/geofence';
import { manageTokenKey, pendingCount } from '@/lib/offline/outbox';
import { supabase } from '@/lib/supabase';

export type WipeReason = 'sign_out' | 'account_deleted' | 'user_request';

/**
 * C17 §Wipe: the public cache, areas, drafts, geofences and their files go. The outbox (the user's own unsent
 * reports, resolved by the caller first) and the manage tokens of sent ones go only with the account.
 */
export async function wipeLocalData({ reason }: { reason: WipeReason }): Promise<void> {
	await stopGeofencing();
	const db = await getDb();
	const tables = ['reports_cache', 'cache_areas', 'drafts', 'geofences', 'geofence_events'];
	const dirs = [thumbsDir, draftsDir];
	if (reason === 'account_deleted') {
		const sent = await db.getAllAsync<{ result: string }>('select result from outbox where result is not null');
		for (const { result } of sent) await SecureStore.deleteItemAsync(manageTokenKey(JSON.parse(result).report_id));
		tables.push('outbox_photos', 'outbox');
		dirs.push(outboxDir);
	}
	await db.withTransactionAsync(() => db.execAsync(tables.map((table) => `delete from ${table};`).join('\n')));
	for (const dir of dirs) if (dir.exists) dir.delete();
}

/**
 * Sign-out with the wipe. With unsent outbox items, `resolvePending(count)` first shows "Send now / Delete / Cancel",
 * does it, and resolves false on Cancel; then nothing happens and this resolves false.
 */
export async function signOutAndWipe({
	resolvePending,
}: {
	resolvePending: (count: number) => Promise<boolean>;
}): Promise<boolean> {
	const count = await pendingCount();
	if (count > 0 && !(await resolvePending(count))) return false;
	const { error } = await supabase.auth.signOut();
	// Offline the server call fails and keeps the session; forget it on this device anyway.
	if (error) await supabase.auth.signOut({ scope: 'local' });
	await wipeLocalData({ reason: 'sign_out' });
	return true;
}
