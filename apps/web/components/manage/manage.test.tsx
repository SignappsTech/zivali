import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { conversations } from '@zivali/api/__fixtures__/chat';
import { placeReverse } from '@zivali/api/__fixtures__/geocode';
import { ownerReport } from '@zivali/api/__fixtures__/reports';
import { ApiError } from '@zivali/api/client';
import { createMockApi, type MockRoutes, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import { ManagePage } from './manage-page';
import { PrivateLinkBlock } from './private-link';
import { RETRY_MS, useAutoRetry } from './use-auto-retry';

vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/m',
	useParams: () => ({ locale: 'sl' }),
}));
// lib/auth is replaced outright (the page imports only ensureSession): its real module graph (supabase-js) is slow to
// transform cold, and the lazy import then resolves at once.
const auth = vi.hoisted(() => ({ ensureSession: vi.fn() }));
vi.mock('@/lib/auth', () => auth);
vi.mock('qrcode', () => ({ toString: vi.fn(async () => '<svg xmlns="http://www.w3.org/2000/svg"></svg>') }));
// The claim and the view take the tab's store (lib/store.ts getStore): here the test's, over the mock API.
const stores = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock('@/lib/store', async (actual) => ({ ...(await actual()), getStore: () => stores.current }));

const CODE = ownerReport.short_code;
const claimed = { report_id: ownerReport.id, short_code: CODE };

function show(node: React.ReactNode, routes: MockRoutes = {}, locale: 'sl' | 'en' = 'sl') {
	const api = createMockApi({
		'POST /v1/manage/claim': ({ body }) =>
			(body as { token: string }).token === 'good' ? claimed : mockError('NOT_FOUND'),
		'GET /v1/reports/:code': ownerReport,
		'GET /v1/conversations': { items: [], next_cursor: null },
		'POST /v1/reports/:code/transitions': ({ body }) => ({ ...ownerReport, ...(body as object) }),
		...routes,
	});
	const store = createApiStore(api);
	stores.current = store;
	render(
		<NextIntlClientProvider locale={locale} messages={{ sl, en }[locale]}>
			<Provider store={store}>{node}</Provider>
		</NextIntlClientProvider>
	);
	return api;
}
// The page as opened from the link: no hashchange event, as on a real load.
const open = (token: string) => history.replaceState(null, '', token ? `/m#${token}` : '/m');
const actions = (api: ReturnType<typeof createMockApi>) =>
	api.calls.filter((call) => call.path.endsWith('/transitions')).map((call) => call.body);

// Turnstile's api.js, which jsdom never loads: `render` keeps the callback, `execute` passes the visitor.
let solve: (token: string) => void = () => {};
const fakeTurnstile = {
	render: (_element: HTMLElement, options: Record<string, unknown>) => {
		solve = options.callback as typeof solve;
		return 'widget';
	},
	execute: vi.fn(() => solve('cf-token')),
	reset: vi.fn(),
	remove: vi.fn(),
};
/** api.js arrives; the hook loads it once per file, so every script element the tests added gets its load. */
function apiJsArrives() {
	window.turnstile = fakeTurnstile;
	for (const script of document.head.querySelectorAll('script[src*="challenges.cloudflare.com"]'))
		script.dispatchEvent(new Event('load'));
}

// The page loads the report view with the claim (TASK-17.9): load it once up front, so no test's findBy waits on
// its first transform.
beforeAll(async () => {
	await import('./manage-view');
}, 60_000);
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.useRealTimers();
	open('');
	sessionStorage.clear();
});

describe('ManagePage (P7, C7)', () => {
	it('signs in, claims the link from the fragment and shows the report with its actions and no ad slot', async () => {
		open('good');
		const api = show(<ManagePage />);

		expect(await screen.findByRole('heading', { level: 1, name: 'Vaša prijava' })).toBeTruthy();
		expect(auth.ensureSession).toHaveBeenCalledOnce();
		expect(api.calls.find((call) => call.path === '/v1/manage/claim')?.body).toEqual({ token: 'good' });
		expect(screen.getByText('Najdena')).toBeTruthy();
		expect(screen.getByText('Pes')).toBeTruthy();
		expect(screen.getByText('pri meni')).toBeTruthy();
		expect(screen.getByText(sl.report_found.manage_private_note)).toBeTruthy();
		expect(screen.getByRole('img', { name: ownerReport.photos[0]!.alt })).toBeTruthy();
		// No messages yet: "Sporočila" is the first row and the page has no primary.
		expect(screen.queryByRole('heading', { name: 'Sporočila' })).toBeNull();
		expect(screen.getByRole('link', { name: 'Sporočila' }).getAttribute('href')).toBe('/nabiralnik');
		// TASK-17.7: Edit opens the edit page, which takes the manage-link session (TASK-26.4).
		expect(screen.getByRole('link', { name: 'Uredi prijavo' }).getAttribute('href')).toBe(`/r/${CODE}/uredi`);
		expect(screen.getByRole('button', { name: 'Zaključi prijavo' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Žival je spet doma' })).toBeTruthy();
		expect(screen.getByRole('button', { name: sl.report_found.resend_title })).toBeTruthy();
		expect(document.querySelector('[data-ad-slot]')).toBeNull();
	});

	it('shows the place of the report\'s public area as "Kraj" (TASK-30.2)', async () => {
		open('good');
		const api = show(<ManagePage />, { 'POST /v1/geo/reverse': placeReverse });
		expect(await screen.findByText('Šiška, Ljubljana')).toBeTruthy();
		expect(screen.getByText('Kraj')).toBeTruthy();
		// The fuzzed area's centre, never the exact point the manager view also carries.
		expect(api.calls.find((call) => call.path === '/v1/geo/reverse')?.body).toEqual({
			lat: ownerReport.area.lat,
			lng: ownerReport.area.lng,
		});
	});

	it('takes the token out of the address bar; a reload in the tab still claims', async () => {
		open('good');
		const first = show(<ManagePage />);
		await screen.findByRole('heading', { level: 1, name: 'Vaša prijava' });
		expect(window.location.hash).toBe('');
		expect(window.location.pathname).toBe('/m');
		expect(first.calls.find((call) => call.path === '/v1/manage/claim')?.body).toEqual({ token: 'good' });

		cleanup();
		const reloaded = show(<ManagePage />);
		await screen.findByRole('heading', { level: 1, name: 'Vaša prijava' });
		expect(reloaded.calls.find((call) => call.path === '/v1/manage/claim')?.body).toEqual({ token: 'good' });
	});

	it('shows the messages with the unread count and each conversation, opened from here (P12 web)', async () => {
		open('good');
		show(<ManagePage />, {
			'GET /v1/conversations': {
				...conversations,
				items: [
					{ ...conversations.items[0]!, unread: 2 },
					{ ...conversations.items[0]!, id: 'x', unread: 0 },
				],
			},
		});
		expect(await screen.findByRole('heading', { name: 'Sporočila' })).toBeTruthy();
		expect(screen.getByText('2 neprebrani sporočili')).toBeTruthy();
		const rows = screen.getAllByRole('link', { name: /^Najdena žival/ });
		expect(rows.map((row) => row.getAttribute('href'))).toEqual([
			`/nabiralnik/${conversations.items[0]!.id}`,
			'/nabiralnik/x',
		]);
		expect(rows[0]!.textContent).toContain('Najdena žival, neprebrano');
		expect(screen.queryByRole('link', { name: 'Sporočila' })).toBeNull();
	});

	it.each([
		['an unknown link', 'bad', {}],
		['a link closed beyond the reopen window', 'good', { 'POST /v1/manage/claim': () => mockError('GONE') }],
		['a link without a token', '', {}],
	])('says %s no longer works (EN)', async (_case, token, routes) => {
		open(token);
		const api = show(<ManagePage />, routes, 'en');
		const heading = await screen.findByRole('heading', { level: 1, name: 'This link no longer works' });
		await vi.waitFor(() => expect(document.activeElement).toBe(heading));
		expect(screen.getByText(en.report_found.link_invalid_body)).toBeTruthy();
		// Reserves the skeleton's height so the footer does not jump (TASK-17.15).
		expect(screen.getByRole('main').className).toContain('min-h-[456px]');
		// Without a token nothing is requested and nothing signs in.
		if (!token) expect([api.calls, auth.ensureSession.mock.calls]).toEqual([[], []]);
	});

	it('without a session, passes the captcha in its reserved slot (CLS) before it signs in and claims', async () => {
		vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'test-key');
		try {
			open('good');
			const api = show(<ManagePage />);
			expect(screen.getByRole('main').querySelector('.min-h-\\[65px\\]')).toBeTruthy();
			// api.js is on its way (jsdom never loads it): nothing signs in or claims yet (TASK-17.17).
			await vi.waitFor(() =>
				expect(document.head.querySelector('script[src*="challenges.cloudflare.com"]')).toBeTruthy()
			);
			await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
			expect([api.calls, auth.ensureSession.mock.calls]).toEqual([[], []]);

			// Cloudflare passes the visitor: the sign-in gets that token, then the claim runs.
			apiJsArrives();
			expect(await screen.findByRole('heading', { level: 1, name: 'Vaša prijava' })).toBeTruthy();
			expect(await auth.ensureSession.mock.calls[0]![0]()).toBe('cf-token');
		} finally {
			vi.unstubAllEnvs();
			delete window.turnstile;
		}
	});

	it('with a stale session cookie, claims at once and the sign-in asks for the captcha itself', async () => {
		vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'test-key');
		document.cookie = 'sb-x-auth-token=v; path=/';
		// The cookie's session is gone: ensureSession asks for a token, as lib/auth does.
		let executedBefore = -1;
		let captchaToken: string | undefined;
		auth.ensureSession.mockImplementationOnce(async (getCaptchaToken: () => Promise<string | undefined>) => {
			executedBefore = fakeTurnstile.execute.mock.calls.length;
			const pending = getCaptchaToken();
			apiJsArrives();
			captchaToken = await pending;
		});
		try {
			open('good');
			const api = show(<ManagePage />);
			expect(await screen.findByRole('heading', { level: 1, name: 'Vaša prijava' })).toBeTruthy();
			// The page took the cookie at its word: no captcha before the sign-in, then the captcha's own getToken.
			expect(executedBefore).toBe(0);
			expect(captchaToken).toBe('cf-token');
			expect(api.calls.find((call) => call.path === '/v1/manage/claim')?.body).toEqual({ token: 'good' });
		} finally {
			vi.unstubAllEnvs();
			document.cookie = 'sb-x-auth-token=; max-age=0; path=/';
			delete window.turnstile;
		}
	});

	it('keeps trying after a lost connection or a failed captcha, with a calm note', async () => {
		open('good');
		auth.ensureSession
			.mockRejectedValueOnce(new ApiError('NETWORK', 'NETWORK'))
			.mockRejectedValueOnce(new ApiError('CAPTCHA_FAILED', 'CAPTCHA_FAILED'));
		show(<ManagePage />);

		const offline = await screen.findByText(sl.errors.offline_body, { exact: false });
		expect(offline.textContent).toBe(`${sl.errors.offline_title} ${sl.errors.offline_body}`);
		// Back online: tried again at once; this time the captcha fails.
		// The listener may attach a moment after the note shows, so fire again until the second attempt has run.
		await vi.waitFor(() => {
			if (auth.ensureSession.mock.calls.length < 2) window.dispatchEvent(new Event('online'));
			expect(auth.ensureSession).toHaveBeenCalledTimes(2);
		});
		await screen.findByText(sl.errors.CAPTCHA_FAILED);
		// "Poskusi znova" does not wait for the next 60 s round.
		fireEvent.click(screen.getByRole('button', { name: sl.common.try_again }));
		expect(await screen.findByRole('heading', { level: 1, name: 'Vaša prijava' })).toBeTruthy();
		expect(auth.ensureSession).toHaveBeenCalledTimes(3);
	});

	it('closes the report, and marks the animal home after the P14 confirmation (`reunited`, with consent)', async () => {
		initAnalytics();
		setConsent({ analytics: true });
		resetMockEvents();
		open('good');
		const api = show(<ManagePage />);
		fireEvent.click(await screen.findByRole('button', { name: 'Zaključi prijavo' }));
		await vi.waitFor(() => expect(actions(api)).toEqual([{ action: 'close', reason: 'other' }]));

		fireEvent.click(screen.getByRole('button', { name: 'Žival je spet doma' }));
		const dialog = await screen.findByRole('alertdialog', { name: sl.lifecycle.finder_confirm_title });
		fireEvent.click(within(dialog).getByRole('button', { name: sl.lifecycle.finder_confirm_yes }));
		expect(await screen.findByRole('heading', { level: 1, name: sl.lifecycle.finder_thanks_title })).toBeTruthy();
		expect(actions(api)).toEqual([{ action: 'close', reason: 'other' }, { action: 'mark_reunited' }]);
		expect(getMockEvents()).toEqual([
			{ name: 'flow_step', params: { flow: 'reunite', step: 'dialog' } },
			{ name: 'reunited', params: { species: 'dog', region: 'osrednjeslovenska', municipality: 'ljubljana' } },
		]);
	});

	it('a refused "Žival je spet doma" sends flow_error reunite dialog with its code; nothing without consent', async () => {
		initAnalytics();
		setConsent({ analytics: true });
		resetMockEvents();
		open('good');
		const api = show(<ManagePage />, { 'POST /v1/reports/:code/transitions': () => mockError('RATE_LIMITED') });
		const markHome = async () => {
			fireEvent.click(await screen.findByRole('button', { name: 'Žival je spet doma' }));
			const dialog = await screen.findByRole('alertdialog', { name: sl.lifecycle.finder_confirm_title });
			fireEvent.click(within(dialog).getByRole('button', { name: sl.lifecycle.finder_confirm_yes }));
		};
		await markHome();
		await vi.waitFor(() =>
			expect(getMockEvents()).toEqual([
				{ name: 'flow_step', params: { flow: 'reunite', step: 'dialog' } },
				{ name: 'flow_error', params: { flow: 'reunite', step: 'dialog', error_code: 'RATE_LIMITED' } },
			])
		);

		setConsent({ analytics: false });
		resetMockEvents();
		await markHome();
		await vi.waitFor(() => expect(actions(api)).toHaveLength(2));
		await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
		expect(getMockEvents()).toEqual([]);
	});

	it('moves focus to the closed note after close and to the h1 after reopen', async () => {
		open('good');
		let report = { ...ownerReport };
		show(<ManagePage />, {
			'GET /v1/reports/:code': () => report,
			'POST /v1/reports/:code/transitions': ({ body }) => {
				const closed = (body as { action: string }).action === 'close';
				report = {
					...report,
					status: closed ? 'closed' : 'open',
					closed_at: closed ? new Date().toISOString() : null,
				};
				return report;
			},
		});
		fireEvent.click(await screen.findByRole('button', { name: 'Zaključi prijavo' }));
		const note = (await screen.findByText(sl.report_found.closed_note)).parentElement!.parentElement!;
		await vi.waitFor(() => expect(document.activeElement).toBe(note));

		fireEvent.click(screen.getByRole('button', { name: 'Ponovno odpri' }));
		await screen.findByRole('button', { name: 'Zaključi prijavo' });
		await vi.waitFor(() =>
			expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Vaša prijava' }))
		);
	});

	it('shows a closed report read-only with "Ponovno odpri" within 7 days', async () => {
		open('good');
		const closedAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
		const api = show(<ManagePage />, {
			'GET /v1/reports/:code': { ...ownerReport, status: 'closed', closed_at: closedAt },
		});
		expect(await screen.findByText(sl.report_found.closed_note)).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Zaključi prijavo' })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'Ponovno odpri' }));
		await vi.waitFor(() => expect(actions(api)).toEqual([{ action: 'reopen' }]));
	});

	it('says a held report is under review', async () => {
		open('good');
		show(<ManagePage />, { 'GET /v1/reports/:code': { ...ownerReport, moderation_state: 'held' } });
		expect(await screen.findByText(sl.report_found.under_review_title)).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Zaključi prijavo' })).toBeTruthy();
	});

	it('offers Contact support by mailto on the under-review note (TASK-25.7)', async () => {
		open('good');
		show(<ManagePage />, { 'GET /v1/reports/:code': { ...ownerReport, moderation_state: 'hidden' } });
		const link = await screen.findByRole('link', { name: sl.report.owner_hidden_contact });
		expect(link.getAttribute('href')).toBe('mailto:podpora@najdimo.si');
	});

	it('offers no reopen for a report removed by moderation', async () => {
		open('good');
		const closedAt = new Date(Date.now() - 86_400_000).toISOString();
		show(<ManagePage />, {
			'GET /v1/reports/:code': { ...ownerReport, status: 'closed', close_reason: 'removed', closed_at: closedAt },
		});
		expect(await screen.findByText(sl.report_found.closed_note)).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Ponovno odpri' })).toBeNull();
	});

	it('from day 25 without an update says when it expires and keeps it 30 more days (P14 S9)', async () => {
		open('good');
		const idle = new Date(Date.now() - 27 * 86_400_000).toISOString();
		const api = show(<ManagePage />, {
			'GET /v1/reports/:code': { ...ownerReport, last_owner_update_at: idle },
		});
		expect(await screen.findByText(/^Prijava bo potekla čez 3 dni\./)).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Podaljšaj za 30 dni' }));
		await vi.waitFor(() => expect(actions(api)).toEqual([{ action: 'extend' }]));
		expect(await screen.findByText(sl.common.toast_saved)).toBeTruthy();
	});

	it('sends the private link again to the email on file, and says when there is none (C7)', async () => {
		open('good');
		let email = true;
		const api = show(<ManagePage />, {
			'POST /v1/reports/:code/manage-link/resend': () => (email ? undefined : mockError('CONFLICT')),
		});
		fireEvent.click(await screen.findByRole('button', { name: sl.report_found.resend_title }));
		expect(await screen.findByText(sl.report_found.resend_done_manager)).toBeTruthy();
		expect(api.calls.filter((call) => call.path === `/v1/reports/${CODE}/manage-link/resend`)).toHaveLength(1);

		email = false;
		// The row ignores clicks while aria-busy (mutation still loading), which can outlast the toast under load.
		const again = screen.getByRole('button', { name: sl.report_found.resend_title });
		await vi.waitFor(() => expect(again.getAttribute('aria-busy')).toBeNull());
		fireEvent.click(again);
		expect(await screen.findByText(sl.report_found.resend_no_email)).toBeTruthy();
	});
});

describe('useAutoRetry (C7)', () => {
	it('retries a transient failure every 60 s until it works', async () => {
		vi.useFakeTimers();
		const task = vi
			.fn()
			.mockRejectedValueOnce(new ApiError('CAPTCHA_FAILED', 'CAPTCHA_FAILED'))
			.mockRejectedValueOnce(new ApiError('NETWORK', 'NETWORK'))
			.mockResolvedValue('sent');
		const { result } = renderHook(() => useAutoRetry(task));
		await act(() => result.current.run());
		expect(result.current.status).toBe('waiting');
		await act(() => vi.advanceTimersByTimeAsync(RETRY_MS - 1));
		expect(task).toHaveBeenCalledTimes(1);
		await act(() => vi.advanceTimersByTimeAsync(1));
		expect(task).toHaveBeenCalledTimes(2);
		await act(() => vi.advanceTimersByTimeAsync(RETRY_MS));
		expect(result.current).toMatchObject({ status: 'done', result: 'sent' });
	});

	it('stops on any other error', async () => {
		vi.useFakeTimers();
		const task = vi.fn().mockRejectedValue(new ApiError('RATE_LIMITED', 'RATE_LIMITED'));
		const { result } = renderHook(() => useAutoRetry(task));
		await act(() => result.current.run());
		await act(() => vi.advanceTimersByTimeAsync(RETRY_MS * 3));
		act(() => void window.dispatchEvent(new Event('online')));
		expect(result.current.status).toBe('failed');
		expect(task).toHaveBeenCalledOnce();
	});
});

describe('PrivateLinkBlock (P7 success)', () => {
	it('shows the private link as text and copies it', async () => {
		const writeText = vi.fn(async () => undefined);
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		show(<PrivateLinkBlock token="q7Vt-token" emailed />);

		const link = `${window.location.origin}/m#q7Vt-token`;
		const block = screen.getByRole('region', { name: 'Vaša zasebna povezava' });
		expect(within(block).getByText(link)).toBeTruthy();
		expect(within(block).getByText(sl.report_found.link_emailed)).toBeTruthy();
		fireEvent.click(within(block).getByRole('button', { name: 'Kopiraj povezavo' }));
		await vi.waitFor(() => expect(within(block).getByRole('status').textContent).toBe('Povezava je kopirana.'));
		expect(writeText).toHaveBeenCalledWith(link);
	});

	it('draws the QR code of the link in the browser, lazy-loaded, with an accessible name', async () => {
		const { toString } = await import('qrcode');
		show(<PrivateLinkBlock token="q7Vt-token" />);

		const qr = await screen.findByRole('img', { name: sl.report_found.link_qr_alt });
		expect(qr.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
		expect(toString).toHaveBeenCalledWith(
			`${window.location.origin}/m#q7Vt-token`,
			expect.objectContaining({ type: 'svg' })
		);
	});
});
