import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { me } from '@zivali/api/__fixtures__/me';
import { prefs } from '@zivali/api/__fixtures__/notifications';
import { ApiError } from '@zivali/api/client';
import sl from '@zivali/i18n/dist/sl.json';
import type { Me, NotificationPrefs, NotificationType } from '@zivali/types';

import { NotificationSettings } from './notification-settings';

const state = vi.hoisted(() => ({
	me: null as Me | null,
	gate: 'loading',
	prefs: {} as { data?: NotificationPrefs; isError?: boolean },
	refetch: vi.fn(),
	setPref: vi.fn(),
	setQuietHours: vi.fn(),
	dispatch: vi.fn(),
	updateQueryData: vi.fn((...args: unknown[]) => ({ type: 'updateQueryData', args })),
}));
vi.mock('@zivali/api/auth', () => ({ useRequireAuth: () => ({ me: state.me, gate: state.gate }) }));
vi.mock('@zivali/api/notifications', () => ({
	notificationsApi: { util: { updateQueryData: state.updateQueryData } },
	useGetPrefsQuery: () => ({ refetch: state.refetch, ...state.prefs }),
	useSetPrefMutation: () => [state.setPref],
	useSetQuietHoursMutation: () => [state.setQuietHours],
}));
vi.mock('react-redux', async (actual) => ({ ...(await actual()), useStore: () => ({ dispatch: state.dispatch }) }));
vi.mock('@/lib/auth', () => ({ resendConfirmation: vi.fn() }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('sonner', async (actual) => ({ ...(await actual()), toast }));

const resolves = (value?: unknown) => ({ unwrap: () => Promise.resolve(value) });
const alerts = sl.alerts;
const switchFor = (type: string, channel: string) =>
	screen.getByRole('switch', { name: `${type}: ${channel}` }) as HTMLButtonElement;

const disclosure = () => screen.getByRole('button', { name: alerts.channels_title });

/** Renders the section, open by default (owner 2026-10-19); `closed` closes it with its button. */
function show(profile: Me | null = me, data: NotificationPrefs | null = prefs, { closed = false } = {}) {
	state.me = profile;
	state.gate = profile ? 'ok' : 'loading';
	state.prefs = { data: data ?? undefined };
	const view = render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<NotificationSettings />
		</NextIntlClientProvider>
	);
	if (closed) fireEvent.click(disclosure());
	return view;
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	window.history.replaceState(null, '', '/');
});

describe('NotificationSettings: the "Kako vas obvestimo" disclosure (TASK-114.15)', () => {
	it('is open by default; the button closes it, with the summary under the closed title, and opens it again', () => {
		show();
		const button = disclosure();
		const panel = document.getElementById(button.getAttribute('aria-controls')!)!;
		expect([button.tagName, button.getAttribute('type'), button.getAttribute('aria-expanded')]).toEqual([
			'BUTTON',
			'button',
			'true',
		]);
		expect(button.closest('h2')).toBeTruthy();
		expect(panel.hidden).toBe(false);
		expect(screen.getByRole('region', { name: alerts.channels_title })).toBe(panel);
		expect(screen.getAllByRole('switch')).toHaveLength(12);
		// Push and email on somewhere, in app beside them goes without saying; quiet hours set.
		const summary = 'Na telefonu in po e-pošti · Tihi čas 22:00 do 07:00';
		expect(screen.queryByText(summary)).toBeNull();
		expect(button.hasAttribute('aria-describedby')).toBe(false);

		fireEvent.click(button);
		expect([button.getAttribute('aria-expanded'), panel.hidden]).toEqual(['false', true]);
		expect(screen.queryAllByRole('switch')).toHaveLength(0);
		expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toBe(summary);

		fireEvent.click(button);
		expect([button.getAttribute('aria-expanded'), panel.hidden]).toEqual(['true', false]);
	});

	it('carries the anchor the redirect of /racun/obvestila targets, and is open there', () => {
		window.history.replaceState(null, '', '/racun/opozorila#kako-vas-obvestimo');
		show();
		expect(disclosure().getAttribute('aria-expanded')).toBe('true');
		expect(disclosure().closest('#kako-vas-obvestimo')).toBeTruthy();
		expect(screen.getAllByRole('switch')).toHaveLength(12);
	});

	it.each([
		['only in app', { push: false, email: false, in_app: true }, 'V aplikaciji'],
		['email only', { push: false, email: true, in_app: true }, 'Po e-pošti'],
		['nothing at all', { push: false, email: false, in_app: false }, alerts.channels_summary_none],
	])('summarises %s, without quiet hours', (_, channels, summary) => {
		const types: NotificationType[] = [
			'match_chip',
			'match_suggested',
			'match_confirmed',
			'chat_message',
			'nearby_lost',
			'report_reminder',
			'report_expiring',
			'report_closed',
		];
		const items = types.map((type) => ({ type, ...channels }));
		show(me, { items, quiet_from: null, quiet_to: null }, { closed: true });
		expect(document.getElementById(disclosure().getAttribute('aria-describedby')!)?.textContent).toBe(summary);
	});

	it('waits with a skeleton, and shows the inline error with a retry when the prefs fail', () => {
		show(me, null);
		expect(screen.getByText(sl.common.loading_page)).toBeTruthy();
		expect(disclosure().hasAttribute('aria-describedby')).toBe(false);

		cleanup();
		state.me = me;
		state.prefs = { isError: true };
		render(
			<NextIntlClientProvider locale="sl" messages={sl}>
				<NotificationSettings />
			</NextIntlClientProvider>
		);
		fireEvent.click(screen.getByRole('button', { name: sl.common.inline_error_retry }));
		expect(state.refetch).toHaveBeenCalled();
	});

	it('has a labelled switch per type and channel, none locked: in app for matches and messages too', () => {
		show();

		expect(screen.getAllByRole('switch')).toHaveLength(12);
		expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
			alerts.channel_push,
			alerts.channel_email,
			alerts.channel_inapp,
		]);
		for (const item of screen.getAllByRole('switch') as HTMLButtonElement[]) {
			expect(item.disabled).toBe(false);
			expect(item.hasAttribute('aria-describedby')).toBe(false);
		}
		expect(screen.queryByText(/ni mogoče izklopiti/)).toBeNull();
		// nearby_lost email is opt-in (fixture: off); types without a stored row are on.
		expect(switchFor(alerts.type_nearby, alerts.channel_email).getAttribute('aria-checked')).toBe('false');
		expect(switchFor(alerts.type_reminders, alerts.channel_push).getAttribute('aria-checked')).toBe('true');
		// The address is confirmed: no note.
		expect(screen.queryByRole('note')).toBeNull();
	});

	it('switches every type of a row, shows it at once and says "Saved."', async () => {
		state.setPref.mockReturnValue(resolves());
		show();

		fireEvent.click(switchFor(alerts.type_reminders, alerts.channel_email));

		expect(state.setPref.mock.calls.map(([input]) => input)).toEqual([
			{ type: 'report_reminder', body: { email: false } },
			{ type: 'report_expiring', body: { email: false } },
			{ type: 'report_closed', body: { email: false } },
		]);
		expect(state.updateQueryData).toHaveBeenCalledWith('getPrefs', undefined, expect.any(Function));
		const draft = structuredClone(prefs);
		draft.items.push({ type: 'report_closed', in_app: true, push: true, email: true });
		(state.updateQueryData.mock.calls[0]![2] as (draft: NotificationPrefs) => void)(draft);
		expect(draft.items.map((item) => [item.type, item.email])).toEqual([
			['chat_message', true],
			['nearby_lost', false],
			['report_closed', false],
		]);
		await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith(sl.profile.saved));
	});

	it('turns in app off for matches and messages, and every channel off with no warning', async () => {
		state.setPref.mockReturnValue(resolves());
		show();

		fireEvent.click(switchFor(alerts.type_messages, alerts.channel_inapp));
		fireEvent.click(switchFor(alerts.type_matches, alerts.channel_inapp));
		for (const channel of [alerts.channel_push, alerts.channel_email])
			fireEvent.click(switchFor(alerts.type_matches, channel));

		const calls = state.setPref.mock.calls.map(([input]) => input);
		expect(calls.slice(0, 4)).toEqual([
			{ type: 'chat_message', body: { in_app: false } },
			{ type: 'match_chip', body: { in_app: false } },
			{ type: 'match_suggested', body: { in_app: false } },
			{ type: 'match_confirmed', body: { in_app: false } },
		]);
		expect(calls).toHaveLength(10);
		await vi.waitFor(() => expect(toast.success).toHaveBeenCalledTimes(4));
		expect(screen.queryByRole('note')).toBeNull();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('says a failed save in a toast', async () => {
		state.setPref.mockReturnValue({ unwrap: () => Promise.reject(new ApiError('NETWORK', 'NETWORK')) });
		show();

		fireEvent.click(switchFor(alerts.type_nearby, alerts.channel_push));
		await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(sl.errors.NETWORK));
		expect(toast.success).not.toHaveBeenCalled();
	});

	it('saves quiet hours once both times are set and a field is left, and clears them', async () => {
		state.setQuietHours.mockReturnValue(resolves());
		show();
		const from = screen.getByLabelText(alerts.quiet_from) as HTMLInputElement;
		const to = screen.getByLabelText(alerts.quiet_to) as HTMLInputElement;
		expect([from.value, to.value, from.type]).toEqual(['22:00', '07:00', 'time']);
		expect(screen.getByText(alerts.quiet_help)).toBeTruthy();

		fireEvent.blur(from);
		expect(state.setQuietHours).not.toHaveBeenCalled();
		fireEvent.change(from, { target: { value: '23:30' } });
		fireEvent.blur(from);
		expect(state.setQuietHours).toHaveBeenCalledWith({ quiet_from: '23:30', quiet_to: '07:00' });
		await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith(sl.profile.saved));

		fireEvent.change(to, { target: { value: '' } });
		fireEvent.blur(to);
		expect(state.setQuietHours).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole('button', { name: alerts.quiet_off }));
		expect(state.setQuietHours).toHaveBeenLastCalledWith({ quiet_from: null, quiet_to: null });
		expect([from.value, to.value]).toEqual(['', '']);
	});

	it('has no "No quiet hours" button without quiet hours', () => {
		show(me, { ...prefs, quiet_from: null, quiet_to: null });
		expect(screen.queryByRole('button', { name: alerts.quiet_off })).toBeNull();
	});

	it('asks to confirm the address for email notifications, with Resend', () => {
		show({ ...me, email_verified: false });

		expect(screen.getByRole('note').textContent).toContain(alerts.email_unverified);
		expect(screen.getByRole('button', { name: alerts.email_resend })).toBeTruthy();
	});
});
