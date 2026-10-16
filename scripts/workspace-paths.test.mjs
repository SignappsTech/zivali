// Guard for TASK-107: the three tsconfigs and mobile's jest moduleNameMapper must resolve @zivali/* to this checkout,
// in step with each package's `exports` (CSS and cjs outputs excluded: they still go through node_modules).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const posix = (p) => p.split(path.sep).join('/');
const rel = (from, target) => posix(path.relative(root, path.resolve(root, from, target)));

const tsconfigs = { base: '.', web: 'apps/web', mobile: 'apps/mobile' };
const rebased = (dir) => {
	const file = path.join(root, dir, dir === '.' ? 'tsconfig.base.json' : 'tsconfig.json');
	const { config, error } = ts.readConfigFile(file, ts.sys.readFile);
	assert.equal(error, undefined, `cannot read ${file}`);
	const out = {};
	for (const [key, targets] of Object.entries(config.compilerOptions.paths)) {
		if (!key.startsWith('@zivali/')) continue;
		out[key] = targets.map((t) => rel(dir, t));
	}
	return out;
};

const base = rebased(tsconfigs.base);

// Built outputs (dist is gitignored): the checkout's own dist first, then an optional node_modules fallback.
// Source (src) entries stay single-target.
const isBuilt = (target) => target.includes('/dist/');
const checkShape = (key, targets) => {
	const [first, second, ...extra] = targets;
	assert.equal(extra.length, 0, `${key}: at most two targets`);
	if (!isBuilt(first)) return assert.equal(second, undefined, `${key}: source entries are single-target`);
	assert.ok(first.startsWith('packages/'), `${key}: first target must be in-repo, got ${first}`);
	if (second !== undefined)
		assert.ok(second.startsWith('node_modules/'), `${key}: fallback must be under node_modules`);
};

const exportTargets = () => {
	const out = [];
	for (const name of fs.readdirSync(path.join(root, 'packages'))) {
		const pj = path.join(root, 'packages', name, 'package.json');
		if (!fs.existsSync(pj)) continue;
		const { exports = {} } = JSON.parse(fs.readFileSync(pj, 'utf8'));
		for (const [key, target] of Object.entries(exports)) {
			if (typeof target !== 'string' || /\.(css|cjs)$/.test(target)) continue;
			out.push({ spec: `@zivali/${name}${key.slice(1)}`, target: posix(path.join('packages', name, target)) });
		}
	}
	return out;
};

const matchPaths = (paths, spec) => {
	for (const [key, target] of Object.entries(paths)) {
		if (!key.includes('*')) {
			if (key === spec) return target;
			continue;
		}
		const [pre, suf] = key.split('*');
		if (spec.startsWith(pre) && spec.endsWith(suf) && spec.length > pre.length + suf.length) {
			return target.map((t) => t.replace('*', spec.slice(pre.length, spec.length - suf.length)));
		}
	}
	return undefined;
};

test('apps/web and apps/mobile repeat the base @zivali paths', () => {
	assert.deepEqual(rebased(tsconfigs.web), base);
	assert.deepEqual(rebased(tsconfigs.mobile), base);
});

test('every package export (except CSS/cjs) has a matching paths target that exists', () => {
	for (const { spec, target } of exportTargets()) {
		// A subpath export such as ./dist/*.json is listed key by key; the paths glob may cover several.
		const got = matchPaths(base, spec)?.[0];
		assert.equal(got, target, `${spec}: paths gives ${got}, exports gives ${target}`);
	}
});

test('built outputs: in-repo target first, optional node_modules fallback second', () => {
	for (const [key, targets] of Object.entries(base)) checkShape(key, targets);
});

test('every source paths target is a real file or glob directory', () => {
	for (const [key, [target]] of Object.entries(base)) {
		if (isBuilt(target)) continue; // dist exists only after a build
		const dir = path.dirname(target);
		assert.ok(
			fs.existsSync(path.join(root, target.includes('*') ? dir : target)),
			`${key} -> ${target} is missing`
		);
	}
});

test('mobile jest moduleNameMapper agrees with paths', () => {
	const { moduleNameMapper } = JSON.parse(fs.readFileSync(path.join(root, 'apps/mobile/package.json'), 'utf8')).jest;
	const jest = (spec) => {
		for (const [re, target] of Object.entries(moduleNameMapper)) {
			const m = spec.match(new RegExp(re));
			if (m) {
				return [target].flat().map((t) =>
					rel(
						'apps/mobile',
						t.replace('<rootDir>/', '').replace(/\$(\d)/g, (_, i) => m[i])
					)
				);
			}
		}
		return undefined;
	};
	for (const { spec, target } of exportTargets()) {
		assert.equal(jest(spec)?.[0], target, `${spec}: jest maps to ${jest(spec)}, exports gives ${target}`);
		assert.deepEqual(jest(spec), matchPaths(base, spec), `${spec}: jest and paths targets differ`);
	}
});
