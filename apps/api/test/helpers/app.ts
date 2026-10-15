// A bare Express app with the real request id, logger, JSON parser and error middleware, for middleware tests.
import express, { type Express } from 'express';

import { requestLogger } from '../../lib/logger.ts';
import { errorHandler } from '../../middleware/error.middleware.ts';
import { requestId } from '../../middleware/requestId.middleware.ts';

export function testApp(mount: (app: Express) => void): Express {
	const app = express();
	app.use(requestId, requestLogger(), express.json());
	mount(app);
	app.use(errorHandler);
	return app;
}
