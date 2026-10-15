// /docs Swagger UI (TASK-3.12): open in local and staging, admin + aal2 only in production.
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '../../prisma/prisma.ts';
import { createDocsRouter } from '../../routes/docs.routes.ts';
import { testApp } from '../helpers/app.ts';
import { createAuthUser, deleteAuthUsers, signTestToken } from '../helpers/token.ts';

const appFor = (env: 'local' | 'staging' | 'production') => testApp((a) => a.use('/docs', createDocsRouter(env)));

const ids: string[] = [];
async function bearer(role: 'USER' | 'ADMIN', aal: 'aal1' | 'aal2') {
	const id = await createAuthUser();
	ids.push(id);
	await prisma.profiles.upsert({ where: { id }, update: { role }, create: { id, role } });
	return `Bearer ${await signTestToken({ sub: id, aal })}`;
}

afterAll(async () => {
	await deleteAuthUsers(ids);
});

describe('GET /docs', () => {
	it.each(['local', 'staging'] as const)('serves Swagger UI with its own CSP in %s', async (env) => {
		const res = await request(appFor(env)).get('/docs/');
		expect(res.status).toBe(200);
		expect(res.text).toContain('swagger-ui');
		expect(res.headers['content-security-policy']).toContain("style-src 'self' 'unsafe-inline'");
	});

	it('requires a token in production', async () => {
		expect((await request(appFor('production')).get('/docs/')).status).toBe(401);
	});

	it('rejects a non-admin in production', async () => {
		const res = await request(appFor('production'))
			.get('/docs/')
			.set('Authorization', await bearer('USER', 'aal2'));
		expect(res.status).toBe(403);
	});

	it('rejects an admin without aal2 in production', async () => {
		const res = await request(appFor('production'))
			.get('/docs/')
			.set('Authorization', await bearer('ADMIN', 'aal1'));
		expect(res.status).toBe(403);
	});

	it('serves an admin with aal2 in production', async () => {
		const res = await request(appFor('production'))
			.get('/docs/')
			.set('Authorization', await bearer('ADMIN', 'aal2'));
		expect(res.status).toBe(200);
	});
});
