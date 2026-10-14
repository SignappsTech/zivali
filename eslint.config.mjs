// Shared ESLint base for the whole workspace (ADR-001), klikni style (ADR-020).
// ESLint 10 uses the config nearest to each linted file, so an app that needs its framework preset
// (eslint-config-next, eslint-config-expo) adds its own eslint.config.mjs that spreads this one:
//   import prettier from 'eslint-config-prettier/flat';
//   import base from '../../eslint.config.mjs';
//   export default [...base, ...nextPreset, prettier];
// Packages without their own config use this file as is.
// Formatting is Prettier's job: it runs on its own (`prettier --check` in verify, `prettier --write` in
// lint-staged), and eslint-config-prettier (last) turns off any rule that would fight it (ADR-017).
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { importX } from 'eslint-plugin-import-x';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
	globalIgnores([
		'**/dist/',
		'**/.next/',
		'**/.expo/',
		'**/.turbo/',
		'**/coverage/',
		'quality-report/',
		'docs/',
		'backlog/',
	]),
	js.configs.recommended,
	tseslint.configs.recommended,
	{
		files: ['**/*.{js,mjs,cjs}'],
		languageOptions: { globals: globals.node },
	},
	{
		plugins: { 'import-x': importX },
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
			],
			'import-x/order': ['error', { groups: ['builtin', 'external', 'internal'], 'newlines-between': 'always' }],
		},
	},
	prettier
);
