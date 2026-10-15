// /docs: Swagger UI over the committed openapi.json. Open in local and staging; in production admin-only (aal2).
// Outside /v1 and not in the spec itself. Own CSP here only: swagger-ui needs inline styles and data: images.
import { Router } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { config } from '../lib/config.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { requireAal2, requireRole } from '../middleware/permission.middleware.ts';
import spec from '../openapi.json' with { type: 'json' };

export function createDocsRouter(appEnv: typeof config.APP_ENV): Router {
	const router = Router();
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
	if (appEnv === 'production') router.use(authMiddleware, requireRole('admin'), requireAal2);
	router.use(swaggerUi.serve, swaggerUi.setup(spec));
	return router;
}

export default createDocsRouter(config.APP_ENV);
