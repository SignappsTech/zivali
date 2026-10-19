import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';

import base from '../../eslint.config.mjs';

const NAVIGATION = {
	name: 'next-intl/navigation',
	allowTypeImports: true,
	message:
		'Use @/i18n/navigation (Link, getPathname, redirect) and @/i18n/client-navigation (usePathname, useRouter): the same API without next-intl client code on every page (TASK-90.7).',
};

export default defineConfig(
	...base,
	...nextVitals,
	...nextTs,
	globalIgnores(['.next/', 'next-env.d.ts', 'playwright-report/', 'test-results/']),
	{
		// Public pages keep Redux and RTK Query off their first load (TASK-90.5, TASK-90.6): an @zivali/api hook in a
		// public route or in a component it imports statically (the shell on every page, the public forms) pulls them
		// in. /m brings its own StoreProvider, so components/manage is not in the list. The ad slot (TASK-36.5) is on
		// public pages too and calls the API without the store.
		files: [
			'app/*/(public)/**/*.tsx',
			'app/*/{layout,page}.tsx',
			'app/providers.tsx',
			'components/ads/*.tsx',
			'components/{analytics,consent,content,legal,partners,shell}/**/*.tsx',
			'components/report/{report-detail,slots/*}.tsx',
			'components/auth/{parts,provider-buttons,reset,sign-in,sign-up}.tsx',
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
						{
							// TASK-9.9: lib/auth brings supabase-js, zod and RTK Query (about 190 KB gz).
							group: ['@/lib/auth'],
							message:
								'No lib/auth on the first load of a public page: take the form checks from @/lib/auth-light and lib/auth with its loadAuth() when the form sends.',
						},
					],
				},
			],
		},
	},
	{
		// next-intl's createNavigation imports its client Link wrapper, which needs use-intl, into every page that
		// imports it, even from a server component (TASK-90.7): @/i18n/navigation and @/i18n/client-navigation have its API.
		files: ['**/*.{ts,tsx}'],
		ignores: ['**/*.test.{ts,tsx}'],
		rules: {
			'@typescript-eslint/no-restricted-imports': ['error', NAVIGATION],
		},
	},
	{
		// The shell's client islands, on every page, ship no intl runtime (TASK-90.7): next-intl's hooks, provider and
		// client navigation need use-intl. Strings come as props from the server components that render the islands;
		// the route comes from @/i18n/client-navigation.
		files: [
			'app/providers.tsx',
			'components/{analytics,consent}/**/*.tsx',
			'components/shell/parts.tsx',
			'i18n/{client-navigation,route,use-locale-switch}.ts',
		],
		ignores: ['**/*.test.tsx'],
		rules: {
			'@typescript-eslint/no-restricted-imports': [
				'error',
				NAVIGATION,
				...['next-intl', '@/i18n/navigation'].map((name) => ({
					name,
					allowTypeImports: true,
					message:
						'No next-intl client code in the shell islands: take strings as props (useLanguageLabels, consentCopy) and the route from @/i18n/client-navigation.',
				})),
			],
		},
	},
	{
		// next/og draws a plain <img> (next/image does not exist there). @next/next/no-img-element exempts opengraph-image
		// files by a '/' path check, so it fires on Windows and an inline disable is "unused" on Linux CI: off here instead.
		files: ['app/**/opengraph-image/**/*.tsx', 'app/**/opengraph-image.tsx'],
		rules: { '@next/next/no-img-element': 'off' },
	},
	prettier
);
