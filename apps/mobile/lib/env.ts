import { z } from 'zod';

// Expo inlines EXPO_PUBLIC_* only on static `process.env.NAME` access, so each variable is read by name.
const raw = {
	EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
	EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	EXPO_PUBLIC_APP_URL: process.env.EXPO_PUBLIC_APP_URL,
	EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
	EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
	EXPO_PUBLIC_ANALYTICS_PROVIDER: process.env.EXPO_PUBLIC_ANALYTICS_PROVIDER,
	EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
	EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};

// An empty value in .env.local counts as unset.
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const schema = z.object({
	EXPO_PUBLIC_SUPABASE_URL: z.url(),
	EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
	EXPO_PUBLIC_APP_URL: z.url(),
	EXPO_PUBLIC_API_URL: z.url(),
	EXPO_PUBLIC_APP_ENV: z.enum(['local', 'staging', 'production']),
	EXPO_PUBLIC_ANALYTICS_PROVIDER: optional(z.enum(['mock', 'firebase'])).transform((v) => v ?? 'mock'),
	EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: optional(z.string()),
	EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: optional(z.string()),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(input: Record<string, string | undefined>): Env {
	const result = schema.safeParse(input);
	if (!result.success) {
		const names = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
		throw new Error(`Invalid or missing environment variables: ${names} (see .env.example)`);
	}
	return result.data;
}

export const env = parseEnv(raw);
