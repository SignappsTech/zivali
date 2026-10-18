import { describe, expect, it, vi } from 'vitest';

import {
	getVerifiedViewer,
	getViewer,
	isAnonymousViewer,
	isHandoff,
	recoveryEmail,
	requireViewer,
	safeNext,
} from './viewer';

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
vi.mock('@/i18n/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/i18n/navigation')>()),
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
		expect(await getViewer()).toEqual({ initials, aal2: false });
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

describe('getVerifiedViewer', () => {
	it('is the user only for a session the guards accept, never for a forged or anonymous one', async () => {
		auth.token = jwt({ email: 'ana@example.si' });
		expect(await getVerifiedViewer()).toEqual({ initials: 'A', aal2: false });
		auth.token = jwt({ email: 'ana@example.si' }, 'forged');
		expect(await getVerifiedViewer()).toBeNull();
		auth.token = jwt({ is_anonymous: true });
		expect(await getVerifiedViewer()).toBeNull();
		auth.token = undefined;
		expect(await getVerifiedViewer()).toBeNull();
	});
});

describe('isAnonymousViewer', () => {
	it('is true only for a signature-checked anonymous finder session (sign-up then converts it, C7 §6)', async () => {
		auth.token = jwt({ sub: 'u-anon', is_anonymous: true });
		expect(await isAnonymousViewer()).toBe(true);
		for (const token of [
			jwt({ email: 'ana@example.si', is_anonymous: false }),
			jwt({ email: 'ana@example.si' }),
			jwt({ is_anonymous: true }, 'forged'),
			undefined,
		]) {
			auth.token = token;
			expect(await isAnonymousViewer(), String(token)).toBe(false);
		}
	});
});

describe('requireViewer', () => {
	it('sends signed-out visitors to sign-in in their language', async () => {
		auth.token = undefined;
		await expect(requireViewer('en')).rejects.toThrow('NEXT_REDIRECT en /sign-in');
		auth.token = jwt({ email: 'ana@example.si' });
		await expect(requireViewer('en')).resolves.toEqual({ initials: 'A', aal2: false });
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
		await expect(requireViewer('sl', { allowAnonymous: true })).resolves.toEqual({ initials: '', aal2: false });
	});
});

describe('recoveryEmail', () => {
	const now = Math.floor(Date.now() / 1000);

	it('is the address of a session from a reset link of the last hour, by code or by token hash', async () => {
		auth.token = jwt({ email: 'ana@example.si', amr: [{ method: 'recovery', timestamp: now - 60 }] });
		expect(await recoveryEmail()).toBe('ana@example.si');
		auth.token = jwt({ email: 'ana@example.si', amr: [{ method: 'otp', timestamp: now - 60 }] });
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

	it("with `converted`, is only a converted finder's email_change session of the last hour (C7 §6)", async () => {
		auth.token = jwt({ email: 'ana@example.si', amr: [{ method: 'email_change', timestamp: now - 60 }] });
		expect(await recoveryEmail({ converted: true })).toBe('ana@example.si');
		// Neither form takes the other's session.
		expect(await recoveryEmail()).toBeNull();
		auth.token = jwt({ email: 'ana@example.si', amr: [{ method: 'recovery', timestamp: now - 60 }] });
		expect(await recoveryEmail({ converted: true })).toBeNull();
		auth.token = jwt({ email: 'ana@example.si', amr: [{ method: 'email_change', timestamp: now - 7200 }] });
		expect(await recoveryEmail({ converted: true })).toBeNull();
		auth.token = jwt({ email: 'ana@example.si', amr: [{ method: 'email_change', timestamp: now }] }, 'forged');
		expect(await recoveryEmail({ converted: true })).toBeNull();
	});
});

describe('safeNext', () => {
	it.each([
		['/racun', '/racun'],
		['/en/account?tab=alerts#x', '/en/account?tab=alerts'],
		['/r/Hk3vT9qP', '/r/Hk3vT9qP'],
		['/en/../racun', '/racun'],
		['/%5cevil.example', '/%5cevil.example'],
	])('keeps the same-site path %s', (next, kept) => expect(safeNext(next)).toBe(kept));

	it.each([
		'https://evil.example/',
		'https:evil.example',
		'//evil.example/x',
		'//%5cevil.example',
		'/\\evil.example',
		'\\\\evil.example',
		'/..//evil.example',
		'/.//evil.example',
		'/a/..//evil.example',
		'/%2e%2e//evil.example',
		'/%2E%2E//evil.example',
		'/\t/evil.example',
		'/\n/evil.example',
		'javascript:alert(1)',
		'javascript:',
		'racun',
		'',
		null,
		7,
	])('drops %j', (next) => expect(safeNext(next)).toBeUndefined());
});

describe('isHandoff', () => {
	it.each([
		['/prijava/izgubljena-zival?handoff=n1', 'sl'],
		['/prijava/izgubljena-zival?pet=p1&handoff=n1', 'sl'],
		['/en/report/lost?handoff=n1', 'en'],
	] as const)('takes %s (%s) back to the report draft', (next, locale) => expect(isHandoff(next, locale)).toBe(true));

	it.each([
		['/racun?handoff=1', 'sl'],
		['/admin?handoff=1', 'sl'],
		['/en/report/lost?handoff=n1', 'sl'],
		['/prijava/izgubljena-zival?handoff=n1', 'en'],
		['/report/lost?handoff=n1', 'sl'],
		['/prijava/izgubljena-zival', 'sl'],
		['/prijava/izgubljena-zival?y=handoff%3D1', 'sl'],
		['/prijava/najdena-zival?handoff=n1', 'sl'],
		[undefined, 'sl'],
	] as const)('does not take %s (%s)', (next, locale) => expect(isHandoff(next, locale)).toBe(false));
});
