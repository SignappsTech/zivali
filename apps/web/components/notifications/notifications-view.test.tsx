import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@zivali/api/client';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { NotificationList } from '@zivali/types';

import { NotificationsView } from './notifications-view';

const state = vi.hoisted(() => ({
	query: {} as {
		pages?: NotificationList[];
		isError?: boolean;
		isFetching?: boolean;
		isFetchingNextPage?: boolean;
		isFetchNextPageError?: boolean;
	},
	markRead: vi.fn(),
	refetch: vi.fn(),
	fetchNextPage: vi.fn(),
}));
vi.mock('@zivali/api/notifications', () => ({
	// The infinite query's shape: the loaded pages, and a next one while the last page has a next_cursor.
	useListNotificationPagesInfiniteQuery: () => {
		const { pages, ...rest } = state.query;
		return {
			refetch: state.refetch,
			fetchNextPage: state.fetchNextPage,
			data: pages && { pages, pageParams: [] },
			hasNextPage: Boolean(pages?.at(-1)?.next_cursor),
			...rest,
		};
	},
	useMarkReadMutation: () => [state.markRead],
}));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('sonner', async (actual) => ({ ...(await actual()), toast }));

const list: NotificationList = {
	items: [
		{
			id: 'n1',
			type: 'match_chip',
			payload: { lost_code: 'Pq7', other_type: 'found', has_name: 'yes', pet_name: 'Luna', species: 'dog' },
			read_at: null,
			created_at: '2026-10-15T13:52:00+02:00',
		},
		{
			id: 'n2',
			type: 'report_reminder',
			payload: { report_code: 'R7', day: 7, has_name: 'yes', pet_name: 'Luna', species: 'dog' },
			read_at: '2026-10-14T08:00:00+02:00',
			created_at: '2026-10-13T08:00:00+02:00',
		},
		{
			id: 'n3',
			type: 'payment_receipt',
			payload: { amount_cents: 300, purpose: 'tip', is_test: false },
			read_at: '2026-10-03T09:00:00+02:00',
			created_at: '2026-10-03T08:00:00+02:00',
		},
	],
	next_cursor: null,
	unread: 1,
};

/** An older page: one read chip match, from September. */
const older: NotificationList = {
	items: [
		{
			id: 'n4',
			type: 'match_chip',
			payload: { lost_code: 'Zx9', other_type: 'found', has_name: 'yes', pet_name: 'Bobi', species: 'dog' },
			read_at: '2026-09-20T09:00:00+02:00',
			created_at: '2026-09-20T08:00:00+02:00',
		},
	],
	next_cursor: null,
	unread: 1,
};

const view = (locale: 'sl' | 'en' = 'sl') => (
	<NextIntlClientProvider locale={locale} messages={locale === 'sl' ? sl : en} timeZone="Europe/Ljubljana">
		<NotificationsView />
	</NextIntlClientProvider>
);
const show = (locale: 'sl' | 'en' = 'sl') => render(view(locale));

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date('2026-10-15T14:20:00+02:00'));
	state.markRead.mockReturnValue({ unwrap: () => Promise.resolve() });
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.clearAllMocks();
	state.query = {};
});

describe('NotificationsView', () => {
	it('waits with skeleton rows, announced once', () => {
		show();
		expect(screen.getByRole('status').textContent).toBe(sl.common.loading);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(sl.notifications.title);
	});

	it('groups the rows, marks the unread one and links every row to its target (SL)', () => {
		state.query = { pages: [list] };
		show();

		expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
			sl.notifications.group_today,
			sl.notifications.group_week,
			sl.notifications.group_earlier,
		]);
		const chip = screen.getByRole('link', { name: /Številka čipa se ujema · Luna, neprebrano/ });
		expect(chip.getAttribute('href')).toBe('/r/Pq7/ujemanja');
		expect(within(chip).getByText('13:52').getAttribute('datetime')).toBe('2026-10-15T13:52:00+02:00');
		expect(screen.getByRole('link', { name: /^Potrdilo o plačilu/ }).getAttribute('href')).toBe('/racun/placila');
		// The matcher's default normaliser turns the no-break space of "3,00 €" into a space.
		expect(screen.getByText('3,00 €, prispevek v zahvalo. Hvala.')).toBeTruthy();
		// The reminder row: its own text buttons under it.
		expect(screen.getByRole('link', { name: sl.notifications.reminder_keep }).getAttribute('href')).toBe(
			'/moje-prijave?r=R7&action=keep'
		);
		expect(screen.getByRole('link', { name: sl.notifications.reminder_close }).getAttribute('href')).toBe(
			'/moje-prijave?r=R7&action=close'
		);
		// One page, no next_cursor: nothing more to load.
		expect(screen.queryByRole('button', { name: sl.common.load_more })).toBeNull();
	});

	it('appends the next page with "Load more", focuses its first row and hides the button at the end', () => {
		const first = { ...list, next_cursor: 'n3' };
		state.query = { pages: [first] };
		const { rerender } = show();

		fireEvent.click(screen.getByRole('button', { name: sl.common.load_more }));
		expect(state.fetchNextPage).toHaveBeenCalledTimes(1);
		state.query = { pages: [first], isFetchingNextPage: true };
		rerender(view());
		expect(screen.getByRole('button', { name: sl.common.load_more }).getAttribute('aria-busy')).toBe('true');

		state.query = { pages: [first, older] };
		rerender(view());
		const bobi = screen.getByRole('link', { name: /^Številka čipa se ujema · Bobi/ });
		expect(bobi.getAttribute('href')).toBe('/r/Zx9/ujemanja');
		expect(document.activeElement).toBe(bobi);
		// The first page's rows stay, and its unread count leads.
		expect(screen.getByRole('link', { name: /Številka čipa se ujema · Luna, neprebrano/ })).toBeTruthy();
		expect(screen.getByRole('button', { name: sl.notifications.mark_all })).toBeTruthy();
		expect(screen.queryByRole('button', { name: sl.common.load_more })).toBeNull();
	});

	it('keeps the rows and offers a retry when the next page fails', () => {
		state.query = { pages: [{ ...list, next_cursor: 'n3' }], isError: true, isFetchNextPageError: true };
		show();

		expect(screen.getByRole('link', { name: /Številka čipa se ujema · Luna/ })).toBeTruthy();
		expect(screen.queryByRole('button', { name: sl.common.load_more })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: sl.common.inline_error_retry }));
		expect(state.fetchNextPage).toHaveBeenCalled();
		expect(state.refetch).not.toHaveBeenCalled();
	});

	it('marks a row read when it is opened, and all rows with the text button (EN)', () => {
		state.query = { pages: [list] };
		show('en');

		fireEvent.click(screen.getByRole('link', { name: /Chip number matches · Luna, unread/ }));
		expect(state.markRead).toHaveBeenCalledWith({ ids: ['n1'] });
		// A read row does not ask again.
		fireEvent.click(screen.getByRole('link', { name: /^Payment receipt/ }));
		expect(state.markRead).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole('button', { name: en.notifications.mark_all }));
		expect(state.markRead).toHaveBeenLastCalledWith({ all: true });
	});

	it('hides "Mark all as read" when everything is read, and says a failed mark in a toast', async () => {
		state.query = { pages: [{ ...list, unread: 0 }] };
		state.markRead.mockReturnValue({ unwrap: () => Promise.reject(new ApiError('RATE_LIMITED', 'RATE_LIMITED')) });
		show();
		expect(screen.queryByRole('button', { name: sl.notifications.mark_all })).toBeNull();

		state.query = { pages: [list] };
		cleanup();
		show();
		fireEvent.click(screen.getByRole('button', { name: sl.notifications.mark_all }));
		await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(sl.errors.RATE_LIMITED_generic));
	});

	it('has an empty state that leads to the alert settings', () => {
		state.query = { pages: [{ items: [], next_cursor: null, unread: 0 }] };
		show();

		// An h2 right under the view's h1 (axe heading-order).
		expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(sl.notifications.empty_title);
		expect(screen.getByText(sl.notifications.empty_body)).toBeTruthy();
		expect(screen.getByRole('link', { name: sl.notifications.empty_action }).getAttribute('href')).toBe(
			'/racun/opozorila'
		);
	});

	it('shows the inline error with a retry', () => {
		state.query = { isError: true };
		show();

		expect(screen.getByRole('alert').textContent).toContain(sl.common.inline_error);
		fireEvent.click(screen.getByRole('button', { name: sl.common.inline_error_retry }));
		expect(state.refetch).toHaveBeenCalled();
	});
});
