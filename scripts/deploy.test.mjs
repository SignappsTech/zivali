import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	exposureRootOk,
	imageNames,
	main,
	missingVars,
	REQUIRED,
	scratchUrl,
	supabaseFindings,
	TEMPORARY,
	webBuildEnv,
} from './deploy.mjs';

const all = Object.fromEntries(
	Object.values(REQUIRED)
		.flat()
		.map((name) => [name, `value-of-${name}`])
);

test('missingVars groups the missing names and treats empty values as missing', () => {
	assert.deepEqual(missingVars(all), {});
	const { HETZNER_SSH_KEY, R2_ACCOUNT_ID, ...rest } = all;
	assert.ok(HETZNER_SSH_KEY && R2_ACCOUNT_ID);
	assert.deepEqual(missingVars({ ...rest, WEB_HOST: '' }), {
		Hetzner: ['HETZNER_SSH_KEY'],
		Hostnames: ['WEB_HOST'],
		R2: ['R2_ACCOUNT_ID'],
	});
	// Names only: nothing in the result is a value.
	assert.ok(!JSON.stringify(missingVars({ HETZNER_HOST: 'secret-host' })).includes('secret-host'));
});

test('missingVars: the pinned host key and certbot token are required, with no fallbacks', () => {
	const { HETZNER_KNOWN_HOSTS, CERTBOT_CLOUDFLARE_TOKEN, ...rest } = all;
	assert.ok(HETZNER_KNOWN_HOSTS && CERTBOT_CLOUDFLARE_TOKEN);
	assert.deepEqual(missingVars({ ...rest, CLOUDFLARE_API_TOKEN: 'x' }), {
		Hetzner: ['HETZNER_KNOWN_HOSTS'],
		TLS: ['CERTBOT_CLOUDFLARE_TOKEN'],
	});
});

test('imageNames: local names, one api image, a web image per environment (NEXT_PUBLIC_* are build-time)', () => {
	assert.deepEqual(imageNames('staging', 'abc123'), {
		api: 'zivali-api:abc123',
		web: 'zivali-web:staging-abc123',
	});
});

test('webBuildEnv derives the public URLs from the hostnames and never passes a live Stripe key', () => {
	const env = {
		SUPABASE_URL: 'https://x.supabase.co',
		SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
		WEB_HOST: 'staging.najdimo.si',
		API_HOST: 'api-staging.najdimo.si',
	};
	assert.deepEqual(webBuildEnv({ ...env, STRIPE_PUBLISHABLE_KEY: 'pk_test_1' }), {
		NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
		NEXT_PUBLIC_API_URL: 'https://api-staging.najdimo.si',
		NEXT_PUBLIC_APP_URL: 'https://staging.najdimo.si',
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_1',
	});
	assert.equal(
		webBuildEnv({ ...env, STRIPE_PUBLISHABLE_KEY: 'pk_live_1' }).NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
		undefined
	);
	assert.deepEqual(webBuildEnv({}), {});
});

test('scratchUrl keeps the local server and ?schema=app, and refuses a remote database', () => {
	assert.equal(
		scratchUrl('postgresql://postgres:postgres@127.0.0.1:55322/postgres?schema=app', 'zivali_dry_run_1'),
		'postgresql://postgres:postgres@127.0.0.1:55322/zivali_dry_run_1?schema=app'
	);
	assert.throws(() => scratchUrl('postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:5432/postgres', 'x'));
});

test('supabaseFindings: exposed schemas only public (ADR-021), Realtime private only (ADR-023)', () => {
	assert.deepEqual(supabaseFindings({ db_schema: 'public' }, { private_only: true }), []);
	const findings = supabaseFindings({ db_schema: 'public, graphql_public' }, { private_only: false });
	assert.equal(findings.length, 2);
	assert.match(findings[0], /Exposed schemas must be only "public" \(now: public, graphql_public\)/);
	assert.match(findings[1], /Allow public access" \(now: on\)/);
	// The Management API answers null until the setting is first changed: public access is on by default.
	assert.match(supabaseFindings({ db_schema: 'public' }, { private_only: null })[0], /now: on, the default/);
	assert.match(supabaseFindings({ db_schema: 'public' }, {})[0], /now: unknown/);
});

test('exposureRootOk: no app table in the PostgREST OpenAPI paths, or no access at all', () => {
	assert.equal(exposureRootOk(200, { paths: { '/': {} } }), true);
	assert.equal(exposureRootOk(401), true);
	assert.equal(exposureRootOk(200, { paths: { '/': {}, '/profiles': {} } }), false);
	assert.equal(exposureRootOk(500), false);
});

/** A fake outside world for main(): records every call; only GETs, HeadBucket and `remote.sh check` are reads. */
function fakeWorld(firewallRules) {
	const calls = [];
	let rules = firewallRules;
	const res = (body, status = 200) => ({
		ok: status < 400,
		status,
		json: async () => body,
		text: async () => String(body),
	});
	const record = (kind) => (arg) => calls.push({ kind, arg });
	return {
		calls,
		rules: () => rules,
		io: {
			env: { ...all, HETZNER_API_TOKEN: 'fake', HETZNER_FIREWALL_ID: '1' },
			loadEnv: () => [],
			fetch: async (url, init = {}) => {
				calls.push({ kind: 'fetch', method: init.method ?? 'GET', url });
				if (url === 'https://api.ipify.org') return res('203.0.113.7');
				if (url.endsWith('/postgrest')) return res({ db_schema: 'public' });
				if (url.endsWith('/config/realtime')) return res({ private_only: true });
				if (url.endsWith('/actions/set_rules')) {
					rules = JSON.parse(init.body).rules;
					return res({ actions: [] });
				}
				if (url.startsWith('https://api.hetzner.cloud/')) return res({ firewall: { rules } });
				return res({}, 404);
			},
			r2: () => async (bucket) => calls.push({ kind: 'r2.head', arg: bucket }),
			ssh: () => ({
				capture: (command) => {
					calls.push({ kind: 'ssh.capture', arg: command });
					return { status: 0, stdout: '' };
				},
				run: record('ssh.run'),
				copy: record('ssh.copy'),
				spawn: record('ssh.spawn'),
			}),
			dryRun: async () => {
				calls.push({ kind: 'dryRun' });
				return true;
			},
			deploy: async () => calls.push({ kind: 'deploy' }),
		},
	};
}

const admin = { direction: 'in', protocol: 'tcp', port: '22', source_ips: ['198.51.100.1/32'], description: 'admin' };

test('main without --deploy, full credentials: read-only checks and the dry run, nothing written anywhere', async () => {
	const world = fakeWorld([admin]);
	assert.equal(await main(['staging', '--skip-images'], world.io), 0);
	const kinds = world.calls.map((call) => call.kind);
	assert.deepEqual(
		kinds.filter((kind) => kind !== 'fetch'),
		['r2.head', 'r2.head', 'r2.head', 'ssh.capture', 'dryRun']
	);
	for (const call of world.calls.filter((c) => c.kind === 'fetch')) {
		// No firewall API, no IP lookup: only the Supabase Management API, read-only.
		assert.equal(call.method, 'GET');
		assert.match(call.url, /^https:\/\/api\.supabase\.com\/v1\/projects\//);
	}
	assert.equal(world.calls.find((c) => c.kind === 'ssh.capture').arg, 'sh -s -- check staging');
	assert.deepEqual(world.rules(), [admin]);
});

test('main --deploy: SSH open for this machine only around the deploy, closed again; no dry run', async () => {
	const world = fakeWorld([admin]);
	let rulesDuringDeploy;
	world.io.deploy = async () => {
		rulesDuringDeploy = world.rules();
	};
	assert.equal(await main(['staging', '--deploy', '--strict'], world.io), 0);
	assert.deepEqual(
		rulesDuringDeploy.map((r) => [r.source_ips[0], r.description]),
		[
			['198.51.100.1/32', 'admin'],
			['203.0.113.7/32', `deploy 203.0.113.7 ${TEMPORARY}`],
		]
	);
	assert.deepEqual(world.rules(), [admin]);
	assert.ok(!world.calls.some((c) => c.kind === 'dryRun'));
});

test('main --deploy --strict with a missing variable: exit 1, no deploy, no dry run', async () => {
	const world = fakeWorld([admin]);
	world.io.env.WEB_HOST = '';
	assert.equal(await main(['staging', '--deploy', '--strict'], world.io), 1);
	assert.ok(!world.calls.some((c) => ['deploy', 'dryRun'].includes(c.kind)));
	assert.deepEqual(world.rules(), [admin]);
});

test('--close-ssh removes every temporary rule, whatever its IP, and keeps the rest', async () => {
	const world = fakeWorld([
		admin,
		{ ...admin, source_ips: ['192.0.2.1/32'], description: `deploy 192.0.2.1 ${TEMPORARY}` },
		{ ...admin, source_ips: ['192.0.2.2/32'], description: `deploy 192.0.2.2 ${TEMPORARY}` },
	]);
	assert.equal(await main(['production', '--close-ssh'], world.io), 0);
	assert.deepEqual(world.rules(), [admin]);
	assert.ok(!world.calls.some((c) => c.kind !== 'fetch'));
});
