import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { conversations } from '@zivali/api/__fixtures__/chat';
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
const auth = vi.hoisted(() => ({ ensureSession: vi.fn() }));
vi.mock('@/lib/auth', async (actual) => ({ ...(await actual<object>()), ...auth }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

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
	render(
		<NextIntlClientProvider locale={locale} messages={{ sl, en }[locale]}>
			<Provider store={createApiStore(api)}>{node}</Provider>
		</NextIntlClientProvider>
	);
	return api;
}
// The page as opened from the link: no hashchange event, as on a real load.
const open = (token: string) => history.replaceState(null, '', token ? `/m#${token}` : '/m');
const actions = (api: ReturnType<typeof createMockApi>) =>
	api.calls.filter((call) => call.path.endsWith('/transitions')).map((call) => call.body);

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
		expect(screen.getByRole('link', { name: 'Uredi prijavo' }).getAttribute('href')).toBe(`/r/${CODE}`);
		expect(screen.getByRole('button', { name: 'Zaključi prijavo' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Žival je spet doma' })).toBeTruthy();
		expect(document.querySelector('[data-ad-slot]')).toBeNull();
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

	it('shows the messages with the unread count and "Odpri sporočila" when there are conversations', async () => {
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
		expect(screen.getByRole('link', { name: 'Odpri sporočila' }).getAttribute('href')).toBe('/nabiralnik');
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
		expect(document.activeElement).toBe(heading);
		expect(screen.getByText(en.report_found.link_invalid_body)).toBeTruthy();
		if (!token) expect(api.calls).toEqual([]);
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
		act(() => void window.dispatchEvent(new Event('online')));
		await screen.findByText(sl.errors.CAPTCHA_FAILED);
		// "Poskusi znova" does not wait for the next 60 s round.
		fireEvent.click(screen.getByRole('button', { name: sl.common.try_again }));
		expect(await screen.findByRole('heading', { level: 1, name: 'Vaša prijava' })).toBeTruthy();
		expect(auth.ensureSession).toHaveBeenCalledTimes(3);
	});

	it('closes the report, and marks the animal home after the P14 confirmation', async () => {
		open('good');
		const api = show(<ManagePage />);
		fireEvent.click(await screen.findByRole('button', { name: 'Zaključi prijavo' }));
		await vi.waitFor(() => expect(actions(api)).toEqual([{ action: 'close', reason: 'other' }]));

		fireEvent.click(screen.getByRole('button', { name: 'Žival je spet doma' }));
		const dialog = await screen.findByRole('alertdialog', { name: sl.lifecycle.finder_confirm_title });
		fireEvent.click(within(dialog).getByRole('button', { name: sl.lifecycle.finder_confirm_yes }));
		expect(await screen.findByRole('heading', { level: 1, name: sl.lifecycle.finder_thanks_title })).toBeTruthy();
		expect(actions(api)).toEqual([{ action: 'close', reason: 'other' }, { action: 'mark_reunited' }]);
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
		expect((await within(block).findByRole('status')).textContent).toBe('Povezava je kopirana.');
		expect(writeText).toHaveBeenCalledWith(link);
	});
});
