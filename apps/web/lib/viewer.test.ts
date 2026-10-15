import { describe, expect, it, vi } from 'vitest';

import { getViewer, requireViewer } from './viewer';

const auth = vi.hoisted(() => ({ token: undefined as string | undefined }));
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
	redirect: ({ href, locale }: { href: string; locale: string }) => {
		throw new Error(`NEXT_REDIRECT ${locale} ${href}`);
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
