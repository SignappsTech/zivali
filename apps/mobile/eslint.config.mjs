import expo from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier/flat';
import { globalIgnores } from 'eslint/config';

import base from '../../eslint.config.mjs';

export default [
	...base,
	...expo,
	{
		settings: {
			// eslint-plugin-react's version detection calls a context API that ESLint 10 removed; a fixed version skips it.
			react: { version: '19.2' },
			// lint-staged runs ESLint from the repo root, so the `@/` alias needs this app's tsconfig explicitly.
			'import/resolver': { typescript: { project: `${import.meta.dirname}/tsconfig.json` } },
		},
	},
	// Metro and Tailwind load their configs as CommonJS.
	{ files: ['*.config.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
	globalIgnores(['android/', 'ios/']),
	prettier,
];
