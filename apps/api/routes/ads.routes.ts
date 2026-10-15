// /v1/ads (C14): ad serving and impressions, public. Wiring only. There is no slot for the report, sign-in, chat or
// payment flows: any other slot value is VALIDATION. The click redirect is TASK-35.2.
import { Router } from 'express';

import { Ad, AdImpressionInput, AdSlotParams, AdSlotQuery, IdParams } from '@zivali/validation';

import AdsController from '../controllers/ads.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { optionalAuth } from '../middleware/auth.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/ads');

route(
	{
		method: 'get',
		path: '/slot/:slot',
		operationId: 'getAdForSlot',
		summary: 'The ad for a slot',
		description:
			'The best active ad for the slot, locale (`?locale`, else Accept-Language), region or municipality and ' +
			'species (weighted random; an exclusive ad owns its slot), else a house ad for the locale. `null` when ' +
			'nothing fits or for ad-free users. `Cache-Control: private, max-age=60`.',
		request: { params: AdSlotParams, query: AdSlotQuery },
		responses: { 200: { description: 'Ad or null', schema: Ad.nullable() } },
	},
	optionalAuth,
	AdsController.slot
);

route(
	{
		method: 'post',
		path: '/:id/impressions',
		operationId: 'recordAdImpression',
		summary: 'Count one rendered impression',
		description:
			'Once, when the ad first renders (A-016). Aggregated per ad, slot, day (Europe/Ljubljana) and region; no ' +
			'user ids, no cookies. NOT_FOUND: unknown or deleted ad, or a slot the ad does not run in.',
		request: { params: IdParams, body: AdImpressionInput },
		responses: { 204: { description: 'Counted' } },
		errors: ['NOT_FOUND'],
	},
	rateLimit('ads.impressions', { limit: 300, window: 60, key: 'ip' }),
	AdsController.impression
);

export default router;
