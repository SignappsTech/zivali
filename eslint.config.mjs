// Shared ESLint base for the whole workspace (ADR-001).
// ESLint 10 uses the config nearest to each linted file, so an app that needs its framework preset
// (eslint-config-next, eslint-config-expo) adds its own eslint.config.mjs that spreads this one:
//   import base from '../../eslint.config.mjs';
//   export default [...base, ...nextPreset];
// Packages without their own config use this file as is.
import js from '@eslint/js';
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
    'packages/types/src/database.ts',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
);
