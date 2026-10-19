// Usage: node scripts/env-sync.mjs [appDir]  (default cwd): appDir/.env.example -> appDir/.env.local.
//        node scripts/env-sync.mjs apps/web --supabase  (pnpm bootstrap, after db:start): the running local stack's
//        URL and publishable key (`supabase status -o env`) -> apps/web/.env.local.
// Never rewrites existing lines; prints names only.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULTS = { API: 54321, DB: 54322, DB_SHADOW: 54320, STUDIO: 54323, LOCAL_SMTP: 54324, DB_POOLER: 54329 };
const keyRe = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;
const keys = (text) =>
	new Set(
		text
			.split(/\r?\n/)
			.map((l) => keyRe.exec(l)?.[1])
			.filter(Boolean)
	);

// SUPABASE_*_PORT overrides from the root .env.local (or the process env) -> map of default port -> moved port.
function portMap(rootEnv, env) {
	const file = fs.existsSync(rootEnv) ? fs.readFileSync(rootEnv, 'utf8') : '';
	const map = {};
	for (const [name, def] of Object.entries(DEFAULTS)) {
		const k = `SUPABASE_${name}_PORT`;
		const m = new RegExp(`^\\s*(?:export\\s+)?${k}\\s*=\\s*"?(\\d+)"?`, 'm').exec(file);
		const v = m?.[1] ?? env[k];
		if (v && /^\d+$/.test(v) && Number(v) !== def) map[def] = v;
	}
	return map;
}

/** Appends the `KEY=value` lines whose key `file` lacks (creating the file) under a dated stamp; returns those keys. */
export function appendMissing(file, lines, date = new Date()) {
	const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
	const have = keys(cur);
	const add = lines.filter((l) => {
		const k = keyRe.exec(l)?.[1];
		return k && !have.has(k);
	});
	if (!add.length) return [];
	const stamp = `# added by env-sync ${date.toISOString().slice(0, 10)}`;
	fs.appendFileSync(file, `${cur && !cur.endsWith('\n') ? '\n' : ''}${stamp}\n${add.join('\n')}\n`);
	return add.map((l) => keyRe.exec(l)[1]);
}

export function envSync(
	dir,
	{ rootEnv = path.join(dir, '../../.env.local'), env = process.env, date = new Date() } = {}
) {
	const ex = path.join(dir, '.env.example');
	const target = path.join(dir, '.env.local');
	if (!fs.existsSync(ex)) return [];
	const ports = portMap(rootEnv, env);
	const fixPorts = (l) => l.replace(/(127\.0\.0\.1:|localhost:)(\d+)/g, (s, h, p) => h + (ports[p] ?? p));
	const lines = fs.readFileSync(ex, 'utf8').split(/\r?\n/).map(fixPorts);
	if (!fs.existsSync(target)) {
		fs.writeFileSync(target, lines.join('\n'));
		return ['(created .env.local)'];
	}
	return appendMissing(target, lines, date);
}

/** `supabase status -o env` output -> the web's two Supabase lines. Older CLIs print the anon key only. */
export function webSupabaseLines(status) {
	const s = Object.fromEntries([...status.matchAll(/^([A-Z_]+)="?([^"\r\n]*)"?\r?$/gm)].map((m) => [m[1], m[2]]));
	const key = s.PUBLISHABLE_KEY || s.ANON_KEY;
	if (!s.API_URL || !key) throw new Error('env-sync: `supabase status -o env` printed no API_URL or PUBLISHABLE_KEY');
	return [`NEXT_PUBLIC_SUPABASE_URL=${s.API_URL}`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}`];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
	const dir = path.resolve(process.argv[2] ?? process.cwd());
	const added = process.argv.includes('--supabase')
		? appendMissing(
				path.join(dir, '.env.local'),
				webSupabaseLines(execSync('pnpm exec supabase status -o env', { cwd: root, encoding: 'utf8' }))
			)
		: envSync(dir, { rootEnv: path.join(root, '.env.local') });
	if (added.length) console.log(`env-sync ${path.basename(dir)}: ${added.join(', ')}`);
}
