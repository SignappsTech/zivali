import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import { Link } from '@/i18n/navigation';

import { UnreadDot } from './unread-dot';

const state = vi.hoisted(() => ({
	unread: 0,
	conversationUnread: 0,
	userId: 'u1' as string | undefined,
	stop: vi.fn(),
	subscribeInbox: vi.fn(),
	dispatch: vi.fn(),
	supabase: { realtime: true },
}));
vi.mock('@zivali/api/notifications', () => ({
	useListNotificationsQuery: () => ({ data: { items: [], next_cursor: null, unread: state.unread } }),
	subscribeInbox: state.subscribeInbox,
}));
vi.mock('@zivali/api/chat', () => ({
	useListConversationsQuery: () => ({
		data: {
			items: [
				{ id: 'c1', unread: 0 },
				{ id: 'c2', unread: state.conversationUnread },
			],
			next_cursor: null,
		},
	}),
}));
vi.mock('@zivali/api/auth', () => ({
	useSession: () => ({ session: state.userId ? { user: { id: state.userId } } : null }),
}));
vi.mock('react-redux', async (actual) => ({ ...(await actual()), useStore: () => ({ dispatch: state.dispatch }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => state.supabase }));

function show(live = false, visible = false) {
	return render(
		<NextIntlClientProvider locale="en" messages={en}>
			<Link href="/inbox">
				<UnreadDot label={en.nav.inbox} live={live} visible={visible} />
			</Link>
		</NextIntlClientProvider>
	);
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	state.unread = 0;
	state.conversationUnread = 0;
	state.userId = 'u1';
});

describe('UnreadDot', () => {
	it.each([false, true])(
		'adds the dot and ", unread" to the link name while unread notifications exist, never a count (visible %s)',
		(visible) => {
			state.unread = 3;
			const { container } = show(false, visible);

			// One text node, so no browser puts a space before the comma.
			const name = 'Messages and notifications, unread';
			expect(screen.getByRole('link', { name }).textContent).not.toContain('3');
			expect(screen.getByText(name).className).toBe('sr-only');
			expect(container.querySelector('.bg-primary')).toBeTruthy();
		}
	);

	it('is on for an unread conversation too, with every notification read', () => {
		state.conversationUnread = 2;
		const { container } = show(false, true);
		expect(screen.getByRole('link', { name: 'Messages and notifications, unread' })).toBeTruthy();
		expect(container.querySelector('.bg-primary')).toBeTruthy();
	});

	it('shows the plain label when everything is read', () => {
		const { container } = show(false, true);
		expect(screen.getByRole('link', { name: en.nav.inbox }).textContent).toBe(en.nav.inbox);
		expect(container.querySelector('.bg-primary')).toBeNull();
	});

	it('live: joins the user channel once signed in and leaves it on unmount', async () => {
		state.subscribeInbox.mockReturnValue(state.stop);
		const view = show(true);

		await vi.waitFor(() => expect(state.subscribeInbox).toHaveBeenCalledWith(state.supabase, state.dispatch, 'u1'));
		view.unmount();
		expect(state.stop).toHaveBeenCalled();
	});

	it('does not subscribe without the live flag or a session', async () => {
		show();
		cleanup();
		state.userId = undefined;
		show(true);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(state.subscribeInbox).not.toHaveBeenCalled();
	});
});
