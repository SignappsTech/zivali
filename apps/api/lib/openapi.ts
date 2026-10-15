// OpenAPI 3.1 from the zod schemas (@asteasolutions/zod-to-openapi registry). Each routes/<area>.routes.ts declares
// its routes with apiRoutes(): one call wires validate() for params, query and body into Express and registers the
// same schemas, plus the C1 error responses, in the registry, so docs and validation cannot drift.
// `pnpm --filter api gen:openapi` writes the committed openapi.json, the input of the RTK Query codegen
// (@rtk-query/codegen-openapi), which names endpoints and hooks after operationId and groups them by tag.
// Schemas with `.meta({ id })` become named components, and so named generated types.
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import type { RequestHandler, Router } from 'express';
import { z, type ZodObject, type ZodType } from 'zod';

import { validate } from '../middleware/validate.middleware.ts';
import { ERROR_STATUS, type ErrorCode } from './errors.ts';

export const registry = new OpenAPIRegistry();

// The one error body of every endpoint (C1).
export const ErrorSchema = z
	.object({
		error: z.object({
			code: z.enum(Object.keys(ERROR_STATUS) as [ErrorCode, ...ErrorCode[]]),
			message: z.string(),
			details: z.record(z.string(), z.unknown()).optional(),
			issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
		}),
	})
	.meta({ id: 'Error' });

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
	responses: Record<number, { description: string; schema?: ZodType }>;
	/**
	 * C1 codes this route can answer with besides the automatic ones (VALIDATION when the request has a schema,
	 * RATE_LIMITED, INTERNAL), e.g. ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'].
	 */
	errors?: ErrorCode[];
};

const json = (schema: ZodType) => ({ content: { 'application/json': { schema } } });

// C1 codes grouped by HTTP status: { 403: ['FORBIDDEN', 'AAL2_REQUIRED'], … }.
function errorResponses(codes: ErrorCode[]) {
	const byStatus: Record<number, ErrorCode[]> = {};
	for (const code of new Set(codes)) (byStatus[ERROR_STATUS[code]] ??= []).push(code);
	return Object.fromEntries(
		Object.entries(byStatus).map(([status, list]) => [
			status,
			{ description: list.join(', '), ...json(ErrorSchema) },
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
					Object.entries(responses).map(([status, { description: text, schema }]) => [
						status,
						{ description: text, ...(schema && json(schema)) },
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
		router[method](path, ...validators, ...handlers);
	};
}

export function buildOpenApiDocument() {
	return new OpenApiGeneratorV31(registry.definitions).generateDocument({
		openapi: '3.1.0',
		// Fixed, so the committed openapi.json only changes when the API does.
		info: {
			title: 'Izgubljene živali API',
			version: 'v1',
			description: 'Lost pet finder REST API. Every error body is `Error` with a stable code (contract C1).',
		},
	});
}
