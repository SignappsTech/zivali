import * as SecureStore from 'expo-secure-store';

import { deleteDb, getDb } from '@/lib/db';
import { draftsDir, outboxDir, pickerCacheDir, thumbsDir } from '@/lib/db/files';
import { cacheOwnReports, cacheQuietHours, stopGeofencing } from '@/lib/offline/geofence';
import { MANAGE_TOKENS_INDEX, listManageTokenIds, manageTokenKey, pendingCount } from '@/lib/offline/outbox';
import { syncIdle } from '@/lib/offline/sync';
import { clearSessionStorage, supabase } from '@/lib/supabase';

export type WipeReason = 'sign_out' | 'account_deleted' | 'user_request';

/**
 * C17 §Wipe: the public cache, areas, drafts (not on a user-requested clear), geofences and their files go. The outbox (the user's own unsent
 * reports, resolved by the caller first) and the manage tokens of sent ones go only with the account (the whole database, files, session and keychain entries) or an explicit removeManageLinks.
 */
export async function wipeLocalData({
	reason,
	removeManageLinks = false,
}: {
	reason: WipeReason;
	removeManageLinks?: boolean;
}): Promise<void> {
	await stopGeofencing();
	// The account's quiet hours and own report ids go with it; "Clear offline data" keeps them for the next opt-in.
	if (reason !== 'user_request') {
		cacheQuietHours(null);
		cacheOwnReports(null);
	}
	// A running sync holds a transaction on the same connection; its resumed page then finds the area gone and drops.
	await syncIdle();
	const deleted = reason === 'account_deleted';
	// "Clear offline data" keeps unsent work: drafts (rows and files) stay with the outbox.
	const dirs = [thumbsDir, pickerCacheDir];
	if (reason !== 'user_request') dirs.push(draftsDir);
	let tokenKeys: string[] = [];
	if (deleted) {
		tokenKeys = await sentTokenKeys();
		dirs.push(outboxDir);
		await deleteDb();
	} else {
		const db = await getDb();
		const tables = ['reports_cache', 'cache_areas', 'geofences', 'geofence_events'];
		if (reason !== 'user_request') tables.push('drafts');
		const sql = tables.map((table) => `delete from ${table};`).join(' ');
		if (removeManageLinks) {
			tokenKeys = await sentTokenKeys();
			const sent = `outbox_id in (select id from outbox where status = 'sent')`;
			await db.withTransactionAsync(() =>
				db.execAsync(
					`${sql} delete from outbox_photos where ${sent}; delete from outbox where status = 'sent';`
				)
			);
		} else {
			await db.withTransactionAsync(() => db.execAsync(sql));
		}
	}
	if (removeManageLinks || deleted) {
		// Claimed links have no outbox row: the index names them.
		tokenKeys.push(...(await listManageTokenIds()).map(manageTokenKey), MANAGE_TOKENS_INDEX);
	}
	for (const dir of dirs) if (dir.exists) dir.delete();
	// Best effort: one failing keychain delete must not leave the rest behind.
	await Promise.allSettled([
		...tokenKeys.map((key) => SecureStore.deleteItemAsync(key)),
		...(deleted ? [clearSessionStorage()] : []),
	]);
}

async function sentTokenKeys(): Promise<string[]> {
	const db = await getDb();
	const sent = await db.getAllAsync<{ result: string }>('select result from outbox where result is not null');
	return sent.flatMap(({ result }) => {
		try {
			return [manageTokenKey(JSON.parse(result).report_id)];
		} catch {
			return []; // a corrupt row has no token we can name
		}
	});
}

// While the in-app sign-out ends the session: it runs its own wipe, after the outbox prompt.
let signingOut = false;

/**
 * A session that ended outside the app gets the sign-out wipe too (C17 §Wipe), so no geofence keeps using Always
 * location for a signed-out user. Supabase drops a session whose refresh token was revoked (sign-out everywhere,
 * password reset, account deleted on the web) with SIGNED_OUT, at start-up or on a later refresh; offline it keeps
 * the session and says nothing. Subscribe once, before the client restores the session (lib/store).
 */
export function wipeOnSessionEnd(): () => void {
	const { data } = supabase.auth.onAuthStateChange((event) => {
		// Not awaited: the auth client waits for its listeners. A failed wipe leaves the reminders' off switch, shown
		// signed out too (settings/alerts).
		if (event === 'SIGNED_OUT' && !signingOut) void wipeLocalData({ reason: 'sign_out' }).catch(() => {});
	});
	return () => data.subscription.unsubscribe();
}

/**
 * Sign-out with the wipe. With unsent outbox items, `resolvePending(count)` first shows "Send now / Delete / Cancel",
 * does it, and resolves false on Cancel; then nothing happens and this resolves false.
 */
export async function signOutAndWipe({
	resolvePending,
	removeManageLinks = false,
	beforeSignOut,
}: {
	resolvePending: (count: number) => Promise<boolean>;
	/** Also forget the manage tokens and sent rows ("remove my report links from this device"); C17 keeps them by default. */
	removeManageLinks?: boolean;
	/** Runs while the session still exists, e.g. the push-token delete (C10); a failure does not stop the sign-out. */
	beforeSignOut?: () => Promise<unknown>;
}): Promise<boolean> {
	const count = await pendingCount();
	if (count > 0 && !(await resolvePending(count))) return false;
	await beforeSignOut?.().catch(() => {});
	signingOut = true;
	try {
		const { error } = await supabase.auth.signOut();
		// Offline the server call fails and keeps the session; forget it on this device anyway.
		if (error) await supabase.auth.signOut({ scope: 'local' });
	} finally {
		signingOut = false;
	}
	await wipeLocalData({ reason: 'sign_out', removeManageLinks });
	return true;
}
