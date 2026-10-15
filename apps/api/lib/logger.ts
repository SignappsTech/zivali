// pino: JSON in staging and production, pretty locally, silent in tests. Never log PII, tokens, request bodies,
// query strings or locations (C1, C6): request logs carry the route pattern only.
import type { Request } from 'express';
import { pino, type Logger, type LoggerOptions } from 'pino';
import { pinoHttp } from 'pino-http';

import { config } from './config.ts';

// Safety net for anything logged by hand ({ body }, { location }, { lat, lng }, …): those keys are dropped.
const LOCATION_KEYS = ['lat', 'lng', 'point', 'near', 'location'];
export const loggerOptions: LoggerOptions = {
	base: { service: 'api', version: config.APP_VERSION },
	redact: {
		paths: [
			'req.headers.authorization',
			'req.headers.cookie',
			'req.url',
			'req.query',
			'req.body',
			'body',
			'query',
			...LOCATION_KEYS,
			...LOCATION_KEYS.map((key) => `*.${key}`),
		],
		remove: true,
	},
};

export const logger = pino({
	...loggerOptions,
	level: config.NODE_ENV === 'test' ? 'silent' : config.APP_ENV === 'local' ? 'debug' : 'info',
	...(config.APP_ENV === 'local' && config.NODE_ENV !== 'test' && { transport: { target: 'pino-pretty' } }),
});

/** pino-http: one line per request with req_id, route pattern (`GET /v1/reports/:id`), status and duration_ms. */
export function requestLogger(base: Logger = logger) {
	return pinoHttp({
		logger: base,
		quietReqLogger: true,
		customAttributeKeys: { reqId: 'req_id', responseTime: 'duration_ms', res: 'status' },
		// Neither the URL (query strings carry ?near=) nor headers nor bodies.
		serializers: { req: () => undefined, res: (res) => res.statusCode },
		// Called for the child logger at the start (nothing matched yet: no props) and for the completion line.
		customProps: (req, res) => {
			if (!res.writableEnded) return {};
			const { method, baseUrl, route } = req as Request;
			return { route: `${method} ${route ? `${baseUrl}${route.path}` : '(no route)'}` };
		},
	});
}

export type { Logger } from 'pino';
