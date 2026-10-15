import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';


import { envSync } from './env-sync.mjs';

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
