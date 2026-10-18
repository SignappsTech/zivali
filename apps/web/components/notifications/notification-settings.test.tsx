import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { me } from '@zivali/api/__fixtures__/me';
import { prefs } from '@zivali/api/__fixtures__/notifications';
import { ApiError } from '@zivali/api/client';
import sl from '@zivali/i18n/dist/sl.json';
import type { Me, NotificationPrefs } from '@zivali/types';

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

function show(profile: Me | null = me, data: NotificationPrefs | null = prefs) {
	state.me = profile;
	state.gate = profile ? 'ok' : 'loading';
	state.prefs = { data: data ?? undefined };
	return render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<NotificationSettings />
		</NextIntlClientProvider>
	);
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('NotificationSettings', () => {
	it('waits with a skeleton, and shows the inline error with a retry when the prefs fail', () => {
		show(me, null);
		expect(screen.getByText(sl.common.loading_page)).toBeTruthy();

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
