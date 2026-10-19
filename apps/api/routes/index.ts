// The /v1 router: one mount line per area router (routes/<area>.routes.ts, declared with apiRoutes(router, '/v1/<area>')).
// /v1/webhooks is mounted in app.ts, before the JSON body parser (raw body for the Stripe signature, C13).
import { Router } from 'express';

import abuseReportsRoutes from './abuse-reports.routes.ts';
import adminRoutes from './admin.routes.ts';
import adsRoutes from './ads.routes.ts';
import alertSubscriptionRoutes from './alert-subscription.routes.ts';
import configRoutes from './config.routes.ts';
import conversationsRoutes from './conversations.routes.ts';
import geoRoutes from './geo.routes.ts';
import healthRoutes from './health.routes.ts';
import leadsRoutes from './leads.routes.ts';
import manageRoutes from './manage.routes.ts';
import matchesRoutes, { reportMatchesRouter } from './matches.routes.ts';
import meRoutes from './me.routes.ts';
import notificationsRoutes, { prefsRouter, pushTokensRouter } from './notifications.routes.ts';
import partnersRoutes from './partners.routes.ts';
import paymentsRoutes from './payments.routes.ts';
import petsRoutes from './pets.routes.ts';
import photoAttributesRoutes from './photo-attributes.routes.ts';
import photosRoutes from './photos.routes.ts';
import reportsRoutes from './reports.routes.ts';
import sheltersRoutes from './shelters.routes.ts';
import statsRoutes from './stats.routes.ts';
import syncRoutes from './sync.routes.ts';

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
router.use('/photos', photoAttributesRoutes);
router.use('/pets', petsRoutes);
router.use('/ads', adsRoutes);
router.use('/reports', reportMatchesRouter);
router.use('/matches', matchesRoutes);
router.use('/partners', partnersRoutes);
router.use('/leads', leadsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/sync', syncRoutes);
router.use('/stats', statsRoutes);
router.use('/abuse-reports', abuseReportsRoutes);

export default router;
