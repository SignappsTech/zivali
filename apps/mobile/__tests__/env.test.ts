const valid = {
	EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
	EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
	EXPO_PUBLIC_APP_URL: 'http://localhost:3000',
	EXPO_PUBLIC_API_URL: 'http://localhost:4000',
	EXPO_PUBLIC_APP_ENV: 'local',
};

// lib/env parses process.env when it loads, so the variables are set first.
Object.assign(process.env, valid);
const { parseEnv } = jest.requireActual<typeof import('@/lib/env')>('@/lib/env');

test('defaults the analytics provider to mock and treats empty values as unset', () => {
	const env = parseEnv({ ...valid, EXPO_PUBLIC_ANALYTICS_PROVIDER: '', EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '' });

	expect(env.EXPO_PUBLIC_ANALYTICS_PROVIDER).toBe('mock');
	expect(env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).toBeUndefined();
});

test('keeps Sign in with Apple off unless the flag is "true"', () => {
	expect(parseEnv(valid).EXPO_PUBLIC_APPLE_SIGN_IN).toBe(false);
	expect(parseEnv({ ...valid, EXPO_PUBLIC_APPLE_SIGN_IN: 'true' }).EXPO_PUBLIC_APPLE_SIGN_IN).toBe(true);
	expect(() => parseEnv({ ...valid, EXPO_PUBLIC_APPLE_SIGN_IN: 'yes' })).toThrow('EXPO_PUBLIC_APPLE_SIGN_IN');
});

test('fails fast with the names of missing or invalid variables', () => {
	expect(() => parseEnv({ ...valid, EXPO_PUBLIC_API_URL: undefined, EXPO_PUBLIC_APP_ENV: 'dev' })).toThrow(
		'EXPO_PUBLIC_API_URL, EXPO_PUBLIC_APP_ENV'
	);
});

test.each(['sb_secret_test', 'eyJhbGciOiJIUzI1NiJ9.service_role.sig', ''])(
	'rejects a non-publishable Supabase key (%s)',
	(key) => {
		expect(() => parseEnv({ ...valid, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key })).toThrow(
			'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
		);
	}
);

test('production refuses the mock push provider', () => {
	const prod = { ...valid, EXPO_PUBLIC_APP_ENV: 'production' };
	expect(() => parseEnv(prod)).toThrow('EXPO_PUBLIC_PUSH_PROVIDER');
	expect(parseEnv({ ...prod, EXPO_PUBLIC_PUSH_PROVIDER: 'expo' }).EXPO_PUBLIC_PUSH_PROVIDER).toBe('expo');
});
