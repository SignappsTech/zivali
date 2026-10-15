// Each mapping of the central error middleware (C1), through validate() and controllers without try/catch.
import express from 'express';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { Prisma } from '../../generated/client.ts';
import { AppError } from '../../lib/errors.ts';
import { logger } from '../../lib/logger.ts';
import { errorHandler, notFound } from '../../middleware/error.middleware.ts';
import { validate } from '../../middleware/validate.middleware.ts';

const prismaError = (code: string) =>
	new Prisma.PrismaClientKnownRequestError('db detail that must not leak', {
		code,
		clientVersion: Prisma.prismaVersion.client,
	});

const app = express();
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '1mb' }));
app.get('/app-error', () => {
	throw new AppError('FORBIDDEN', 'Not your report', { report_id: 'r1' });
});
app.get('/rate-limited', async () => {
	throw new AppError('RATE_LIMITED', 'Too many reports', { retry_after_s: 1800 });
});
app.get('/p2002', async () => {
	throw prismaError('P2002');
});
app.get('/p2025', async () => {
	throw prismaError('P2025');
});
app.get('/pool-timeout', async () => {
	throw new Error('x', { cause: new Error('timeout exceeded when trying to connect') });
});
app.get('/boom', async () => {
	throw new Error('secret internals');
});
app.get('/bad-mapper', () => {
	z.object({ id: z.uuid() }).parse({ id: 'nope' }); // a .parse outside validate(): our bug, not bad input
});
app.post(
	'/items/:id',
	validate(z.object({ id: z.uuid() }), 'params'),
	validate(z.object({ limit: z.coerce.number().int().max(50) }), 'query'),
	validate(z.object({ location: z.object({ lat: z.number().min(-90).max(90) }) })),
	(req, res) => {
		res.json({ params: req.params, query: req.query, body: req.body });
	}
);
app.use(notFound);
app.use(errorHandler);

describe('error middleware', () => {
	it('maps AppError to its status with code, message and details', async () => {
		const res = await request(app).get('/app-error');
		expect(res.status).toBe(403);
		expect(res.body).toEqual({
			error: { code: 'FORBIDDEN', message: 'Not your report', details: { report_id: 'r1' } },
		});
	});

	it('maps RATE_LIMITED to 429 with Retry-After', async () => {
		const res = await request(app).get('/rate-limited');
		expect(res.status).toBe(429);
		expect(res.headers['retry-after']).toBe('1800');
		expect(res.body.error).toEqual({
			code: 'RATE_LIMITED',
			message: 'Too many reports',
			details: { retry_after_s: 1800 },
		});
	});

	it('maps Prisma P2002 to 409 CONFLICT without database details', async () => {
		const res = await request(app).get('/p2002');
		expect(res.status).toBe(409);
		expect(res.body).toEqual({ error: { code: 'CONFLICT', message: 'Resource already exists' } });
	});

	it('maps Prisma P2025 to 404 NOT_FOUND', async () => {
		const res = await request(app).get('/p2025');
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
	});

	it('maps unknown errors to 500 INTERNAL without leaking the message', async () => {
		const res = await request(app).get('/boom');
		expect(res.status).toBe(500);
		expect(res.body).toEqual({ error: { code: 'INTERNAL', message: 'Internal server error' } });
		expect(JSON.stringify(res.body)).not.toContain('secret');
	});

	it('maps a ZodError thrown outside validate() to 500 INTERNAL', async () => {
		const res = await request(app).get('/bad-mapper');
		expect(res.status).toBe(500);
		expect(res.body).toEqual({ error: { code: 'INTERNAL', message: 'Internal server error' } });
	});

	it('maps malformed JSON to VALIDATION', async () => {
		const res = await request(app)
			.post(`/items/${crypto.randomUUID()}?limit=5`)
			.set('content-type', 'application/json')
			.send('{"location":');
		expect(res.status).toBe(400);
		expect(res.body.error).toMatchObject({ code: 'VALIDATION', details: { reason: 'entity.parse.failed' } });
	});
});

describe('validate middleware (ZodError → VALIDATION)', () => {
	const id = crypto.randomUUID();

	it('maps a pool connect timeout to 503 SERVICE_UNAVAILABLE with Retry-After', async () => {
		const res = await request(app).get('/pool-timeout');
		expect(res.status).toBe(503);
		expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
		expect(res.headers['retry-after']).toBe('1');
	});

	it('passes parsed body, query and params to the controller', async () => {
		const res = await request(app)
			.post(`/items/${id}?limit=5`)
			.send({ location: { lat: 46.05 }, extra: 'stripped' });
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ params: { id }, query: { limit: 5 }, body: { location: { lat: 46.05 } } });
	});

	it('rejects a bad body with dotted-path issues', async () => {
		const res = await request(app)
			.post(`/items/${id}?limit=5`)
			.send({ location: { lat: 123 } });
		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe('VALIDATION');
		expect(res.body.error.issues).toEqual([{ path: 'location.lat', message: expect.any(String) }]);
	});

	it('rejects bad query and params', async () => {
		const badQuery = await request(app)
			.post(`/items/${id}?limit=500`)
			.send({ location: { lat: 1 } });
		expect(badQuery.status).toBe(400);
		expect(badQuery.body.error.issues[0].path).toBe('limit');

		const badParams = await request(app)
			.post('/items/not-a-uuid?limit=5')
			.send({ location: { lat: 1 } });
		expect(badParams.status).toBe(400);
		expect(badParams.body.error.issues[0].path).toBe('id');
	});
});
