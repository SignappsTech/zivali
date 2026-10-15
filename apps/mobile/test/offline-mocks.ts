/// <reference types="node" />
// Jest stand-ins for the native modules of the offline layer (C17), used as
//   jest.mock('expo-sqlite', () => jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').sqlite());
// Real SQL on node:sqlite (in memory, one database per open) and real files in a temp folder.

type Params = unknown[];
// expo-sqlite takes `(sql, a, b)` or `(sql, [a, b])`; node:sqlite only the first.
const flat = (params: Params) => (params.length === 1 && Array.isArray(params[0]) ? params[0] : params) as never[];

export function sqlite() {
	const { DatabaseSync } = jest.requireActual<typeof import('node:sqlite')>('node:sqlite');
	return {
		openDatabaseAsync: async () => {
			const db = new DatabaseSync(':memory:');
			const transaction = async (task: () => Promise<void>) => {
				db.exec('begin');
				try {
					await task();
					db.exec('commit');
				} catch (error) {
					db.exec('rollback');
					throw error;
				}
			};
			const connection = {
				execAsync: async (sql: string) => db.exec(sql),
				runAsync: async (sql: string, ...params: Params) => db.prepare(sql).run(...flat(params)),
				getFirstAsync: async (sql: string, ...params: Params) => db.prepare(sql).get(...flat(params)) ?? null,
				getAllAsync: async (sql: string, ...params: Params) => db.prepare(sql).all(...flat(params)),
				withTransactionAsync: transaction,
				withExclusiveTransactionAsync: (task: (txn: unknown) => Promise<void>) =>
					transaction(() => task(connection)),
				closeAsync: async () => {
					db.close();
				},
			};
			return connection;
		},
		deleteDatabaseAsync: jest.fn(async () => {}),
	};
}

export function fileSystem() {
	const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
	const path = jest.requireActual<typeof import('node:path')>('node:path');
	const os = jest.requireActual<typeof import('node:os')>('node:os');
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zivali-'));
	type Part = string | { uri: string };
	class Entry {
		uri: string;
		constructor(...parts: Part[]) {
			this.uri = path.join(...parts.map((part) => (typeof part === 'string' ? part : part.uri)));
		}
		get exists() {
			return fs.existsSync(this.uri);
		}
		get name() {
			return path.basename(this.uri);
		}
		delete() {
			fs.rmSync(this.uri, { recursive: true });
		}
	}
	class File extends Entry {
		get size() {
			return this.exists ? fs.statSync(this.uri).size : null;
		}
		async copy(to: File) {
			fs.copyFileSync(this.uri, to.uri);
		}
		/** Writes 1000 bytes; a test overrides it (mockImplementationOnce) for failures. */
		static downloadFileAsync = jest.fn(async (_url: string, to: File) => {
			fs.writeFileSync(to.uri, Buffer.alloc(1000));
			return new File(to.uri);
		});
	}
	class Directory extends Entry {
		get size() {
			if (!this.exists) return null;
			const files = fs.readdirSync(this.uri, { recursive: true, withFileTypes: true });
			return files
				.filter((file) => file.isFile())
				.reduce((sum, file) => sum + fs.statSync(path.join(file.parentPath, file.name)).size, 0);
		}
		create() {
			fs.mkdirSync(this.uri, { recursive: true });
		}
		list() {
			return fs
				.readdirSync(this.uri, { withFileTypes: true })
				.map((entry) =>
					entry.isFile() ? new File(this.uri, entry.name) : new Directory(this.uri, entry.name)
				);
		}
	}
	return {
		File,
		Directory,
		Paths: { cache: new Directory(root, 'cache'), document: new Directory(root, 'document') },
	};
}
