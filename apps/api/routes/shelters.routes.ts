// /v1/shelters: wiring only. Public, no auth, `Cache-Control: public, max-age=3600` (C18).
import { Router } from 'express';

import {
	MunicipalityShelterList,
	ResponsibleShelter,
	ResponsibleShelterQuery,
	ShelterDetail,
	ShelterList,
	ShelterSlugParams,
} from '@zivali/validation';

import SheltersController from '../controllers/shelters.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';

const router = Router();
const route = apiRoutes(router, '/v1/shelters');

route(
	{
		method: 'get',
		path: '/',
		operationId: 'listShelters',
		summary: 'Registered shelters',
		description: 'Active shelters sorted by name; `area` is the statistical region in the request language.',
		responses: { 200: { description: 'Shelters', schema: ShelterList } },
	},
	SheltersController.list
);

route(
	{
		method: 'get',
		path: '/municipalities',
		operationId: 'listMunicipalities',
		summary: 'Municipalities with their confirmed shelter',
		description: 'All 212 municipalities sorted by name; `shelter_slug` is null unless the shelter is confirmed.',
		responses: { 200: { description: 'Municipalities', schema: MunicipalityShelterList } },
	},
	SheltersController.municipalities
);

route(
	{
		method: 'get',
		path: '/responsible',
		operationId: 'getResponsibleShelter',
		summary: 'Responsible shelter for a point or a municipality',
		description:
			'`?lat=&lng=` (rounded to 2 decimals by the client) or `?municipality=<slug>`. Only `confirmed` names the ' +
			'responsible shelter; `likely` is unconfirmed; `unconfirmed` lists up to 2 nearest shelters without a phone.',
		request: { query: ResponsibleShelterQuery },
		responses: { 200: { description: 'Lookup result', schema: ResponsibleShelter } },
		errors: ['NOT_FOUND'],
	},
	SheltersController.responsible
);

route(
	{
		method: 'get',
		path: '/:slug',
		operationId: 'getShelter',
		summary: 'Shelter page',
		description: 'An active shelter with its confirmed municipalities; 404 for an unknown or inactive slug.',
		request: { params: ShelterSlugParams },
		responses: { 200: { description: 'Shelter', schema: ShelterDetail } },
		errors: ['NOT_FOUND'],
	},
	SheltersController.get
);

export default router;
