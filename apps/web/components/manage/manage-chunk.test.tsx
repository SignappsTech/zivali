import { act, cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it, vi } from 'vitest';

import sl from '@zivali/i18n/dist/sl.json';

import { ManagePage } from './manage-page';

vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/m',
	useParams: () => ({ locale: 'sl' }),
}));
const auth = vi.hoisted(() => ({ ensureSession: vi.fn() }));
vi.mock('@/lib/auth', () => auth);
const captcha = vi.hoisted(() => ({ getToken: vi.fn(), widget: null, interactive: false }));
vi.mock('@/components/auth/turnstile', () => ({ useCaptcha: () => captcha }));
// The report view's chunk fails to download, as on a lost connection.
vi.mock('./manage-view', () => {
	throw new Error('Failed to fetch dynamically imported module');
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	history.replaceState(null, '', '/m');
	sessionStorage.clear();
	document.cookie = 'sb-x-auth-token.0=; max-age=0; path=/';
});

// No redux Provider: the page before the claim runs without the store (TASK-17.17).
const show = () =>
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<ManagePage />
		</NextIntlClientProvider>
	);

it('treats a failed chunk download as a lost connection: the offline note, with the automatic retry', async () => {
	captcha.getToken.mockResolvedValue(undefined);
	history.replaceState(null, '', '/m#good');
	show();
	const offline = await screen.findByText(sl.errors.offline_body, { exact: false });
	expect(offline.textContent).toBe(`${sl.errors.offline_title} ${sl.errors.offline_body}`);
});

// The view's failed download (the offline note) shows when the claim code was asked for.
it('without a session cookie, asks for the claim code only after the captcha has passed (TASK-17.17)', async () => {
	let pass: (token: string) => void = () => {};
	captcha.getToken.mockReturnValue(new Promise<string>((resolve) => (pass = resolve)));
	history.replaceState(null, '', '/m#good');
	show();
	await vi.waitFor(() => expect(captcha.getToken).toHaveBeenCalledOnce());
	await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
	// A visit that never passes it (a bot, a headless audit) loads neither lib/auth nor the view.
	expect(screen.queryByText(sl.errors.offline_body, { exact: false })).toBeNull();

	pass('cf-token');
	expect(await screen.findByText(sl.errors.offline_body, { exact: false })).toBeTruthy();
	expect(captcha.getToken).toHaveBeenCalledOnce();
});

it('with a session cookie, asks for the claim code at once, without the captcha', async () => {
	// A long session is split into .0, .1 (@supabase/ssr).
	document.cookie = 'sb-x-auth-token.0=base64-v; path=/';
	history.replaceState(null, '', '/m#good');
	show();
	expect(await screen.findByText(sl.errors.offline_body, { exact: false })).toBeTruthy();
	expect(captcha.getToken).not.toHaveBeenCalled();
});
