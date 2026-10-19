// Deploy to the Hetzner VPS (ADR-016). Usage:
//   node scripts/deploy.mjs <staging|production> [--deploy] [--strict] [--skip-images] [--yes]
//   node scripts/deploy.mjs <staging|production> --close-ssh
// The GitHub Actions workflow (.github/workflows/deploy.yml) runs this same script with --deploy --strict:
//   1. checks, read-only: credentials (names only), the three R2 buckets (HeadBucket on the EU endpoint), the Supabase
//      settings of ADR-021/ADR-023 (Management API GETs), the VPS files and TLS certificate (`remote.sh check` over SSH);
//   2. only with --deploy and nothing missing: build the linux/arm64 api (also the worker) and web images here (in
//      Actions with the BuildKit layer cache, cacheArgs), copy
//      deploy/ to /opt/zivali, write cloudflare.ini (certbot's token, mode 600), stream the images to the VPS
//      (docker save | zstd | ssh docker load; no registry), `remote.sh deploy` (one-off `prisma migrate deploy`, then
//      the seed; up and healthy within 180 s, else back to the running release; nginx and certbot up, nginx reload);
//   3. smoke checks (GETs): /ping, /v1/health/ready, the web reports the new version, web home, ADR-021 exposure; then
//      `remote.sh promote` (release.env moves), or `remote.sh rollback` and exit 1.
// Without --deploy nothing is written anywhere (no firewall rule, no file on the VPS, no image transfer): the checks,
// then the dry run: image builds, migrations from zero on a scratch database on the local Supabase server, the seed as
// staging, `prisma migrate diff`, the ADR-021 security tests on it; exit 0 when it passes. Anything missing prints NEEDS-INPUT with
// variable names (never values) and runs the dry run too; --strict (CI) exits 1 on NEEDS-INPUT instead. --skip-images
// skips the dry run's image builds; --yes confirms a production deploy from a workstation; --close-ssh removes every
// temporary SSH rule from the Hetzner firewall (the workflow's always() step).
// Values: staging from the root .env.local, production from .env.production.local; real environment variables win.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'apps/api');
// @aws-sdk/client-s3 and pg are dependencies of apps/api.
const apiRequire = createRequire(path.join(apiDir, 'package.json'));

export const TARGETS = ['staging', 'production'];
/** Hetzner CAX11 (Ampere, Arm64). */
export const PLATFORM = 'linux/arm64';
/** Every credential a real deploy needs, by who provides it (README "Environments and credentials"). */
export const REQUIRED = {
	// HETZNER_HOST: the VPS address (user deploy unless `user@host`); HETZNER_KNOWN_HOSTS: its pinned host key.
	Hetzner: ['HETZNER_HOST', 'HETZNER_SSH_KEY', 'HETZNER_KNOWN_HOSTS'],
	// This environment's public hostnames (staging: staging.najdimo.si, api-staging.najdimo.si).
	Hostnames: ['WEB_HOST', 'API_HOST'],
	// certbot's DNS-01 token (Zone DNS Edit on najdimo.si only), written to /opt/zivali/cloudflare.ini.
	TLS: ['CERTBOT_CLOUDFLARE_TOKEN'],
	R2: ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'],
	Supabase: ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF'],
};
export const BUCKETS = {
	R2_BUCKET_PRIVATE: 'zivali-private',
	R2_BUCKET_MEDIA: 'zivali-media',
	R2_BUCKET_BACKUPS: 'zivali-backups',
};
/** The web build args a working site needs; the others are optional (analytics, captcha, Stripe test key). */
const WEB_ARGS_NEEDED = [
	'NEXT_PUBLIC_SUPABASE_URL',
	'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
	'NEXT_PUBLIC_API_URL',
	'NEXT_PUBLIC_APP_URL',
];
const PROBE_TABLES = ['profiles', 'audit_log', 'app_config'];

/** Missing credentials by group; empty values count as missing. */
export function missingVars(env) {
	const out = {};
	for (const [group, names] of Object.entries(REQUIRED)) {
		const missing = names.filter((name) => !env[name]);
		if (missing.length) out[group] = missing;
	}
	return out;
}

/** Kept out of the dry run's local tools. */
const ALL_CREDENTIALS = [...Object.values(REQUIRED).flat(), 'HETZNER_API_TOKEN', 'HETZNER_FIREWALL_ID'];

/** Server-side items only an SSH check can see (`remote.sh check`); named up front when SSH is not possible yet. */
export const VPS_ITEMS = (target) => [
	'/opt/zivali/edge.env',
	`/opt/zivali/${target}/.env`,
	`/opt/zivali/${target}/web.env`,
	'TLS certificate (first issuance)',
];

/** Local image names; they travel to the VPS with docker save/load, no registry. */
export function imageNames(target, tag) {
	return { api: `zivali-api:${tag}`, web: `zivali-web:${target}-${tag}` };
}

/** Build args of the web image: NEXT_PUBLIC_* are inlined at build time (apps/web/Dockerfile). Public values only. */
export function webBuildEnv(env) {
	const stripe = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || env.STRIPE_PUBLISHABLE_KEY;
	const values = {
		NEXT_PUBLIC_SUPABASE_URL: env.SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_PUBLISHABLE_KEY,
		NEXT_PUBLIC_API_URL: env.API_HOST && `https://${env.API_HOST}`,
		NEXT_PUBLIC_APP_URL: env.WEB_HOST && `https://${env.WEB_HOST}`,
		NEXT_PUBLIC_ANALYTICS_PROVIDER: env.NEXT_PUBLIC_ANALYTICS_PROVIDER,
		NEXT_PUBLIC_GA_MEASUREMENT_ID: env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
		NEXT_PUBLIC_TURNSTILE_SITE_KEY: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
		// Sign-in provider buttons (P16): 'true' once the provider is enabled in that environment's Supabase Auth.
		NEXT_PUBLIC_GOOGLE_SIGN_IN: env.NEXT_PUBLIC_GOOGLE_SIGN_IN,
		NEXT_PUBLIC_APPLE_SIGN_IN: env.NEXT_PUBLIC_APPLE_SIGN_IN,
		// Test keys only (C13): a live key is never baked into an image.
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripe?.startsWith('pk_test_') ? stripe : undefined,
	};
	return Object.fromEntries(Object.entries(values).filter(([, value]) => value));
}

export const isLocalDb = (url) => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname);

/** The dry run's scratch database: same local server, own database. Refuses anything but a local server. */
export function scratchUrl(url, name) {
	const u = new URL(url);
	if (!isLocalDb(url)) {
		throw new Error('the dry run needs the local Supabase database (DATABASE_URL in apps/api/.env.local)');
	}
	u.pathname = `/${name}`;
	return u.toString();
}

/** ADR-021 (exposed schemas: public only) and ADR-023 (Realtime 'Allow public access' off), as NEEDS-INPUT lines. */
export function supabaseFindings(postgrest, realtime) {
	const out = [];
	const schemas = String(postgrest?.db_schema ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	if (schemas.join(',') !== 'public') {
		out.push(
			`Supabase dashboard: Project Settings > Data API > Exposed schemas must be only "public" (now: ${schemas.join(', ') || 'unknown'}) (ADR-021, deploy/README.md)`
		);
	}
	if (realtime?.private_only !== true) {
		// null: never changed in the dashboard, so still the default (public access on).
		const now = { false: 'on', null: 'on, the default' }[realtime?.private_only] ?? 'unknown';
		out.push(
			`Supabase dashboard: Realtime > Settings > turn off "Allow public access" (now: ${now}) (ADR-023, deploy/README.md)`
		);
	}
	return out;
}

/** PostgREST root with the public key: no app table in the OpenAPI paths, or no access at all (ADR-021). */
export function exposureRootOk(status, body) {
	if ([401, 403, 404].includes(status)) return true;
	return status === 200 && JSON.stringify(Object.keys(body?.paths ?? {})) === '["/"]';
}

// --- process helpers (never print values: commands carry names only, secrets go through stdin or env) ---

function run(cmd, args, { env = process.env, input, cwd = root, ok = [0] } = {}) {
	const r = spawnSync(cmd, args, {
		cwd,
		env,
		input,
		stdio: [input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'],
	});
	if (r.error) throw new Error(`${cmd}: ${r.error.code ?? r.error.message}`);
	if (!ok.includes(r.status)) throw new Error(`${cmd} ${args[0]} exited with ${r.status}`);
	return r.status;
}

const output = (cmd, args) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8' }).stdout?.trim() ?? '';

/** Fills process.env from a gitignored env file without overriding real variables; returns the names it set. */
function loadEnvFile(file) {
	const p = path.join(root, file);
	if (!fs.existsSync(p)) return [];
	const added = [];
	for (const [name, value] of Object.entries(parseEnv(fs.readFileSync(p, 'utf8')))) {
		if (process.env[name] === undefined && value !== '') {
			process.env[name] = value;
			added.push(name);
		}
	}
	return added;
}

function sshClient(env) {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zivali-deploy-'));
	process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
	let key = env.HETZNER_SSH_KEY;
	// A key's content (CI secret) goes to a private temp file; otherwise the value is a path.
	if (key.includes('PRIVATE KEY')) {
		const file = path.join(tmp, 'id');
		fs.writeFileSync(file, key.endsWith('\n') ? key : `${key}\n`, { mode: 0o600 });
		key = file;
	}
	// The host key is pinned (HETZNER_KNOWN_HOSTS): never trust a key on first use.
	const knownHosts = path.join(tmp, 'known_hosts');
	fs.writeFileSync(knownHosts, `${env.HETZNER_KNOWN_HOSTS}\n`);
	const opts = [
		...['-i', key, '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=15'],
		...['-o', `UserKnownHostsFile=${knownHosts}`, '-o', 'StrictHostKeyChecking=yes'],
	];
	const host = env.HETZNER_HOST.includes('@') ? env.HETZNER_HOST : `deploy@${env.HETZNER_HOST}`;
	return {
		run: (command, input) => run('ssh', [...opts, host, command], { input }),
		capture: (command, input) =>
			spawnSync('ssh', [...opts, host, command], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] }),
		copy: (files, dest) => run('scp', [...opts, '-r', ...files, `${host}:${dest}`]),
		/** A remote command reading this side's stream on stdin. */
		spawn: (command) => spawn('ssh', [...opts, host, command], { stdio: ['pipe', 'inherit', 'inherit'] }),
	};
}

/** The description that marks a deploy's port 22 rule; --close-ssh removes every rule carrying it. */
export const TEMPORARY = '(temporary)';

function hetznerFirewall(env, fetchFn) {
	const api = async (p, init = {}) => {
		const res = await fetchFn(`https://api.hetzner.cloud/v1/firewalls${p}`, {
			...init,
			headers: { Authorization: `Bearer ${env.HETZNER_API_TOKEN}`, 'Content-Type': 'application/json' },
		});
		if (!res.ok) throw new Error(`Hetzner firewall API answered ${res.status}`);
		return res.json();
	};
	return {
		rules: async () => (await api(`/${env.HETZNER_FIREWALL_ID}`)).firewall.rules,
		set: async (rules) => {
			const { actions } = await api(`/${env.HETZNER_FIREWALL_ID}/actions/set_rules`, {
				method: 'POST',
				body: JSON.stringify({ rules }),
			});
			for (const { id } of actions) {
				for (let i = 0; i < 30 && (await api(`/actions/${id}`)).action.status === 'running'; i++) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}
		},
	};
}

/**
 * The Hetzner Cloud Firewall opens port 22 to the admin IP only. With HETZNER_API_TOKEN and HETZNER_FIREWALL_ID (CI),
 * a deploy gives this machine's public IPv4 its own temporary rule; the returned function removes it again (and the
 * workflow's always() step runs --close-ssh in case this process never gets there).
 */
async function openSsh(env, fetchFn) {
	if (!env.HETZNER_API_TOKEN || !env.HETZNER_FIREWALL_ID) return async () => {};
	const firewall = hetznerFirewall(env, fetchFn);
	const ip = (await (await fetchFn('https://api.ipify.org')).text()).trim();
	const rule = `deploy ${ip} ${TEMPORARY}`;
	const others = async () => (await firewall.rules()).filter((r) => r.description !== rule);
	await firewall.set([
		...(await others()),
		{ direction: 'in', protocol: 'tcp', port: '22', source_ips: [`${ip}/32`], description: rule },
	]);
	console.log('Hetzner firewall: SSH opened for this machine');
	return async () => {
		await firewall.set(await others());
		console.log('Hetzner firewall: SSH closed again');
	};
}

/** Removes every temporary deploy rule (any IP, any run); returns how many there were. */
async function closeSsh(env, fetchFn) {
	const firewall = hetznerFirewall(env, fetchFn);
	const rules = await firewall.rules();
	const keep = rules.filter((r) => !String(r.description ?? '').includes(TEMPORARY));
	if (keep.length < rules.length) await firewall.set(keep);
	return rules.length - keep.length;
}

// --- checks ---

/** HeadBucket on the EU endpoint (read-only). */
function r2Head(env) {
	const { S3Client, HeadBucketCommand } = apiRequire('@aws-sdk/client-s3');
	const client = new S3Client({
		region: 'auto',
		endpoint: `https://${env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
		credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
		forcePathStyle: true,
	});
	return (bucket) => client.send(new HeadBucketCommand({ Bucket: bucket }));
}

async function checkBuckets(env, head) {
	const out = [];
	for (const [name, fallback] of Object.entries(BUCKETS)) {
		const bucket = env[name] || fallback;
		try {
			await head(bucket);
		} catch (err) {
			const status = err?.$metadata?.httpStatusCode;
			out.push(
				status === 404
					? `R2 bucket ${bucket} not found on the EU endpoint: create it in the EU jurisdiction (deploy/README.md, R2)`
					: `R2 bucket ${bucket}: HeadBucket failed (${status ?? err?.name}); check the R2 token (deploy/README.md, R2)`
			);
		}
	}
	return out;
}

async function checkSupabase(env, fetchFn) {
	const get = (p) =>
		fetchFn(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}${p}`, {
			headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` },
		});
	let postgrest, realtime;
	try {
		[postgrest, realtime] = await Promise.all([get('/postgrest'), get('/config/realtime')]);
	} catch {
		return ['Supabase Management API not reachable (api.supabase.com)'];
	}
	if (!postgrest.ok || !realtime.ok) {
		return [
			`Supabase Management API answered ${postgrest.status}/${realtime.status}: check SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF`,
		];
	}
	return supabaseFindings(await postgrest.json(), await realtime.json());
}

/** `remote.sh check` over SSH (the script goes on stdin, so it works before the first deploy); read-only. */
function checkVps(ssh, target) {
	const script = fs.readFileSync(path.join(root, 'deploy/remote.sh'), 'utf8');
	const res = ssh.capture(`sh -s -- check ${target}`, script);
	if (res.status === 0) return [];
	const lines = (res.stdout ?? '').split('\n').filter((line) => line.startsWith('NEEDS-INPUT: '));
	if (lines.length) return lines.map((line) => `VPS: ${line.slice('NEEDS-INPUT: '.length)}`);
	return [`VPS: SSH to HETZNER_HOST failed (exit ${res.status}; deploy/README.md, VPS)`];
}

// --- steps ---

/**
 * BuildKit layer cache in the GitHub Actions cache, one scope per image: only when the Actions runtime is exposed to
 * run steps (deploy.yml does it, with a docker-container builder), so a workstation build passes nothing. mode=min
 * keeps the final stage's layers (the api's emulated apt-get layer); the build stages copy the whole repo before
 * `pnpm install`, so their layers change on every commit. A cache error never fails the build.
 */
export function cacheArgs(env, scope) {
	if (!scope || !env.ACTIONS_RUNTIME_TOKEN || !(env.ACTIONS_RESULTS_URL || env.ACTIONS_CACHE_URL)) return [];
	return [
		'--cache-from',
		`type=gha,scope=${scope}`,
		'--cache-to',
		`type=gha,mode=min,scope=${scope},ignore-error=true`,
	];
}

function buildImage(dockerfile, tag, buildEnv = {}, cacheScope = '') {
	const args = ['buildx', 'build', '--platform', PLATFORM, '-f', dockerfile, '-t', tag, '--load'];
	args.push(...cacheArgs(process.env, cacheScope));
	// `--build-arg NAME` without a value: Docker reads it from the environment, so no value is on a command line.
	for (const name of Object.keys(buildEnv)) args.push('--build-arg', name);
	run('docker', [...args, '.'], { env: { ...process.env, ...buildEnv } });
}

function checkImage(tag) {
	const arch = output('docker', ['image', 'inspect', '-f', '{{.Os}}/{{.Architecture}}', tag]);
	if (arch !== PLATFORM) throw new Error(`${tag} is ${arch || 'missing'}, expected ${PLATFORM}`);
}

/** Env for the local tools of the dry run: none of the deploy credentials, the local apps/api values, the scratch DB. */
function localEnv(dropped, dbUrl) {
	const apiEnvFile = path.join(apiDir, '.env.local');
	const local = fs.existsSync(apiEnvFile) ? parseEnv(fs.readFileSync(apiEnvFile, 'utf8')) : {};
	const env = { ...process.env };
	for (const name of [...dropped, ...ALL_CREDENTIALS]) delete env[name];
	// The tests' global setup runs `prisma` from PATH (spelled Path on Windows).
	const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
	const bin = path.join(root, 'node_modules/.bin');
	return {
		...env,
		...local,
		DATABASE_URL: dbUrl,
		DIRECT_URL: dbUrl,
		[pathKey]: `${bin}${path.delimiter}${env[pathKey] ?? ''}`,
	};
}

async function withScratchDb(dropped, fn) {
	const apiEnvFile = path.join(apiDir, '.env.local');
	const local = fs.existsSync(apiEnvFile) ? parseEnv(fs.readFileSync(apiEnvFile, 'utf8')) : {};
	// Moved local ports: DATABASE_URL/DIRECT_URL in the environment win, as in pnpm verify; never a remote database.
	const { DIRECT_URL, DATABASE_URL } = process.env;
	const base = [DIRECT_URL, DATABASE_URL, local.DIRECT_URL, local.DATABASE_URL].find((url) => url && isLocalDb(url));
	if (!base) throw new Error('no local DATABASE_URL (apps/api/.env.local, created by pnpm install)');
	const name = `zivali_dry_run_${process.pid}`;
	const adminUrl = new URL(scratchUrl(base, 'postgres'));
	adminUrl.search = '';
	const { Client } = apiRequire('pg');
	const admin = new Client({ connectionString: adminUrl.toString() });
	try {
		await admin.connect();
	} catch {
		throw new Error('local database not reachable: start it with `pnpm db:start`');
	}
	await admin.query(`create database "${name}"`);
	try {
		return await fn(localEnv(dropped, scratchUrl(base, name)), name);
	} finally {
		await admin.query(`drop database if exists "${name}" with (force)`);
		await admin.end();
	}
}

const prismaCli = path.join(root, 'node_modules/prisma/build/index.js');
const vitestCli = path.join(root, 'node_modules/vitest/vitest.mjs');

async function dryRun(target, { skipImages, dropped }) {
	const steps = [];
	const step = async (name, fn) => {
		console.log(`\n> ${name}`);
		const started = Date.now();
		try {
			const note = await fn();
			steps.push({ name, result: note ?? 'ok', s: (Date.now() - started) / 1000 });
		} catch (err) {
			steps.push({ name, result: `FAILED: ${err.message}`, s: (Date.now() - started) / 1000 });
		}
	};
	const webEnv = webBuildEnv(process.env);
	if (skipImages) {
		steps.push({ name: `images (${PLATFORM})`, result: 'skipped (--skip-images)', s: 0 });
	} else {
		await step(`api image (${PLATFORM}): apps/api/Dockerfile`, () => {
			buildImage('apps/api/Dockerfile', 'zivali-api:dry-run');
			checkImage('zivali-api:dry-run');
			const pgDump = output('docker', [
				'run',
				'--rm',
				'--platform',
				PLATFORM,
				'zivali-api:dry-run',
				'pg_dump',
				'--version',
			]);
			if (!/ 17\./.test(pgDump)) throw new Error(`pg_dump 17 missing in the image (${pgDump || 'none'})`);
			return `ok (${pgDump})`;
		});
		await step(`web image (${PLATFORM}): apps/web/Dockerfile`, () => {
			buildImage('apps/web/Dockerfile', `zivali-web:${target}-dry-run`, webEnv);
			checkImage(`zivali-web:${target}-dry-run`);
			const missing = WEB_ARGS_NEEDED.filter((name) => !webEnv[name]);
			return missing.length ? `ok (built without ${missing.join(', ')})` : 'ok';
		});
	}
	await step('migrations from zero on a scratch local database, the seed, migrate diff, ADR-021 security tests', () =>
		withScratchDb(dropped, (env, name) => {
			run(process.execPath, [prismaCli, 'migrate', 'deploy'], { cwd: apiDir, env });
			// After the migrations, as remote.sh does, and as staging: reference data only, the fixture seeders skip
			// themselves. MEDIA_BASE_URL is required outside APP_ENV=local; the seed never uses it.
			const seedEnv = { ...env, APP_ENV: 'staging', MEDIA_BASE_URL: 'https://media.example.invalid' };
			run(process.execPath, [prismaCli, 'db', 'seed'], { cwd: apiDir, env: seedEnv });
			const drift = run(
				process.execPath,
				[
					prismaCli,
					'migrate',
					'diff',
					'--from-config-datasource',
					'--to-schema',
					'prisma/schemas',
					'--exit-code',
				],
				{ cwd: apiDir, env, ok: [0, 2] }
			);
			if (drift === 2) throw new Error('the migrations do not produce prisma/schemas (run `pnpm db:migrate`)');
			run(process.execPath, [vitestCli, 'run', 'test/security'], { cwd: apiDir, env });
			return `ok (database ${name}, dropped)`;
		})
	);
	console.log('\nDry run summary');
	for (const { name, result, s } of steps)
		console.log(`  ${result.startsWith('FAILED') ? 'x' : '-'} ${name}: ${result} [${s.toFixed(0)} s]`);
	return steps.every(({ result }) => !result.startsWith('FAILED'));
}

function releaseTag(target) {
	if (target === 'staging') return output('git', ['rev-parse', 'HEAD']).slice(0, 12);
	const tag = output('git', ['describe', '--tags', '--exact-match', 'HEAD']);
	if (!/^v\d+\.\d+\.\d+/.test(tag)) throw new Error('production deploys a version tag: check out vX.Y.Z first');
	return tag;
}

/** GETs only: the public hostnames, the web's version, and ADR-021 (the public key reaches no app table). */
async function smoke(env, tag, fetchFn, { attempts = 12, delayMs = 5000 } = {}) {
	const h = { web: env.WEB_HOST, api: env.API_HOST };
	const retry = async (name, fn) => {
		for (let i = 1; ; i++) {
			const ok = await fn().catch(() => false);
			if (ok) return console.log(`  - ${name}: ok`);
			if (i === attempts) throw new Error(`smoke check failed: ${name}`);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	};
	await retry('api /ping', async () => (await (await fetchFn(`https://${h.api}/ping`)).text()).includes('pong'));
	await retry('api /v1/health/ready', async () => (await fetchFn(`https://${h.api}/v1/health/ready`)).status === 200);
	await retry(
		`web /api/health reports ${tag}`,
		async () => (await (await fetchFn(`https://${h.web}/api/health`)).json()).version === tag
	);
	await retry('web home', async () => (await fetchFn(`https://${h.web}/`)).status === 200);
	const rest = (p, headers = {}) =>
		fetchFn(`${env.SUPABASE_URL}/rest/v1${p}`, { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, ...headers } });
	await retry('PostgREST root exposes no app table', async () => {
		const res = await rest('/');
		return exposureRootOk(res.status, res.status === 200 ? await res.json() : undefined);
	});
	for (const table of PROBE_TABLES) {
		await retry(`PostgREST refuses ${table} (public and app profile)`, async () => {
			const statuses = [
				(await rest(`/${table}?select=*`)).status,
				(await rest(`/${table}?select=*`, { 'Accept-Profile': 'app' })).status,
			];
			return statuses.every((status) => status >= 400);
		});
	}
}

/** docker save | zstd | ssh "zstd -dc | docker load": the images go straight to the VPS, no registry. */
async function transferImages(ssh, images) {
	const exited = (child, name) =>
		new Promise((resolve, reject) => {
			child.on('error', (err) => reject(new Error(`${name}: ${err.code ?? err.message}`)));
			child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${name} exited with ${code}`))));
		});
	const save = spawn('docker', ['save', ...images], { stdio: ['ignore', 'pipe', 'inherit'] });
	const zstd = spawn('zstd', ['-T0', '-3', '-q', '-c'], { stdio: ['pipe', 'pipe', 'inherit'] });
	const load = ssh.spawn('zstd -dc | docker load');
	await Promise.all([
		pipeline(save.stdout, zstd.stdin),
		pipeline(zstd.stdout, load.stdin),
		exited(save, 'docker save'),
		exited(zstd, 'zstd'),
		exited(load, 'ssh docker load'),
	]);
}

async function deploy(target, env, io) {
	if (output('git', ['status', '--porcelain'])) throw new Error('uncommitted changes: commit them first');
	if (spawnSync('zstd', ['--version']).error)
		throw new Error('zstd is not installed here (deploy/README.md, Deploy)');
	const tag = releaseTag(target);
	const images = imageNames(target, tag);
	console.log(`\nDeploying ${target} ${tag}: ${images.api}, ${images.web}`);
	// The web image inlines each environment's NEXT_PUBLIC_* values, so its cache is per environment.
	buildImage('apps/api/Dockerfile', images.api, {}, 'api');
	buildImage('apps/web/Dockerfile', images.web, webBuildEnv(env), `web-${target}`);
	checkImage(images.api);
	checkImage(images.web);
	const ssh = io.ssh(env);
	ssh.run('mkdir -p /opt/zivali');
	ssh.copy(['deploy/docker-compose.yml', 'deploy/remote.sh', 'deploy/nginx'], '/opt/zivali/');
	// certbot's renewals read the token from here; it arrives on stdin and the file is private to the deploy user.
	ssh.run(
		'umask 077 && cat > /opt/zivali/cloudflare.ini && chmod 600 /opt/zivali/cloudflare.ini',
		`dns_cloudflare_api_token = ${env.CERTBOT_CLOUDFLARE_TOKEN}\n`
	);
	console.log('\nImages to the VPS (docker save | zstd | docker load)');
	await transferImages(ssh, [images.api, images.web]);
	try {
		// Migrations, the seed, then up and healthy within 180 s (else remote.sh starts the running release again),
		// nginx reload.
		ssh.run(`sh /opt/zivali/remote.sh deploy ${target} ${images.api} ${images.web} ${tag}`);
		console.log('\nSmoke checks');
		await smoke(env, tag, io.fetch);
	} catch (err) {
		// release.env still names the running release; rollback starts it again (a no-op when it never stopped).
		console.error(`${err.message}: back to the running release`);
		try {
			ssh.run(`sh /opt/zivali/remote.sh rollback ${target}`);
		} catch {
			console.error('rollback failed: deploy/README.md, Rollback');
		}
		throw err;
	}
	ssh.run(`sh /opt/zivali/remote.sh promote ${target}`);
	console.log(`\n${target} ${tag} is live. Rollback: deploy/README.md, Rollback.`);
}

/** Everything that reaches outside this process, swappable in tests. */
const IO = {
	env: process.env,
	loadEnv: loadEnvFile,
	fetch: (...args) => fetch(...args),
	r2: r2Head,
	ssh: sshClient,
	dryRun,
	deploy,
};

export async function main(argv, overrides = {}) {
	const io = { ...IO, ...overrides };
	const [target, ...flags] = argv;
	if (!TARGETS.includes(target)) {
		console.error(
			'usage: node scripts/deploy.mjs <staging|production> [--deploy] [--strict] [--skip-images] [--yes] | --close-ssh'
		);
		return 2;
	}
	const envFile = target === 'production' ? '.env.production.local' : '.env.local';
	const dropped = io.loadEnv(envFile);
	const env = io.env;
	if (flags.includes('--close-ssh')) {
		if (!env.HETZNER_API_TOKEN || !env.HETZNER_FIREWALL_ID) {
			console.log('Hetzner firewall: HETZNER_API_TOKEN or HETZNER_FIREWALL_ID not set, nothing to close');
			return 0;
		}
		console.log(`Hetzner firewall: ${await closeSsh(env, io.fetch)} temporary SSH rule(s) removed`);
		return 0;
	}
	const write = flags.includes('--deploy');
	if (write && target === 'production' && !env.CI && !flags.includes('--yes')) {
		console.error(
			'production from a workstation: add --yes to confirm (CI approves in the production environment)'
		);
		return 1;
	}
	const missing = missingVars(env);
	if (Object.keys(missing).length) {
		console.log(
			`NEEDS-INPUT (${target}): missing variables (names only; values go in ${envFile} or the GitHub environment):`
		);
		for (const [group, names] of Object.entries(missing)) console.log(`  ${group}: ${names.join(', ')}`);
	}
	if (missing.Hetzner)
		console.log(`  VPS (checked over SSH once HETZNER_* are set): ${VPS_ITEMS(target).join(', ')}`);
	// The firewall changes only for a deploy; a check without --deploy needs the admin IP.
	const closeOwnSsh = write && !missing.Hetzner ? await openSsh(env, io.fetch) : async () => {};
	let blocked = Object.keys(missing).length > 0;
	try {
		const findings = [];
		if (!missing.R2) findings.push(...(await checkBuckets(env, io.r2(env))));
		if (!missing.Supabase) findings.push(...(await checkSupabase(env, io.fetch)));
		if (!missing.Hetzner) findings.push(...checkVps(io.ssh(env), target));
		for (const finding of findings) console.log(`NEEDS-INPUT (${target}): ${finding}`);
		blocked ||= findings.length > 0;
		if (!blocked && write) {
			await io.deploy(target, env, io);
			return 0;
		}
	} finally {
		await closeOwnSsh();
	}
	if (blocked && flags.includes('--strict')) return 1;
	console.log(`\nDry run for ${target} (nothing is written outside this machine).`);
	return (await io.dryRun(target, { skipImages: flags.includes('--skip-images'), dropped })) ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	main(process.argv.slice(2)).then(
		(code) => process.exit(code),
		(err) => {
			console.error(`deploy failed: ${err.message}`);
			process.exit(1);
		}
	);
}
