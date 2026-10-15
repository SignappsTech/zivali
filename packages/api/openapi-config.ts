// @rtk-query/codegen-openapi config: endpoints, hooks and types from the API's OpenAPI spec (zod-to-openapi in
// apps/api, TASK-3.7), injected into the empty slice in src/rtk.ts. Run with `pnpm --filter @zivali/api gen:api`.
import type { ConfigFile } from '@rtk-query/codegen-openapi';

const config: ConfigFile = {
	schemaFile: '../../apps/api/openapi.json',
	apiFile: './src/rtk.ts',
	apiImport: 'api',
	outputFile: './src/generated/endpoints.ts',
	hooks: true,
	tag: true,
};

export default config;
