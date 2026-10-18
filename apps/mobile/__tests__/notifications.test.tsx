// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as React from 'react';
import { Linking } from 'react-native';
import { Provider } from 'react-redux';
import { createTranslator } from 'use-intl';

import { notification as chip, prefs as prefsFixture } from '@zivali/api/__fixtures__/notifications';
import { createMockApi, mockError, type MockRequest, type MockRoutes } from '@zivali/api/mock';
import { api, type ApiStore, createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { type Notification, NOTIFICATION_TYPES, type NotificationPrefs } from '@zivali/types';
import InboxTab from '@/app/(tabs)/inbox';
import NotificationSettings, { parseClock } from '@/app/settings/notifications';
import { I18nProvider } from '@/lib/i18n';
import { hasInAppText, inboxGroups, notificationTarget, notificationValues, rowTime } from '@/lib/notifications';
import { usePushNotifications } from '@/lib/push';

const mockStorage = new Map<string, string>();
jest.mock('expo-sqlite/localStorage/install', () => {
	globalThis.localStorage = {
		getItem: (name: string) => mockStorage.get(name) ?? null,
		setItem: (name: string, value: string) => void mockStorage.set(name, value),
		removeItem: (name: string) => void mockStorage.delete(name),
	} as Storage;
	return {};
});
jest.mock('@/lib/env', () => ({
	env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test', EXPO_PUBLIC_PUSH_PROVIDER: 'mock' },
}));

type Tap = { notification: { request: { identifier: string; content: { data: Record<string, unknown> } } } };
const mockPush = {
	permission: { granted: true, canAskAgain: true },
	request: jest.fn(),
	last: null as Tap | null,
	listener: undefined as ((response: Tap) => void) | undefined,
};
jest.mock('expo-notifications', () => ({
	setNotificationHandler: jest.fn(),
	getPermissionsAsync: async () => mockPush.permission,
	requestPermissionsAsync: () => mockPush.request(),
	getExpoPushTokenAsync: jest.fn(),
	getLastNotificationResponse: () => mockPush.last,
	addNotificationResponseReceivedListener: (listener: (response: Tap) => void) => {
		mockPush.listener = listener;
		return { remove: () => (mockPush.listener = undefined) };
	},
}));

// Supabase Realtime: the inbox joins `user:<id>`; tests broadcast on it.
const mockChannels = new Map<string, Record<string, (message: { payload?: unknown }) => void>>();
jest.mock('@/lib/supabase', () => ({
	supabase: {
		channel: (topic: string) => {
			const handlers: Record<string, (message: { payload?: unknown }) => void> = {};
			mockChannels.set(topic, handlers);
			const channel = {
				on: (
					_type: string,
					{ event }: { event: string },
					callback: (message: { payload?: unknown }) => void
				) => {
					handlers[event] = callback;
					return channel;
				},
				subscribe: () => channel,
			};
			return channel;
		},
		removeChannel: (_channel: unknown) => mockChannels.clear(),
	},
}));

const ME = { display_name: 'Ana', email: 'ana@primer.si', email_verified: true };
type SessionMock = { session: { user: { id: string } } | null; me: typeof ME; isAnonymous: boolean; loading: boolean };
let mockSession: SessionMock;
jest.mock('@zivali/api/auth', () => ({
	...jest.requireActual('@zivali/api/auth'),
	useSession: () => mockSession,
	useRequireAuth: () => ({ ...mockSession, gate: 'ok' }),
}));
const mockResend = jest.fn();
jest.mock('@/lib/auth', () => ({
	providers: { google: false, apple: false },
	signInWithProvider: jest.fn(),
	resendConfirmation: (email: string) => mockResend(email),
}));

// A fresh mock API and store per test, over the real client (C1 parsing).
let store: ApiStore;
let calls: MockRequest[];
function serve(routes: MockRoutes) {
	// Every signed-in render registers the push token (permission granted by default).
	const client = createMockApi({ 'POST /v1/push-tokens': () => undefined, ...routes });
	calls = client.calls;
	store = createApiStore(client);
}
const sent = (method: string, path: string) =>
	calls.filter((call) => call.method === method && call.path === path).map((call) => call.body);

function Providers({ children }: { children: React.ReactNode }) {
	return (
		<Provider store={store}>
			<I18nProvider>
				{children}
				<PortalHost />
			</I18nProvider>
		</Provider>
	);
}

function PushRoot() {
	usePushNotifications();
	return <Stack screenOptions={{ headerShown: false }} />;
}

const open = async (initialUrl: string) => {
	const result = renderRouter(
		{
			_layout: PushRoot,
			index: () => null,
			inbox: InboxTab,
			'settings/notifications': NotificationSettings,
			'settings/alerts': () => null,
			'settings/payments': () => null,
			'r/[code]/index': () => null,
			'r/[code]/matches': () => null,
			'inbox/[id]': () => null,
		},
		{ initialUrl, wrapper: Providers }
	);
	// The result is a promise with the router getters attached; awaiting it would drop them.
	await result;
	return { getPathname: result.getPathname };
};
const nameOf = (element: { props: Record<string, unknown> }) => String(element.props.accessibilityLabel);

// 14:20 in Ljubljana. Only Date is faked (timers stay real), so "today" never crosses midnight during a run.
const NOW = Date.parse('2026-10-15T12:20:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const DAY = 86_400_000;
const n = (patch: Partial<Notification> & Pick<Notification, 'id' | 'type' | 'payload'>): Notification => ({
	read_at: null,
	created_at: ago(60_000),
	...patch,
});
const message = (id: string, minutes: number, read = false) =>
	n({
		id,
		type: 'chat_message',
		payload: { conversation_id: 'c1', preview_alias: 'Ana', unread_count: 1 },
		created_at: ago(minutes * 60_000),
		read_at: read ? ago(0) : null,
	});
const nearby = n({
	id: 'n-near',
	type: 'nearby_lost',
	payload: {
		report_code: 'Hk3vT9qP',
		species: 'dog',
		distance_band: 'lt1',
		has_area: true,
		area_name: 'Šiška',
		reported_at: ago(DAY),
		// Email-only fields (C10) never reach the inbox; if a payload carried them, they are not shown.
		clinic_name: 'Ambulanta Mačji kašelj',
		unsubscribe_url: 'https://najdimo.test/u/x',
	},
	created_at: ago(30 * 60_000),
	read_at: ago(0),
});
const reminder = n({
	id: 'n-rem',
	type: 'report_reminder',
	payload: { report_code: 'Lu7aB2cD', day: 7, has_name: 'yes', pet_name: 'Luna', species: 'cat' },
	created_at: ago(3 * DAY),
	read_at: ago(0),
});
const receipt = n({
	id: 'n-pay',
	type: 'payment_receipt',
	payload: {
		payment_id: 'p1',
		amount_cents: 300,
		purpose: 'tip',
		paid_at: ago(20 * DAY),
		receipt_ref: 'R1',
		is_test: false,
	},
	created_at: ago(20 * DAY),
	read_at: ago(0),
});
const todayChip = { ...chip, created_at: ago(90 * 60_000) };

jest.setTimeout(60_000);
beforeAll(() =>
	jest.useFakeTimers({
		now: NOW,
		doNotFake: [
			'hrtime',
			'nextTick',
			'performance',
			'queueMicrotask',
			'requestAnimationFrame',
			'cancelAnimationFrame',
			'requestIdleCallback',
			'cancelIdleCallback',
			'setImmediate',
			'clearImmediate',
			'setInterval',
			'clearInterval',
			'setTimeout',
			'clearTimeout',
		],
	})
);
afterAll(() => jest.useRealTimers());

beforeEach(() => {
	mockStorage.clear();
	mockStorage.set('locale', 'sl');
	mockSession = { session: { user: { id: 'u1' } }, me: ME, isAnonymous: false, loading: false };
	mockPush.permission = { granted: true, canAskAgain: true };
	mockPush.request.mockReset();
	mockPush.last = null;
	mockChannels.clear();
	mockResend.mockReset().mockResolvedValue({});
});
afterEach(() => store?.dispatch(api.util.resetApiState()));

describe('inbox rows (lib/notifications)', () => {
	test('every type with in-app copy renders in both languages from its allowlisted variables', () => {
		const payloads: Record<string, Record<string, unknown>> = {
			match_chip: chip.payload,
			match_suggested: {
				lost_code: 'Pq7xK2mN',
				strength: 'strong',
				other_type: 'sighted',
				has_name: 'no',
				species: 'cat',
			},
			match_confirmed: { conversation_id: 'c1', report_code: 'Hk3vT9qP', species: 'dog', report_type: 'found' },
			chat_message: { conversation_id: 'c1', preview_alias: 'Ana', unread_count: 2 },
			nearby_lost: nearby.payload,
			report_reminder: reminder.payload,
			report_expiring: { report_code: 'X1', report_type: 'lost', days_left: 3, has_name: 'no', species: 'dog' },
			report_closed: { report_code: 'X1', report_type: 'found', idle_days: 30, reopen_days: 7, species: 'dog' },
			report_hidden: { report_code: 'X1', report_type: 'lost', support_email: 'pomoc@najdimo.si' },
			report_reunited: { report_code: 'X1', species: 'cat' },
			payment_receipt: receipt.payload,
		};
		for (const [locale, messages] of [
			['sl', sl],
			['en', en],
		] as const) {
			const errors: unknown[] = [];
			const t = createTranslator({
				locale,
				messages,
				namespace: 'notifications',
				onError: (error) => errors.push(error),
			}) as unknown as (key: string, values: object) => string;
			for (const type of NOTIFICATION_TYPES.filter(hasInAppText)) {
				const values = notificationValues(n({ id: type, type, payload: payloads[type] }), locale);
				expect(t(`${type}.title`, values)).not.toContain('notifications.');
				expect(t(`${type}.body`, values)).not.toContain('{');
			}
			expect(errors).toEqual([]);
		}
		expect(hasInAppText('manage_link')).toBe(false);
	});

	test('only allowlisted variables survive; names are cut, booleans and money formatted', () => {
		const values = notificationValues(nearby, 'sl');
		expect(values).toEqual({
			report_code: 'Hk3vT9qP',
			species: 'dog',
			distance_band: 'lt1',
			has_area: 'yes',
			area_name: 'Šiška',
		});
		const long = n({
			id: 'x',
			type: 'match_chip',
			payload: { ...chip.payload, pet_name: 'Princesa Lunica Bela Zvezdica' },
		});
		expect(notificationValues(long, 'sl')).toMatchObject({ pet_name: 'Princesa Lunica Be', has_name: 'yes' });
		const unnamed = n({ id: 'x', type: 'match_chip', payload: { ...chip.payload, has_name: 'yes', pet_name: '' } });
		expect(notificationValues(unnamed, 'sl').has_name).toBe('no');
		expect(notificationValues(receipt, 'sl')).toMatchObject({ is_test: 'no', purpose: 'tip' });
		expect(notificationValues(receipt, 'sl').amount).toMatch(/^3,00\s€$/);
		expect(notificationValues(message('m', 1), 'en')).toEqual({ conversation_id: 'c1', preview_alias: 'Ana' });
	});

	test('targets open the listing, its matches, the conversation or payments; odd codes open nothing', () => {
		expect(notificationTarget(chip)).toBe('/r/Pq7xK2mN/matches');
		expect(notificationTarget(message('m', 1))).toBe('/inbox/c1');
		expect(notificationTarget(nearby)).toBe('/r/Hk3vT9qP');
		expect(notificationTarget(reminder)).toBe('/r/Lu7aB2cD');
		expect(notificationTarget(receipt)).toBe('/settings/payments');
		expect(notificationTarget({ ...nearby, payload: { report_code: '../../dev/kit' } })).toBeNull();
	});

	test('groups by the Ljubljana day; chip matches first; one row per conversation', () => {
		const at = (iso: string) => new Date(iso).toISOString();
		const items = [
			{ ...message('m2', 0), created_at: at('2026-10-15T12:00:00Z') },
			{ ...message('m1', 0, true), created_at: at('2026-10-15T11:00:00Z') },
			{ ...chip, created_at: at('2026-10-15T09:00:00Z') },
			// 23:30 the evening before in Ljubljana (21:30 UTC) is not today.
			{ ...reminder, created_at: at('2026-10-14T21:30:00Z') },
			{ ...receipt, created_at: at('2026-10-08T10:00:00Z') },
			n({ id: 'mail', type: 'manage_link', payload: { report_code: 'X1' } }),
		];
		const groups = inboxGroups(items, NOW);
		expect(groups.map((g) => [g.group, g.rows.map((row) => row.notification.id)])).toEqual([
			['today', [chip.id, 'm2']],
			['week', ['n-rem']],
			['earlier', ['n-pay']],
		]);
		expect(groups[0].rows[1]).toMatchObject({ ids: ['m2', 'm1'], unread: true });
		expect(rowTime('2026-10-15T11:52:00Z', 'today', 'sl')).toBe('13:52');
		expect(rowTime('2026-10-03T10:00:00Z', 'earlier', 'sl')).toBe('3. 10.');
	});

	test('quiet hours accept common ways of typing a time', () => {
		expect(['22:00', '7:00', '22.30', '2200', '0630'].map(parseClock)).toEqual([
			'22:00',
			'07:00',
			'22:30',
			'22:00',
			'06:30',
		]);
		expect(['24:00', '12:60', 'ab', '', '1'].map(parseClock)).toEqual([null, null, null, null, null]);
	});
});

describe('Inbox tab: notifications view', () => {
	const list = (items: Notification[]) => {
		const unread = items.filter((item) => !item.read_at).length;
		return { items, next_cursor: null, unread };
	};

	test('shows rows by group with the unread state, chip match first, without email-only text', async () => {
		serve({
			'GET /v1/notifications': list([message('m2', 5), message('m1', 10), nearby, todayChip, reminder, receipt]),
		});
		await open('/inbox?view=notifications');

		expect(await screen.findByRole('heading', { name: sl.notifications.title })).toBeOnTheScreen();
		for (const group of ['group_today', 'group_week', 'group_earlier'] as const)
			expect(screen.getByRole('heading', { name: sl.notifications[group] })).toBeOnTheScreen();
		const unread = screen.getAllByRole('button', { name: /, neprebrano, / });
		expect(unread).toHaveLength(2);
		expect(nameOf(unread[0])).toMatch(/^Številka čipa se ujema · Piko, neprebrano, /);
		expect(nameOf(unread[1])).toMatch(/^Novo sporočilo · Ana, neprebrano, /);
		expect(
			screen.getByRole('button', { name: /^Izgubljen pes v vaši bližini, Šiška, manj kot 1 km/ })
		).toBeOnTheScreen();
		// The two messages of one conversation are one row.
		expect(screen.getAllByText('Novo sporočilo · Ana')).toHaveLength(1);
		expect(screen.getByText('Izgubljen pes v vaši bližini')).toBeOnTheScreen();
		expect(screen.queryByText(/Mačji kašelj/)).toBeNull();
		expect(screen.getByText(/^3,00\s€, prispevek v zahvalo\. Hvala\.$/)).toBeOnTheScreen();
	});

	test('a tap marks the row read and opens its target; "Mark all" marks everything', async () => {
		serve({
			'GET /v1/notifications': list([message('m2', 5), message('m1', 10), todayChip]),
			'POST /v1/notifications/read': () => undefined,
		});
		const result = await open('/inbox?view=notifications');

		await fireEvent.press(await screen.findByRole('button', { name: sl.notifications.mark_all }));
		await waitFor(() => expect(sent('POST', '/v1/notifications/read')).toEqual([{ all: true }]));

		await fireEvent.press(screen.getByRole('button', { name: /^Novo sporočilo · Ana, neprebrano/ }));
		await waitFor(() => expect(result.getPathname()).toBe('/inbox/c1'));
		expect(sent('POST', '/v1/notifications/read')).toEqual([{ all: true }, { ids: ['m2', 'm1'] }]);
	});

	test('a new notification arrives in real time', async () => {
		let items = [nearby];
		serve({ 'GET /v1/notifications': () => list(items) });
		await open('/inbox?view=notifications');
		await screen.findByText('Izgubljen pes v vaši bližini');
		expect(screen.queryByRole('button', { name: sl.notifications.mark_all })).toBeNull();

		items = [todayChip, nearby];
		await act(async () => mockChannels.get('user:u1')!['notification.created']({ payload: todayChip }));
		expect(await screen.findByText('Številka čipa se ujema · Piko')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.notifications.mark_all })).toBeOnTheScreen();
	});

	test('"Keep searching" extends the search; "Close search" opens the listing', async () => {
		serve({
			'GET /v1/notifications': list([{ ...reminder, read_at: null }]),
			'POST /v1/notifications/read': () => undefined,
			'POST /v1/reports/:code/transitions': () => ({}),
		});
		const result = await open('/inbox?view=notifications');

		await fireEvent.press(await screen.findByRole('button', { name: sl.notifications.reminder_keep }));
		await waitFor(() => expect(sent('POST', '/v1/reports/Lu7aB2cD/transitions')).toEqual([{ action: 'extend' }]));
		expect(sent('POST', '/v1/notifications/read')).toEqual([{ ids: ['n-rem'] }]);

		await fireEvent.press(screen.getByRole('button', { name: sl.notifications.reminder_close }));
		await waitFor(() => expect(result.getPathname()).toBe('/r/Lu7aB2cD'));
	});

	test('empty: the sentence and "Set up alerts"; push denied: the fallback note', async () => {
		mockPush.permission = { granted: false, canAskAgain: false };
		serve({ 'GET /v1/notifications': list([]) });
		const result = await open('/inbox?view=notifications');

		expect(await screen.findByText(sl.notifications.empty_title)).toBeOnTheScreen();
		expect(screen.getByText(sl.notifications.empty_body)).toBeOnTheScreen();
		expect(await screen.findByText(sl.permissions.notifications_denied)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.notifications.empty_action }));
		expect(result.getPathname()).toBe('/settings/alerts');
	});

	test('a failed load offers "Try again"', async () => {
		let fail = true;
		serve({
			'GET /v1/notifications': () => (fail ? mockError('INTERNAL') : list([nearby])),
		});
		await open('/inbox?view=notifications');

		expect(await screen.findByText(sl.common.inline_error, {}, { timeout: 10_000 })).toBeOnTheScreen();
		fail = false;
		await fireEvent.press(screen.getByRole('button', { name: sl.common.inline_error_retry }));
		expect(await screen.findByText('Izgubljen pes v vaši bližini')).toBeOnTheScreen();
	});
});

describe('settings: how we tell you', () => {
	// Keeps what PUT stores, as the API does, so the re-fetch after a change returns it.
	const prefsRoute = (initial: NotificationPrefs = prefsFixture) => {
		const prefs = structuredClone(initial);
		return {
			'GET /v1/notification-prefs': () => prefs,
			'PUT /v1/notification-prefs/:type': ({ params, body }: MockRequest) => {
				const type = params.type as NotificationPrefs['items'][number]['type'];
				let item = prefs.items.find((i) => i.type === type);
				if (!item) prefs.items.push((item = { type, in_app: true, push: true, email: true }));
				Object.assign(item, body);
				return item;
			},
			'PATCH /v1/me': () => ({}),
		};
	};
	const cell = (type: string, channel: string) => screen.getByRole('switch', { name: `${type}: ${channel}` });
	const { type_matches, type_messages, type_nearby, type_reminders, channel_push, channel_email, channel_inapp } =
		sl.alerts;

	test('no switch is locked: in app turns off for matches and messages too; a switch saves every type of its row', async () => {
		serve(prefsRoute());
		await open('/settings/notifications');

		await screen.findByRole('switch', { name: `${type_matches}: ${channel_inapp}` });
		for (const type of [type_matches, type_messages]) {
			expect(cell(type, channel_inapp)).toBeEnabled();
			expect(cell(type, channel_inapp)).toBeChecked();
		}
		expect(screen.queryByText(/ni mogoče izklopiti/)).toBeNull();
		await fireEvent.press(cell(type_messages, channel_inapp));
		await waitFor(() => expect(cell(type_messages, channel_inapp)).not.toBeChecked());
		expect(sent('PUT', '/v1/notification-prefs/chat_message')).toEqual([{ in_app: false }]);
		expect(cell(type_nearby, channel_email)).not.toBeChecked();

		await fireEvent.press(cell(type_nearby, channel_email));
		await waitFor(() => expect(sent('PUT', '/v1/notification-prefs/nearby_lost')).toEqual([{ email: true }]));
		await waitFor(() => expect(cell(type_nearby, channel_email)).toBeChecked());

		await fireEvent.press(cell(type_matches, channel_push));
		await waitFor(() =>
			expect(calls.filter((c) => c.method === 'PUT').map((c) => [c.path, c.body])).toEqual([
				['/v1/notification-prefs/chat_message', { in_app: false }],
				['/v1/notification-prefs/nearby_lost', { email: true }],
				['/v1/notification-prefs/match_chip', { push: false }],
				['/v1/notification-prefs/match_suggested', { push: false }],
				['/v1/notification-prefs/match_confirmed', { push: false }],
			])
		);
	});

	test('a refused change moves the switch back', async () => {
		serve({
			...prefsRoute(),
			'PUT /v1/notification-prefs/:type': () => mockError('VALIDATION'),
		});
		await open('/settings/notifications');

		await fireEvent.press(await screen.findByRole('switch', { name: `${type_reminders}: ${channel_email}` }));
		await waitFor(() => expect(sent('PUT', '/v1/notification-prefs/report_reminder')).toHaveLength(1));
		await waitFor(() => expect(cell(type_reminders, channel_email)).toBeChecked());
	});

	test('push denied: the note opens the phone settings and the push column is off', async () => {
		mockPush.permission = { granted: false, canAskAgain: false };
		const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
		serve(prefsRoute());
		await open('/settings/notifications');

		expect(await screen.findByText(sl.alerts.push_denied)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.alerts.push_open_settings }));
		expect(openSettings).toHaveBeenCalled();
		for (const type of [type_matches, type_messages, type_nearby, type_reminders]) {
			expect(cell(type, channel_push)).not.toBeChecked();
			expect(cell(type, channel_push)).toBeDisabled();
		}
	});

	test('push not asked yet: turning it on shows the primer first, then registers and saves', async () => {
		mockPush.permission = { granted: false, canAskAgain: true };
		mockPush.request.mockImplementation(async () => {
			mockPush.permission = { granted: true, canAskAgain: true };
			return { granted: true };
		});
		const off = {
			...prefsFixture,
			items: [{ type: 'report_reminder' as const, in_app: true, push: false, email: true }],
		};
		serve(prefsRoute(off));
		await open('/settings/notifications');

		await fireEvent.press(await screen.findByRole('switch', { name: `${type_reminders}: ${channel_push}` }));
		expect(screen.getByRole('heading', { name: sl.permissions.notifications_title })).toBeOnTheScreen();
		expect(mockPush.request).not.toHaveBeenCalled();

		await fireEvent.press(screen.getByRole('button', { name: sl.permissions.notifications_allow }));
		await waitFor(() =>
			expect(sent('POST', '/v1/push-tokens')).toEqual([{ token: 'ExponentPushToken[mock-ios]', platform: 'ios' }])
		);
		await waitFor(() => expect(sent('PUT', '/v1/notification-prefs/report_reminder')).toEqual([{ push: true }]));
	});

	test('quiet hours save as two valid times; a wrong time says so; "No quiet hours" clears them', async () => {
		serve(prefsRoute());
		await open('/settings/notifications');

		const from = await screen.findByLabelText(sl.alerts.quiet_from);
		expect(from.props.value).toBe('22:00');
		await fireEvent.changeText(from, '25:00');
		await fireEvent(from, 'endEditing');
		expect(screen.getByText(sl.alerts.quiet_invalid)).toBeOnTheScreen();
		expect(sent('PATCH', '/v1/me')).toEqual([]);

		await fireEvent.changeText(from, '2330');
		await fireEvent(from, 'endEditing');
		await waitFor(() => expect(sent('PATCH', '/v1/me')).toEqual([{ quiet_from: '23:30', quiet_to: '07:00' }]));
		expect(screen.queryByText(sl.alerts.quiet_invalid)).toBeNull();

		await fireEvent.press(screen.getByRole('button', { name: sl.alerts.quiet_off }));
		await waitFor(() => expect(sent('PATCH', '/v1/me')).toHaveLength(2));
		expect(sent('PATCH', '/v1/me')[1]).toEqual({ quiet_from: null, quiet_to: null });
	});

	test('an unconfirmed address shows the note and can resend the link', async () => {
		mockSession.me = { ...ME, email_verified: false };
		serve(prefsRoute());
		await open('/settings/notifications');

		expect(await screen.findByText(sl.alerts.email_unverified)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.alerts.email_resend }));
		expect(mockResend).toHaveBeenCalledWith('ana@primer.si');
	});
});

describe('push: registration and taps', () => {
	const tap = (url: string, identifier = url): Tap => ({
		notification: { request: { identifier, content: { data: { url } } } },
	});

	test('a signed-in session registers its token when permission is granted, without prompting', async () => {
		serve({ 'POST /v1/push-tokens': () => undefined });
		await open('/');
		await waitFor(() =>
			expect(sent('POST', '/v1/push-tokens')).toEqual([{ token: 'ExponentPushToken[mock-ios]', platform: 'ios' }])
		);
		expect(mockPush.request).not.toHaveBeenCalled();
	});

	test.each([
		['no permission', () => (mockPush.permission = { granted: false, canAskAgain: true })],
		['no session', () => (mockSession.session = null)],
	])('%s: nothing is registered', async (_case, arrange) => {
		arrange();
		serve({ 'POST /v1/push-tokens': () => undefined });
		await open('/');
		await act(async () => {});
		expect(sent('POST', '/v1/push-tokens')).toEqual([]);
	});

	test('a tap opens its target through the deep-link routes; the launching tap too, once', async () => {
		mockPush.permission = { granted: false, canAskAgain: false };
		mockPush.last = tap('/r/Pq7xK2mN/matches', 'launch');
		serve({});
		const result = await open('/');
		await waitFor(() => expect(result.getPathname()).toBe('/r/Pq7xK2mN/matches'));

		await act(async () => mockPush.listener!(tap('zivali://r/Hk3vT9qP', 'local-1')));
		expect(result.getPathname()).toBe('/r/Hk3vT9qP');
		await act(async () => mockPush.listener!(tap('/inbox/c1', 'push-2')));
		expect(result.getPathname()).toBe('/inbox/c1');
		await act(async () => mockPush.listener!(tap('/settings/account', 'push-3')));
		expect(result.getPathname()).toBe('/inbox');
	});
});
