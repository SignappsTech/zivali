import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import init from './migrations/001_init';

// The on-device store (C17, ADR-019). The Supabase session lives in expo-sqlite localStorage, a separate database file.
export const DB_NAME = 'zivali.db';

/** In order; migration i brings the database to `PRAGMA user_version` i + 1. Append only. */
export const migrations: string[] = [init];

/** Runs the migrations above the stored version, each in its own transaction with its version bump. */
export async function migrate(db: SQLiteDatabase, list = migrations): Promise<void> {
	const { user_version: from } = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))!;
	for (let version = from + 1; version <= list.length; version++) {
		await db.withExclusiveTransactionAsync((txn) =>
			txn.execAsync(`${list[version - 1]}\nPRAGMA user_version = ${version};`)
		);
	}
}

let db: Promise<SQLiteDatabase> | undefined;

/** The migrated database, opened once per app run. */
export function getDb(): Promise<SQLiteDatabase> {
	db ??= (async () => {
		const opened = await openDatabaseAsync(DB_NAME);
		// Per connection; outbox_photos rows go with their outbox row.
		await opened.execAsync('PRAGMA foreign_keys = ON;');
		await migrate(opened);
		return opened;
	})().catch((error) => {
		// A failed open or migration must not stick until the app restarts.
		db = undefined;
		throw error;
	});
	return db;
}

/** Closes and deletes the database file (account deletion); the next getDb() starts empty. */
export async function deleteDb(): Promise<void> {
	const opened = await db?.catch(() => undefined);
	db = undefined;
	await opened?.closeAsync();
	await deleteDatabaseAsync(DB_NAME);
}
