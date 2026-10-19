// @rtk-query/codegen-openapi config: endpoints, hooks and types from the API's OpenAPI spec (zod-to-openapi in
// apps/api, TASK-3.7), injected into the empty slice in src/rtk.ts. Run with `pnpm --filter @zivali/api gen:api`.
import type { ConfigFile } from '@rtk-query/codegen-openapi';

const config: ConfigFile = {
	schemaFile: '../../apps/api/openapi.json',
	apiFile: './src/rtk.ts',
	apiImport: 'api',
	outputFile: './src/generated/endpoints.ts',
	// Only operations whose hand-written stub is gone: injectEndpoints keeps the first definition of a name, so an
	// operation in both would shadow the stub (or the stub it) by import order. Add a name when its stub is deleted.
	filterEndpoints: ['getPhoto', 'deletePhoto'],
	hooks: true,
	tag: true,
	useUnknown: true,
};

export default config;
