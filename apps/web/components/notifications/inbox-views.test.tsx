import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
vi.mock('./notifications-view', () => ({ NotificationsView: () => <h1>notifications view</h1> }));
vi.mock('@/components/chat/conversations', () => ({
	ConversationList: ({ selected, heading: Heading = 'h1' }: { selected?: string; heading?: 'h1' | 'h2' }) => (
		<Heading data-selected={selected}>{sl.chat.inbox_title}</Heading>
	),
}));

const show = (view: 'conversations' | 'notifications', selected?: string) =>
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<InboxViews view={view} selected={selected} />
		</NextIntlClientProvider>
	);

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
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
		expect(window.location.search).toBe('');
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
});
