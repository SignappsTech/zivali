// The only place that reads process.env (ADR-020). Validated once at import; fails with the variable names.
// Locally values come from apps/api/.env.local; real environment variables win over the file.
import { existsSync } from 'node:fs';

import { z } from 'zod';

const envFile = new URL('../.env.local', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

const EnvSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
	APP_VERSION: z.string().default('dev'),
	PORT: z.coerce.number().int().positive().default(4000),
	DATABASE_URL: z.url().refine((url) => new URL(url).searchParams.get('schema') === 'app', {
		message: 'must end with ?schema=app (ADR-021)',
	}),
	// Comma-separated web origins for CORS; requests without Origin (mobile) are always allowed.
	WEB_ORIGINS: z
		.string()
		.default('')
		.transform((value) =>
			value
				.split(',')
				.map((origin) => origin.trim())
				.filter(Boolean)
		),
	SUPABASE_URL: z.url().optional(),
	// Local HS256 fallback for JWT verification; also signs test tokens and the local Admin API token (seeder 00-users).
	SUPABASE_JWT_SECRET: z.string().min(32).optional(),
});

// Empty values from a copied .env.example count as unset, so defaults apply.
const env = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ''));
const parsed = EnvSchema.safeParse(env);

if (!parsed.success) {
	const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
	throw new Error(`Invalid environment: ${problems}`);
}

export const config = parsed.data;
export type Config = typeof config;
