import { ApiError } from '@zivali/api/client';

// What the auth forms need on their first load (TASK-9.9): the checks they run while typing, the provider flags and
// lib/auth on demand. lib/auth brings supabase-js, zod (lib/env, @zivali/validation) and RTK Query (@zivali/api/auth),
// about 190 KB gz, so the forms import it only when they send.

/** MIN_PASSWORD and MAX_PASSWORD of @zivali/validation/me.schema, without its zod (lib/auth.test.ts keeps them equal). */
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;
/** GoTrue counts UTF-8 bytes ("č" is 2), so a password of fewer than 72 characters can be too long already. */
export const passwordTooLong = (password: string) => new TextEncoder().encode(password).length > MAX_PASSWORD;

// zod's z.email() pattern (regexes.email, zod 4), so the form says what the API would.
const EMAIL = /^(?:[A-Za-z0-9_'+-]+\.)*[A-Za-z0-9_'+-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;
export const validEmail = (value: string) => EMAIL.test(value);

/**
 * Provider buttons show only for providers enabled in Supabase Auth; Apple is off until its account exists. Read
 * directly (lib/env validates them on the server): NEXT_PUBLIC_* is inlined at build.
 */
export const providers = {
	google: process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === 'true',
	apple: process.env.NEXT_PUBLIC_APPLE_SIGN_IN === 'true',
};

/** lib/auth; a chunk that fails to download is a lost connection (NETWORK), as in the report flows. */
export const loadAuth = () =>
	import('@/lib/auth').catch((cause: unknown) => {
		throw new ApiError('NETWORK', 'NETWORK', { cause });
	});
