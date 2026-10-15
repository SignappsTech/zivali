// /docs Swagger UI (TASK-3.12, TASK-6.17): open in local and staging, not mounted (404) in production.
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createDocsRouter } from '../../routes/docs.routes.ts';
import { testApp } from '../helpers/app.ts';

const appFor = (env: 'local' | 'staging' | 'production') => testApp((a) => a.use('/docs', createDocsRouter(env)));

describe('GET /docs', () => {
	it.each(['local', 'staging'] as const)('serves Swagger UI with its own CSP in %s', async (env) => {
		const res = await request(appFor(env)).get('/docs/');
		expect(res.status).toBe(200);
		expect(res.text).toContain('swagger-ui');
		expect(res.headers['content-security-policy']).toContain("style-src 'self' 'unsafe-inline'");
	});

	it('is not mounted in production', async () => {
		expect((await request(appFor('production')).get('/docs/')).status).toBe(404);
	});
});
