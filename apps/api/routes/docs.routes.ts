// /docs: the OpenAPI document built from the route declarations (same content as the committed openapi.json).
// Mounted by app.ts in local and staging only. A Swagger UI page at /docs is a later task.
import { Router } from 'express';

import { buildOpenApiDocument } from '../lib/openapi.ts';

const router = Router();

router.get('/openapi.json', (_req, res) => {
	res.json(buildOpenApiDocument());
});

export default router;
