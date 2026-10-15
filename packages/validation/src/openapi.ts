// OpenAPI components from the zod schemas (single source). apps/api adds its paths to `registry` and generates
// openapi.json / Swagger UI from it; clients can be generated from that document.
import './openapi-extend.ts'; // first: the schema modules below call `.openapi()` while loading

import { getRefId, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import * as abuse from './abuse.schema.ts';
import * as ads from './ads.schema.ts';
import * as breeds from './breeds.ts';
import * as chat from './chat.schema.ts';
import * as common from './common.schema.ts';
import * as enums from './enums.ts';
import * as geo from './geo.schema.ts';
import * as matches from './matches.schema.ts';
import * as me from './me.schema.ts';
import * as notifications from './notifications.schema.ts';
import * as payments from './payments.schema.ts';
import * as pets from './pets.schema.ts';
import * as photos from './photos.schema.ts';
import * as reports from './reports.schema.ts';
import * as shelters from './shelters.schema.ts';
import { z } from './zod.ts';

const modules = [
	common,
	enums,
	breeds,
	me,
	photos,
	geo,
	reports,
	pets,
	matches,
	chat,
	notifications,
	abuse,
	payments,
	ads,
	shelters,
];

/** Registers every schema that carries a ref id (`.openapi('Name')`); query and params schemas have none. */
export function registerSchemas(registry: OpenAPIRegistry): OpenAPIRegistry {
	for (const mod of modules)
		for (const value of Object.values(mod)) {
			const refId = value instanceof z.ZodType ? getRefId(value) : undefined;
			if (refId) registry.register(refId, value as z.ZodType);
		}
	if (!registry.definitions.length)
		throw new Error('No OpenAPI refs found: import @zivali/validation/openapi before @zivali/validation.');
	return registry;
}

/** Shared registry with all components registered. */
export const registry = registerSchemas(new OpenAPIRegistry());
