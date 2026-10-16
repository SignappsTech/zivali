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
	{
		// Public pages keep Redux and RTK Query off their first load (TASK-90.5, TASK-90.6): an @zivali/api hook in a
		// public route or in a component it imports statically (the shell on every page, the public forms) pulls them
		// in. /m brings its own StoreProvider, so components/manage is not in the list.
		files: [
			'app/*/(public)/**/*.tsx',
			'app/*/{layout,page}.tsx',
			'app/providers.tsx',
			'components/{analytics,consent,content,legal,shell}/**/*.tsx',
			'components/auth/{parts,reset,sign-in,sign-up}.tsx',
			'components/shelters/shelter-search.tsx',
		],
		ignores: ['**/*.test.tsx'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@zivali/api/*'],
							importNamePattern: '^use[A-Z]',
							message:
								'No @zivali/api hooks on the first load of a public page: load the component that needs one lazily (next/dynamic or import()) inside a StoreProvider, as shelter-search.tsx loads shelter-answer.tsx.',
						},
					],
				},
			],
		},
	},
	prettier
);
