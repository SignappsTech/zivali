import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	credential,
	exposureRootOk,
	imageNames,
	missingVars,
	REQUIRED,
	scratchUrl,
	supabaseFindings,
	webBuildEnv,
} from './deploy.mjs';

const all = Object.fromEntries(
	Object.values(REQUIRED)
		.flat()
		.map((name) => [name.split('|')[0], `value-of-${name}`])
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

test('certbot token: CERTBOT_CLOUDFLARE_TOKEN, else CLOUDFLARE_API_TOKEN; NEEDS-INPUT only without both', () => {
	const { CERTBOT_CLOUDFLARE_TOKEN, ...rest } = all;
	assert.ok(CERTBOT_CLOUDFLARE_TOKEN);
	assert.deepEqual(missingVars(rest), { TLS: ['CERTBOT_CLOUDFLARE_TOKEN or CLOUDFLARE_API_TOKEN'] });
	assert.deepEqual(missingVars({ ...rest, CLOUDFLARE_API_TOKEN: 'b' }), {});
	const name = 'CERTBOT_CLOUDFLARE_TOKEN|CLOUDFLARE_API_TOKEN';
	assert.equal(credential({ CERTBOT_CLOUDFLARE_TOKEN: 'a', CLOUDFLARE_API_TOKEN: 'b' }, name), 'a');
	assert.equal(credential({ CERTBOT_CLOUDFLARE_TOKEN: '', CLOUDFLARE_API_TOKEN: 'b' }, name), 'b');
});

test('imageNames: one api image, a web image per environment (NEXT_PUBLIC_* are build-time)', () => {
	assert.deepEqual(imageNames('PBozic', 'staging', 'abc123'), {
		api: 'ghcr.io/pbozic/zivali-api:abc123',
		web: 'ghcr.io/pbozic/zivali-web:staging-abc123',
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
	assert.match(supabaseFindings({ db_schema: 'public' }, {})[0], /now: unknown/);
});

test('exposureRootOk: no app table in the PostgREST OpenAPI paths, or no access at all', () => {
	assert.equal(exposureRootOk(200, { paths: { '/': {} } }), true);
	assert.equal(exposureRootOk(401), true);
	assert.equal(exposureRootOk(200, { paths: { '/': {}, '/profiles': {} } }), false);
	assert.equal(exposureRootOk(500), false);
});
