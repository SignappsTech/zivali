// apiRoutes(): one declaration validates the request in Express and documents it in OpenAPI.
import express, { Router } from 'express';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { logger } from '../../lib/logger.ts';
import { apiRoutes, buildOpenApiDocument } from '../../lib/openapi.ts';
import { errorHandler } from '../../middleware/error.middleware.ts';

const Params = z.object({ id: z.uuid() });
const Query = z.object({ dry_run: z.stringbool().default(false) });
const Body = z.object({ note: z.string().max(10) }).meta({ id: 'ConfirmMatchBody' });
const Result = z.object({ id: z.uuid(), note: z.string(), dry_run: z.boolean() }).meta({ id: 'ConfirmMatchResult' });

const router = Router();
apiRoutes(router, '/v1/matches')(
	{
		method: 'post',
		path: '/:id/confirm',
		operationId: 'confirmMatch',
		summary: 'Confirm a match',
		request: { params: Params, query: Query, body: Body },
		responses: { 200: { description: 'Confirmed', schema: Result } },
		errors: ['FORBIDDEN', 'AAL2_REQUIRED', 'NOT_FOUND'],
	},
	(req, res) => {
		res.json({ id: req.params.id, note: req.body.note, dry_run: req.query.dry_run });
	}
);

const app = express().use(pinoHttp({ logger }), express.json(), router, errorHandler);
const id = crypto.randomUUID();

describe('apiRoutes', () => {
	it('validates params, query and body from the declaration', async () => {
		const ok = await request(app).post(`/${id}/confirm?dry_run=true`).send({ note: 'yes' });
		expect(ok.status).toBe(200);
		expect(ok.body).toEqual({ id, note: 'yes', dry_run: true });

		const bad = await request(app).post('/nope/confirm').send({ note: 'far too long a note' });
		expect(bad.status).toBe(400);
		expect(bad.body.error.issues.map((issue: { path: string }) => issue.path)).toEqual(['id']);
	});

	it('registers the same schemas as an OpenAPI operation under the mount path', () => {
		const operation = buildOpenApiDocument().paths?.['/v1/matches/{id}/confirm']?.post;
		expect(operation).toMatchObject({
			operationId: 'confirmMatch',
			tags: ['matches'],
			parameters: [
				{ in: 'path', name: 'id', required: true },
				{ in: 'query', name: 'dry_run' },
			],
			requestBody: {
				content: { 'application/json': { schema: { $ref: '#/components/schemas/ConfirmMatchBody' } } },
			},
			responses: {
				200: {
					content: { 'application/json': { schema: { $ref: '#/components/schemas/ConfirmMatchResult' } } },
				},
			},
		});
	});

	it('documents the C1 error responses grouped by status, all with the Error schema', () => {
		const responses = buildOpenApiDocument().paths?.['/v1/matches/{id}/confirm']?.post?.responses ?? {};
		const errors = Object.fromEntries(
			Object.entries(responses)
				.filter(([status]) => Number(status) >= 400)
				.map(([status, response]) => [status, (response as { description: string }).description])
		);
		expect(errors).toEqual({
			400: 'VALIDATION',
			403: 'FORBIDDEN, AAL2_REQUIRED',
			404: 'NOT_FOUND',
			429: 'RATE_LIMITED',
			500: 'INTERNAL',
		});
		expect(responses['403']).toMatchObject({
			content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
		});
	});
});
