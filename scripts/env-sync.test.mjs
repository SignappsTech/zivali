import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { appendMissing, envSync, webSupabaseLines } from './env-sync.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'env-sync-'));
const ex = 'A=1\nURL=http://127.0.0.1:54321\nDB=postgresql://x@127.0.0.1:54322/p\n';

test('creates when missing', () => {
	const d = tmp();
	fs.writeFileSync(path.join(d, '.env.example'), ex);
	envSync(d, { rootEnv: path.join(d, 'none'), env: {} });
	assert.equal(fs.readFileSync(path.join(d, '.env.local'), 'utf8').trim(), ex.trim());
});

test('appends only missing keys, keeps existing lines, applies port overrides', () => {
	const d = tmp();
	fs.writeFileSync(path.join(d, '.env.example'), ex);
	fs.writeFileSync(path.join(d, '.env.local'), 'A=custom');
	const root = path.join(d, 'root.env');
	fs.writeFileSync(root, 'SUPABASE_API_PORT=55321\nSUPABASE_DB_PORT=55322\n');
	const added = envSync(d, { rootEnv: root, env: {}, date: new Date('2026-01-02') });
	assert.deepEqual(added, ['URL', 'DB']);
	const out = fs.readFileSync(path.join(d, '.env.local'), 'utf8');
	assert.equal(
		out,
		'A=custom\n# added by env-sync 2026-01-02\nURL=http://127.0.0.1:55321\nDB=postgresql://x@127.0.0.1:55322/p\n'
	);
	assert.deepEqual(envSync(d, { rootEnv: root, env: {} }), []);
});

// `supabase status -o env` shape (CRLF on Windows); placeholder values, not the CLI's.
const status = 'ANON_KEY="anon"\r\nAPI_URL="http://127.0.0.1:55321"\r\nPUBLISHABLE_KEY="sb_publishable_local"\r\n';

test('web Supabase lines come from supabase status: moved port kept, publishable key preferred over anon', () => {
	assert.deepEqual(webSupabaseLines(status), [
		'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321',
		'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local',
	]);
	assert.equal(
		webSupabaseLines('API_URL=http://127.0.0.1:54321\nANON_KEY=anon\n')[1],
		'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=anon'
	);
	assert.throws(() => webSupabaseLines('DB_URL="postgresql://x"\n'), /no API_URL or PUBLISHABLE_KEY/);
});

test('fresh clone: creates apps/web/.env.local with both values; reruns never touch existing lines', () => {
	const file = path.join(tmp(), '.env.local');
	const date = new Date('2026-01-02');
	assert.deepEqual(appendMissing(file, webSupabaseLines(status), date), [
		'NEXT_PUBLIC_SUPABASE_URL',
		'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
	]);
	assert.deepEqual(appendMissing(file, webSupabaseLines(status), date), []);
	fs.writeFileSync(file, 'NEXT_PUBLIC_SUPABASE_URL=https://own.example');
	assert.deepEqual(appendMissing(file, webSupabaseLines(status), date), ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']);
	assert.equal(
		fs.readFileSync(file, 'utf8'),
		'NEXT_PUBLIC_SUPABASE_URL=https://own.example\n# added by env-sync 2026-01-02\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local\n'
	);
});
