import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import configStore from '../../lib/config-store.ts';
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
