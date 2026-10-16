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
	// Public base URLs: links in emails (web app) and the signed one-click unsubscribe link (API).
	API_URL: z.url().default('http://localhost:4000'),
	APP_URL: z.url().default('http://localhost:3000'),
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
	// Access tokens are verified against ${SUPABASE_URL}/auth/v1/.well-known/jwks.json (C3).
	SUPABASE_URL: z.url(),
	// HS256 fallback for JWT verification, honoured only when APP_ENV=local; also signs test tokens and the local
	// Admin API token (seeder 00-users).
	SUPABASE_JWT_SECRET: z.string().min(32).optional(),
	// Server-only sb_secret_ key: Auth Admin API (locale -> user_metadata so Auth emails follow PATCH /v1/me). Never sent to clients.
	SUPABASE_SECRET_KEY: z.string().min(1).optional(),
	// Deprecated name, read as a fallback for one release.
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
	// Random 32-byte secrets per environment (C1): HMAC salt for IP and device ids, idempotency body encryption.
	RATE_SALT: z.string().min(32),
	IDEMPOTENCY_KEY: z.string().min(32),
	// HMAC key of the deterministic public blur (lib/fuzz.ts, C6). public_point is stored, so a new key only affects
	// circles computed afterwards (new reports, moved locations); rotate on a suspected leak only (README). Never logged.
	FUZZ_SECRET: z.string().min(32),
	// Adapters (backend.md): unset provider = mock (memory for storage) outside production.
	STORAGE_PROVIDER: z.enum(['minio', 'r2', 'memory', 'off']).optional(),
	R2_ACCOUNT_ID: z.string().optional(),
	R2_ACCESS_KEY_ID: z.string().optional(),
	R2_SECRET_ACCESS_KEY: z.string().optional(),
	R2_BUCKET_PRIVATE: z.string().default('zivali-private'),
	R2_BUCKET_MEDIA: z.string().default('zivali-media'),
	R2_BUCKET_BACKUPS: z.string().default('zivali-backups'),
	// Public base of the media bucket (https://media.<domain>); required in production. Unset locally = the MinIO URL.
	MEDIA_BASE_URL: z.url().optional(),
	S3_ENDPOINT: z.string().default('http://127.0.0.1:9000'),
	PAYMENTS_PROVIDER: z.enum(['mock', 'stripe', 'off']).optional(),
	STRIPE_SECRET_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string().optional(),
	MOCK_WEBHOOK_SECRET: z.string().optional(),
	// Fiscal invoices (C13, TASK-92): mock (default in every environment while payments are test-only) | furs (FURS
	// test environment, needs the FURS_* files) | off (no invoices). Premise and device are the ids registered with FURS.
	FISCAL_PROVIDER: z.enum(['mock', 'furs', 'off']).default('mock'),
	FISCAL_TAX_NUMBER: z
		.string()
		.regex(/^\d{8}$/)
		.optional(),
	FISCAL_PREMISE_ID: z
		.string()
		.regex(/^[0-9A-Za-z]{1,20}$/)
		.default('SPLET'),
	FISCAL_DEVICE_ID: z
		.string()
		.regex(/^[0-9A-Za-z]{1,20}$/)
		.default('API1'),
	FURS_URL: z.url().default('https://blagajne-test.fu.gov.si:9002/v1/cash_registers'),
	// PEM files outside the repo (e.g. .secrets/): the FURS certificate, its private key and the FURS CA chain.
	FURS_CERT_PATH: z.string().optional(),
	FURS_KEY_PATH: z.string().optional(),
	FURS_KEY_PASSPHRASE: z.string().optional(),
	FURS_CA_PATH: z.string().optional(),
	EMAIL_PROVIDER: z.enum(['mock', 'brevo', 'off']).optional(),
	BREVO_API_KEY: z.string().optional(),
	EMAIL_FROM: z.string().optional(),
	// Team inbox for partner leads (C14); unset = leads are stored and listed in the admin console only.
	LEADS_NOTIFY_EMAIL: z.email().optional(),
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

if (parsed.data.APP_ENV !== 'local' && !parsed.data.MEDIA_BASE_URL)
	throw new Error('Invalid environment: MEDIA_BASE_URL: required when APP_ENV is staging or production');

export const config = parsed.data;
if (!config.SUPABASE_SECRET_KEY && config.SUPABASE_SERVICE_ROLE_KEY) {
	// logger imports config, so plain console here. Never print the value.
	// eslint-disable-next-line no-console
	console.warn('SUPABASE_SERVICE_ROLE_KEY is deprecated: rename it to SUPABASE_SECRET_KEY');
	config.SUPABASE_SECRET_KEY = config.SUPABASE_SERVICE_ROLE_KEY;
}
export type Config = typeof config;
