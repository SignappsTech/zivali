// Builds the Express app in the ADR-020 middleware order; server.ts listens, tests use it with Supertest.
// Must stay the first import: it installs the zod-to-openapi extension before any schema module loads.
import '@zivali/validation/openapi';
import compression from 'compression';
import cors from 'cors';
import express, { type Request } from 'express';
import { rateLimit, type RateLimitInfo } from 'express-rate-limit';
import helmet from 'helmet';

import { config } from './lib/config.ts';
import { AppError } from './lib/errors.ts';
import { requestLogger } from './lib/logger.ts';
import { errorHandler, notFound } from './middleware/error.middleware.ts';
import { requestId } from './middleware/requestId.middleware.ts';
import docsRoutes from './routes/docs.routes.ts';
import v1Routes from './routes/index.ts';

export const app = express();

// Behind nginx (one proxy hop; it sets X-Forwarded-For to the client address, taken from Cloudflare's
// CF-Connecting-IP), so req.ip is the client address for rate limits.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(requestId);
app.use(requestLogger());
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
		handler: (req, _res, next) => {
			const retryAfter = Math.ceil(
				(((req as Request & { rateLimit: RateLimitInfo }).rateLimit.resetTime?.getTime() ??
					Date.now() + 60_000) -
					Date.now()) /
					1000
			);
			next(new AppError('RATE_LIMITED', 'Too many requests', { retry_after_s: Math.max(1, retryAfter) }));
		},
	})
);

app.get('/ping', (_req, res) => {
	res.json({ message: 'pong' });
});
app.use('/docs', docsRoutes);
app.use('/v1', v1Routes);

app.use(notFound);
app.use(errorHandler);

export default app;
