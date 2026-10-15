// /v1/ads (C14): ad serving, impressions and the click redirect, public. Wiring only. There is no slot for the report,
// sign-in, chat or payment flows: any other slot value is VALIDATION.
import { Router } from 'express';

import { Ad, AdClickQuery, AdImpressionInput, AdSlotParams, AdSlotQuery, IdParams, nullOr } from '@zivali/validation';

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
		responses: { 200: { description: 'Ad or null', schema: nullOr(Ad) } },
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

route(
	{
		method: 'get',
		path: '/:id/click',
		operationId: 'followAdClick',
		summary: 'Count a click and redirect to the sponsor link',
		description:
			'The `click_url` of a served ad (`?s=<slot>&r=<region_id>`). Counts one click per ad, slot, day ' +
			'(Europe/Ljubljana) and region (no user ids, no cookies), then 302 to the https link stored with the ad; ' +
			'the target never comes from the request. NOT_FOUND: unknown, deleted or inactive ad, or a slot the ad ' +
			'does not run in.',
		request: { params: IdParams, query: AdClickQuery },
		responses: { 302: { description: 'Redirect to the stored link (Location header)' } },
		errors: ['NOT_FOUND'],
	},
	rateLimit('ads.clicks', { limit: 300, window: 60, key: 'ip' }),
	AdsController.click
);

export default router;
