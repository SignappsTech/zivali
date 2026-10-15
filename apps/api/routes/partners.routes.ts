// /v1/partners (C14): the live partner stats for the "Oglašujte pri nas" page, public. Wiring only.
import { Router } from 'express';

import { PartnerStats } from '@zivali/validation';

import PartnersController from '../controllers/partners.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';

const router = Router();
const route = apiRoutes(router, '/v1/partners');

route(
	{
		method: 'get',
		path: '/stats',
		operationId: 'getPartnerStats',
		summary: 'Partner stats',
		description:
			'Totals and per statistical region: registered users, active reports and reunions in the last 90 days, from ' +
			'the newest hourly snapshot (database only). Any value from 1 to 4 is "<5"; 0 stays 0. ' +
			'`Cache-Control: public, max-age=3600`.',
		responses: { 200: { description: 'The newest snapshot', schema: PartnerStats } },
	},
	PartnersController.stats
);

export default router;
