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
	// Local HS256 fallback for JWT verification; also signs test tokens.
	SUPABASE_JWT_SECRET: z.string().min(32).optional(),
	// Adapters (backend.md): unset provider = mock (memory for storage) outside production.
	STORAGE_PROVIDER: z.enum(['minio', 'r2', 'memory', 'off']).optional(),
	R2_ACCOUNT_ID: z.string().optional(),
	R2_ACCESS_KEY_ID: z.string().optional(),
	R2_SECRET_ACCESS_KEY: z.string().optional(),
	R2_BUCKET_PRIVATE: z.string().default('zivali-private'),
	R2_BUCKET_MEDIA: z.string().default('zivali-media'),
	R2_BUCKET_BACKUPS: z.string().default('zivali-backups'),
	MEDIA_BASE_URL: z.string().optional(),
	S3_ENDPOINT: z.string().default('http://127.0.0.1:9000'),
	PAYMENTS_PROVIDER: z.enum(['mock', 'stripe', 'off']).optional(),
	STRIPE_SECRET_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string().optional(),
	MOCK_WEBHOOK_SECRET: z.string().optional(),
	EMAIL_PROVIDER: z.enum(['mock', 'brevo', 'off']).optional(),
	BREVO_API_KEY: z.string().optional(),
	EMAIL_FROM: z.string().optional(),
	PUSH_PROVIDER: z.enum(['mock', 'expo', 'off']).optional(),
	EXPO_ACCESS_TOKEN: z.string().optional(),
	CAPTCHA_PROVIDER: z.enum(['mock', 'turnstile', 'off']).optional(),
	TURNSTILE_SECRET_KEY: z.string().optional(),
	AI_PROVIDER: z.enum(['mock', 'anthropic', 'off']).optional(),
	ANTHROPIC_API_KEY: z.string().optional(),
	AI_VISION_MODEL: z.string().default('claude-sonnet-5-5'),
	EMBEDDER_PROVIDER: z.enum(['mock', 'voyage', 'off']).optional(),
	VOYAGE_API_KEY: z.string().optional(),
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
