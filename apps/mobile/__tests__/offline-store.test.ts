/// <reference types="node" />
// node:sqlite and node:fs stand in for the native modules, so this test runs with Node types.
import fs from 'node:fs';
import path from 'node:path';

import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';

import { DB_NAME, getDb, migrate, migrations } from '@/lib/db';
import { bytesUsed, draftsDir, outboxDir, thumbsDir } from '@/lib/db/files';
import { stopGeofencing } from '@/lib/offline/geofence';
import { manageTokenKey } from '@/lib/offline/outbox';
import { signOutAndWipe, wipeLocalData } from '@/lib/offline/wipe';
import { supabase } from '@/lib/supabase';

// Real SQL: node:sqlite stands in for the native expo-sqlite module (in memory, one database per open).
jest.mock('expo-sqlite', () => {
	const { DatabaseSync } = jest.requireActual<typeof import('node:sqlite')>('node:sqlite');
	return {
		openDatabaseAsync: async () => {
			const db = new DatabaseSync(':memory:');
			return {
				execAsync: async (sql: string) => db.exec(sql),
				getFirstAsync: async (sql: string, ...params: never[]) => db.prepare(sql).get(...params) ?? null,
				getAllAsync: async (sql: string, ...params: never[]) => db.prepare(sql).all(...params),
				withTransactionAsync: async (task: () => Promise<void>) => {
					db.exec('begin');
					try {
						await task();
						db.exec('commit');
					} catch (error) {
						db.exec('rollback');
						throw error;
					}
				},
				withExclusiveTransactionAsync: async (task: (txn: unknown) => Promise<void>) => {
					db.exec('begin');
					try {
						await task({ execAsync: async (sql: string) => db.exec(sql) });
						db.exec('commit');
					} catch (error) {
						db.exec('rollback');
						throw error;
					}
				},
				closeAsync: async () => {
					db.close();
				},
			};
		},
		deleteDatabaseAsync: jest.fn(async () => {}),
	};
});
// Real files in a temp folder stand in for the app's cache and document directories.
jest.mock('expo-file-system', () => {
	const nodeFs = jest.requireActual<typeof import('node:fs')>('node:fs');
	const nodePath = jest.requireActual<typeof import('node:path')>('node:path');
	const root = nodeFs.mkdtempSync(nodePath.join(jest.requireActual('node:os').tmpdir(), 'zivali-'));
	class Directory {
		uri: string;
		constructor(...parts: (string | Directory)[]) {
			this.uri = nodePath.join(...parts.map((part) => (typeof part === 'string' ? part : part.uri)));
		}
		get exists() {
			return nodeFs.existsSync(this.uri);
		}
		get size() {
			if (!this.exists) return null;
			const files = nodeFs.readdirSync(this.uri, { recursive: true, withFileTypes: true });
			return files
				.filter((file) => file.isFile())
				.reduce((sum, file) => sum + nodeFs.statSync(nodePath.join(file.parentPath, file.name)).size, 0);
		}
		delete() {
			nodeFs.rmSync(this.uri, { recursive: true });
		}
	}
	return { Directory, Paths: { cache: new Directory(root, 'cache'), document: new Directory(root, 'document') } };
});
const mockKeychain = new Map<string, string>();
const mockSession = jest.fn(async () => {});
jest.mock('expo-secure-store', () => ({
	deleteItemAsync: jest.fn(async (name: string) => void mockKeychain.delete(name)),
}));
jest.mock('@/lib/supabase', () => ({
	clearSessionStorage: () => mockSession(),
	supabase: { auth: { signOut: jest.fn(async () => ({ error: null })) } },
}));
jest.mock('@/lib/offline/geofence', () => ({ stopGeofencing: jest.fn(async () => {}) }));

const C17_TABLES = [
	'cache_areas',
	'drafts',
	'geofence_events',
	'geofences',
	'outbox',
	'outbox_photos',
	'reports_cache',
];
// The public whitelist (C17): no exact point, chip number or contact field.
const REPORTS_CACHE_COLUMNS = [
	'id',
	'short_code',
	'type',
	'status',
	'species',
	'name',
	'breed_codes',
	'colours',
	'pattern',
	'size',
	'sex',
	'has_chip',
	'event_at',
	'area_lat',
	'area_lng',
	'area_radius_m',
	'municipality_slug',
	'region_slug',
	'thumb_url',
	'thumb_path',
	'thumb_bytes',
	'boosted',
	'updated_at',
	'synced_at',
];

const version = async (db: SQLiteDatabase) =>
	(await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))!.user_version;
const tables = async (db: SQLiteDatabase) =>
	(
		await db.getAllAsync<{ name: string }>(
			"select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name"
		)
	).map((row) => row.name);
const count = async (table: string) =>
	(await (await getDb()).getFirstAsync<{ n: number }>(`select count(*) as n from ${table}`))!.n;
const writeFile = (dir: { uri: string }, name: string, bytes: number) => {
	fs.mkdirSync(path.dirname(path.join(dir.uri, name)), { recursive: true });
	fs.writeFileSync(path.join(dir.uri, name), Buffer.alloc(bytes));
};

afterAll(() => fs.rmSync(path.resolve(thumbsDir.uri, '../..'), { recursive: true }));

describe('getDb', () => {
	test('a failed migration is not cached', async () => {
		jest.resetModules();
		const fresh = await import('@/lib/db');
		fresh.migrations.push('not sql;');
		await expect(fresh.getDb()).rejects.toThrow();
		fresh.migrations.pop();
		await expect(fresh.getDb()).resolves.toBeDefined();
	});
});

describe('migrations', () => {
	test('from empty create exactly the C17 tables and set user_version', async () => {
		const db = await openDatabaseAsync(':memory:');
		await migrate(db);

		expect(await version(db)).toBe(migrations.length);
		expect(await tables(db)).toEqual(C17_TABLES);
		const columns = await db.getAllAsync<{ name: string }>(
			'select name from pragma_table_info(?)',
			'reports_cache'
		);
		expect(columns.map((column) => column.name)).toEqual(REPORTS_CACHE_COLUMNS);
	});

	test('from version n-1 run only the newest and a second run is a no-op', async () => {
		const db = await openDatabaseAsync(':memory:');
		await migrate(db, migrations.slice(0, -1));
		expect(await version(db)).toBe(migrations.length - 1);

		await migrate(db);
		await migrate(db);

		expect(await version(db)).toBe(migrations.length);
		expect(await tables(db)).toEqual(C17_TABLES);
	});

	test('a failing migration rolls back with its version', async () => {
		const db = await openDatabaseAsync(':memory:');
		await migrate(db);

		await expect(migrate(db, [...migrations, 'create table extra (id text); not sql;'])).rejects.toThrow();

		expect(await version(db)).toBe(migrations.length);
		expect(await tables(db)).toEqual(C17_TABLES);
	});
});

async function seed() {
	const db = await getDb();
	await db.execAsync(`
		delete from reports_cache; delete from cache_areas; delete from drafts; delete from geofences;
		delete from geofence_events; delete from outbox_photos; delete from outbox;
		insert into reports_cache (id, short_code, type, status, species, event_at, area_lat, area_lng, area_radius_m,
			updated_at, synced_at) values ('r1', 'AB12CD', 'lost', 'open', 'dog', '2026-10-14', 46.05, 14.5, 500, '2026-10-14', 1);
		insert into cache_areas (id, lat, lng, radius_km) values ('current', 46.05, 14.5, 10);
		insert into drafts (id, kind, data, updated_at) values ('d1', 'found', '{}', 1);
		insert into geofences (region_id, lat, lng, radius_m, registered_at) values ('r1', 46.05, 14.5, 500, 1);
		insert into geofence_events (report_id, area_key, fired_at) values ('r1', 'a', 1);
		insert into outbox (id, kind, payload, captured_at, status, result, created_at, updated_at)
			values ('o1', 'found', '{}', '2026-10-15T07:42:10Z', 'sent', '{"report_id":"rep-1","short_code":"XY34"}', 1, 1),
			('o2', 'sighted', '{}', '2026-10-15T07:50:00Z', 'queued', null, 1, 1);
		insert into outbox_photos (outbox_id, position, path, sha256) values ('o2', 0, 'outbox/o2/0.jpg', 'abc');
	`);
	writeFile(thumbsDir, 'r1.jpg', 3);
	writeFile(draftsDir, 'd1/0.jpg', 4);
	writeFile(outboxDir, 'o2/0.jpg', 5);
	mockKeychain.set(manageTokenKey('rep-1'), 'token');
}

describe('file budget', () => {
	test('reports bytes of thumbnails and queued photos', async () => {
		await seed();
		expect(bytesUsed()).toEqual({ thumbnails: 3, queuedPhotos: 5 });

		await wipeLocalData({ reason: 'account_deleted' });
		expect(bytesUsed()).toEqual({ thumbnails: 0, queuedPhotos: 0 });
	});
});

describe('wipeLocalData', () => {
	beforeEach(seed);

	test.each(['sign_out', 'user_request'] as const)(
		'%s clears cache, areas, drafts, geofences and files but keeps the outbox and tokens',
		async (reason) => {
			await wipeLocalData({ reason });

			for (const table of ['reports_cache', 'cache_areas', 'drafts', 'geofences', 'geofence_events']) {
				expect(await count(table)).toBe(0);
			}
			expect(stopGeofencing).toHaveBeenCalled();
			expect(thumbsDir.exists).toBe(false);
			expect(draftsDir.exists).toBe(false);
			expect(await count('outbox')).toBe(2);
			expect(await count('outbox_photos')).toBe(1);
			expect(outboxDir.exists).toBe(true);
			expect(mockKeychain.has(manageTokenKey('rep-1'))).toBe(true);
		}
	);

	test('account_deleted also clears the outbox, its photos and the manage tokens', async () => {
		await wipeLocalData({ reason: 'account_deleted' });

		expect(deleteDatabaseAsync).toHaveBeenCalledWith(DB_NAME);
		for (const table of C17_TABLES) expect(await count(table)).toBe(0); // a fresh database
		expect(outboxDir.exists).toBe(false);
		expect(mockKeychain.size).toBe(0);
		expect(mockSession).toHaveBeenCalled();
	});

	test('a corrupt result row does not stop the wipe', async () => {
		await (
			await getDb()
		).execAsync(
			`insert into outbox (id, kind, payload, captured_at, status, result, created_at, updated_at)
			 values ('o3', 'found', '{}', 'x', 'sent', 'not json', 1, 1)`
		);
		jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('keychain'));

		await wipeLocalData({ reason: 'account_deleted' });

		expect(await count('outbox')).toBe(0);
		expect(mockSession).toHaveBeenCalled();
	});

	test('removeManageLinks on sign_out also drops sent rows and tokens, keeps unsent', async () => {
		await wipeLocalData({ reason: 'sign_out', removeManageLinks: true });

		expect(await count('outbox')).toBe(1);
		expect(await count('outbox_photos')).toBe(1);
		expect(mockKeychain.has(manageTokenKey('rep-1'))).toBe(false);
	});
});

describe('signOutAndWipe', () => {
	beforeEach(async () => {
		await seed();
		jest.mocked(supabase.auth.signOut).mockClear();
	});

	test('Cancel on pending items keeps the session and the data', async () => {
		const resolvePending = jest.fn(async () => false);

		expect(await signOutAndWipe({ resolvePending })).toBe(false);

		expect(resolvePending).toHaveBeenCalledWith(1);
		expect(supabase.auth.signOut).not.toHaveBeenCalled();
		expect(await count('reports_cache')).toBe(1);
	});

	test('signs out, then wipes', async () => {
		expect(await signOutAndWipe({ resolvePending: async () => true })).toBe(true);

		expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
		expect(await count('reports_cache')).toBe(0);
	});

	test('without pending items it does not ask, and offline it forgets the local session', async () => {
		await (await getDb()).execAsync(`update outbox set status = 'sent'`);
		jest.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: new Error('offline') } as never);
		const resolvePending = jest.fn(async () => true);

		expect(await signOutAndWipe({ resolvePending })).toBe(true);

		expect(resolvePending).not.toHaveBeenCalled();
		expect(supabase.auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
		expect(await count('drafts')).toBe(0);
	});
});
