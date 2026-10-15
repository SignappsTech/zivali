import { readFileSync } from 'node:fs';

import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../app.ts';
import HealthDao from '../../domains/health/health.dao.ts';
import { config } from '../../lib/config.ts';
import { buildOpenApiDocument } from '../../lib/openapi.ts';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('GET /ping', () => {
	it('answers pong without touching the database', async () => {
		const res = await request(app).get('/ping');
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ message: 'pong' });
	});
});

describe('GET /v1/health/ready', () => {
	it('checks the local database and returns the version (C1 shape)', async () => {
		const res = await request(app).get('/v1/health/ready');
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, version: config.APP_VERSION, db: 'ok', queue_lag_s: null });
	});

	it('answers 503 with db down when the database check fails', async () => {
		vi.spyOn(HealthDao, 'pingDatabase').mockRejectedValue(new Error('connection refused'));
		const res = await request(app).get('/v1/health/ready');
		expect(res.status).toBe(503);
		expect(res.body).toEqual({ ok: false, version: config.APP_VERSION, db: 'down', queue_lag_s: null });
	});
});

describe('request id', () => {
	it('generates one per request', async () => {
		const res = await request(app).get('/ping');
		expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
	});

	it('keeps a well-formed incoming id and replaces a malformed one', async () => {
		const kept = await request(app).get('/ping').set('x-request-id', 'caddy-1234abcd');
		expect(kept.headers['x-request-id']).toBe('caddy-1234abcd');
		const replaced = await request(app).get('/ping').set('x-request-id', 'bad id <script>');
		expect(replaced.headers['x-request-id']).not.toBe('bad id <script>');
	});
});

describe('OpenAPI', () => {
	it('documents the health route in the committed openapi.json (the RTK Query codegen input)', () => {
		const committed = JSON.parse(readFileSync(new URL('../../openapi.json', import.meta.url), 'utf8'));
		expect(buildOpenApiDocument()).toEqual(committed);
		expect(committed.paths['/v1/health/ready'].get).toMatchObject({
			operationId: 'getHealthReady',
			tags: ['health'],
			responses: {
				200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthReady' } } } },
				429: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
			},
		});
	});
});

describe('unknown routes', () => {
	it('answer 404 NOT_FOUND in the C1 error shape, with x-request-id', async () => {
		const res = await request(app).get('/v1/does-not-exist');
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
		expect(res.headers['x-request-id']).toBeTruthy();
	});
});

describe('CORS', () => {
	it('allows requests without Origin (mobile) and does not allow unknown web origins', async () => {
		const noOrigin = await request(app).get('/ping');
		expect(noOrigin.status).toBe(200);
		const foreign = await request(app).get('/ping').set('Origin', 'https://evil.example');
		expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
	});
});
