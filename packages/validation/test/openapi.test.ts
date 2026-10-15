import { OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { expect, test } from 'vitest';

import { registerSchemas, registry, ReportList, ReportSearch, SyncReportsQuery } from '../src/index.ts';

const generate = (r: OpenAPIRegistry) =>
	new OpenApiGeneratorV31(r.definitions).generateDocument({
		openapi: '3.1.0',
		info: { title: 'test', version: '0' },
	});

test('every named schema becomes an OpenAPI component', () => {
	const schemas = generate(registry).components?.schemas ?? {};
	for (const name of [
		'CreateReportInput',
		'PetInput',
		'Location',
		'AbuseReportInput',
		'AdInput',
		'LeadInput',
		'CheckoutInput',
		'AlertSubscriptionInput',
		'GeoSearchInput',
		'Place',
		'PublicReport',
		'ReportOwnerView',
		'MatchSuggestion',
		'Message',
		'ApiErrorBody',
	])
		expect(schemas, name).toHaveProperty(name);
	expect(Object.keys(schemas).length).toBeGreaterThan(100);
	// nested schemas are references, so generated clients get named types
	expect(JSON.stringify(schemas.ReportList)).toContain('#/components/schemas/PublicReport');
});

test('query schemas (comma lists, bbox, JSON areas) document as path parameters', () => {
	const r = registerSchemas(new OpenAPIRegistry());
	r.registerPath({
		method: 'get',
		path: '/v1/reports',
		request: { query: ReportSearch },
		responses: { 200: { description: 'ok', content: { 'application/json': { schema: ReportList } } } },
	});
	r.registerPath({ method: 'get', path: '/v1/sync/reports', request: { query: SyncReportsQuery }, responses: {} });
	const params = generate(r).paths?.['/v1/reports']?.get?.parameters ?? [];
	expect(params.map((p) => ('name' in p ? p.name : ''))).toEqual(expect.arrayContaining(['types', 'bbox', 'near']));
});

test('registerSchemas fills any registry (the API can keep its own)', () => {
	const own = registerSchemas(new OpenAPIRegistry());
	expect(Object.keys(generate(own).components?.schemas ?? {})).toEqual(
		Object.keys(generate(registry).components?.schemas ?? {})
	);
});
