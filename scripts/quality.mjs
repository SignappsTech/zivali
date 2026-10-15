// pnpm quality: builds the web app, serves it on :8080 (or QUALITY_PORT) and runs the quality kit against it (docs/05 §Quality gates):
// Playwright (axe, console errors, consent guard, visual: tests/quality), Lighthouse CI (lighthouserc.json) and
// linkinator (0 broken internal links). Reports go to quality-report/. Extra arguments go to Playwright,
// e.g. `pnpm quality --update-snapshots`.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';
import { LinkChecker } from 'linkinator';

import { freePort } from './free-port.mjs';

// A free port per run (parallel worktrees); QUALITY_PORT pins it. lighthouserc.json's :8080 is rewritten to it below.
const PORT = Number(process.env.QUALITY_PORT || freePort());
const BASE = `http://localhost:${PORT}`;
process.env.BASE_URL = BASE; // read by tests/quality/playwright.config.mjs
const REPORT = 'quality-report';
const WEB = resolve('apps/web');

// Same fallbacks as apps/web/playwright.config.ts: the public pages render without a local Supabase.
if (existsSync(`${WEB}/.env.local`)) process.loadEnvFile(`${WEB}/.env.local`);
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= 'quality-placeholder';
// Lighthouse uses Playwright's Chromium, so no separate Chrome install is needed.
process.env.CHROME_PATH ||= chromium.executablePath();

// shell: true so Windows finds the .cmd shims in node_modules/.bin.
const run = (command) => spawnSync(command, { stdio: 'inherit', shell: true }).status === 0;

async function waitForServer(server) {
	const isUp = () =>
		fetch(`${BASE}/api/health`)
			.then((response) => response.ok)
			.catch(() => false);
	for (let i = 0; i < 120 && server.exitCode === null; i++) {
		if (await isUp()) return;
		await new Promise((done) => setTimeout(done, 500));
	}
	throw new Error(`web app did not answer on ${BASE}/api/health`);
}

async function checkLinks() {
	const { links } = await new LinkChecker().check({
		path: [`${BASE}/`, `${BASE}/en`],
		recurse: true,
		linksToSkip: [`^(?!${BASE})`], // internal links only (docs/05)
	});
	const broken = links.filter((link) => link.state === 'BROKEN');
	writeFileSync(`${REPORT}/links.json`, JSON.stringify({ broken, links }, null, '\t'));
	for (const link of broken) console.error(`  ${link.status ?? '-'} ${link.url} (on ${link.parent ?? '-'})`);
	console.log(`linkinator: ${links.length} links, ${broken.length} broken`);
	return broken.length === 0;
}

rmSync(REPORT, { recursive: true, force: true });
mkdirSync(REPORT);
if (!run('turbo run build --filter=web')) process.exit(1);

const next = createRequire(`${WEB}/package.json`).resolve('next/dist/bin/next');
const server = spawn(process.execPath, [next, 'start', '-p', String(PORT)], { cwd: WEB, stdio: 'inherit' });
const results = {};
try {
	await waitForServer(server);
	results.playwright = run(['playwright test -c tests/quality', ...process.argv.slice(2)].join(' '));
	const urls = JSON.parse(readFileSync('lighthouserc.json', 'utf8')).ci.collect.url;
	const urlFlags = urls.map((url) => `--collect.url=${url.replace('http://localhost:8080', BASE)}`);
	results.lighthouse = run(['lhci autorun', ...urlFlags].join(' '));
	results.links = await checkLinks();
} finally {
	if (process.platform === 'win32')
		spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
	else server.kill();
}

console.log(
	`\nquality: ${Object.entries(results)
		.map(([gate, ok]) => `${gate} ${ok ? 'pass' : 'FAIL'}`)
		.join(', ')}`
);
console.log(`reports: ${REPORT}/ (playwright, lighthouse, links.json)`);
process.exit(Object.values(results).every(Boolean) ? 0 : 1);
