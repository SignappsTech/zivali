import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const exchange = vi.hoisted(() => vi.fn());
const verifyOtp = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/server', () => ({
	createClient: async () => ({ auth: { exchangeCodeForSession: exchange, verifyOtp } }),
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

	it('opens the new-password form from a reset link with a token hash, on any device (no PKCE verifier)', async () => {
		verifyOtp.mockResolvedValue({ error: null });
		expect(await callback('en', 'type=recovery&token_hash=pkce_h1')).toBe('https://najdimo.si/en/reset-password');
		expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'pkce_h1' });
		expect(exchange).not.toHaveBeenCalled();

		verifyOtp.mockResolvedValue({ error: new Error('Email link is invalid or has expired') });
		expect(await callback('sl', 'type=recovery&token_hash=pkce_h2')).toBe(
			'https://najdimo.si/pozabljeno-geslo?link=expired'
		);
		// Only reset links sign in by token hash.
		verifyOtp.mockClear();
		expect(await callback('sl', 'type=oauth&token_hash=pkce_h3')).toBe('https://najdimo.si/vpis?error=failed');
		expect(verifyOtp).not.toHaveBeenCalled();
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

	it("takes a converted finder's link straight to the set-password form when its session is here (C7 §6)", async () => {
		const set = (path: string) => `next=${encodeURIComponent(path)}`;
		exchange.mockResolvedValue({ error: null });
		expect(await callback('en', `type=signup&code=c5&${set('/en/reset-password?set=1&next=%2Fen%2Fr%2FX')}`)).toBe(
			'https://najdimo.si/en/reset-password?set=1&next=%2Fen%2Fr%2FX'
		);
		expect(await callback('sl', `type=signup&code=c6&${set('/pozabljeno-geslo?set=1')}`)).toBe(
			'https://najdimo.si/pozabljeno-geslo?set=1'
		);
		// Another browser (no verifier, no session): the plain confirmation, still pointing on.
		exchange.mockResolvedValue({ error: new Error('code verifier not found') });
		expect(await callback('sl', `type=signup&code=c7&${set('/pozabljeno-geslo?set=1')}`)).toBe(
			'https://najdimo.si/vpis?confirmed=1&next=%2Fpozabljeno-geslo%3Fset%3D1'
		);
	});

	it('takes a signed-out Publish straight back to its report in the same browser; elsewhere, the view (C3)', async () => {
		const set = (path: string) => `next=${encodeURIComponent(path)}`;
		exchange.mockResolvedValue({ error: null });
		expect(await callback('sl', `type=signup&code=c8&${set('/prijava/izgubljena-zival?handoff=n1')}`)).toBe(
			'https://najdimo.si/prijava/izgubljena-zival?handoff=n1'
		);
		expect(await callback('en', `type=signup&code=c9&${set('/en/report/lost?pet=p1&handoff=n2')}`)).toBe(
			'https://najdimo.si/en/report/lost?pet=p1&handoff=n2'
		);
		// Without a hand-off it stays the "confirmed" view, session or not.
		expect(await callback('sl', `type=signup&code=c10&${set('/prijava/izgubljena-zival')}`)).toBe(
			'https://najdimo.si/vpis?confirmed=1&next=%2Fprijava%2Fizgubljena-zival'
		);
		expect(await callback('en', 'type=signup&code=c11')).toBe('https://najdimo.si/en/sign-in?confirmed=1');
		// Another browser (no verifier, no session): the view, which says where the draft is (sign-in/page.tsx).
		exchange.mockResolvedValue({ error: new Error('code verifier not found') });
		expect(await callback('sl', `type=signup&code=c12&${set('/prijava/izgubljena-zival?handoff=n3')}`)).toBe(
			'https://najdimo.si/vpis?confirmed=1&next=%2Fprijava%2Fizgubljena-zival%3Fhandoff%3Dn3'
		);
	});

	it('returns from Google to next, never off-site; a cancel goes back to sign-in quietly', async () => {
		exchange.mockResolvedValue({ error: null });
		expect(await callback('en', 'type=oauth&code=c4&next=%2Fen%2Fr%2FHk3vT9qP')).toBe(
			'https://najdimo.si/en/r/Hk3vT9qP'
		);
		for (const next of [
			'//evil.example',
			'/..//evil.example',
			'/.//evil.example',
			'/a/..//evil.example',
			'/%2e%2e//evil.example',
			'\\\\evil.example',
			'/\\evil.example',
			'https:evil.example',
			'javascript:alert(1)',
			'//%5cevil.example',
		])
			expect(await callback('sl', `type=oauth&code=c5&next=${encodeURIComponent(next)}`)).toBe(
				'https://najdimo.si/'
			);
		expect(await callback('sl', 'type=oauth&error=access_denied&next=%2Fracun')).toBe(
			'https://najdimo.si/vpis?error=cancelled&next=%2Fracun'
		);
		exchange.mockResolvedValue({ error: new Error('bad code') });
		expect(await callback('en', 'type=oauth&code=c6')).toBe('https://najdimo.si/en/sign-in?error=failed');
	});
});
