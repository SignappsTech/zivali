import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { createPayments } from '../../adapters/payments/index.ts';
import { app } from '../../app.ts';
import { ConfigDomain } from '../../domains/config/index.ts';
import { config } from '../../lib/config.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';

const prefix = `test.${randomUUID()}`;

beforeEach(() => configStore.invalidate());

afterAll(async () => {
	await prisma.app_config.deleteMany({ where: { key: { startsWith: prefix } } });
	configStore.invalidate();
});

describe('GET /v1/config/public', () => {
	it('returns only is_public keys as { key: value }, cacheable for 5 minutes', async () => {
		await prisma.app_config.createMany({
			data: [
				{ key: `${prefix}.flag`, value: true, is_public: true },
				{ key: `${prefix}.groups`, value: [{ name: 'Ljubljana' }], is_public: true },
				{ key: `${prefix}.private`, value: 'internal', is_public: false },
			],
		});
		const res = await request(app).get('/v1/config/public');
		expect(res.status).toBe(200);
		expect(res.headers['cache-control']).toBe('public, max-age=300');
		expect(res.body).toMatchObject({ [`${prefix}.flag`]: true, [`${prefix}.groups`]: [{ name: 'Ljubljana' }] });
		expect(res.body).not.toHaveProperty(`${prefix}.private`);
	});

	it('reports payments.enabled from the payments adapter: true with a provider, false with PAYMENTS_PROVIDER=off', async () => {
		// Tests run the mock provider (vitest.config.ts).
		expect((await request(app).get('/v1/config/public')).body['payments.enabled']).toBe(true);
		const off = createPayments({ ...config, PAYMENTS_PROVIDER: 'off' });
		const flags = await ConfigDomain.getPublicConfig(undefined, {
			...systemCtx(),
			adapters: { ...adapters, payments: off },
		});
		expect(flags['payments.enabled']).toBe(false);
	});

	it('serves app_config from the 60 s store until it is invalidated', async () => {
		const key = `${prefix}.cached`;
		await prisma.app_config.create({ data: { key, value: 1, is_public: true } });
		expect((await request(app).get('/v1/config/public')).body[key]).toBe(1);
		await prisma.app_config.update({ where: { key }, data: { value: 2 } });
		expect((await request(app).get('/v1/config/public')).body[key]).toBe(1);
		expect(await configStore.get(key)).toBe(1);
		configStore.invalidate();
		expect((await request(app).get('/v1/config/public')).body[key]).toBe(2);
	});
});
