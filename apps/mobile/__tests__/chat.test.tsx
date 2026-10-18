// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { NetworkState } from 'expo-network';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import { AccessibilityInfo } from 'react-native';
import { Provider } from 'react-redux';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { abuseCreated } from '@zivali/api/__fixtures__/abuse';
import { createMockApi, mockError, type MockRequest, type MockRoutes } from '@zivali/api/mock';
import { type ApiStore, createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { ConversationSummary, Message } from '@zivali/types';
import InboxTab from '@/app/(tabs)/inbox';
import ConversationScreen from '@/app/inbox/[id]';
import { I18nProvider } from '@/lib/i18n';

const c = sl.chat;
const a = sl.abuse;

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
jest.mock('expo-crypto', () => {
	let n = 0;
	return { randomUUID: () => `1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7${String(++n).padStart(4, '0')}` };
});
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({})) }));
jest.mock('@/lib/anonymous', () => ({ ensureSession: jest.fn(async () => ({})) }));
// The Notifications view reads the push permission (P13 fallback note).
jest.mock('expo-notifications', () => ({
	setNotificationHandler: jest.fn(),
	getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
}));

// Network: online by default; tests go offline and fire the reconnect listener.
const mockNet = {
	state: { isConnected: true, isInternetReachable: true } as NetworkState,
	listeners: new Set<(state: NetworkState) => void>(),
};
jest.mock('expo-network', () => ({
	NetworkStateType: { WIFI: 'WIFI', ETHERNET: 'ETHERNET' },
	useNetworkState: () => mockNet.state,
	addNetworkStateListener: (listener: (state: NetworkState) => void) => {
		mockNet.listeners.add(listener);
		return { remove: () => mockNet.listeners.delete(listener) };
	},
}));

// Supabase Realtime: the thread joins `conversation:<id>`, the inbox `user:<id>`; tests broadcast on them.
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
		removeChannel: () => undefined,
	},
}));

const ME = { display_name: 'Ana', email: 'ana@primer.si', email_verified: true };
let mockSession: { session: { user: { id: string } } | null; me: typeof ME; isAnonymous: boolean; loading: boolean };
jest.mock('@zivali/api/auth', () => ({
	...jest.requireActual('@zivali/api/auth'),
	useSession: () => mockSession,
}));

const ID = 'c9a1d2e3-0000-4000-8000-000000000001';
const OTHER = '5b1e0c2a-0000-4000-8000-000000000009';
const conversation = (patch: Partial<ConversationSummary> = {}): ConversationSummary => ({
	id: ID,
	about_report: { short_code: 'Hk3vT9qP', type: 'found', species: 'dog', thumb_url: null },
	my_alias_key: 'owner',
	other_alias_key: 'finder',
	other_participant_id: OTHER,
	last_message_preview: 'Je pri meni, lahko pridete po 17h.',
	unread: 2,
	status: 'active',
	...patch,
});
const notifications = (unread: number) => ({ items: [], next_cursor: null, unread });
const at = (secondsAgo: number) => new Date(Date.now() - secondsAgo * 1000).toISOString();
const msg = (id: string, patch: Partial<Message> = {}): Message => ({
	id,
	conversation_id: ID,
	sender_alias_key: 'finder',
	kind: 'text',
	body: 'Je pri meni, lahko pridete po 17h.',
	has_link: false,
	created_at: at(60),
	...patch,
});
const HISTORY = [
	msg('m0', { kind: 'system', sender_alias_key: 'contact', body: 'confirmed', created_at: at(300) }),
	msg('m1', { body: 'Pozdravljeni, mislim, da imam vašega psa.', created_at: at(240) }),
	msg('m2', { sender_alias_key: 'owner', body: 'Ja, to je on!', created_at: at(180) }),
	msg('m3', { body: 'Kraj: https://example.org/maks', has_link: true, created_at: at(120) }),
];

let store: ApiStore;
let calls: MockRequest[];
function serve({
	summary = conversation(),
	history = HISTORY,
	routes = {},
}: { summary?: ConversationSummary; history?: Message[]; routes?: MockRoutes } = {}) {
	let n = 0;
	const client = createMockApi({
		'GET /v1/conversations': () => ({ items: [summary], next_cursor: null }),
		'GET /v1/conversations/:id/messages': ({ query }) =>
			query.after ? { items: [], next_cursor: null } : { items: history, next_cursor: null },
		'POST /v1/conversations/:id/read': () => undefined,
		'POST /v1/conversations/:id/messages': ({ body }) =>
			msg(`sent-${++n}`, { sender_alias_key: 'owner', body: (body as { body: string }).body, created_at: at(0) }),
		'POST /v1/conversations/:id/block': () => undefined,
		'POST /v1/abuse-reports': abuseCreated,
		...routes,
	});
	calls = client.calls;
	store = createApiStore(client);
}
const sent = (method: string, path: string) =>
	calls.filter((call) => call.method === method && call.path === path).map((call) => call.body);
const MESSAGES = `/v1/conversations/${ID}/messages`;
const keys = () =>
	calls
		.filter((call) => call.method === 'POST' && call.path === MESSAGES)
		.map((call) => call.headers['Idempotency-Key']);

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

const open = async (initialUrl = `/inbox/${ID}`) => {
	const result = renderRouter(
		{
			_layout: () => <Stack screenOptions={{ headerShown: false }} />,
			index: () => null,
			inbox: InboxTab,
			'inbox/[id]': ConversationScreen,
			'r/[code]/index': () => null,
		},
		{ initialUrl, wrapper: Providers }
	);
	await result;
	return { getPathname: result.getPathname };
};
const composer = () => screen.getByLabelText(c.composer_label);
const sendButton = () => screen.getByRole('button', { name: c.send });
const type = (text: string) => fireEvent.changeText(composer(), text);
const container = (role: string, name: string) => {
	const found = screen.queryAllByLabelText(name).find((el) => el.props.role === role);
	if (!found) throw new Error(`no ${role} "${name}"`);
	return found;
};
const broadcast = (topic: string, event: string, payload: unknown) =>
	act(async () => mockChannels.get(topic)![event]({ payload }));

const consent = { value: null as string | null };
beforeEach(() => {
	mockStorage.set('locale', 'sl');
	mockSession = { session: { user: { id: 'u1' } }, me: ME, isAnonymous: false, loading: false };
	mockNet.state = { isConnected: true, isInternetReachable: true } as NetworkState;
	mockNet.listeners.clear();
	mockChannels.clear();
	consent.value = null;
	initAnalytics({
		provider: 'mock',
		storage: { get: () => consent.value, set: (value) => void (consent.value = value) },
	});
	resetMockEvents();
});

jest.setTimeout(60_000);

describe('Inbox tab: conversations (P12)', () => {
	test('h1, the two views; rows with unread and closed states open the conversation', async () => {
		const closed = conversation({ id: 'c2', unread: 0, status: 'read_only', last_message_preview: 'Hvala!' });
		const list = { items: [conversation(), closed], next_cursor: null };
		store = createApiStore(
			createMockApi({ 'GET /v1/conversations': list, 'GET /v1/notifications': notifications(0) })
		);
		const result = await open('/inbox');

		expect(screen.getByRole('heading', { name: c.inbox_title })).toBeOnTheScreen();
		expect(
			await screen.findByRole('tab', { name: `${c.view_conversations}, neprebrano`, selected: true })
		).toBeOnTheScreen();
		expect(screen.getByRole('tab', { name: c.view_notifications, selected: false })).toBeOnTheScreen();
		const unread = await screen.findByRole('button', {
			name: 'Najdena žival, neprebrano, Je pri meni, lahko pridete po 17h.',
		});
		expect(screen.getByRole('button', { name: 'Najdena žival, Prijava zaključena, Hvala!' })).toBeOnTheScreen();
		// Aliases and previews only: never the other person's contact data.
		expect(screen.queryByText(/@|\+386/)).toBeNull();

		await fireEvent.press(unread);
		await waitFor(() => expect(result.getPathname()).toBe(`/inbox/${ID}`));
	});

	test('empty: the sentence about how chats start; the Notifications view is one tap away', async () => {
		store = createApiStore(
			createMockApi({
				'GET /v1/conversations': { items: [], next_cursor: null },
				'GET /v1/notifications': { items: [], next_cursor: null, unread: 0 },
			})
		);
		await open('/inbox');

		expect(await screen.findByText(c.empty_title)).toBeOnTheScreen();
		expect(screen.getByText(c.empty_body)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('tab', { name: c.view_notifications }));
		expect(await screen.findByText(sl.notifications.empty_title)).toBeOnTheScreen();
		expect(screen.queryByText(c.empty_title)).toBeNull();
	});

	test('a conversation update on user:<id> re-fetches the list', async () => {
		let items = [conversation({ unread: 0, last_message_preview: 'Staro' })];
		store = createApiStore(createMockApi({ 'GET /v1/conversations': () => ({ items, next_cursor: null }) }));
		await open('/inbox');
		await screen.findByText('Staro');

		items = [conversation({ unread: 1, last_message_preview: 'Novo' })];
		await broadcast('user:u1', 'conversation.updated', { conversation_id: ID, status: 'active' });
		expect(await screen.findByText('Novo')).toBeOnTheScreen();
	});

	// TASK-114.10 on mobile: each segment says where the unread items are, and the inbox opens there.
	const inbox = (conversations: ConversationSummary[], unread: number | (() => number)) =>
		(store = createApiStore(
			createMockApi({
				'GET /v1/conversations': () => ({ items: conversations, next_cursor: null }),
				'GET /v1/notifications': () => notifications(typeof unread === 'number' ? unread : unread()),
			})
		));
	const tab = (name: string, selected: boolean) => screen.findByRole('tab', { name, selected });

	test('only notifications unread: opens Notifications, its segment has the dot and "neprebrano"', async () => {
		inbox([conversation({ unread: 0 })], 2);
		await open('/inbox');
		expect(await tab(`${c.view_notifications}, neprebrano`, true)).toBeOnTheScreen();
		expect(await tab(c.view_conversations, false)).toBeOnTheScreen();
		expect(await screen.findByText(sl.notifications.empty_title)).toBeOnTheScreen();
	});

	test('both unread: Conversations first, both segments named unread', async () => {
		inbox([conversation()], 1);
		await open('/inbox');
		expect(await tab(`${c.view_conversations}, neprebrano`, true)).toBeOnTheScreen();
		expect(await tab(`${c.view_notifications}, neprebrano`, false)).toBeOnTheScreen();
	});

	test('in English: ", unread" in the segment name', async () => {
		mockStorage.set('locale', 'en');
		inbox([conversation({ unread: 0 })], 2);
		await open('/inbox');
		expect(await tab(`${en.chat.view_notifications}, unread`, true)).toBeOnTheScreen();
		expect(await tab(en.chat.view_conversations, false)).toBeOnTheScreen();
	});

	test('the URL names the view: it opens there whatever is unread', async () => {
		inbox([conversation({ unread: 0 })], 2);
		await open('/inbox?view=conversations');
		expect(await tab(c.view_conversations, true)).toBeOnTheScreen();
		expect(await screen.findByText(conversation().last_message_preview!)).toBeOnTheScreen();
	});

	test('a list that fails opens Conversations', async () => {
		store = createApiStore(
			createMockApi({
				'GET /v1/conversations': { items: [conversation({ unread: 0 })], next_cursor: null },
				'GET /v1/notifications': () => mockError('FORBIDDEN'),
			})
		);
		await open('/inbox');
		expect(await tab(c.view_conversations, true)).toBeOnTheScreen();
	});

	test('a notification arriving in real time puts the dot on its segment, the open view stays', async () => {
		let unread = 0;
		inbox([conversation({ unread: 0 })], () => unread);
		await open('/inbox');
		expect(await tab(c.view_conversations, true)).toBeOnTheScreen();
		expect(await tab(c.view_notifications, false)).toBeOnTheScreen();

		unread = 1;
		await broadcast('user:u1', 'notification.created', { id: 'n1' });
		expect(await tab(`${c.view_notifications}, neprebrano`, false)).toBeOnTheScreen();
		expect(screen.getByRole('tab', { name: c.view_conversations, selected: true })).toBeOnTheScreen();
	});
});

describe('conversation (P12 thread)', () => {
	test('safety banner, own and other messages, plain links with the caution, system line; marks read', async () => {
		serve();
		await open();

		expect(await screen.findByText(HISTORY[1]!.body)).toBeOnTheScreen();
		// No pet photo: the header names the other person by alias (P12 M7).
		expect(screen.getByRole('heading', { name: c.alias_finder })).toBeOnTheScreen();
		expect(screen.getByText(c.safety_banner)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: c.safety_banner_link }));
		expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://najdimo.test/varnost');

		expect(screen.getByText(c.system_confirmed)).toBeOnTheScreen();
		expect(screen.getByText(c.day_today)).toBeOnTheScreen();
		expect(screen.getByLabelText(new RegExp(`^${c.alias_finder}, \\d\\d:\\d\\d: Pozdravljeni`))).toBeOnTheScreen();
		expect(screen.getByLabelText(/^Vi, \d\d:\d\d: Ja, to je on!$/)).toBeOnTheScreen();
		// The link stays text (no link role, no preview) with one caution line.
		expect(screen.getByText(HISTORY[3]!.body)).toBeOnTheScreen();
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getAllByText(c.link_caution)).toHaveLength(1);
		expect(screen.queryByText(ME.email)).toBeNull();
		expect(screen.queryByTestId(/ad-slot/i)).toBeNull();

		await waitFor(() => expect(sent('POST', `/v1/conversations/${ID}/read`)).toHaveLength(1));
		expect(sendButton()).toBeDisabled();
	});

	test('a message arrives in real time: shown, announced politely, read again', async () => {
		const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
		serve();
		await open();
		await screen.findByText(HISTORY[1]!.body);
		await waitFor(() => expect(sent('POST', `/v1/conversations/${ID}/read`)).toHaveLength(1));

		await broadcast(
			`conversation:${ID}`,
			'message.created',
			msg('m4', { body: 'Sem pri parku.', created_at: at(1) })
		);
		expect(await screen.findByText('Sem pri parku.')).toBeOnTheScreen();
		expect(announce).toHaveBeenCalledWith(`Novo sporočilo od: ${c.alias_finder}`);
		await waitFor(() => expect(sent('POST', `/v1/conversations/${ID}/read`)).toHaveLength(2));
		announce.mockRestore();
	});

	test('sending: appears at once, then "Poslano"; chat_started only with consent and only once', async () => {
		serve({ history: [HISTORY[0]!, HISTORY[1]!] });
		await open();
		await screen.findByText(HISTORY[1]!.body);

		await type('  Prihajam.  ');
		await fireEvent.press(sendButton());
		expect(await screen.findByText(c.sent)).toBeOnTheScreen();
		expect(sent('POST', MESSAGES)).toEqual([{ body: 'Prihajam.' }]);
		expect(composer().props.value).toBe('');
		// No consent: nothing reaches analytics.
		expect(getMockEvents()).toHaveLength(0);
	});

	test('chat_started fires once, with the species only, after consent', async () => {
		setConsent({ analytics: true });
		serve({ history: [HISTORY[1]!] });
		await open();
		await screen.findByText(HISTORY[1]!.body);

		await type('Prvo');
		await fireEvent.press(sendButton());
		await screen.findByText('Prvo');
		await type('Drugo');
		await fireEvent.press(sendButton());
		await screen.findByText('Drugo');
		await waitFor(() => expect(sent('POST', MESSAGES)).toHaveLength(2));
		expect(getMockEvents().filter((e) => e.name === 'chat_started')).toEqual([
			expect.objectContaining({ name: 'chat_started', params: { species: 'dog' } }),
		]);
	});

	test('the counter shows only in the last 100 of 2000 characters', async () => {
		serve();
		await open();
		await screen.findByText(HISTORY[1]!.body);
		expect(composer().props.maxLength).toBe(2000);

		await type('x'.repeat(1899));
		expect(screen.queryByText(/^Še \d+ znak/)).toBeNull();
		await type('x'.repeat(1963));
		expect(screen.getByText('Še 37 znakov')).toBeOnTheScreen();
	});

	test('blocked by the other person: refused, the note, composer off, the message marked not sent', async () => {
		serve({ routes: { 'POST /v1/conversations/:id/messages': () => mockError('FORBIDDEN') } });
		await open();
		await screen.findByText(HISTORY[1]!.body);

		await type('Halo?');
		await fireEvent.press(sendButton());
		expect(await screen.findByText(c.blocked_you)).toBeOnTheScreen();
		expect(screen.getByText(c.failed)).toBeOnTheScreen();
		expect(screen.getByLabelText('Vi, Ni poslano: Halo?')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: c.retry })).toBeOnTheScreen();
		expect(composer().props.editable).toBe(false);
		expect(sendButton()).toBeDisabled();
	});

	test('a failed send says so with the reason; "Poskusi znova" sends the same text again', async () => {
		let fail = true;
		serve({
			routes: {
				'POST /v1/conversations/:id/messages': ({ body }) =>
					fail
						? mockError('RATE_LIMITED')
						: msg('sent-1', { sender_alias_key: 'owner', body: (body as { body: string }).body }),
			},
		});
		await open();
		await screen.findByText(HISTORY[1]!.body);

		await type('Ste še tam?');
		await fireEvent.press(sendButton());
		expect(await screen.findByText(c.failed)).toBeOnTheScreen();
		expect(composer().props.editable).toBe(true);
		fail = false;
		await fireEvent.press(screen.getByRole('button', { name: c.retry }));
		expect(await screen.findByText(c.sent)).toBeOnTheScreen();
		expect(screen.queryByText(c.failed)).toBeNull();
		expect(sent('POST', MESSAGES)).toEqual([{ body: 'Ste še tam?' }, { body: 'Ste še tam?' }]);
		// One message, one key: a retry after a lost response never doubles it (C1).
		expect(keys()[0]).toMatch(/^[0-9a-f-]{36}$/);
		expect(keys()[1]).toBe(keys()[0]);
	});

	test('a failure stops the run: the messages queued behind it are failed too, not stuck on "sending"', async () => {
		mockNet.state = { isConnected: false, isInternetReachable: false } as NetworkState;
		serve({ routes: { 'POST /v1/conversations/:id/messages': () => mockError('RATE_LIMITED') } });
		await open();
		await screen.findByText(HISTORY[1]!.body);
		await type('Prvo');
		await fireEvent.press(sendButton());
		await type('Drugo');
		await fireEvent.press(sendButton());

		mockNet.state = { isConnected: true, isInternetReachable: true } as NetworkState;
		await act(async () => mockNet.listeners.forEach((listener) => listener(mockNet.state)));
		await waitFor(() => expect(screen.getAllByRole('button', { name: c.retry })).toHaveLength(2));
		expect(sent('POST', MESSAGES)).toEqual([{ body: 'Prvo' }]);
		expect(screen.queryByText(c.queued)).toBeNull();
	});

	test('read-only: the composer is replaced by the closed note; the thread stays readable', async () => {
		serve({ summary: conversation({ status: 'read_only' }) });
		await open();

		expect(await screen.findByText(c.read_only)).toBeOnTheScreen();
		expect(screen.getByText(HISTORY[1]!.body)).toBeOnTheScreen();
		expect(screen.getByText(c.row_status_closed)).toBeOnTheScreen();
		expect(screen.queryByLabelText(c.composer_label)).toBeNull();
		expect(screen.queryByRole('button', { name: c.send })).toBeNull();
	});

	test('a send refused as GONE turns the thread read-only', async () => {
		serve({ routes: { 'POST /v1/conversations/:id/messages': () => mockError('GONE') } });
		await open();
		await screen.findByText(HISTORY[1]!.body);

		await type('Še vedno iščete?');
		await fireEvent.press(sendButton());
		expect(await screen.findByText(c.read_only)).toBeOnTheScreen();
		expect(screen.queryByLabelText(c.composer_label)).toBeNull();
	});

	test('offline: the note, messages wait with a clock and go out on reconnect', async () => {
		mockNet.state = { isConnected: false, isInternetReachable: false } as NetworkState;
		serve();
		await open();
		await screen.findByText(HISTORY[1]!.body);
		expect(screen.getByText(c.offline)).toBeOnTheScreen();

		await type('Pridem ob osmih.');
		await fireEvent.press(sendButton());
		expect(screen.getByText(c.queued)).toBeOnTheScreen();
		expect(sent('POST', MESSAGES)).toEqual([]);

		mockNet.state = { isConnected: true, isInternetReachable: true } as NetworkState;
		await act(async () => mockNet.listeners.forEach((listener) => listener(mockNet.state)));
		await waitFor(() => expect(sent('POST', MESSAGES)).toEqual([{ body: 'Pridem ob osmih.' }]));
		expect(await screen.findByText(c.sent)).toBeOnTheScreen();
		expect(screen.queryByText(c.queued)).toBeNull();
	});

	test('offline: two queued messages and two quick online events send exactly twice, in order', async () => {
		mockNet.state = { isConnected: false, isInternetReachable: false } as NetworkState;
		serve();
		await open();
		await screen.findByText(HISTORY[1]!.body);

		await type('Prvo');
		await fireEvent.press(sendButton());
		await type('Drugo');
		await fireEvent.press(sendButton());
		expect(sent('POST', MESSAGES)).toEqual([]);

		mockNet.state = { isConnected: true, isInternetReachable: true } as NetworkState;
		await act(async () => {
			mockNet.listeners.forEach((listener) => listener(mockNet.state));
			mockNet.listeners.forEach((listener) => listener(mockNet.state));
		});
		await waitFor(() => expect(sent('POST', MESSAGES)).toHaveLength(2));
		expect(sent('POST', MESSAGES)).toEqual([{ body: 'Prvo' }, { body: 'Drugo' }]);
		await waitFor(() => expect(screen.queryByText(c.queued)).toBeNull());
	});

	test('"Prijavi in blokiraj": the P10 sheet for the other person (profile), then the block', async () => {
		serve();
		await open();
		await screen.findByText(HISTORY[1]!.body);

		await fireEvent.press(screen.getByRole('button', { name: c.menu }));
		const menu = container('menu', c.menu);
		for (const name of [c.menu_open_report, c.menu_report, a.entry_block, c.menu_block])
			expect(within(menu).getByRole('menuitem', { name })).toBeOnTheScreen();
		await fireEvent.press(within(menu).getByRole('menuitem', { name: a.entry_block }));

		expect(screen.getByRole('heading', { name: a.title })).toBeOnTheScreen();
		expect(screen.getByText(a.target_profile)).toBeOnTheScreen();
		expect(screen.getByRole('switch', { name: a.block_label, checked: true })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('radio', { name: a.reason_scam }));
		await fireEvent.press(screen.getByRole('button', { name: a.send }));

		expect(await screen.findByText(a.done_blocked)).toBeOnTheScreen();
		expect(sent('POST', '/v1/abuse-reports')).toEqual([
			{ target_type: 'profile', target_id: OTHER, reason: 'scam' },
		]);
		expect(sent('POST', `/v1/conversations/${ID}/block`)).toEqual([{ participant_id: OTHER }]);
		await fireEvent.press(screen.getByRole('button', { name: a.done_close }));
		// A profile report folds no message.
		expect(screen.queryByText(a.message_folded)).toBeNull();
		expect(screen.getByText(HISTORY[3]!.body)).toBeOnTheScreen();
		expect(screen.getByText(c.blocked_by_you)).toBeOnTheScreen();
		expect(sendButton()).toBeDisabled();
	});

	test('Block from the menu asks first; confirmed, the composer is disabled with the reason', async () => {
		serve();
		await open();
		await screen.findByText(HISTORY[1]!.body);

		await fireEvent.press(screen.getByRole('button', { name: c.menu }));
		await fireEvent.press(within(container('menu', c.menu)).getByRole('menuitem', { name: c.menu_block }));
		expect(screen.getByRole('heading', { name: c.block_title })).toBeOnTheScreen();
		expect(screen.getByText(c.block_body)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: c.block_confirm }));

		expect(await screen.findByText(c.blocked_by_you)).toBeOnTheScreen();
		expect(sent('POST', `/v1/conversations/${ID}/block`)).toEqual([{ participant_id: OTHER }]);
		expect(composer().props.editable).toBe(false);
	});

	test("long press on the other person's message reports that message; own messages have no report", async () => {
		serve();
		await open();
		const other = await screen.findByLabelText(/Pozdravljeni, mislim/);
		expect(screen.getByLabelText(/^Vi, .*Ja, to je on!$/).props.accessibilityActions).toBeUndefined();

		await fireEvent(other, 'longPress');
		expect(screen.getByRole('heading', { name: a.title })).toBeOnTheScreen();
		expect(screen.getByText(a.target_message)).toBeOnTheScreen();
		expect(screen.getByRole('switch', { name: a.block_label, checked: false })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('radio', { name: a.reason_spam }));
		await fireEvent.press(screen.getByRole('button', { name: a.send }));
		await screen.findByRole('heading', { name: a.done_title });
		expect(sent('POST', '/v1/abuse-reports')).toEqual([
			{ target_type: 'message', target_id: 'm1', reason: 'spam' },
		]);
		expect(sent('POST', `/v1/conversations/${ID}/block`)).toEqual([]);
	});

	test('no other participant (null id): report targets their latest message, block is not offered', async () => {
		serve({ summary: conversation({ other_participant_id: null }) });
		await open();
		await screen.findByText(HISTORY[1]!.body);

		await fireEvent.press(screen.getByRole('button', { name: c.menu }));
		const menu = container('menu', c.menu);
		expect(within(menu).queryByRole('menuitem', { name: c.menu_block })).toBeNull();
		expect(within(menu).queryByRole('menuitem', { name: a.entry_block })).toBeNull();
		await fireEvent.press(within(menu).getByRole('menuitem', { name: c.menu_report }));
		expect(screen.getByText(a.target_message)).toBeOnTheScreen();
		expect(screen.queryByRole('switch')).toBeNull();
		await fireEvent.press(screen.getByRole('radio', { name: a.reason_scam }));
		await fireEvent.press(screen.getByRole('button', { name: a.send }));
		await screen.findByRole('heading', { name: a.done_title });
		expect(sent('POST', '/v1/abuse-reports')).toEqual([
			{ target_type: 'message', target_id: 'm3', reason: 'scam' },
		]);
	});

	test('"Odpri prijavo" opens the listing', async () => {
		serve();
		const result = await open();
		await screen.findByText(HISTORY[1]!.body);

		await fireEvent.press(screen.getByRole('button', { name: c.menu }));
		await fireEvent.press(within(container('menu', c.menu)).getByRole('menuitem', { name: c.menu_open_report }));
		await waitFor(() => expect(result.getPathname()).toBe('/r/Hk3vT9qP'));
	});

	test('anonymous manager, empty thread: the private-session note and the prompt; the composer is focused', async () => {
		mockSession = { ...mockSession, isAnonymous: true };
		serve({ history: [msg('m0', { kind: 'system', sender_alias_key: 'contact', body: 'contact' })] });
		await open();

		expect(await screen.findByText(c.anon_session)).toBeOnTheScreen();
		expect(screen.getByText(c.system_contact)).toBeOnTheScreen();
		expect(screen.getByText(c.empty_thread)).toBeOnTheScreen();
		expect(composer().props.autoFocus).toBe(true);
	});
});
