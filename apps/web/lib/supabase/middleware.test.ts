// @vitest-environment node
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateSession } from './middleware';

type SetAll = (cookies: { name: string; value: string; options: object }[], headers: object) => void;

const supabase = vi.hoisted(() => ({ error: null as { code?: string } | null, signOut: vi.fn() }));
// Stands in for @supabase/ssr: getClaims answers `supabase.error`; signOut removes the session cookie as the library does.
vi.mock('@supabase/ssr', () => ({
	createServerClient: (_url: string, _key: string, { cookies }: { cookies: { setAll: SetAll } }) => ({
		auth: {
			getClaims: async () => ({ data: null, error: supabase.error }),
			signOut: async (options: object) => {
				supabase.signOut(options);
				cookies.setAll([{ name: 'sb-x-auth-token', value: '', options: { maxAge: 0, path: '/' } }], {});
				return { error: null };
			},
		},
	}),
}));

async function run() {
	const request = new NextRequest('http://localhost/admin', { headers: { cookie: 'sb-x-auth-token=base64-forged' } });
	return { request, response: await updateSession(request, () => NextResponse.next()) };
}

describe('updateSession', () => {
	beforeEach(() => supabase.signOut.mockClear());

	it.each(['invalid_jwt', 'bad_jwt'])('drops a session whose token does not verify (%s)', async (code) => {
		supabase.error = { code };
		const { request, response } = await run();

		expect(supabase.signOut).toHaveBeenCalledWith({ scope: 'local' });
		// Gone for this request's pages (the guards) and for the browser.
		expect(request.cookies.get('sb-x-auth-token')?.value).toBe('');
		expect(response.headers.get('set-cookie')).toMatch(/^sb-x-auth-token=;.*Max-Age=0/);
	});

	it.each([null, { code: 'over_request_rate_limit' }, {}])(
		'keeps the session on %j (valid, or an outage)',
		async (error) => {
			supabase.error = error;
			const { request, response } = await run();

			expect(supabase.signOut).not.toHaveBeenCalled();
			expect(request.cookies.get('sb-x-auth-token')?.value).toBe('base64-forged');
			expect(response.headers.get('set-cookie')).toBeNull();
		}
	);
});
