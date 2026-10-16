import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import sl from '@zivali/i18n/dist/sl.json';

import { InboxViews } from './inbox-views';

vi.mock('./notifications-view', () => ({ NotificationsView: () => <h1>notifications view</h1> }));

const show = (view: 'conversations' | 'notifications') =>
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<InboxViews view={view} />
		</NextIntlClientProvider>
	);

afterEach(() => {
	cleanup();
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
	});
});
