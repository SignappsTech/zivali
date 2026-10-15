// /v1/pets (C4, FR-002; photo order C5): pet profiles of real accounts, owner only. Wiring only.
import { Router } from 'express';

import { IdParams, Pet, PetInput, PetList, SetPhotosInput, UpdatePetInput } from '@zivali/validation';

import PetsController from '../controllers/pets.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { rejectAnonymous } from '../middleware/permission.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/pets');
const signedIn = [authMiddleware, rejectAnonymous];
const writeLimit = rateLimit('pets.write', { limit: 60, window: 3600, key: 'user' });
const OWNER_ONLY = 'Owner only (staff included: FORBIDDEN for anyone else). ';

route(
	{
		method: 'get',
		path: '/',
		operationId: 'listPets',
		summary: 'Own pets',
		description: 'All the caller’s pets, archived ones included (archived_at set), oldest first.',
		responses: { 200: { description: 'The pets', schema: PetList } },
		errors: ['UNAUTHENTICATED'],
	},
	...signedIn,
	PetsController.list
);

route(
	{
		method: 'post',
		path: '/',
		operationId: 'createPet',
		summary: 'Register a pet',
		description:
			'`chip` is normalised (chip_number, chip_status; an invalid chip is stored as null, never refused). ' +
			'ear_tip and lifestyle are for cats only. Free accounts keep at most app_config `pets.free_limit` (2) ' +
			'active pets: CONFLICT with details.code PET_LIMIT. Lost reports never count against it.',
		request: { body: PetInput },
		responses: { 201: { description: 'The new pet', schema: Pet } },
		errors: ['UNAUTHENTICATED', 'CONFLICT'],
	},
	...signedIn,
	writeLimit,
	PetsController.create
);

route(
	{
		method: 'get',
		path: '/:id',
		operationId: 'getPet',
		summary: 'One own pet',
		description: OWNER_ONLY + 'Photo thumbs are 10-minute presigned URLs.',
		request: { params: IdParams },
		responses: { 200: { description: 'The pet', schema: Pet } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'],
	},
	...signedIn,
	PetsController.get
);

route(
	{
		method: 'patch',
		path: '/:id',
		operationId: 'updatePet',
		summary: 'Edit an own pet',
		description:
			OWNER_ONLY +
			'null clears an optional field. The pet as stored after the change must keep breeds of its species and ' +
			'the cat fields only on a cat (VALIDATION otherwise).',
		request: { params: IdParams, body: UpdatePetInput },
		responses: { 200: { description: 'The pet', schema: Pet } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'],
	},
	...signedIn,
	writeLimit,
	PetsController.update
);

route(
	{
		method: 'delete',
		path: '/:id',
		operationId: 'deletePet',
		summary: 'Delete an own pet',
		description: OWNER_ONLY + 'Its photos are deleted too (objects by the worker); its reports keep their details.',
		request: { params: IdParams },
		responses: { 204: { description: 'Deleted' } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'],
	},
	...signedIn,
	writeLimit,
	PetsController.remove
);

route(
	{
		method: 'post',
		path: '/:id/archive',
		operationId: 'archivePet',
		summary: 'Archive an own pet',
		description:
			OWNER_ONLY + 'Sets archived_at (kept when archived again); archived pets do not count to the limit.',
		request: { params: IdParams },
		responses: { 200: { description: 'The archived pet', schema: Pet } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'],
	},
	...signedIn,
	writeLimit,
	PetsController.archive
);

route(
	{
		method: 'put',
		path: '/:id/photos',
		operationId: 'setPetPhotos',
		summary: 'Set the photos of an own pet, in order',
		description:
			OWNER_ONLY +
			'Up to 5 of the caller’s unattached photos or the pet’s own; photos left out are detached ' +
			'(purged after 24 h). VALIDATION for an unknown or foreign photo.',
		request: { params: IdParams, body: SetPhotosInput },
		responses: { 200: { description: 'The pet', schema: Pet } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'],
	},
	...signedIn,
	writeLimit,
	PetsController.setPhotos
);

export default router;
