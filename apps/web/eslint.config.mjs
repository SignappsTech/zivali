import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';

import base from '../../eslint.config.mjs';

export default defineConfig(
	...base,
	...nextVitals,
	...nextTs,
	globalIgnores(['.next/', 'next-env.d.ts', 'playwright-report/', 'test-results/']),
	prettier
);
