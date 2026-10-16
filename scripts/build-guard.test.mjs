import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isLink, unlinkLinks } from './build-guard.mjs';

test('unlinkLinks removes links under a folder without touching their targets', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'build-guard-'));
	const target = path.join(tmp, 'target');
	fs.mkdirSync(path.join(target, 'pkg'), { recursive: true });
	fs.writeFileSync(path.join(target, 'pkg', 'index.js'), 'x');
	const standalone = path.join(tmp, 'standalone', 'apps', 'web');
	fs.mkdirSync(standalone, { recursive: true });
	// 'junction' needs no privileges on Windows and is ignored (a directory symlink) elsewhere.
	fs.symlinkSync(target, path.join(tmp, 'standalone', 'node_modules'), 'junction');
	fs.symlinkSync(target, path.join(standalone, 'node_modules'), 'junction');
	assert.equal(isLink(path.join(tmp, 'standalone', 'node_modules')), true);

	const removed = unlinkLinks(path.join(tmp, 'standalone'));

	assert.equal(removed.length, 2);
	assert.equal(fs.existsSync(path.join(tmp, 'standalone', 'node_modules')), false);
	assert.equal(fs.readFileSync(path.join(target, 'pkg', 'index.js'), 'utf8'), 'x');
	fs.rmSync(tmp, { recursive: true, force: true });
});

test('isLink is false for a real folder and for a missing path', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'build-guard-'));
	assert.equal(isLink(tmp), false);
	assert.equal(isLink(path.join(tmp, 'missing')), false);
	fs.rmSync(tmp, { recursive: true, force: true });
});
