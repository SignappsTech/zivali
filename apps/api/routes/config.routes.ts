// /v1/config: wiring only.
import { Router } from 'express';

import ConfigController from '../controllers/config.controller.ts';
import { PublicConfigSchema } from '../domains/config/index.ts';
import { apiRoutes } from '../lib/openapi.ts';

const router = Router();
const route = apiRoutes(router, '/v1/config');

route(
	{
		method: 'get',
		path: '/public',
		operationId: 'getPublicConfig',
		summary: 'Public feature and content flags',
		description:
			'Every app_config key with is_public = true, as { key: value } (C1). Cached: `Cache-Control: public, max-age=300`.',
		responses: { 200: { description: 'Public flags by key', schema: PublicConfigSchema } },
	},
	ConfigController.getPublic
);

export default router;
