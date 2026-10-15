import { getRefId, OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { expect, test, vi } from 'vitest';

import indexSrc from '../src/index.ts?raw';
import zodSrc from '../src/zod.ts?raw';
import * as root from '../src/index.ts';
import { ReportList, ReportSearch, SyncReportsQuery } from '../src/index.ts';
import * as geo from '../src/geo.schema.ts';
import { registerSchemas, registry } from '../src/openapi.ts';
import { z } from '../src/zod.ts';

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

test('the registry is not exported from the package root (keeps it out of app bundles)', () => {
	expect(root).not.toHaveProperty('registry');
	expect(root).not.toHaveProperty('registerSchemas');
});

test('index and zod.ts do not import zod-to-openapi at runtime (lean client bundles)', () => {
	for (const src of [zodSrc, indexSrc]) expect(src).not.toMatch(/^import (?!type)[^\n]*zod-to-openapi/m);
});

test('wrong import order (stub installed before the extension) throws', async () => {
	const proto = (await import('zod')).z.ZodType.prototype as unknown as { openapi?: unknown };
	const real = proto.openapi;
	try {
		delete proto.openapi;
		vi.resetModules();
		await import('../src/zod.ts');
		await expect(import('../src/openapi-extend.ts')).rejects.toThrow(
			'import @zivali/validation/openapi before @zivali/validation'
		);
	} finally {
		proto.openapi = real;
	}
});

test('no named component is itself nullable (use nullOr, not .nullable(), on named schemas)', () => {
	const intentional = new Set<string>(); // declare a component nullable on purpose by listing it here
	const bad = Object.entries(generate(registry).components?.schemas ?? {}).filter(([name, s]) => {
		const o = s as { type?: unknown; anyOf?: { type?: unknown }[]; oneOf?: { type?: unknown }[] };
		const isNull = (t: unknown) => t === 'null' || (Array.isArray(t) && t.includes('null'));
		return (
			!intentional.has(name) &&
			(isNull(o.type) || [...(o.anyOf ?? []), ...(o.oneOf ?? [])].some((x) => isNull(x.type)))
		);
	});
	expect(bad.map(([name]) => name)).toEqual([]);
});

test('.nullable()/.nullish() is never applied to an .openapi()-named schema (the refId leaks, null is lost)', () => {
	const files = import.meta.glob('../src/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<
		string,
		string
	>;
	const src = Object.values(files).join('\n');
	const named = [...src.matchAll(/export const (\w+)\s*=[^;]*?\.openapi\('/gs)].map((m) => m[1]);
	expect(named.length).toBeGreaterThan(50);
	const bad = named.filter((n) => new RegExp(`\\b${n}\\.(nullable|nullish)\\(`).test(src));
	expect(bad).toEqual([]);
});

test('GeoReverseResponse.place is nullable and Place stays a plain object, whatever the registration order', () => {
	const modules = Object.values(geo);
	for (const order of [modules, [...modules].reverse()]) {
		const r = new OpenAPIRegistry();
		for (const s of order) {
			const id = s instanceof z.ZodType ? getRefId(s) : undefined;
			if (id) r.register(id, s as z.ZodType);
		}
		const schemas = generate(r).components?.schemas ?? {};
		expect(JSON.stringify(schemas.GeoReverseResponse)).toContain('"type":"null"');
		expect(JSON.stringify(schemas.Place)).not.toContain('"null"');
	}
});
