// /docs: Swagger UI over the committed openapi.json. Open in local and staging; not mounted in production (404).
// Outside /v1 and not in the spec itself. Own CSP here only: swagger-ui needs inline styles and data: images.
import { Router } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { config } from '../lib/config.ts';
import spec from '../openapi.json' with { type: 'json' };

export function createDocsRouter(appEnv: typeof config.APP_ENV): Router {
	const router = Router();
	if (appEnv === 'production') return router; // empty: falls through to the 404 handler
	router.use(
		helmet.contentSecurityPolicy({
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", 'data:'],
				connectSrc: ["'self'"],
				objectSrc: ["'none'"],
				frameAncestors: ["'none'"],
			},
		})
	);
	router.use(swaggerUi.serve, swaggerUi.setup(spec));
	return router;
}

export default createDocsRouter(config.APP_ENV);
