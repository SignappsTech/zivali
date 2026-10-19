import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@zivali/api/client';
import sl from '@zivali/i18n/dist/sl.json';

import { ACTIVITY_KEY, clock, IDLE_MS, IdleTimeout, step, WARN_MS } from './idle-timeout';

const a = sl.admin;

const mocks = vi.hoisted(() => ({
	signOut: vi.fn(),
	refreshSession: vi.fn(),
	replace: vi.fn(),
	toastError: vi.fn(),
}));
vi.mock('@zivali/api/auth', () => ({
	signOut: mocks.signOut,
	authError: (error: { code: string }) => new ApiError(error.code as 'NETWORK', error.code),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { refreshSession: mocks.refreshSession } }) }));
vi.mock('@/i18n/client-navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }));

beforeEach(() => {
	vi.useFakeTimers();
	localStorage.clear();
	mocks.signOut.mockResolvedValue(undefined);
	mocks.refreshSession.mockResolvedValue({ data: {}, error: null });
	window.history.replaceState(null, '', '/admin/revizijska-sled?page=2');
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.clearAllMocks();
});

function renderTimeout() {
	render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<IdleTimeout />
		</NextIntlClientProvider>
	);
}

/** Moves the fake clock on; the dialog's async handlers settle inside act. */
const wait = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const dialog = () => screen.queryByRole('dialog', { name: a.idle_title });
const body = (time: string) => a.idle_body.replace('{time}', time);

describe('clock', () => {
	it('shows minutes and seconds, rounded up', () => {
		expect(clock(120_000)).toBe('2:00');
		expect(clock(119_001)).toBe('2:00');
		expect(clock(65_000)).toBe('1:05');
		expect(clock(1)).toBe('0:01');
	});
});

describe('IdleTimeout', () => {
	it('warns at the warning point with a countdown, then ends the session and goes to sign-in with next', async () => {
		renderTimeout();
		await wait(IDLE_MS - WARN_MS - 1000);
		expect(dialog()).toBeNull();

		await wait(1000);
		const open = dialog()!;
		expect(open).not.toBeNull();
		expect(open.getAttribute('aria-describedby')).toBeTruthy();
		expect(document.getElementById(open.getAttribute('aria-describedby')!)?.textContent).toBe(body('2:00'));
		// Focus goes to the one action (P19 A3), so Enter or Space answers it.
		expect(document.activeElement).toBe(screen.getByRole('button', { name: a.idle_stay }));
		await wait(1000);
		expect(screen.getByText(body('1:59'))).toBeTruthy();

		// Input while the dialog shows is no answer: the countdown goes on.
		fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
		fireEvent.pointerMove(window);
		await wait(WARN_MS - 2000);
		expect(screen.getByText(body('0:01'))).toBeTruthy();
		expect(mocks.signOut).not.toHaveBeenCalled();

		await wait(1000);
		expect(mocks.signOut).toHaveBeenCalledOnce();
		expect(mocks.replace).toHaveBeenCalledWith({
			pathname: '/sign-in',
			query: { next: '/admin/revizijska-sled?page=2' },
		});
		expect(dialog()).toBeNull();
		await wait(5000);
		expect(mocks.signOut).toHaveBeenCalledOnce();
	});

	it('stay signed in refreshes the session and restarts the time', async () => {
		renderTimeout();
		await wait(IDLE_MS - WARN_MS + 30_000);
		fireEvent.click(screen.getByRole('button', { name: a.idle_stay }));
		await vi.waitFor(() => expect(mocks.refreshSession).toHaveBeenCalledOnce());
		expect(dialog()).toBeNull();

		// A full idle period again from the answer, not from the first warning.
		await wait(IDLE_MS - WARN_MS - 1000);
		expect(dialog()).toBeNull();
		await wait(1000);
		expect(dialog()).not.toBeNull();
		expect(mocks.signOut).not.toHaveBeenCalled();
	});

	it('Escape closes the dialog as an answer: the admin stays signed in', async () => {
		renderTimeout();
		await wait(IDLE_MS - WARN_MS);
		fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
		await vi.waitFor(() => expect(mocks.refreshSession).toHaveBeenCalledOnce());
		expect(dialog()).toBeNull();
		await wait(WARN_MS);
		expect(mocks.signOut).not.toHaveBeenCalled();
	});

	it('input before the warning point restarts the time', async () => {
		renderTimeout();
		await wait(20 * 60_000);
		fireEvent.pointerDown(document.body);
		await wait(IDLE_MS - WARN_MS - 1000);
		expect(dialog()).toBeNull();
		await wait(1000);
		expect(dialog()).not.toBeNull();
	});

	it('activity in another console tab keeps this one signed in and closes its warning', async () => {
		renderTimeout();
		await wait(IDLE_MS - WARN_MS);
		expect(dialog()).not.toBeNull();
		localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
		await wait(1000);
		expect(dialog()).toBeNull();
		await wait(WARN_MS);
		expect(mocks.signOut).not.toHaveBeenCalled();
	});

	it('a failed refresh says why in a toast; the time still restarts', async () => {
		mocks.refreshSession.mockResolvedValue({ data: {}, error: { code: 'NETWORK' } });
		renderTimeout();
		await wait(IDLE_MS - WARN_MS);
		fireEvent.click(screen.getByRole('button', { name: a.idle_stay }));
		await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(sl.errors.NETWORK));
		expect(dialog()).toBeNull();
		await wait(WARN_MS);
		expect(mocks.signOut).not.toHaveBeenCalled();
	});

	it('signing out offline still drops the browser session before it leaves for sign-in', async () => {
		for (const name of ['sb-x-auth-token', 'sb-x-auth-token.0', 'sb-x-auth-token.1', 'NEXT_LOCALE'])
			document.cookie = `${name}=v; path=/`;
		let cookiesAtSignIn = '';
		mocks.replace.mockImplementation(() => void (cookiesAtSignIn = document.cookie));
		mocks.signOut.mockRejectedValue(new ApiError('NETWORK', 'NETWORK'));
		renderTimeout();
		await wait(IDLE_MS);
		expect(mocks.replace).toHaveBeenCalledOnce();
		expect(cookiesAtSignIn).toBe('NEXT_LOCALE=v');
		document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
	});

	it('a signed-out success leaves the cookies to supabase-js', async () => {
		document.cookie = 'sb-x-auth-token=v; path=/';
		renderTimeout();
		await wait(IDLE_MS);
		expect(mocks.signOut).toHaveBeenCalledOnce();
		expect(document.cookie).toBe('sb-x-auth-token=v');
		document.cookie = 'sb-x-auth-token=; max-age=0; path=/';
	});

	it('a future or broken time from another tab does not hold off the timeout', async () => {
		renderTimeout();
		localStorage.setItem(ACTIVITY_KEY, String(Date.now() + 10 * IDLE_MS));
		await wait(IDLE_MS - WARN_MS);
		expect(dialog()).not.toBeNull();
		localStorage.setItem(ACTIVITY_KEY, 'Infinity');
		await wait(WARN_MS);
		expect(mocks.signOut).toHaveBeenCalledOnce();
	});

	it('screen readers hear the countdown at each minute, 0:30 and 0:10 only; the visible text is not live', async () => {
		renderTimeout();
		await wait(IDLE_MS - WARN_MS);
		const open = dialog()!;
		const live = open.querySelectorAll('[aria-live]');
		expect(live).toHaveLength(1);
		const heard = () => live[0]!.textContent;
		expect(heard()).toBe(body('2:00'));
		await wait(59_000);
		expect(heard()).toBe(body('2:00'));
		await wait(1000);
		expect(heard()).toBe(body('1:00'));
		await wait(29_000);
		expect(heard()).toBe(body('1:00'));
		await wait(1000);
		expect(heard()).toBe(body('0:30'));
		await wait(19_000);
		expect(heard()).toBe(body('0:30'));
		await wait(1000);
		expect(heard()).toBe(body('0:10'));
	});
});

describe('step', () => {
	it('rounds the time left to the announced steps', () => {
		expect([120_000, 61_000, 60_000, 31_000, 30_000, 11_000, 10_000, 1000].map((ms) => clock(step(ms)))).toEqual([
			'2:00',
			'2:00',
			'1:00',
			'1:00',
			'0:30',
			'0:30',
			'0:10',
			'0:10',
		]);
	});
});
