import { describe, expect, it, vi } from 'vitest';

import { getViewer, requireViewer } from './viewer';

const auth = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock('@/lib/supabase/server', () => ({
	createClient: async () => ({
		auth: { getSession: async () => ({ data: { session: auth.token ? { access_token: auth.token } : null } }) },
	}),
}));
vi.mock('@/i18n/navigation', () => ({
	redirect: ({ href, locale }: { href: string; locale: string }) => {
		throw new Error(`NEXT_REDIRECT ${locale} ${href}`);
	},
}));

const jwt = (claims: object) =>
	['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'signature'].join('.');

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
});
