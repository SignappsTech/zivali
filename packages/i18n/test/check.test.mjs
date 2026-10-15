import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { check, parseIcu } from '../check.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const BROKEN = path.join(here, 'fixtures', 'broken');

test('the package catalogues pass', () => {
	assert.deepEqual(check(), []);
});

test('the broken fixture fails on every rule', () => {
	assert.deepEqual(check(BROKEN), [
		'en: demo.only_sl: missing (present in sl)',
		'sl: demo.results: plural {count} needs one, two, few, other (missing two, few)',
		'sl: demo.unclosed: unclosed "{"',
		'en: demo.photos: plural {count} needs one, other (missing one)',
		'en: demo.blank: empty string',
		'sl: demo.only_en: missing (present in en)',
		'demo.greeting: placeholders differ: sl {name}, en {nam}',
	]);
});

test('the CLI exits 1 with the problems on stderr, 0 on the package catalogues', () => {
	const run = (...args) =>
		spawnSync(process.execPath, [path.join(here, '..', 'check.mjs'), ...args], { encoding: 'utf8' });
	const broken = run(BROKEN);
	assert.equal(broken.status, 1);
	assert.match(broken.stderr, /7 problem\(s\)/);
	assert.match(broken.stderr, /demo\.greeting: placeholders differ/);
	assert.equal(run().status, 0);
});

test('parseIcu reads arguments, tags, quotes and nested plurals', () => {
	const { args, plurals } = parseIcu(
		"<b>{name}</b> '{literal}' it''s {n, number} {when, date, short} {kind, select, dog {{count, plural, =0 {none} one {# pes} other {# '#' psov}}} other {}}"
	);
	assert.deepEqual([...args].sort(), ['<b>', 'count', 'kind', 'n', 'name', 'when']);
	assert.deepEqual(
		plurals.map((p) => [p.name, [...p.selectors]]),
		[['count', ['=0', 'one', 'other']]]
	);
});

test('parseIcu rejects broken syntax', () => {
	assert.throws(() => parseIcu('a } b'), /unmatched/);
	assert.throws(() => parseIcu('{n, plural, one {x}}'), /no "other"/);
	assert.throws(() => parseIcu('{n, list}'), /unknown type/);
	assert.throws(() => parseIcu('{n, plural, one {x} other {y}'), /unclosed/);
});
