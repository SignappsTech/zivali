// The /v1 router: one mount line per area router (routes/<area>.routes.ts, declared with apiRoutes(router, '/v1/<area>')).
import { Router } from 'express';

import adminRoutes from './admin.routes.ts';
import alertSubscriptionRoutes from './alert-subscription.routes.ts';
import configRoutes from './config.routes.ts';
import conversationsRoutes from './conversations.routes.ts';
import geoRoutes from './geo.routes.ts';
import healthRoutes from './health.routes.ts';
import manageRoutes from './manage.routes.ts';
import meRoutes from './me.routes.ts';
import notificationsRoutes, { prefsRouter, pushTokensRouter } from './notifications.routes.ts';
import photosRoutes from './photos.routes.ts';
import reportsRoutes from './reports.routes.ts';
import sheltersRoutes from './shelters.routes.ts';

const router = Router();

router.use('/health', healthRoutes);
router.use('/config', configRoutes);
router.use('/me', meRoutes);
router.use('/admin', adminRoutes);
router.use('/shelters', sheltersRoutes);
router.use('/geo', geoRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/notification-prefs', prefsRouter);
router.use('/push-tokens', pushTokensRouter);
router.use('/reports', reportsRoutes);
router.use('/manage', manageRoutes);
router.use('/alert-subscription', alertSubscriptionRoutes);
router.use('/conversations', conversationsRoutes);
router.use('/photos', photosRoutes);

export default router;
