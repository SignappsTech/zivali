import { describe, expect, it } from 'vitest';

import { createAdapters } from '../../adapters/index.ts';
import { signMockWebhook } from '../../adapters/payments/mock.ts';
import { config, type Config } from '../../lib/config.ts';
import { systemCtx } from '../../lib/ctx.ts';

// Blank every adapter variable so the developer's .env.local cannot change the outcome.
const blank: Config = {
	...config,
	STORAGE_PROVIDER: undefined,
	R2_ACCOUNT_ID: undefined,
	R2_ACCESS_KEY_ID: undefined,
	R2_SECRET_ACCESS_KEY: undefined,
	PAYMENTS_PROVIDER: undefined,
	STRIPE_SECRET_KEY: undefined,
	STRIPE_WEBHOOK_SECRET: undefined,
	EMAIL_PROVIDER: undefined,
	BREVO_API_KEY: undefined,
	EMAIL_FROM: undefined,
	PUSH_PROVIDER: undefined,
	CAPTCHA_PROVIDER: undefined,
	TURNSTILE_SECRET_KEY: undefined,
	AI_PROVIDER: undefined,
	ANTHROPIC_API_KEY: undefined,
	EMBEDDER_PROVIDER: undefined,
	VOYAGE_API_KEY: undefined,
};

describe('adapter provider selection', () => {
	it('falls back to mocks without credentials outside production', async () => {
		const a = createAdapters(blank);
		expect((await a.ai.vision({ prompt: 'x', images: [] })).text).toContain('mock');
		expect((await a.embedder.embed([{ text: 'a' }]))[0]).toHaveLength(1024);
		expect(await a.captcha.verify('fail')).toBe(false);
		expect(await a.captcha.verify('ok')).toBe(true);
		await a.email.send({ to: 'a@b.si', subject: 's', html: '<p>x</p>' });
		expect(a.email.sent).toHaveLength(1);
		expect(await a.push.send([{ to: 'unregistered-1', title: 't', body: 'b' }])).toEqual([
			{ status: 'error', error: 'DeviceNotRegistered' },
		]);
		const ref = { bucket: 'private', key: 'k' } as const;
		await a.storage.put(ref, Buffer.from('x'), 'text/plain');
		expect(await a.storage.head(ref)).toMatchObject({ size: 1 });
	});

	it('a real provider without credentials still falls back to the mock', async () => {
		const a = createAdapters({ ...blank, EMAIL_PROVIDER: 'brevo', STORAGE_PROVIDER: 'r2' });
		expect(a.email.sent).toBeDefined();
		const url = await a.storage.presignGet({ bucket: 'private', key: 'k' });
		expect(url.startsWith('memory://')).toBe(true);
	});

	it('refuses mocks and missing credentials in production', () => {
		expect(() => createAdapters({ ...blank, NODE_ENV: 'production' })).toThrow(/production/);
	});

	it('refuses Stripe live keys even outside production', () => {
		for (const key of ['sk_live_x', 'rk_live_x']) {
			expect(() => createAdapters({ ...blank, STRIPE_SECRET_KEY: key })).toThrow(/live keys/);
		}
	});

	it('mock payments verify the webhook signature', () => {
		const { payments } = createAdapters({ ...blank, MOCK_WEBHOOK_SECRET: 's' });
		const body = JSON.stringify({ id: 'e1', type: 'checkout.completed', checkoutId: 'c1', metadata: {} });
		expect(payments.parseWebhook(body, signMockWebhook(body, 's')).id).toBe('e1');
		expect(() => payments.parseWebhook(body, 'bad')).toThrow(/signature/);
	});

	it('adapters are reachable as ctx.adapters', () => {
		expect(systemCtx().adapters.storage).toBeDefined();
	});
});
