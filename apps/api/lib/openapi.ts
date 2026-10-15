// OpenAPI 3.1 from the zod schemas: the shared registry of @zivali/validation (C1) already holds the DTO components;
// each routes/<area>.routes.ts adds its paths with apiRoutes(): one call wires validate() for params, query and body
// into Express and registers the same schemas, plus the C1 error responses, so docs and validation cannot drift.
// `pnpm --filter api gen:openapi` writes the committed openapi.json, the input of the RTK Query codegen
// (@rtk-query/codegen-openapi), which names endpoints and hooks after operationId and groups them by tag.
// Schemas with a ref id (`.openapi('Name')` in @zivali/validation, `.meta({ id })`) become named components.
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import type { RequestHandler, Router } from 'express';
import type { ZodObject, ZodType } from 'zod';

import { ApiErrorBody } from '@zivali/validation';
import { registry } from '@zivali/validation/openapi';

import { validate } from '../middleware/validate.middleware.ts';
import { ERROR_HTTP_STATUS, type ErrorCode } from './errors.ts';

export { registry };

export type ApiRouteSpec = {
	method: 'get' | 'post' | 'put' | 'patch' | 'delete';
	/** Express path inside the area router, e.g. '/' or '/:id/confirm'. */
	path: string;
	/**
	 * Stable, unique, camelCase verb + noun: the RTK Query endpoint name and hook
	 * (getReport → useGetReportQuery, createLostReport → useCreateLostReportMutation, listNearbyReports).
	 */
	operationId: string;
	summary: string;
	description?: string;
	request?: { params?: ZodObject; query?: ZodObject; body?: ZodType };
	/** `contentType` for a non-JSON body, e.g. 'application/pdf' with a binary string schema. */
	responses: Record<number, { description: string; schema?: ZodType; contentType?: string }>;
	/**
	 * C1 codes this route can answer with besides the automatic ones (VALIDATION when the request has a schema,
	 * RATE_LIMITED, INTERNAL), e.g. ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'].
	 */
	errors?: ErrorCode[];
};

const json = (schema: ZodType, type = 'application/json') => ({ content: { [type]: { schema } } });

// C1 codes grouped by HTTP status: { 403: ['FORBIDDEN', 'AAL2_REQUIRED'], … }.
function errorResponses(codes: ErrorCode[]) {
	const byStatus: Record<number, ErrorCode[]> = {};
	for (const code of new Set(codes)) (byStatus[ERROR_HTTP_STATUS[code]] ??= []).push(code);
	return Object.fromEntries(
		Object.entries(byStatus).map(([status, list]) => [
			status,
			{ description: list.join(', '), ...json(ApiErrorBody) },
		])
	);
}

const operationIds = new Set<string>();

/** Route declarer for one area router; basePath is where routes/index.ts mounts it, e.g. '/v1/reports'. */
export function apiRoutes(router: Router, basePath: string) {
	// One tag per area (the URL segment after /v1/), so the codegen groups each area's endpoints.
	const tag = basePath.split('/').pop() ?? basePath;
	return (spec: ApiRouteSpec, ...handlers: RequestHandler[]): void => {
		const { method, path, operationId, summary, description, request = {}, responses, errors = [] } = spec;
		// Two routes with one operationId would generate one hook for both.
		if (operationIds.has(operationId)) throw new Error(`Duplicate operationId ${operationId} (${basePath}${path})`);
		operationIds.add(operationId);
		const validated = Boolean(request.params || request.query || request.body);
		registry.registerPath({
			method,
			path: `${basePath}${path === '/' ? '' : path}`.replace(/:(\w+)/g, '{$1}'),
			operationId,
			summary,
			description,
			tags: [tag],
			request: {
				params: request.params,
				query: request.query,
				...(request.body && { body: { required: true, ...json(request.body) } }),
			},
			responses: {
				...Object.fromEntries(
					Object.entries(responses).map(([status, { description: text, schema, contentType }]) => [
						status,
						{ description: text, ...(schema && json(schema, contentType)) },
					])
				),
				...errorResponses([
					...(validated ? ['VALIDATION' as const] : []),
					...errors,
					'RATE_LIMITED',
					'INTERNAL',
				]),
			},
		});
		const validators = (['params', 'query', 'body'] as const).flatMap((source) => {
			const schema = request[source];
			return schema ? [validate(schema, source)] : [];
		});
		// First handler: record the route pattern for the request logger (see lib/logger.ts).
		const route = `${method.toUpperCase()} ${basePath}${path === '/' ? '' : path}`;
		const setRoute: RequestHandler = (_req, res, next) => {
			res.locals.route = route;
			next();
		};
		router[method](path, setRoute, ...validators, ...handlers);
	};
}

export function buildOpenApiDocument() {
	const document = new OpenApiGeneratorV31(registry.definitions).generateDocument({
		openapi: '3.1.0',
		// Fixed, so the committed openapi.json only changes when the API does.
		info: {
			title: 'Izgubljene živali API',
			version: 'v1',
			description:
				'Lost pet finder REST API. Every error body is `ApiErrorBody` with a stable code (contract C1).',
		},
	});
	// Components sorted by name: registration order follows module-namespace key order, which Node and Vitest differ on.
	const schemas = document.components?.schemas;
	if (schemas)
		document.components!.schemas = Object.fromEntries(Object.entries(schemas).sort(([a], [b]) => (a < b ? -1 : 1)));
	return document;
}
