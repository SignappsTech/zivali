// /v1/leads (C14): the "Oglašujte pri nas" enquiry form, public. Wiring only; captcha in the domain.
import { Router } from 'express';

import { IdResponse, LeadInput } from '@zivali/validation';

import PartnersController from '../controllers/partners.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/leads');

route(
	{
		method: 'post',
		path: '/',
		operationId: 'createLead',
		summary: 'Send a partner enquiry',
		description:
			'Ad or Vet Partner enquiry with explicit consent (stored with its time). The captcha token is verified ' +
			'first; 3 per hour per IP. The lead is emailed to the team.',
		request: { body: LeadInput },
		responses: { 201: { description: 'Stored', schema: IdResponse } },
		errors: ['CAPTCHA_FAILED'],
	},
	rateLimit('leads', { limit: 3, window: 3600, key: 'ip' }),
	PartnersController.createLead
);

export default router;
