// Builds the Express app in the ADR-020 middleware order; server.ts listens, tests use it with Supertest.
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { config } from './lib/config.ts';
import { AppError } from './lib/errors.ts';
import { logger } from './lib/logger.ts';
import { errorHandler, notFound } from './middleware/error.middleware.ts';
import { requestId } from './middleware/requestId.middleware.ts';
import docsRoutes from './routes/docs.routes.ts';
import v1Routes from './routes/index.ts';

export const app = express();

// Behind Caddy (one proxy hop), so req.ip is the client address for rate limits.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(requestId);
app.use(
	pinoHttp({
		logger,
		quietReqLogger: true,
		customAttributeKeys: { reqId: 'req_id', responseTime: 'duration_ms', res: 'status' },
		// Route pattern and status only: no URLs with query strings, headers or bodies (backend.md).
		serializers: { req: () => undefined, res: (res) => res.statusCode },
		customProps: (req) => {
			const { baseUrl, route } = req as express.Request;
			return { route: route ? `${baseUrl}${route.path}` : undefined };
		},
	})
);
app.use(helmet());
// Allowlisted web origins; requests without Origin (mobile, server to server) pass.
app.use(cors({ origin: config.WEB_ORIGINS }));
app.use(compression());
// The Stripe webhook route mounts its own raw body parser above this line when it arrives (C13).
app.use(express.json({ limit: '1mb' }));
// Global soft limit per IP; per-route limits use the rateLimit middleware backed by Postgres (C1).
app.use(
	rateLimit({
		windowMs: 60_000,
		limit: 600,
		standardHeaders: 'draft-8',
		legacyHeaders: false,
		handler: (_req, _res, next) => {
			next(new AppError('RATE_LIMITED', 'Too many requests', { retry_after_s: 60 }));
		},
	})
);

app.get('/ping', (_req, res) => {
	res.json({ message: 'pong' });
});
app.use('/v1', v1Routes);
// The OpenAPI document at /docs/openapi.json in local and staging; off in production.
if (config.APP_ENV !== 'production') app.use('/docs', docsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
