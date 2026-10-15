import { describe, expect, it, vi } from 'vitest';

import { getViewer, recoveryEmail, requireViewer } from './viewer';

const auth = vi.hoisted(() => ({ token: undefined as string | undefined, path: null as string | null }));
vi.mock('next/headers', () => ({ headers: async () => new Headers(auth.path ? { 'x-next-path': auth.path } : {}) }));
// Stands in for the signature check of getClaims(): only tokens signed with 'good' verify.
vi.mock('@/lib/supabase/server', () => ({
	createClient: async () => ({
		auth: {
			getSession: async () => ({ data: { session: auth.token ? { access_token: auth.token } : null } }),
			getClaims: async () => {
				const [, payload, signature] = auth.token?.split('.') ?? [];
				return signature === 'good'
					? { data: { claims: JSON.parse(Buffer.from(payload!, 'base64url').toString()) }, error: null }
					: { data: null, error: new Error('invalid JWT') };
			},
		},
	}),
}));
vi.mock('@/i18n/navigation', () => ({
	redirect: ({ href, locale }: { href: string | { pathname: string; query: { next: string } }; locale: string }) => {
		throw new Error(
			`NEXT_REDIRECT ${locale} ${typeof href === 'string' ? href : `${href.pathname}?next=${href.query.next}`}`
		);
	},
}));

const jwt = (claims: object, signature = 'good') =>
	['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), signature].join('.');

describe('getViewer', () => {
	it.each([
		[{ email: 'ana.novak@example.si' }, 'AN'],
		[{ email: 'maja@example.si', user_metadata: { full_name: 'Maja Kos' } }, 'MK'],
		[{ user_metadata: { name: 'eva' } }, 'E'],
		[{ sub: 'u1' }, ''],
	])('reads the initials of %j', async (claims, initials) => {
		auth.token = jwt(claims);
		expect(await getViewer()).toEqual({ initials });
	});

	it('is null signed out, for an anonymous finder session and for a token it cannot read', async () => {
		auth.token = undefined;
		expect(await getViewer()).toBeNull();
		auth.token = jwt({ email: 'x@y.si', is_anonymous: true });
		expect(await getViewer()).toBeNull();
		auth.token = 'not-a-jwt';
		expect(await getViewer()).toBeNull();
	});
});

describe('requireViewer', () => {
	it('sends signed-out visitors to sign-in in their language', async () => {
		auth.token = undefined;
		await expect(requireViewer('en')).rejects.toThrow('NEXT_REDIRECT en /sign-in');
		auth.token = jwt({ email: 'ana@example.si' });
		await expect(requireViewer('en')).resolves.toEqual({ initials: 'A' });
	});

	it('sends the page that was asked for along as next', async () => {
		auth.token = undefined;
		auth.path = '/en/account?tab=1';
		await expect(requireViewer('en')).rejects.toThrow('NEXT_REDIRECT en /sign-in?next=/en/account?tab=1');
		auth.path = null;
	});

	it('rejects a forged cookie whose payload looks valid but whose signature does not verify', async () => {
		auth.token = jwt({ email: 'ana@example.si' }, 'forged');
		await expect(requireViewer('en')).rejects.toThrow('NEXT_REDIRECT en /sign-in');
	});

	it('lets an anonymous session through only for allowAnonymous (C15 /m report managers)', async () => {
		auth.token = jwt({ is_anonymous: true });
		await expect(requireViewer('sl')).rejects.toThrow('NEXT_REDIRECT sl /sign-in');
		await expect(requireViewer('sl', { allowAnonymous: true })).resolves.toEqual({ initials: '' });
	});
});

describe('recoveryEmail', () => {
	const now = Math.floor(Date.now() / 1000);

	it('is the address of a session from a reset link of the last hour', async () => {
		auth.token = jwt({ email: 'ana@example.si', amr: [{ method: 'recovery', timestamp: now - 60 }] });
		expect(await recoveryEmail()).toBe('ana@example.si');
	});

	it('is null for a password session, an old recovery, signed out and a forged token', async () => {
		auth.token = jwt({ email: 'ana@example.si', amr: [{ method: 'password', timestamp: now }] });
		expect(await recoveryEmail()).toBeNull();
		auth.token = jwt({ email: 'ana@example.si', amr: [{ method: 'recovery', timestamp: now - 7200 }] });
		expect(await recoveryEmail()).toBeNull();
		auth.token = undefined;
		expect(await recoveryEmail()).toBeNull();
		auth.token = jwt({ email: 'ana@example.si', amr: [{ method: 'recovery', timestamp: now }] }, 'forged');
		expect(await recoveryEmail()).toBeNull();
	});
});
