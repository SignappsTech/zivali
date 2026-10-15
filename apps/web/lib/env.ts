import { z } from 'zod';

// Add a variable here when the first code reads it (names: docs/tech/frontend.md, .env.example).
const schema = z
	.object({
		NEXT_PUBLIC_SUPABASE_URL: z.url(),
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
		NEXT_PUBLIC_API_URL: z.url(),
		// Origin of the public site: hreflang links are built on it, never on the request Host.
		NEXT_PUBLIC_APP_URL: z.url(),
		// @zivali/analytics reads it (and NEXT_PUBLIC_GA_MEASUREMENT_ID) itself; the proxy opens the CSP for ga4.
		NEXT_PUBLIC_ANALYTICS_PROVIDER: z.enum(['mock', 'ga4']).default('mock'),
		NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().regex(/^G-/).optional(),
		// Turnstile (C7): empty = captcha off. The hosted Supabase project requires it for email sign-up, sign-in and reset.
		NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
		// Sign-in providers (P16): the buttons show only when the provider is enabled in Supabase Auth; Apple waits for its account.
		NEXT_PUBLIC_GOOGLE_SIGN_IN: z.enum(['true', 'false']).optional(),
		NEXT_PUBLIC_APPLE_SIGN_IN: z.enum(['true', 'false']).optional(),
		// Server only: undefined in the browser, so read them on the server.
		APP_ENV: z.enum(['local', 'staging', 'production']),
		APP_VERSION: z.string().default('dev'),
		// Origin the API presigns photo PUTs with (C5): the CSP connect-src opens exactly this.
		R2_UPLOAD_ORIGIN: z.url(),
		// Universal / App Links (TASK-12.3): a platform's entry is left out of its .well-known file while unset (Q-007).
		APPLE_TEAM_ID: z
			.string()
			.regex(/^[A-Z0-9]{10}$/)
			.optional(),
		// Comma-separated SHA-256 fingerprints of the signing certificates (EAS release keystore, Play app signing).
		ANDROID_CERT_SHA256: z
			.string()
			.regex(/^[0-9A-F]{2}(:[0-9A-F]{2}){31}(\s*,\s*[0-9A-F]{2}(:[0-9A-F]{2}){31})*$/i)
			.optional(),
		// Signs the /dev/checkout mock events (C13): the API's MOCK_WEBHOOK_SECRET. Defaults to its local value only when APP_ENV=local; unset elsewhere.
		MOCK_WEBHOOK_SECRET: z.string().optional(),
	})
	.refine(
		(v) => {
			if (v.APP_ENV === 'local') return true;
			const url = new URL(v.R2_UPLOAD_ORIGIN);
			return url.protocol === 'https:' && /^[^.]+.eu.r2.cloudflarestorage.com$/.test(url.hostname);
		},
		{ path: ['R2_UPLOAD_ORIGIN'], message: 'must be https://<account>.eu.r2.cloudflarestorage.com outside local' }
	)
	.refine((v) => v.NEXT_PUBLIC_ANALYTICS_PROVIDER !== 'ga4' || v.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
		path: ['NEXT_PUBLIC_GA_MEASUREMENT_ID'],
		message: 'required when NEXT_PUBLIC_ANALYTICS_PROVIDER=ga4',
	});

export type Env = z.infer<typeof schema>;

/** Throws once, naming every missing or invalid variable. Empty values count as missing. */
export function parseEnv(source: Record<string, string | undefined>): Env {
	const values = Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value || undefined]));
	// Only local development may omit the API URL; everywhere else a missing value fails fast.
	// An unset APP_ENV is local only outside a production build (NODE_ENV comes in through the source).
	values.APP_ENV ??= values.NODE_ENV === 'production' ? 'production' : 'local';
	if (values.APP_ENV === 'local') {
		values.NEXT_PUBLIC_API_URL ??= 'http://localhost:4000';
		values.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
		values.R2_UPLOAD_ORIGIN ??= 'http://127.0.0.1:9000';
		values.MOCK_WEBHOOK_SECRET ??= 'mock-webhook-secret';
	}
	const result = schema.safeParse(values);
	if (!result.success) {
		const problems = result.error.issues.map((issue) => `${issue.path.join('.')} (${issue.message})`);
		throw new Error(
			`Invalid environment: ${problems.join(', ')}. Set it in apps/web/.env.local (see .env.example).`
		);
	}
	return result.data;
}

// NEXT_PUBLIC_* are inlined at build time only when written out in full, so no `...process.env`.
const source = {
	NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
	NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
	NEXT_PUBLIC_ANALYTICS_PROVIDER: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER,
	NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
	NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
	NEXT_PUBLIC_GOOGLE_SIGN_IN: process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN,
	NEXT_PUBLIC_APPLE_SIGN_IN: process.env.NEXT_PUBLIC_APPLE_SIGN_IN,
	APP_ENV: process.env.APP_ENV,
	// Server only like APP_ENV: the browser cannot tell, and the server has already failed fast by then.
	NODE_ENV: typeof window === 'undefined' ? process.env.NODE_ENV : undefined,
	APP_VERSION: process.env.APP_VERSION,
	R2_UPLOAD_ORIGIN: process.env.R2_UPLOAD_ORIGIN,
	APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
	ANDROID_CERT_SHA256: process.env.ANDROID_CERT_SHA256,
	MOCK_WEBHOOK_SECRET: process.env.MOCK_WEBHOOK_SECRET,
};

// `next build` loads route modules without reading them (every page renders per request for the CSP nonce), so a
// build without .env.local still passes `pnpm verify`; the server and the browser fail on the first import instead.
export const env = process.env.NEXT_PHASE === 'phase-production-build' ? (source as Env) : parseEnv(source);
