// Deploy to the Hetzner VPS (ADR-016). Usage:
//   node scripts/deploy.mjs <staging|production> [--dry-run] [--skip-images] [--strict] [--yes]
// The GitHub Actions workflow (.github/workflows/deploy.yml) runs this same script, so both paths take the same steps:
//   1. checks: credentials (names only), the three R2 buckets (HeadBucket on the EU endpoint), the Supabase settings
//      of ADR-021/ADR-023 (Management API, read-only GETs) and the VPS files and TLS certificate (`remote.sh check`
//      over SSH, read-only);
//   2. build the linux/arm64 api (also the worker) and web images and push them to GHCR;
//   3. over SSH: copy deploy/ to /opt/zivali, write cloudflare.ini (certbot's token, mode 600), pull, one-off
//      `prisma migrate deploy`, restart, nginx and certbot up, nginx reload (deploy/remote.sh);
//   4. smoke checks: /ping, /v1/health/ready, web home and the ADR-021 exposure checks on Supabase.
// Anything missing prints NEEDS-INPUT with variable names (never values) and runs the dry run instead: image builds,
// migrations from zero on a scratch database on the local Supabase server + `prisma migrate diff`, the ADR-021 security
// tests on it; exit 0 when the dry run passes. --strict (CI) exits 1 on NEEDS-INPUT; --dry-run forces the dry run;
// --skip-images skips the image builds of the dry run; --yes confirms a production deploy from a workstation.
// Values: staging from the root .env.local, production from .env.production.local; real environment variables win.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
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
	Hetzner: ['HETZNER_HOST', 'HETZNER_SSH_KEY'],
	GitHub: ['GHCR_TOKEN'],
	// This environment's public hostnames (staging: staging.najdimo.si, api-staging.najdimo.si).
	Hostnames: ['WEB_HOST', 'API_HOST'],
	// certbot's DNS-01 token (Zone DNS Edit on najdimo.si only); `A|B` = A, else B. Written to /opt/zivali/cloudflare.ini.
	TLS: ['CERTBOT_CLOUDFLARE_TOKEN|CLOUDFLARE_API_TOKEN'],
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

/** Missing credentials by group; empty values count as missing; `A|B` is satisfied by either and shown as "A or B". */
export function missingVars(env) {
	const out = {};
	for (const [group, names] of Object.entries(REQUIRED)) {
		const missing = names.filter((name) => !name.split('|').some((alt) => env[alt]));
		if (missing.length) out[group] = missing.map((name) => name.replace('|', ' or '));
	}
	return out;
}

/** The value of a credential with alternatives (`A|B`). */
export const credential = (env, name) =>
	name
		.split('|')
		.map((alt) => env[alt])
		.find(Boolean);
const ALL_CREDENTIALS = Object.values(REQUIRED).flatMap((names) => names.flatMap((name) => name.split('|')));

/** Server-side items only an SSH check can see (`remote.sh check`); named up front when SSH is not possible yet. */
export const VPS_ITEMS = (target) => [
	'/opt/zivali/edge.env',
	`/opt/zivali/${target}/.env`,
	`/opt/zivali/${target}/web.env`,
	'TLS certificate (first issuance)',
];

export function imageNames(owner, target, tag) {
	const base = `ghcr.io/${owner.toLowerCase()}`;
	return { api: `${base}/zivali-api:${tag}`, web: `${base}/zivali-web:${target}-${tag}` };
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
		const now = realtime?.private_only === false ? 'on' : 'unknown';
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
	const opts = ['-i', key, '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=15'];
	if (env.HETZNER_KNOWN_HOSTS) {
		const file = path.join(tmp, 'known_hosts');
		fs.writeFileSync(file, `${env.HETZNER_KNOWN_HOSTS}\n`);
		opts.push('-o', `UserKnownHostsFile=${file}`, '-o', 'StrictHostKeyChecking=yes');
	} else {
		opts.push('-o', 'StrictHostKeyChecking=accept-new');
	}
	const host = env.HETZNER_HOST.includes('@') ? env.HETZNER_HOST : `root@${env.HETZNER_HOST}`;
	return {
		run: (command, input) => run('ssh', [...opts, host, command], { input }),
		capture: (command, input) =>
			spawnSync('ssh', [...opts, host, command], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] }),
		copy: (files, dest) => run('scp', [...opts, '-r', ...files, `${host}:${dest}`]),
	};
}

/**
 * The Hetzner Cloud Firewall opens port 22 to the admin IP only. With HETZNER_API_TOKEN and HETZNER_FIREWALL_ID (CI),
 * this machine's public IPv4 gets its own temporary rule for the deploy; the returned function removes it again.
 */
async function openSsh(env) {
	if (!env.HETZNER_API_TOKEN || !env.HETZNER_FIREWALL_ID) return async () => {};
	const api = async (p, init = {}) => {
		const res = await fetch(`https://api.hetzner.cloud/v1/firewalls${p}`, {
			...init,
			headers: { Authorization: `Bearer ${env.HETZNER_API_TOKEN}`, 'Content-Type': 'application/json' },
		});
		if (!res.ok) throw new Error(`Hetzner firewall API answered ${res.status}`);
		return res.json();
	};
	const ip = (await (await fetch('https://api.ipify.org')).text()).trim();
	const rule = `deploy ${ip} (temporary)`;
	const others = async () =>
		(await api(`/${env.HETZNER_FIREWALL_ID}`)).firewall.rules.filter((r) => r.description !== rule);
	const setRules = async (rules) => {
		const { actions } = await api(`/${env.HETZNER_FIREWALL_ID}/actions/set_rules`, {
			method: 'POST',
			body: JSON.stringify({ rules }),
		});
		for (const { id } of actions) {
			for (let i = 0; i < 30 && (await api(`/actions/${id}`)).action.status === 'running'; i++) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}
	};
	await setRules([
		...(await others()),
		{ direction: 'in', protocol: 'tcp', port: '22', source_ips: [`${ip}/32`], description: rule },
	]);
	console.log('Hetzner firewall: SSH opened for this machine');
	return async () => {
		await setRules(await others());
		console.log('Hetzner firewall: SSH closed again');
	};
}

// --- checks ---

async function checkBuckets(env) {
	const { S3Client, HeadBucketCommand } = apiRequire('@aws-sdk/client-s3');
	const client = new S3Client({
		region: 'auto',
		endpoint: `https://${env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
		credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
		forcePathStyle: true,
	});
	const out = [];
	for (const [name, fallback] of Object.entries(BUCKETS)) {
		const bucket = env[name] || fallback;
		try {
			await client.send(new HeadBucketCommand({ Bucket: bucket }));
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

async function checkSupabase(env) {
	const get = (p) =>
		fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}${p}`, {
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
function checkVps(env, target) {
	const script = fs.readFileSync(path.join(root, 'deploy/remote.sh'), 'utf8');
	const res = sshClient(env).capture(`sh -s -- check ${target}`, script);
	if (res.status === 0) return [];
	const lines = (res.stdout ?? '').split('\n').filter((line) => line.startsWith('NEEDS-INPUT: '));
	if (lines.length) return lines.map((line) => `VPS: ${line.slice('NEEDS-INPUT: '.length)}`);
	return [`VPS: SSH to HETZNER_HOST failed (exit ${res.status}; deploy/README.md, VPS)`];
}

// --- steps ---

function buildImage(dockerfile, tag, { push, buildEnv = {} }) {
	const args = ['buildx', 'build', '--platform', PLATFORM, '-f', dockerfile, '-t', tag, push ? '--push' : '--load'];
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
			buildImage('apps/api/Dockerfile', 'zivali-api:dry-run', { push: false });
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
			buildImage('apps/web/Dockerfile', `zivali-web:${target}-dry-run`, { push: false, buildEnv: webEnv });
			checkImage(`zivali-web:${target}-dry-run`);
			const missing = WEB_ARGS_NEEDED.filter((name) => !webEnv[name]);
			return missing.length ? `ok (built without ${missing.join(', ')})` : 'ok';
		});
	}
	await step('migrations from zero on a scratch local database, migrate diff, ADR-021 security tests', () =>
		withScratchDb(dropped, (env, name) => {
			run(process.execPath, [prismaCli, 'migrate', 'deploy'], { cwd: apiDir, env });
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

async function smoke(env, { attempts = 12, delayMs = 5000 } = {}) {
	const h = { web: env.WEB_HOST, api: env.API_HOST };
	const retry = async (name, fn) => {
		for (let i = 1; ; i++) {
			const ok = await fn().catch(() => false);
			if (ok) return console.log(`  - ${name}: ok`);
			if (i === attempts) throw new Error(`smoke check failed: ${name}`);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	};
	await retry('api /ping', async () => (await (await fetch(`https://${h.api}/ping`)).text()).includes('pong'));
	await retry('api /v1/health/ready', async () => (await fetch(`https://${h.api}/v1/health/ready`)).status === 200);
	await retry('web home', async () => (await fetch(`https://${h.web}/`)).status === 200);
	// ADR-021, read-only: the public key reaches no app table through PostgREST.
	const rest = (p, init = {}) =>
		fetch(`${env.SUPABASE_URL}/rest/v1${p}`, {
			...init,
			headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json', ...init.headers },
		});
	await retry('PostgREST root exposes no app table', async () => {
		const res = await rest('/');
		return exposureRootOk(res.status, res.status === 200 ? await res.json() : undefined);
	});
	for (const table of PROBE_TABLES) {
		await retry(`PostgREST refuses ${table} (GET, app profile, POST)`, async () => {
			const statuses = [
				(await rest(`/${table}?select=*`)).status,
				(await rest(`/${table}?select=*`, { headers: { 'Accept-Profile': 'app' } })).status,
				(await rest(`/${table}`, { method: 'POST', body: '{}' })).status,
			];
			return statuses.every((status) => status >= 400);
		});
	}
}

async function deploy(target, env) {
	if (output('git', ['status', '--porcelain'])) throw new Error('uncommitted changes: commit them first');
	const tag = releaseTag(target);
	const owner = env.GHCR_OWNER || 'pbozic';
	const user = env.GHCR_USER || owner;
	const images = imageNames(owner, target, tag);
	console.log(`\nDeploying ${target} ${tag}: ${images.api}, ${images.web}`);
	run('docker', ['login', 'ghcr.io', '-u', user, '--password-stdin'], { input: env.GHCR_TOKEN });
	buildImage('apps/api/Dockerfile', images.api, { push: true });
	buildImage('apps/web/Dockerfile', images.web, { push: true, buildEnv: webBuildEnv(env) });
	const ssh = sshClient(env);
	ssh.run('mkdir -p /opt/zivali');
	ssh.copy(['deploy/docker-compose.yml', 'deploy/remote.sh', 'deploy/nginx'], '/opt/zivali/');
	// certbot's renewals read the token from here; it arrives on stdin and the file is private to the deploy user.
	ssh.run(
		'umask 077 && cat > /opt/zivali/cloudflare.ini && chmod 600 /opt/zivali/cloudflare.ini',
		`dns_cloudflare_api_token = ${credential(env, 'CERTBOT_CLOUDFLARE_TOKEN|CLOUDFLARE_API_TOKEN')}\n`
	);
	// The registry login lives only for this pull; the token arrives on stdin.
	ssh.run(
		`docker login ghcr.io -u ${user} --password-stdin >/dev/null && sh /opt/zivali/remote.sh deploy ${target} ${images.api} ${images.web} ${tag}; rc=$?; docker logout ghcr.io >/dev/null; exit $rc`,
		env.GHCR_TOKEN
	);
	console.log('\nSmoke checks');
	await smoke(env);
	console.log(`\n${target} ${tag} is live. Rollback: deploy/README.md, Rollback.`);
}

async function main(argv) {
	const [target, ...flags] = argv;
	if (!TARGETS.includes(target)) {
		console.error(
			'usage: node scripts/deploy.mjs <staging|production> [--dry-run] [--skip-images] [--strict] [--yes]'
		);
		return 2;
	}
	const envFile = target === 'production' ? '.env.production.local' : '.env.local';
	const dropped = loadEnvFile(envFile);
	const env = process.env;
	const missing = missingVars(env);
	if (Object.keys(missing).length) {
		console.log(
			`NEEDS-INPUT (${target}): missing variables (names only; values go in ${envFile} or the GitHub environment):`
		);
		for (const [group, names] of Object.entries(missing)) console.log(`  ${group}: ${names.join(', ')}`);
	}
	if (missing.Hetzner)
		console.log(`  VPS (checked over SSH once HETZNER_* are set): ${VPS_ITEMS(target).join(', ')}`);
	const closeSsh = missing.Hetzner ? async () => {} : await openSsh(env);
	let blocked = Object.keys(missing).length > 0;
	try {
		const findings = [];
		if (!missing.R2) findings.push(...(await checkBuckets(env)));
		if (!missing.Supabase) findings.push(...(await checkSupabase(env)));
		if (!missing.Hetzner) findings.push(...checkVps(env, target));
		for (const finding of findings) console.log(`NEEDS-INPUT (${target}): ${finding}`);
		blocked ||= findings.length > 0;
		if (!blocked && !flags.includes('--dry-run')) {
			if (target === 'production' && !env.CI && !flags.includes('--yes')) {
				console.error(
					'production from a workstation: add --yes to confirm (CI approves in the production environment)'
				);
				return 1;
			}
			await deploy(target, env);
			return 0;
		}
	} finally {
		await closeSsh();
	}
	if (blocked && flags.includes('--strict')) return 1;
	console.log(`\nDry run for ${target} (nothing is pushed or deployed).`);
	return (await dryRun(target, { skipImages: flags.includes('--skip-images'), dropped })) ? 0 : 1;
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
