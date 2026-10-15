// pino: JSON in staging and production, pretty locally, silent in tests. Never log PII, tokens or request bodies.
import { pino } from 'pino';

import { config } from './config.ts';

export const logger = pino({
	level: config.NODE_ENV === 'test' ? 'silent' : config.APP_ENV === 'local' ? 'debug' : 'info',
	base: { service: 'api', version: config.APP_VERSION },
	redact: ['req.headers.authorization', 'req.headers.cookie'],
	...(config.APP_ENV === 'local' && config.NODE_ENV !== 'test' && { transport: { target: 'pino-pretty' } }),
});

export type { Logger } from 'pino';
