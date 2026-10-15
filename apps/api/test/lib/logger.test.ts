// C1/C6: request logs carry the route pattern only; locations in bodies and query strings never reach the logs.
import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

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
});
