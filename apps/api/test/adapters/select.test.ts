import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { aiOn } from '../../adapters/ai/index.ts';
import { embedderOn } from '../../adapters/embedder/index.ts';
import { createAdapters } from '../../adapters/index.ts';
import { mockEvent, signWebhook } from '../../adapters/payments/mock.ts';
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
		expect(a.ai.provider).toBe('mock');
		expect(await a.ai.extract({ jpegBase64: '', sha256: 'a' })).toMatchObject({ outcome: 'ok' });
		expect((await a.embedder.embed([{ jpegBase64: '', sha256: 'a' }], 'm'))[0]).toHaveLength(1024);
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

	const prodFull: Config = {
		...blank,
		NODE_ENV: 'production',
		STORAGE_PROVIDER: 'r2',
		R2_ACCOUNT_ID: 'a',
		R2_ACCESS_KEY_ID: 'k',
		R2_SECRET_ACCESS_KEY: 's',
		PAYMENTS_PROVIDER: 'stripe',
		STRIPE_SECRET_KEY: 'sk_test_x',
		STRIPE_WEBHOOK_SECRET: 'whsec_x',
		EMAIL_PROVIDER: 'brevo',
		BREVO_API_KEY: 'b',
		EMAIL_FROM: 'a@b.si',
		PUSH_PROVIDER: 'expo',
		CAPTCHA_PROVIDER: 'turnstile',
		TURNSTILE_SECRET_KEY: 't',
		AI_PROVIDER: 'anthropic',
		ANTHROPIC_API_KEY: 'a',
		EMBEDDER_PROVIDER: 'voyage',
		VOYAGE_API_KEY: 'v',
	};

	it('production boots with every provider configured', () => {
		expect(() => createAdapters(prodFull)).not.toThrow();
	});

	it('an unset embedder is off in staging and production, never voyage or the mock (C20)', () => {
		for (const APP_ENV of ['staging', 'production'] as const) {
			for (const NODE_ENV of ['production', 'development'] as const) {
				const { embedder } = createAdapters({ ...prodFull, APP_ENV, NODE_ENV, EMBEDDER_PROVIDER: undefined });
				expect(embedderOn(embedder)).toBe(false);
				expect(() => embedder.embed([], 'm')).toThrow(/not enabled/);
			}
		}
		// Locally an unset provider is the mock, even with a key.
		expect(createAdapters({ ...blank, VOYAGE_API_KEY: 'v' }).embedder.provider).toBe('mock');
		expect(createAdapters({ ...blank, EMBEDDER_PROVIDER: 'voyage', VOYAGE_API_KEY: 'v' }).embedder.provider).toBe(
			'voyage'
		);
	});

	it('an unset AI provider is off in staging and production, never anthropic or the mock (TASK-40.1 review)', () => {
		for (const APP_ENV of ['staging', 'production'] as const) {
			for (const NODE_ENV of ['production', 'development'] as const) {
				const { ai } = createAdapters({ ...prodFull, APP_ENV, NODE_ENV, AI_PROVIDER: undefined });
				expect(aiOn(ai)).toBe(false);
				expect(() => ai.extract({ jpegBase64: '', sha256: 'a' })).toThrow(/not enabled/);
			}
		}
		// Locally an unset provider is the mock, even with a key; anthropic only when set explicitly.
		expect(createAdapters({ ...blank, ANTHROPIC_API_KEY: 'a' }).ai.provider).toBe('mock');
		expect(createAdapters({ ...blank, AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'a' }).ai.provider).toBe(
			'anthropic'
		);
		expect(createAdapters({ ...blank, AI_PROVIDER: 'anthropic' }).ai.provider).toBe('mock');
	});

	it('the AI mock never runs outside APP_ENV=local: mock, or anthropic without a key, is off (CH-562)', () => {
		for (const APP_ENV of ['staging', 'production'] as const) {
			for (const settings of [
				{ AI_PROVIDER: 'mock' as const },
				{ AI_PROVIDER: 'anthropic' as const, ANTHROPIC_API_KEY: undefined },
			]) {
				const { ai } = createAdapters({ ...blank, APP_ENV, NODE_ENV: 'development', ...settings });
				expect(aiOn(ai)).toBe(false);
				expect(() => ai.extract({ jpegBase64: '', sha256: 'a' })).toThrow(/not enabled/);
			}
		}
		// NODE_ENV=production still refuses both at boot.
		expect(() => createAdapters({ ...prodFull, APP_ENV: 'staging', AI_PROVIDER: 'mock' })).toThrow(/AI_PROVIDER/);
	});

	it('the embedder mock never runs outside APP_ENV=local: mock, or voyage without a key, is off (TASK-40.3 parity)', () => {
		for (const APP_ENV of ['staging', 'production'] as const) {
			for (const settings of [
				{ EMBEDDER_PROVIDER: 'mock' as const },
				{ EMBEDDER_PROVIDER: 'voyage' as const, VOYAGE_API_KEY: undefined },
			]) {
				const { embedder } = createAdapters({ ...blank, APP_ENV, NODE_ENV: 'development', ...settings });
				expect(embedderOn(embedder)).toBe(false);
				expect(() => embedder.embed([], 'm')).toThrow(/not enabled/);
			}
		}
		// Locally the mock stays; NODE_ENV=production still refuses it at boot.
		expect(createAdapters({ ...blank, EMBEDDER_PROVIDER: 'mock' }).embedder.provider).toBe('mock');
		expect(() => createAdapters({ ...prodFull, APP_ENV: 'staging', EMBEDDER_PROVIDER: 'mock' })).toThrow(
			/EMBEDDER_PROVIDER/
		);
	});

	it('minio never passes on built-in credentials in production', () => {
		expect(() => createAdapters({ ...prodFull, STORAGE_PROVIDER: 'minio' })).toThrow(/STORAGE_PROVIDER/);
	});

	it('production accepts an explicit off and the adapter throws SERVICE_UNAVAILABLE', async () => {
		const off: Config = { ...blank, NODE_ENV: 'production' };
		for (const k of ['STORAGE', 'PAYMENTS', 'EMAIL', 'PUSH', 'CAPTCHA', 'AI', 'EMBEDDER'] as const) {
			(off as Record<string, unknown>)[`${k}_PROVIDER`] = 'off';
		}
		const a = createAdapters(off);
		expect(() => a.ai.extract({ jpegBase64: '', sha256: 'a' })).toThrowError(
			expect.objectContaining({ name: 'AppError', code: 'SERVICE_UNAVAILABLE' })
		);
		expect(() => a.embedder.embed([], 'm')).toThrow(/not enabled/);
		expect(() => a.payments.parseWebhook('{}', undefined)).toThrow(/not enabled/);
		expect(() => a.storage.head({ bucket: 'private', key: 'k' })).toThrow(/not enabled/);
		// Unconfigured and not off still fails at boot.
		expect(() => createAdapters({ ...off, AI_PROVIDER: undefined })).toThrow(/AI_PROVIDER/);
	});

	it('stripe accepts any matching v1 signature (secret rotation)', () => {
		const { payments } = createAdapters({
			...blank,
			PAYMENTS_PROVIDER: 'stripe',
			STRIPE_SECRET_KEY: 'sk_test_x',
			STRIPE_WEBHOOK_SECRET: 'whsec_x',
		});
		const body = JSON.stringify({
			id: 'e1',
			type: 'checkout.session.async_payment_failed',
			livemode: false,
			data: { object: { id: 'cs_1' } },
		});
		const t = Math.floor(Date.now() / 1000);
		const sig = createHmac('sha256', 'whsec_x').update(`${t}.${body}`).digest('hex');
		const ok = `t=${t},v1=${'0'.repeat(64)},v1=${sig}`;
		expect(payments.parseWebhook(body, ok)).toMatchObject({
			id: 'e1',
			type: 'checkout.session.async_payment_failed',
			object: { id: 'cs_1', metadata: {} },
		});
		expect(() => payments.parseWebhook(body, `t=${t},v1=${'0'.repeat(64)}`)).toThrow(/signature/);
	});

	it('refuses Stripe live keys even outside production', () => {
		for (const key of ['sk_live_x', 'rk_live_x', 'pk_live_x']) {
			expect(() => createAdapters({ ...blank, STRIPE_SECRET_KEY: key })).toThrow(/live keys/);
		}
	});

	it('mock payments verify the webhook signature', () => {
		const { payments } = createAdapters({ ...blank, MOCK_WEBHOOK_SECRET: 's' });
		const body = mockEvent('success', 'p1');
		expect(payments.parseWebhook(body, signWebhook(body, 's')).object.metadata).toEqual({ payment_id: 'p1' });
		expect(() => payments.parseWebhook(body, 'bad')).toThrow(/signature/);
		expect(() => payments.parseWebhook(body, signWebhook(body, 'other'))).toThrow(/signature/);
	});

	it('adapters are reachable as ctx.adapters', () => {
		expect(systemCtx().adapters.storage).toBeDefined();
	});
});
