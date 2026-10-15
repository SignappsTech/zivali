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

	it('defaults the mock webhook secret only on local', () => {
		expect(parseEnv(valid).MOCK_WEBHOOK_SECRET).toBe('mock-webhook-secret');
		const staging = {
			...valid,
			APP_ENV: 'staging',
			NEXT_PUBLIC_API_URL: 'https://api.example.com',
			NEXT_PUBLIC_APP_URL: 'https://najdimo.si',
			R2_UPLOAD_ORIGIN: 'https://acct.eu.r2.cloudflarestorage.com',
		};
		expect(parseEnv(staging).MOCK_WEBHOOK_SECRET).toBeUndefined();
	});

	it('fails fast on a missing API URL outside local', () => {
		expect(() => parseEnv({ ...valid, APP_ENV: 'staging' })).toThrow(/NEXT_PUBLIC_API_URL/);
		expect(
			parseEnv({
				...valid,
				APP_ENV: 'staging',
				NEXT_PUBLIC_API_URL: 'https://api.example.com',
				NEXT_PUBLIC_APP_URL: 'https://najdimo.si',
				R2_UPLOAD_ORIGIN: 'https://acct.eu.r2.cloudflarestorage.com',
			}).APP_ENV
		).toBe('staging');
	});

	it('does not treat an unset APP_ENV as local in production', () => {
		expect(() => parseEnv({ ...valid, NODE_ENV: 'production' })).toThrow(/NEXT_PUBLIC_API_URL/);
		expect(parseEnv({ ...valid, NODE_ENV: 'production', APP_ENV: 'local' }).NEXT_PUBLIC_API_URL).toBe(
			'http://localhost:4000'
		);
	});

	it('names a missing variable, treating an empty value as missing', () => {
		expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' })).toThrow(
			/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/
		);
	});

	it('takes the sign-in provider flags as true or false only', () => {
		expect(parseEnv({ ...valid, NEXT_PUBLIC_APPLE_SIGN_IN: '' }).NEXT_PUBLIC_APPLE_SIGN_IN).toBeUndefined();
		expect(parseEnv({ ...valid, NEXT_PUBLIC_GOOGLE_SIGN_IN: 'true' }).NEXT_PUBLIC_GOOGLE_SIGN_IN).toBe('true');
		expect(() => parseEnv({ ...valid, NEXT_PUBLIC_APPLE_SIGN_IN: 'maybe' })).toThrow(/NEXT_PUBLIC_APPLE_SIGN_IN/);
	});

	it('names an invalid variable', () => {
		expect(() => parseEnv({ ...valid, APP_ENV: 'prod' })).toThrow(/APP_ENV/);
	});

	it('requires a measurement id for ga4 and keeps mock without one', () => {
		const ga4 = { ...valid, NEXT_PUBLIC_ANALYTICS_PROVIDER: 'ga4' };
		expect(() => parseEnv(ga4)).toThrow(/NEXT_PUBLIC_GA_MEASUREMENT_ID/);
		expect(() => parseEnv({ ...ga4, NEXT_PUBLIC_GA_MEASUREMENT_ID: 'UA-1' })).toThrow(
			/NEXT_PUBLIC_GA_MEASUREMENT_ID/
		);
		expect(parseEnv({ ...ga4, NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-E2ETEST' }).NEXT_PUBLIC_ANALYTICS_PROVIDER).toBe(
			'ga4'
		);
		expect(parseEnv(valid).NEXT_PUBLIC_ANALYTICS_PROVIDER).toBe('mock');
	});

	it('defaults the upload origin to MinIO locally and pins it to R2 elsewhere', () => {
		expect(parseEnv(valid).R2_UPLOAD_ORIGIN).toBe('http://127.0.0.1:9000');
		const staging = {
			...valid,
			APP_ENV: 'staging',
			NEXT_PUBLIC_API_URL: 'https://api.example.com',
			NEXT_PUBLIC_APP_URL: 'https://najdimo.si',
		};
		expect(() => parseEnv(staging)).toThrow(/R2_UPLOAD_ORIGIN/);
		for (const bad of [
			'http://acct.eu.r2.cloudflarestorage.com',
			'https://evil.example.com',
			'https://a.b.eu.r2.cloudflarestorage.com',
		])
			expect(() => parseEnv({ ...staging, R2_UPLOAD_ORIGIN: bad })).toThrow(/R2_UPLOAD_ORIGIN/);
		expect(parseEnv({ ...staging, R2_UPLOAD_ORIGIN: 'https://acct.eu.r2.cloudflarestorage.com' }).APP_ENV).toBe(
			'staging'
		);
	});
});
