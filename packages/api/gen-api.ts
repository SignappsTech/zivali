// `pnpm gen:api`. The codegen CLI loads a .ts config only through ts-node or esbuild-runner, so this runs it on
// Node's own type stripping instead.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { generateEndpoints, parseConfig } from '@rtk-query/codegen-openapi';

import config from './openapi-config.ts';

process.chdir(import.meta.dirname);

if (!existsSync(config.schemaFile)) {
	console.log(`${config.schemaFile} not found: apps/api generates it from its zod schemas (TASK-3.7). Skipped.`);
} else {
	for (const options of parseConfig(config)) {
		console.log(`Generating ${options.outputFile}`);
		mkdirSync(dirname(options.outputFile), { recursive: true });
		await generateEndpoints(options);
	}
}
