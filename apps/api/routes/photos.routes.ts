// /v1/photos (C5): presigned uploads to the private bucket, then /complete queues photo.process. Owner-only reads and
// deletes (signed-in users and anonymous finders). Wiring only.
import { Router } from 'express';

import { CompletePhotoResponse, CreatePhotoInput, CreatePhotoResponse, IdParams, PhotoView } from '@zivali/validation';

import PhotosController from '../controllers/photos.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/photos');

route(
	{
		method: 'post',
		path: '/',
		operationId: 'createPhoto',
		summary: 'Register a photo and get a presigned upload',
		description:
			'201 with a 5-minute presigned PUT (Content-Type image/jpeg, Content-Length = `bytes`) to the private bucket. ' +
			'The same owner and sha256 after a successful /complete answers 200 `existing: true` (restarting the 24 h ' +
			'purge clock of an unattached photo); before that, 201 with a fresh URL for the same `photo_id`.',
		request: { body: CreatePhotoInput },
		responses: {
			201: { description: 'New upload', schema: CreatePhotoResponse },
			200: { description: 'Already uploaded (`existing: true`)', schema: CreatePhotoResponse },
		},
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	rateLimit('photos.create', { limit: 60, window: 3600, key: 'user' }),
	PhotosController.create
);

route(
	{
		method: 'post',
		path: '/:id/complete',
		operationId: 'completePhoto',
		summary: 'Confirm the upload',
		description:
			'Owner only. Queues photo.process (accepted or rejected, see GET). CONFLICT: no object in the bucket.',
		request: { params: IdParams },
		responses: { 202: { description: 'Uploaded, processing queued', schema: CompletePhotoResponse } },
		errors: ['UNAUTHENTICATED', 'NOT_FOUND', 'CONFLICT'],
	},
	authMiddleware,
	PhotosController.complete
);

route(
	{
		method: 'get',
		path: '/:id',
		operationId: 'getPhoto',
		summary: 'One own photo',
		description:
			'Owner only. `thumb_url` is a 10-minute presigned GET while private (it resolves once the photo is ' +
			'accepted), the public URL once published.',
		request: { params: IdParams },
		responses: { 200: { description: 'The photo', schema: PhotoView } },
		errors: ['UNAUTHENTICATED', 'NOT_FOUND'],
	},
	authMiddleware,
	PhotosController.get
);

route(
	{
		method: 'delete',
		path: '/:id',
		operationId: 'deletePhoto',
		summary: 'Delete an own photo',
		description: 'Owner only; the worker deletes the objects. CONFLICT while the photo is on a published report.',
		request: { params: IdParams },
		responses: { 204: { description: 'Deleted' } },
		errors: ['UNAUTHENTICATED', 'NOT_FOUND', 'CONFLICT'],
	},
	authMiddleware,
	PhotosController.remove
);

export default router;
