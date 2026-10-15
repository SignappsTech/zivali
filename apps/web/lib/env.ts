import { z } from 'zod';

// Add a variable here when the first code reads it (names: docs/tech/frontend.md, .env.example).
const schema = z.object({
	NEXT_PUBLIC_SUPABASE_URL: z.url(),
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
	NEXT_PUBLIC_API_URL: z.url(),
	// Server only: undefined in the browser, so read them on the server.
	APP_ENV: z.enum(['local', 'staging', 'production']),
	APP_VERSION: z.string().default('dev'),
});

export type Env = z.infer<typeof schema>;

/** Throws once, naming every missing or invalid variable. Empty values count as missing. */
export function parseEnv(source: Record<string, string | undefined>): Env {
	const values = Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value || undefined]));
	// Only local development may omit the API URL; everywhere else a missing value fails fast.
	// An unset APP_ENV is local only outside a production build (NODE_ENV comes in through the source).
	values.APP_ENV ??= values.NODE_ENV === 'production' ? 'production' : 'local';
	if (values.APP_ENV === 'local') values.NEXT_PUBLIC_API_URL ??= 'http://localhost:4000';
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
	APP_ENV: process.env.APP_ENV,
	// Server only like APP_ENV: the browser cannot tell, and the server has already failed fast by then.
	NODE_ENV: typeof window === 'undefined' ? process.env.NODE_ENV : undefined,
	APP_VERSION: process.env.APP_VERSION,
};

// `next build` loads route modules without reading them (every page renders per request for the CSP nonce), so a
// build without .env.local still passes `pnpm verify`; the server and the browser fail on the first import instead.
export const env = process.env.NEXT_PHASE === 'phase-production-build' ? (source as Env) : parseEnv(source);
