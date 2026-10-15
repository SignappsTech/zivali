// C1/C6: request logs carry the route pattern only; locations in bodies and query strings never reach the logs.
import express, { type ErrorRequestHandler } from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { apiRoutes } from '../../lib/openapi.ts';
import { loggerOptions, requestLogger } from '../../lib/logger.ts';

const lines: string[] = [];
const capture = pino({ ...loggerOptions, level: 'info' }, { write: (line: string) => void lines.push(line) });

const app = express();
app.use(requestLogger(capture), express.json());
app.post('/v1/reports/:id', (req, res) => {
	// A careless hand-written log line: the redact config drops the location keys.
	req.log.info(
		{ body: req.body, query: req.query, location: req.body.location, lat: 46.0512, details: { lng: 14.5051 } },
		'handler'
	);
	res.json({ ok: true });
});
app.get('/v1/reports', (_req, res) => {
	res.json({ items: [], next_cursor: null });
});
describe('request logger', () => {
	it('never logs locations from bodies or query strings, only route patterns', async () => {
		const point = { lat: 46.0512, lng: 14.5051 };
		await request(app)
			.post('/v1/reports/r1?near=46.0512,14.5051')
			.send({ ...point, location: point });
		await request(app).get('/v1/reports?near=46.0512,14.5051&radius_km=5');
		await request(app).get('/v1/nowhere?near=46.0512,14.5051');
		await new Promise((resolve) => setImmediate(resolve));

		const output = lines.join('');
		for (const leak of ['46.05', '14.50', 'near', 'radius_km', '"lat"', '"lng"', 'location']) {
			expect(output).not.toContain(leak);
		}

		const entries = lines.map((line) => JSON.parse(line));
		expect(entries.some((entry) => entry.msg === 'handler')).toBe(true);
		expect(entries.filter((entry) => entry.msg === 'request completed').map((entry) => entry.route)).toEqual([
			'POST /v1/reports/:id',
			'GET /v1/reports',
			'GET (no route)',
		]);
	});

	it('logs the full route pattern for errored requests (Express restores baseUrl on next(err))', async () => {
		lines.length = 0;
		const router = express.Router();
		const failing = express();
		failing.use(requestLogger(capture));
		apiRoutes(router, '/v1/health')(
			{
				method: 'get',
				path: '/ready',
				operationId: 'getLoggerErrorCase',
				summary: 's',
				responses: { 200: { description: 'ok' } },
			},
			(_req, _res, next) => next(new Error('boom'))
		);
		failing.use('/v1/health', router);
		failing.use(((_err, _req, res, _next) => void res.status(500).end()) as ErrorRequestHandler);
		await request(failing).get('/v1/health/ready');
		await new Promise((resolve) => setImmediate(resolve));
		const done = lines.map((line) => JSON.parse(line)).find((entry) => entry.route);
		expect(done.route).toBe('GET /v1/health/ready');
	});
});
