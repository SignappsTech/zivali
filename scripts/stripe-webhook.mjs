// Stripe test-mode webhook endpoint for an environment's API (C13, TASK-32.1). Usage:
//   node scripts/stripe-webhook.mjs <staging|production> [--env-file=<path>]
// Creates https://<API_HOST>/v1/webhooks/stripe once, subscribed to the events the webhook handles, and writes its
// signing secret to the env file it read as STRIPE_WEBHOOK_SECRET (never printed); the operator copies it to
// /opt/zivali/<target>/.env (deploy/README.md). An existing endpoint is kept (events brought up to date) while the file
// still holds its secret; without one it is recreated, since Stripe shows a secret only at creation.
// Values: staging from the root .env.local, production from .env.production.local (--env-file overrides);
// STRIPE_SECRET_KEY and API_HOST, real environment variables win. Only sk_test_/rk_test_ keys: live mode is refused.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const EVENTS = [
	'checkout.session.completed',
	'checkout.session.async_payment_succeeded',
	'checkout.session.async_payment_failed',
	'checkout.session.expired',
	'charge.refunded',
];

/** `text` with `NAME=value` set: the existing line replaced, else appended. */
export function setEnvLine(text, name, value) {
	const line = `${name}=${value}`;
	const re = new RegExp(`^${name}=.*$`, 'm');
	if (re.test(text)) return text.replace(re, line);
	return `${text}${text === '' || text.endsWith('\n') ? '' : '\n'}${line}\n`;
}

/**
 * Makes sure one endpoint for `url` exists with EVENTS. Returns { action: 'kept' | 'updated' | 'created', secret? };
 * `secret` only when created. `stripe(method, path, form?)` is the API call (injected in tests).
 */
export async function ensureWebhook({ key, url, hasSecret, stripe }) {
	if (!/^(sk|rk)_test_/.test(key ?? ''))
		throw new Error('STRIPE_SECRET_KEY must be a test key (sk_test_ or rk_test_)');
	const { data } = await stripe('GET', '/v1/webhook_endpoints?limit=100');
	const existing = data.find((e) => e.url === url);
	if (existing && hasSecret) {
		const same =
			EVENTS.length === existing.enabled_events.length &&
			EVENTS.every((e) => existing.enabled_events.includes(e));
		if (same) return { action: 'kept' };
		await stripe('POST', `/v1/webhook_endpoints/${existing.id}`, eventsForm());
		return { action: 'updated' };
	}
	if (existing) await stripe('DELETE', `/v1/webhook_endpoints/${existing.id}`);
	const form = eventsForm();
	form.set('url', url);
	form.set('description', 'Najdimo API (C13), managed by scripts/stripe-webhook.mjs');
	const created = await stripe('POST', '/v1/webhook_endpoints', form);
	if (created.livemode) throw new Error('Stripe returned a live-mode endpoint: refused');
	return { action: 'created', secret: created.secret };
}

function eventsForm() {
	const form = new URLSearchParams();
	EVENTS.forEach((event, i) => form.set(`enabled_events[${i}]`, event));
	return form;
}

async function main() {
	const [target, ...flags] = process.argv.slice(2);
	if (!['staging', 'production'].includes(target)) {
		console.error('usage: node scripts/stripe-webhook.mjs <staging|production> [--env-file=<path>]');
		process.exit(2);
	}
	const fileFlag = flags.find((f) => f.startsWith('--env-file='))?.slice('--env-file='.length);
	const file = path.resolve(root, fileFlag ?? (target === 'production' ? '.env.production.local' : '.env.local'));
	const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
	const env = { ...parseEnv(text), ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v)) };
	const missing = ['STRIPE_SECRET_KEY', 'API_HOST'].filter((name) => !env[name]);
	if (missing.length) {
		console.error(`NEEDS-INPUT (${target}): ${missing.join(', ')} (in ${path.relative(root, file) || file})`);
		process.exit(1);
	}
	const stripe = async (method, apiPath, form) => {
		const res = await fetch(`https://api.stripe.com${apiPath}`, {
			method,
			headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
			body: form,
		});
		const json = await res.json();
		if (!res.ok)
			throw new Error(
				`stripe ${method} ${apiPath.split('?')[0]}: HTTP ${res.status} ${json.error?.message ?? ''}`
			);
		return json;
	};
	const url = `https://${env.API_HOST}/v1/webhooks/stripe`;
	const result = await ensureWebhook({
		key: env.STRIPE_SECRET_KEY,
		url,
		hasSecret: Boolean(parseEnv(text).STRIPE_WEBHOOK_SECRET),
		stripe,
	});
	if (result.secret)
		fs.writeFileSync(file, setEnvLine(text, 'STRIPE_WEBHOOK_SECRET', result.secret), { mode: 0o600 });
	console.log(`${target}: webhook endpoint ${url} ${result.action} (test mode, ${EVENTS.length} events)`);
	if (result.secret)
		console.log(
			`STRIPE_WEBHOOK_SECRET written to ${path.basename(file)} (value not shown); copy it to /opt/zivali/${target}/.env`
		);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	main().catch((err) => {
		console.error(err.message);
		process.exit(1);
	});
}
