import { afterEach, expect, it, vi } from 'vitest';

const ssr = vi.hoisted(() => ({ createBrowserClient: vi.fn(() => ({})) }));
vi.mock('@supabase/ssr', () => ssr);
// lib/env.ts would bring zod (about 90 KB gz) with every first API request and the manage claim (TASK-17.17).
vi.mock('@/lib/env', () => {
	throw new Error('lib/env.ts loaded in the browser client');
});

afterEach(() => vi.unstubAllEnvs());

it('builds the browser client from the inlined NEXT_PUBLIC_* keys, without lib/env.ts (zod)', async () => {
	vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://omtp.supabase.co');
	vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_x');
	const { createClient } = await import('./client');
	createClient();
	// jsdom serves http: the cookies are Secure on https only.
	expect(ssr.createBrowserClient).toHaveBeenCalledWith('https://omtp.supabase.co', 'sb_publishable_x', {
		cookieOptions: { secure: false },
	});
});
