import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

const valid = {
	NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
};

describe('parseEnv', () => {
	it('applies the local defaults', () => {
		expect(parseEnv(valid)).toMatchObject({
			NEXT_PUBLIC_API_URL: 'http://localhost:4000',
			APP_ENV: 'local',
			APP_VERSION: 'dev',
		});
	});

	it('fails fast on a missing API URL outside local', () => {
		expect(() => parseEnv({ ...valid, APP_ENV: 'staging' })).toThrow(/NEXT_PUBLIC_API_URL/);
		expect(parseEnv({ ...valid, APP_ENV: 'staging', NEXT_PUBLIC_API_URL: 'https://api.example.com' }).APP_ENV).toBe(
			'staging'
		);
	});

	it('names a missing variable, treating an empty value as missing', () => {
		expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' })).toThrow(
			/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/
		);
	});

	it('names an invalid variable', () => {
		expect(() => parseEnv({ ...valid, APP_ENV: 'prod' })).toThrow(/APP_ENV/);
	});
});
