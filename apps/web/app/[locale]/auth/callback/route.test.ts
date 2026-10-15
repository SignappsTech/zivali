import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const exchange = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/server', () => ({
	createClient: async () => ({ auth: { exchangeCodeForSession: exchange } }),
}));

afterEach(() => vi.clearAllMocks());

async function callback(locale: string, query: string) {
	const response = await GET(new NextRequest(`https://najdimo.si/auth/callback?${query}`), {
		params: Promise.resolve({ locale }),
	});
	return response.headers.get('location');
}

describe('auth callback', () => {
	it('exchanges a reset link code and opens the new-password form; a dead link the reset form', async () => {
		exchange.mockResolvedValue({ error: null });
		expect(await callback('sl', 'type=recovery&code=c1')).toBe('https://najdimo.si/pozabljeno-geslo');
		expect(exchange).toHaveBeenCalledWith('c1');

		exchange.mockResolvedValue({ error: new Error('invalid flow state') });
		expect(await callback('en', 'type=recovery&code=c2')).toBe('https://najdimo.si/en/reset-password?link=expired');
		expect(await callback('sl', 'type=recovery&error=access_denied&error_code=otp_expired')).toBe(
			'https://najdimo.si/pozabljeno-geslo?link=expired'
		);
	});

	it('shows "confirmed" for a confirmation link, also from another browser, and "expired" for a dead one', async () => {
		exchange.mockResolvedValue({ error: new Error('code verifier not found') });
		expect(await callback('sl', 'type=signup&code=c3&next=%2Fracun')).toBe(
			'https://najdimo.si/vpis?confirmed=1&next=%2Fracun'
		);
		expect(await callback('en', 'type=signup&error=access_denied&error_code=otp_expired')).toBe(
			'https://najdimo.si/en/sign-in?link=expired'
		);
	});

	it('returns from Google to next, never off-site; a cancel goes back to sign-in quietly', async () => {
		exchange.mockResolvedValue({ error: null });
		expect(await callback('en', 'type=oauth&code=c4&next=%2Fen%2Fr%2FHk3vT9qP')).toBe(
			'https://najdimo.si/en/r/Hk3vT9qP'
		);
		expect(await callback('sl', 'type=oauth&code=c5&next=%2F%2Fevil.example')).toBe('https://najdimo.si/');
		expect(await callback('sl', 'type=oauth&error=access_denied&next=%2Fracun')).toBe(
			'https://najdimo.si/vpis?error=cancelled&next=%2Fracun'
		);
		exchange.mockResolvedValue({ error: new Error('bad code') });
		expect(await callback('en', 'type=oauth&code=c6')).toBe('https://najdimo.si/en/sign-in?error=failed');
	});
});
