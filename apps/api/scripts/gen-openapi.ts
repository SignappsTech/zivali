// `pnpm --filter api gen:openapi`: writes apps/api/openapi.json from the route declarations (input for the RTK Query
// codegen). With --check it only compares and fails when the committed file is stale (run by `lint`, so by verify).
// Must stay the first import: it installs the zod-to-openapi extension before any schema module loads.
import '@zivali/validation/openapi';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { format, resolveConfig } from 'prettier';

import { buildOpenApiDocument } from '../lib/openapi.ts';
// Registers every /v1 route in the OpenAPI registry.
import '../routes/index.ts';

const file = fileURLToPath(new URL('../openapi.json', import.meta.url));
const text = await format(JSON.stringify(buildOpenApiDocument()), { ...(await resolveConfig(file)), filepath: file });

if (!process.argv.includes('--check')) {
	writeFileSync(file, text);
} else if (!existsSync(file) || readFileSync(file, 'utf8') !== text) {
	process.stderr.write('apps/api/openapi.json is out of date: run `pnpm --filter api gen:openapi` and commit it.\n');
	process.exit(1);
}
