import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import { Link } from '@/i18n/navigation';

import { UnreadDot } from './unread-dot';

const state = vi.hoisted(() => ({
	unread: 0,
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
vi.mock('@zivali/api/auth', () => ({
	useSession: () => ({ session: state.userId ? { user: { id: state.userId } } : null }),
}));
vi.mock('react-redux', async (actual) => ({ ...(await actual()), useStore: () => ({ dispatch: state.dispatch }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => state.supabase }));

function show(live = false) {
	return render(
		<NextIntlClientProvider locale="en" messages={en}>
			<Link href="/inbox">
				{en.nav.inbox}
				<UnreadDot live={live} />
			</Link>
		</NextIntlClientProvider>
	);
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	state.unread = 0;
	state.userId = 'u1';
});

describe('UnreadDot', () => {
	it('adds the dot and "unread" to the inbox link while unread notifications exist, never a count', () => {
		state.unread = 3;
		show();

		const link = screen.getByRole('link', { name: `${en.nav.inbox}, ${en.common.unread}` });
		expect(link.textContent).not.toContain('3');
	});

	it('shows nothing when everything is read', () => {
		show();
		expect(screen.getByRole('link', { name: en.nav.inbox })).toBeTruthy();
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
