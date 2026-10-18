import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import sl from '@zivali/i18n/dist/sl.json';

import { InboxViews } from './inbox-views';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => router,
	usePathname: () => '/nabiralnik',
	useParams: () => ({ locale: 'sl' }),
}));
const unread = vi.hoisted(() => ({ conversations: false, notifications: false, loaded: true, failed: false }));
vi.mock('./unread-dot', () => ({ useInboxUnread: () => unread }));
vi.mock('./notifications-view', () => ({ NotificationsView: () => <h1>notifications view</h1> }));
vi.mock('@/components/chat/conversations', () => ({
	ConversationList: ({ selected, heading: Heading = 'h1' }: { selected?: string; heading?: 'h1' | 'h2' }) => (
		<Heading data-selected={selected}>{sl.chat.inbox_title}</Heading>
	),
}));

const tree = (view?: 'conversations' | 'notifications', selected?: string) => (
	<NextIntlClientProvider locale="sl" messages={sl}>
		<InboxViews view={view} selected={selected} />
	</NextIntlClientProvider>
);
const show = (view?: 'conversations' | 'notifications', selected?: string) => render(tree(view, selected));
const selectedTab = () => screen.getByRole('tab', { selected: true });
const unreadName = (label: string) => sl.chat.row_unread_a11y.replace('{title}', label);

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.useRealTimers();
	Object.assign(unread, { conversations: false, notifications: false, loaded: true, failed: false });
	window.history.replaceState(null, '', '/');
});

describe('InboxViews', () => {
	it('opens the view from the URL and keeps the chosen view in ?view= without navigating', () => {
		window.history.replaceState(null, '', '/nabiralnik?view=notifications');
		show('notifications');

		expect(screen.getByRole('tablist', { name: sl.chat.inbox_title })).toBeTruthy();
		expect(screen.getByRole('tab', { name: sl.chat.view_notifications }).getAttribute('aria-selected')).toBe(
			'true'
		);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('notifications view');

		// Radix tabs activate on mouse down.
		fireEvent.mouseDown(screen.getByRole('tab', { name: sl.chat.view_conversations }));
		expect(window.location.search).toBe('?view=conversations');
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(sl.chat.inbox_title);

		fireEvent.mouseDown(screen.getByRole('tab', { name: sl.chat.view_notifications }));
		expect(window.location.pathname + window.location.search).toBe('/nabiralnik?view=notifications');
		expect(router.push).not.toHaveBeenCalled();
	});

	it('beside an open thread: the list heading is an h2 and Notifications opens the inbox page in that view', () => {
		window.history.replaceState(null, '', '/nabiralnik/c1');
		show('conversations', 'c1');

		const heading = screen.getByRole('heading', { level: 2, name: sl.chat.inbox_title });
		expect(heading.dataset.selected).toBe('c1');
		expect(screen.queryByRole('heading', { level: 1 })).toBeNull();

		fireEvent.mouseDown(screen.getByRole('tab', { name: sl.chat.view_notifications }));
		expect(router.push).toHaveBeenCalledWith('/nabiralnik?view=notifications');
		expect(window.location.pathname).toBe('/nabiralnik/c1');
		expect(screen.getByRole('tab', { name: sl.chat.view_conversations }).getAttribute('aria-selected')).toBe(
			'true'
		);
	});

	it('marks each view with unread items: the dot and ", neprebrano" in the tab name; plain when read', () => {
		Object.assign(unread, { conversations: true, notifications: true });
		const { container, rerender } = show('conversations');

		const conversations = screen.getByRole('tab', { name: unreadName(sl.chat.view_conversations) });
		const notifications = screen.getByRole('tab', { name: unreadName(sl.chat.view_notifications) });
		for (const tab of [conversations, notifications]) expect(tab.querySelector('.bg-primary')).toBeTruthy();

		// Live: the lists re-fetch on Realtime events, the tabs follow.
		Object.assign(unread, { conversations: false, notifications: false });
		rerender(tree('conversations'));
		expect(screen.getByRole('tab', { name: sl.chat.view_conversations })).toBeTruthy();
		expect(screen.getByRole('tab', { name: sl.chat.view_notifications })).toBeTruthy();
		expect(container.querySelector('.bg-primary')).toBeNull();
	});

	it.each([
		[{ conversations: true, notifications: true }, 'conversations'],
		[{ conversations: false, notifications: true }, 'notifications'],
		[{ conversations: false, notifications: false }, 'conversations'],
	] as const)('without a view in the URL opens where the unread items are (%o → %s)', (state, view) => {
		Object.assign(unread, state);
		show();
		expect(selectedTab().textContent).toContain(sl.chat[`view_${view}`]);
		expect(window.location.search).toBe('');
	});

	it('opens no view until both lists answered (no jump), then keeps it; the URL view always wins', () => {
		Object.assign(unread, { notifications: true, loaded: false });
		const { rerender } = show();
		expect(screen.queryByRole('tab', { selected: true })).toBeNull();
		expect(screen.queryByRole('heading')).toBeNull();
		expect(screen.getByRole('status').textContent).toBe(sl.common.loading);

		unread.loaded = true;
		rerender(tree());
		expect(selectedTab().textContent).toContain(sl.chat.view_notifications);
		expect(screen.queryByRole('status')).toBeNull();
		Object.assign(unread, { conversations: true });
		rerender(tree());
		expect(selectedTab().textContent).toContain(sl.chat.view_notifications);
		cleanup();

		Object.assign(unread, { conversations: false, notifications: true, loaded: false });
		show('conversations');
		expect(selectedTab().textContent).toBe(sl.chat.view_conversations);
	});

	it('opens Conversations when a list fails, or when the lists take longer than 2 s', () => {
		Object.assign(unread, { notifications: true, loaded: false, failed: true });
		show();
		expect(selectedTab().textContent).toBe(sl.chat.view_conversations);
		cleanup();

		vi.useFakeTimers();
		Object.assign(unread, { failed: false });
		show();
		act(() => vi.advanceTimersByTime(1999));
		expect(screen.queryByRole('tab', { selected: true })).toBeNull();
		act(() => vi.advanceTimersByTime(1));
		expect(selectedTab().textContent).toBe(sl.chat.view_conversations);
	});
});
