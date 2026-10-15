// The /v1 router: one mount line per area router (routes/<area>.routes.ts, declared with apiRoutes(router, '/v1/<area>')).
import { Router } from 'express';

import configRoutes from './config.routes.ts';
import healthRoutes from './health.routes.ts';

const router = Router();

router.use('/health', healthRoutes);
router.use('/config', configRoutes);

export default router;
