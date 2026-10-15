// apps/api: the root base plus the API rules (ADR-020): logs go through pino, never console.
import { defineConfig, globalIgnores } from 'eslint/config';

import base from '../../eslint.config.mjs';

export default defineConfig(base, globalIgnores(['generated/']), { rules: { 'no-console': 'error' } });
