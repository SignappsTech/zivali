import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import sl from '@zivali/i18n/dist/sl.json';

import SignUpPage from './page';

// Server translations from the catalogue (next-intl/server needs the Next request scope).
vi.mock('next-intl/server', () => ({ getMessages: async () => sl }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	redirect: (url: string) => {
		throw new Error(`NEXT_REDIRECT ${url}`);
	},
}));
// The real lib/viewer gate over a stand-in for getClaims(): only tokens signed with 'good' verify.
const auth = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock('@/lib/supabase/server', () => ({
	createClient: async () => ({
		auth: {
			getClaims: async () => {
				const [, payload, signature] = auth.token?.split('.') ?? [];
				return signature === 'good'
					? { data: { claims: JSON.parse(Buffer.from(payload!, 'base64url').toString()) }, error: null }
					: { data: null, error: new Error('invalid JWT') };
			},
		},
	}),
}));
// The form has its own tests (components/auth/auth.test.tsx): here it shows what the page hands it.
vi.mock('@/components/auth/sign-up', () => ({
	SignUpForm: ({ convert }: { convert: boolean }) => <p data-testid="form" data-convert={String(convert)} />,
}));

const jwt = (claims: object, signature = 'good') =>
	['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), signature].join('.');

async function show(query: Record<string, string>) {
	const page = await SignUpPage({
		params: Promise.resolve({ locale: 'sl' }),
		searchParams: Promise.resolve(query),
	} as PageProps<'/[locale]/sign-up'>);
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			{page}
		</NextIntlClientProvider>
	);
	return screen.getByTestId('form').dataset.convert;
}

afterEach(() => {
	cleanup();
	auth.token = undefined;
});

describe('SignUpPage ?convert=1 (C7 §6)', () => {
	it('converts only a signature-checked anonymous finder session', async () => {
		auth.token = jwt({ sub: 'u-anon', is_anonymous: true });
		expect(await show({ convert: '1' })).toBe('true');
		cleanup();
		// The offer's link only: a plain visit with the anonymous session is the plain form.
		expect(await show({})).toBe('false');
	});

	it('is the plain page for a signed-out visitor and a forged anonymous session', async () => {
		expect(await show({ convert: '1' })).toBe('false');
		cleanup();
		auth.token = jwt({ sub: 'u-anon', is_anonymous: true }, 'forged');
		expect(await show({ convert: '1' })).toBe('false');
	});

	it('sends an account on as without convert, never to the conversion form', async () => {
		auth.token = jwt({ sub: 'u-1', email: 'ana@example.si', is_anonymous: false });
		await expect(show({ convert: '1', next: '/moje-prijave' })).rejects.toThrow('NEXT_REDIRECT /moje-prijave');
		await expect(show({ convert: '1' })).rejects.toThrow('NEXT_REDIRECT /');
		expect(screen.queryByTestId('form')).toBeNull();
	});
});
