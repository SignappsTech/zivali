// The cheap gate for a task branch: format, secrets and root lint on the files the branch changed, then lint, typecheck
// and test only in the packages turbo marks affected against the base. No production builds: the full `pnpm verify`
// (with web and mobile builds) runs once per merge on the base branch.
// Usage: node scripts/verify-affected.mjs [base]   (base defaults to main)
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const base = process.argv[2] ?? 'main';
const git = (args) => spawnSync('git', args, { encoding: 'utf8' }).stdout.trim();

const mergeBase = git(['merge-base', base, 'HEAD']);
if (!mergeBase) {
	console.error(`verify:affected: no merge base with ${base}`);
	process.exit(2);
}
// Committed on the branch, plus staged, unstaged and untracked changes in the working tree.
const changed = [
	...git(['diff', '--name-only', '--diff-filter=ACMR', `${mergeBase}...HEAD`]).split('\n'),
	...git(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']).split('\n'),
	...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
].filter((f, i, all) => f && all.indexOf(f) === i && existsSync(f));

const run = (label, cmd, args) => {
	console.log(`\n> ${label}`);
	// shell: true so Windows finds the .cmd shims in node_modules/.bin.
	const { status, error } = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
	if (error) throw error;
	if (status !== 0) {
		console.error(`verify:affected: ${label} failed`);
		process.exit(status ?? 1);
	}
};
const quote = (f) => `"${f}"`;

console.log(`verify:affected against ${base} (${mergeBase.slice(0, 7)}): ${changed.length} changed file(s)`);
if (changed.length) {
	run('prettier (changed files)', 'prettier', ['--check', '--ignore-unknown', ...changed.map(quote)]);
	run('secretlint (changed files)', 'secretlint', ['--no-glob', ...changed.map(quote)]);
	const rootLint = changed.filter((f) => /^(scripts|tests)\/.*\.m?[jt]s$|^eslint\.config\.mjs$/.test(f));
	if (rootLint.length) run('eslint (root scripts)', 'eslint', ['--max-warnings=0', ...rootLint.map(quote)]);
	if (changed.some((f) => /^scripts\/.*\.test\.mjs$|^scripts\/[^/]+\.mjs$/.test(f)))
		run('script tests', 'node', ['--test', '"scripts/*.test.mjs"']);
}
run('turbo lint typecheck test (affected packages)', 'turbo', [
	'run',
	'lint',
	'typecheck',
	'test',
	'--affected',
	'--continue',
]);
console.log('\nverify:affected: PASS');
