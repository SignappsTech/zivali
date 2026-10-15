// /v1/matches and GET /v1/reports/:code/matches (C8 §REST): wiring only. Manager checks and the verdict states live
// in domains/matching/review.domain.ts.
import { Router } from 'express';

import {
	CodeParams,
	ConfirmMatchResponse,
	IdParams,
	MatchList,
	MatchListQuery,
	RejectMatchInput,
} from '@zivali/validation';

import MatchesController from '../controllers/matches.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { requireVerified } from '../middleware/permission.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const verdictLimit = rateLimit('matches.verdict', { limit: 60, window: 3600, key: 'user' });

const router = Router();
const route = apiRoutes(router, '/v1/matches');

route(
	{
		method: 'post',
		path: '/:id/confirm',
		operationId: 'confirmMatch',
		summary: 'Confirm a suggested match (lost report managers)',
		description:
			'The match becomes confirmed, the lost report matched, the match conversation opens (C9) and the other ' +
			"report's managers are notified. Idempotent: a confirmed match returns its conversation again. Rejected or " +
			'closed matches answer CONFLICT, a closed lost report GONE.',
		request: { params: IdParams },
		responses: { 200: { description: 'The match conversation', schema: ConfirmMatchResponse } },
		errors: ['UNAUTHENTICATED', 'UNVERIFIED_EMAIL', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'GONE'],
	},
	authMiddleware,
	requireVerified,
	verdictLimit,
	MatchesController.confirm
);

route(
	{
		method: 'post',
		path: '/:id/reject',
		operationId: 'rejectMatch',
		summary: 'Reject a suggested match (lost report managers)',
		description:
			'The pair is never suggested or listed again; the optional reason is kept with the verdict. Repeating it is a ' +
			'no-op; a confirmed or closed match answers CONFLICT.',
		request: { params: IdParams, body: RejectMatchInput },
		responses: { 204: { description: 'Rejected' } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT'],
	},
	authMiddleware,
	verdictLimit,
	MatchesController.reject
);

export default router;

/** Mounted on /reports next to the reports router. */
export const reportMatchesRouter = Router();
const reportRoute = apiRoutes(reportMatchesRouter, '/v1/reports');

reportRoute(
	{
		method: 'get',
		path: '/:code/matches',
		operationId: 'listMatches',
		summary: 'Match suggestions of a lost report (its managers)',
		description:
			'Best score first; `state` (comma-separated) defaults to suggested,confirmed. Rejected pairs are never ' +
			"listed. `other` is the other report's public view: no exact point, chip number or contact data.",
		request: { params: CodeParams, query: MatchListQuery },
		responses: { 200: { description: 'Suggestions', schema: MatchList } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'],
	},
	authMiddleware,
	MatchesController.list
);
