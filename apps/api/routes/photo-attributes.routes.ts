// /v1/photos/:id/attributes (C19 §REST): the AI suggestions the pet, lost and found forms poll for the owner's photo
// (signed-in users and anonymous finders). Wiring only.
import { Router } from 'express';

import { IdParams } from '@zivali/validation';
import { photoAttributesSchema } from '@zivali/validation/ai';

import PhotoAttributesController from '../controllers/photo-attributes.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/photos');

route(
	{
		method: 'get',
		path: '/:id/attributes',
		operationId: 'getPhotoAttributes',
		summary: 'AI suggestions for an own photo',
		description:
			'Owner only (unknown, rejected or someone else’s photo: NOT_FOUND). `pending` until the photo is accepted ' +
			'and extracted, `unavailable` when AI is off, over a cap or failed (the form stays manual), else `ready`: ' +
			'values below `ai.min_confidence` are null. Poll every 750 ms for at most 10 s; skip when `ai.enabled` is false.',
		request: { params: IdParams },
		responses: { 200: { description: 'pending, unavailable or ready', schema: photoAttributesSchema } },
		errors: ['UNAUTHENTICATED', 'NOT_FOUND'],
	},
	authMiddleware,
	rateLimit('photos.attributes', { limit: 600, window: 3600, key: 'user' }),
	PhotoAttributesController.get
);

export default router;
