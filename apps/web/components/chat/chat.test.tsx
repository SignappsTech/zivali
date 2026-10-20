import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import * as React from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { abuseCreated } from '@zivali/api/__fixtures__/abuse';
import { createMockApi, mockError, type MockRequest, type MockRoutes } from '@zivali/api/mock';
import { type ApiStore, createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { ConversationSummary, Message } from '@zivali/types';

import { ConversationList, ConversationRow } from './conversations';
import { Thread } from './thread';

// TASK-21.3: P12 on the web, over the in-memory API (C9) and a fake Supabase Realtime client.

type Handler = (message: { payload?: unknown }) => void;
const state = vi.hoisted(() => ({
	store: undefined as ApiStore | undefined,
	channels: new Map<
		string,
		{ handlers: Record<string, Handler>; status?: (status: string) => void; options: unknown }
	>(),
	removed: [] as string[],
	session: { session: { user: { id: 'u1' } } as { user: { id: string } } | null, isAnonymous: false },
}));
vi.mock('@/lib/supabase/client', () => ({
	createClient: () => ({
		channel: (topic: string, options: unknown) => {
			const entry: { handlers: Record<string, Handler>; status?: (status: string) => void; options: unknown } = {
				handlers: {},
				options,
			};
			state.channels.set(topic, entry);
			const channel = {
				topic,
				on: (_type: string, { event }: { event: string }, callback: Handler) => {
					entry.handlers[event] = callback;
					return channel;
				},
				subscribe: (callback: (status: string) => void) => {
					entry.status = callback;
					return channel;
				},
			};
			return channel;
		},
		removeChannel: (channel: { topic: string }) => void state.removed.push(channel.topic),
	}),
}));
vi.mock('@zivali/api/auth', () => ({ useSession: () => state.session }));
// The abuse dialog brings its own StoreProvider: the same store.
vi.mock('@/lib/store', () => ({ getStore: () => state.store }));
vi.mock('@/lib/auth', () => ({ ensureSession: vi.fn() }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/nabiralnik',
	useParams: () => ({ locale: 'sl' }),
}));
// Radix menus and radios measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

const c = sl.chat;
const a = sl.abuse;
const ID = 'c9a1d2e3-0000-4000-8000-000000000001';
const OTHER = '5b1e0c2a-0000-4000-8000-000000000009';
const MESSAGES = `/v1/conversations/${ID}/messages`;
const TOPIC = `conversation:${ID}`;

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

let calls: MockRequest[];
function serve({
	summary = conversation(),
	history = HISTORY,
	routes = {},
}: { summary?: ConversationSummary; history?: Message[]; routes?: MockRoutes } = {}) {
	let n = 0;
	const api = createMockApi({
		'GET /v1/conversations': () => ({ items: [summary], next_cursor: null }),
		[`GET ${MESSAGES}`]: ({ query }) =>
			query.after ? { items: [], next_cursor: null } : { items: history, next_cursor: null },
		[`POST /v1/conversations/${ID}/read`]: () => undefined,
		[`POST ${MESSAGES}`]: ({ body }) =>
			msg(`sent-${++n}`, { sender_alias_key: 'owner', body: (body as { body: string }).body, created_at: at(0) }),
		[`POST /v1/conversations/${ID}/block`]: () => undefined,
		'POST /v1/abuse-reports': abuseCreated,
		...routes,
	});
	calls = api.calls;
	state.store = createApiStore(api);
}
const keys = () =>
	calls
		.filter((call) => call.method === 'POST' && call.path === MESSAGES)
		.map((call) => call.headers['Idempotency-Key']);
const sent = (method: string, path: string) =>
	calls.filter((call) => call.method === method && call.path === path).map((call) => call.body);

function show(ui: React.ReactNode = <Thread id={ID} />, locale: 'sl' | 'en' = 'sl') {
	return render(
		<NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : sl}>
			<Provider store={state.store!}>{ui}</Provider>
		</NextIntlClientProvider>
	);
}
const composer = () => screen.getByRole('textbox', { name: c.composer_label });
const sendButton = () => screen.getByRole('button', { name: c.send });
const type = (text: string) => fireEvent.change(composer(), { target: { value: text } });
const bubble = (name: RegExp) => screen.getByRole('article', { name });
/** Waits for the thread to join its private channel (the Supabase client loads after the page). */
const joined = async () => {
	await waitFor(() => expect(state.channels.get(TOPIC)?.status).toBeTypeOf('function'));
	return state.channels.get(TOPIC)!;
};
const broadcast = async (event: string, payload: unknown) => {
	const channel = await joined();
	act(() => channel.handlers[event]!({ payload }));
};
const openMenu = async () => {
	fireEvent.keyDown(screen.getByRole('button', { name: c.menu }), { key: 'Enter' });
	return screen.findByRole('menu', { name: c.menu });
};

beforeEach(() => {
	state.session = { session: { user: { id: 'u1' } }, isAnonymous: false };
	state.channels.clear();
	state.removed = [];
	initAnalytics();
	setConsent({ analytics: true });
	resetMockEvents();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('ConversationList (P12 inbox)', () => {
	it('rows link to the thread, unread in bold with ", neprebrano", closed with the status word; aliases only', async () => {
		const closed = conversation({ id: 'c2', unread: 0, status: 'read_only', last_message_preview: 'Hvala!' });
		state.store = createApiStore(
			createMockApi({ 'GET /v1/conversations': { items: [conversation(), closed], next_cursor: null } })
		);
		show(<ConversationList selected="c2" />);

		expect(screen.getByRole('heading', { level: 1, name: c.inbox_title })).toBeTruthy();
		const unread = await screen.findByRole('link', { name: /^Najdena žival, neprebrano/ });
		expect(unread.getAttribute('href')).toBe(`/nabiralnik/${ID}`);
		expect(unread.querySelector('.font-bold')).toBeTruthy();
		expect(unread.querySelector('.bg-primary')).toBeTruthy();
		const other = screen.getByRole('link', { name: /Prijava zaključena/ });
		expect(other.getAttribute('href')).toBe('/nabiralnik/c2');
		expect(other.getAttribute('aria-current')).toBe('page');
		expect(other.textContent).toContain('Hvala!');
		expect(unread.getAttribute('aria-current')).toBeNull();
		expect(screen.queryByText(/@|\+386/)).toBeNull();
	});

	it('a row needs only the three chat lines the /m page sends (app/[locale]/(public)/m/page.tsx)', () => {
		const onError = vi.fn();
		const { row_title_fallback, row_unread_a11y, row_status_closed } = c;
		render(
			<NextIntlClientProvider
				locale="sl"
				messages={{ chat: { row_title_fallback, row_unread_a11y, row_status_closed } }}
				onError={onError}
			>
				<ul>
					<ConversationRow conversation={conversation({ status: 'read_only' })} />
				</ul>
			</NextIntlClientProvider>
		);

		expect(screen.getByRole('link').textContent).toContain('Najdena žival, neprebrano');
		expect(screen.getByText(c.row_status_closed)).toBeTruthy();
		expect(onError).not.toHaveBeenCalled();
	});

	it('empty: an h2 under the h1 with the sentence about how chats start, SL and EN; beside a thread an h3', async () => {
		const empty = () =>
			createApiStore(createMockApi({ 'GET /v1/conversations': { items: [], next_cursor: null } }));
		state.store = empty();
		show(<ConversationList />);
		// The P12 slice's copy, as exact names.
		expect(await screen.findByRole('heading', { level: 2, name: 'Pogovorov še ni' })).toBeTruthy();
		expect(screen.getByText(c.empty_body)).toBeTruthy();
		cleanup();

		state.store = empty();
		show(<ConversationList />, 'en');
		expect(await screen.findByRole('heading', { level: 2, name: 'No conversations yet' })).toBeTruthy();
		expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeTruthy();
		expect(screen.getByText(en.chat.empty_body)).toBeTruthy();
		cleanup();

		state.store = empty();
		show(<ConversationList heading="h2" />);
		expect(await screen.findByRole('heading', { level: 3, name: c.empty_title })).toBeTruthy();
		expect(screen.getByRole('heading', { level: 2, name: c.inbox_title })).toBeTruthy();
		expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
	});
});

describe('Thread (P12)', () => {
	it('a conversation the list does not have: a not-found note linking to the inbox, no retry', async () => {
		serve();
		show(<Thread id="c9a1d2e3-0000-4000-8000-0000000000ff" />);

		const note = await screen.findByRole('alert');
		expect(note.textContent).toContain(sl.errors.NOT_FOUND);
		expect(within(note).getByRole('link', { name: c.inbox_title }).getAttribute('href')).toBe('/nabiralnik');
		expect(screen.queryByRole('button', { name: sl.common.inline_error_retry })).toBeNull();
	});

	it('opening refetches the list: a conversation newer than the cached page is found', async () => {
		let items: ConversationSummary[] = [];
		serve({ routes: { 'GET /v1/conversations': () => ({ items, next_cursor: null }) } });
		await state.store!.dispatch(
			(await import('@zivali/api/chat')).chatApi.endpoints.listConversations.initiate(undefined)
		);
		items = [conversation()];
		show();

		expect(await screen.findByText(HISTORY[1]!.body)).toBeTruthy();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('switching to another conversation leaves the first channel, joins the second, and ignores a late broadcast of the first', async () => {
		const B = 'c9a1d2e3-0000-4000-8000-000000000002';
		serve({
			routes: {
				'GET /v1/conversations': () => ({
					items: [conversation(), conversation({ id: B })],
					next_cursor: null,
				}),
				[`GET /v1/conversations/${B}/messages`]: () => ({
					items: [msg('b1', { conversation_id: B, body: 'Pogovor B.' })],
					next_cursor: null,
				}),
				[`POST /v1/conversations/${B}/read`]: () => undefined,
			},
		});
		const { rerender } = show();
		await screen.findByText(HISTORY[1]!.body);
		const first = await joined();

		rerender(
			<NextIntlClientProvider locale="sl" messages={sl}>
				<Provider store={state.store!}>
					<Thread id={B} />
				</Provider>
			</NextIntlClientProvider>
		);
		expect(await screen.findByText('Pogovor B.')).toBeTruthy();
		expect(screen.queryByText(HISTORY[1]!.body)).toBeNull();
		expect(state.removed).toContain(TOPIC);
		await waitFor(() => expect(state.channels.get(`conversation:${B}`)?.status).toBeTypeOf('function'));

		act(() => first.handlers['message.created']!({ payload: msg('late', { body: 'Pozna sporočilo A.' }) }));
		expect(screen.queryByText('Pozna sporočilo A.')).toBeNull();
	});

	it('safety banner, plain-text links with the caution, system line, own and other bubbles; marks read', async () => {
		serve();
		show();

		expect(await screen.findByText(HISTORY[1]!.body)).toBeTruthy();
		// No pet photo: the header names the other person by alias (P12 M7).
		expect(screen.getByRole('heading', { level: 1, name: c.alias_finder })).toBeTruthy();
		expect(screen.getByText(c.safety_banner)).toBeTruthy();
		expect(screen.getByRole('link', { name: c.safety_banner_link }).getAttribute('href')).toBe('/varnost');

		expect(screen.getByText(c.system_confirmed)).toBeTruthy();
		expect(screen.getByText(c.day_today)).toBeTruthy();
		expect(bubble(new RegExp(`^${c.alias_finder}, \\d\\d:\\d\\d: Pozdravljeni`))).toBeTruthy();
		expect(bubble(/^Vi, \d\d:\d\d: Ja, to je on!$/)).toBeTruthy();
		// The link stays text: no anchor in the bubble, no preview, one caution line under it.
		const linked = bubble(/Kraj: https:\/\/example\.org\/maks$/);
		expect(linked.querySelector('a')).toBeNull();
		expect(screen.queryByRole('link', { name: /example\.org/ })).toBeNull();
		expect(screen.getAllByText(c.link_caution)).toHaveLength(1);
		expect(screen.getByRole('log')).toBeTruthy();
		expect(document.querySelector('[data-ad-slot]')).toBeNull();

		await waitFor(() => expect(sent('POST', `/v1/conversations/${ID}/read`)).toHaveLength(1));
		expect(sendButton()).toHaveProperty('disabled', true);
	});

	it('Realtime: joins the private channel, adds a broadcast once, catches up on reconnect without doubles, leaves on unmount', async () => {
		let after: Message[] = [];
		serve({
			routes: {
				[`GET ${MESSAGES}`]: ({ query }) =>
					query.after ? { items: after, next_cursor: null } : { items: HISTORY, next_cursor: null },
			},
		});
		const { unmount } = show();
		await screen.findByText(HISTORY[1]!.body);
		const channel = await joined();
		expect(channel.options).toEqual({ config: { private: true } });
		await waitFor(() => expect(sent('POST', `/v1/conversations/${ID}/read`)).toHaveLength(1));

		const m4 = msg('m4', { body: 'Sem pri parku.', created_at: at(2) });
		await broadcast('message.created', m4);
		await broadcast('message.created', m4);
		expect(await screen.findAllByText('Sem pri parku.')).toHaveLength(1);
		// Another person's message while open: read again.
		await waitFor(() => expect(sent('POST', `/v1/conversations/${ID}/read`)).toHaveLength(2));

		// A reconnect fetches what came after the last message; one it already has is not shown twice.
		after = [m4, msg('m5', { body: 'Še vedno sem tu.', created_at: at(1) })];
		act(() => channel.status!('SUBSCRIBED'));
		expect(await screen.findByText('Še vedno sem tu.')).toBeTruthy();
		expect(calls.find((call) => call.path === MESSAGES && call.query.after)?.query.after).toBe('m4');
		expect(screen.getAllByText('Sem pri parku.')).toHaveLength(1);

		unmount();
		expect(state.removed).toEqual([TOPIC]);
	});

	it('sends at once with "Pošiljanje …", then "Poslano"; Enter sends, Shift+Enter does not; chat_started once, no text', async () => {
		serve({ history: [HISTORY[0]!, HISTORY[1]!] });
		show();
		await screen.findByText(HISTORY[1]!.body);

		type('  Prihajam.  ');
		fireEvent.keyDown(composer(), { key: 'Enter', shiftKey: true });
		expect(sent('POST', MESSAGES)).toHaveLength(0);
		fireEvent.keyDown(composer(), { key: 'Enter' });
		// Optimistic: the bubble is there before the API answers.
		expect(bubble(/^Vi, Pošiljanje: Prihajam\.$/)).toBeTruthy();
		expect(screen.getByText(c.sending)).toBeTruthy();
		expect(composer()).toHaveProperty('value', '');

		expect(await screen.findByText(c.sent)).toBeTruthy();
		expect(sent('POST', MESSAGES)).toEqual([{ body: 'Prihajam.' }]);
		expect(screen.getAllByText('Prihajam.')).toHaveLength(1);

		type('Ob 17h?');
		fireEvent.click(sendButton());
		await waitFor(() => expect(sent('POST', MESSAGES)).toHaveLength(2));
		expect(getMockEvents()).toEqual([{ name: 'chat_started', params: { species: 'dog' } }]);
	});

	it('a failed send shows "Ni poslano." and "Poskusi znova" on that message; nothing retries on its own', async () => {
		let fail = true;
		serve({
			routes: {
				[`POST ${MESSAGES}`]: ({ body }) =>
					fail
						? mockError('INTERNAL')
						: msg('sent-1', {
								sender_alias_key: 'owner',
								body: (body as { body: string }).body,
								created_at: at(0),
							}),
			},
		});
		show();
		await screen.findByText(HISTORY[1]!.body);

		type('Kje ste?');
		fireEvent.click(sendButton());
		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toContain(c.failed);
		expect(bubble(/^Vi, Ni poslano: Kje ste\?$/)).toBeTruthy();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(sent('POST', MESSAGES)).toHaveLength(1);
		// C12b: one flow_error per refused send, the code only (never the text).
		expect(getMockEvents()).toEqual([
			{ name: 'flow_error', params: { flow: 'chat', step: 'send', error_code: 'INTERNAL' } },
		]);

		fail = false;
		fireEvent.click(within(alert).getByRole('button', { name: c.retry }));
		expect(await screen.findByText(c.sent)).toBeTruthy();
		expect(sent('POST', MESSAGES)).toHaveLength(2);
		expect(screen.queryByRole('alert')).toBeNull();
		// One message, one key: the retry repeats it, so a lost response never doubles the message (C1).
		expect(keys()[0]).toMatch(/^[0-9a-f-]{36}$/);
		expect(keys()[1]).toBe(keys()[0]);
	});

	it('a failure stops the run: messages queued behind it fail too, each with its own retry, outside the live log', async () => {
		const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
		serve({ routes: { [`POST ${MESSAGES}`]: () => mockError('RATE_LIMITED') } });
		show();
		await screen.findByText(HISTORY[1]!.body);
		type('Prvo');
		fireEvent.click(sendButton());
		type('Drugo');
		fireEvent.click(sendButton());
		expect(screen.getAllByText(c.queued)).toHaveLength(2);
		// Pending bubbles sit after the log, so the live region does not announce them twice.
		expect(within(screen.getByRole('log')).queryByText('Prvo')).toBeNull();

		onLine.mockReturnValue(true);
		// The listener may attach a moment after the render, so fire again until the first message has gone out.
		await waitFor(() => {
			if (!sent('POST', MESSAGES).length) window.dispatchEvent(new Event('online'));
			expect(sent('POST', MESSAGES)).toHaveLength(1);
		});
		await waitFor(() => expect(screen.getAllByRole('button', { name: c.retry })).toHaveLength(2));
		expect(sent('POST', MESSAGES)).toEqual([{ body: 'Prvo' }]);
		expect(screen.queryByText(c.sending)).toBeNull();
		expect(screen.queryByText(c.queued)).toBeNull();
		// One refused attempt, one event: the messages behind it were never sent.
		expect(getMockEvents()).toEqual([
			{ name: 'flow_error', params: { flow: 'chat', step: 'send', error_code: 'RATE_LIMITED' } },
		]);
	});

	it('a send without a response sends flow_error NETWORK; nothing without consent', async () => {
		serve({
			routes: {
				[`POST ${MESSAGES}`]: () => {
					throw new TypeError('Failed to fetch');
				},
			},
		});
		show();
		await screen.findByText(HISTORY[1]!.body);
		type('Halo?');
		fireEvent.click(sendButton());
		await screen.findByRole('button', { name: c.retry });
		expect(getMockEvents()).toEqual([
			{ name: 'flow_error', params: { flow: 'chat', step: 'send', error_code: 'NETWORK' } },
		]);

		setConsent({ analytics: false });
		resetMockEvents();
		fireEvent.click(screen.getByRole('button', { name: c.retry }));
		await waitFor(() => expect(sent('POST', MESSAGES)).toHaveLength(2));
		await screen.findByRole('button', { name: c.retry });
		expect(getMockEvents()).toEqual([]);
	});

	it('after sending with the button, focus returns to the composer', async () => {
		serve();
		show();
		await screen.findByText(HISTORY[1]!.body);

		type('Pridem.');
		sendButton().focus();
		fireEvent.click(sendButton());
		expect(document.activeElement).toBe(composer());
		await screen.findByText(c.sent);
	});

	it('offline: the note, the message waits with the clock, and goes out when the browser is back online', async () => {
		const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
		serve();
		show();
		await screen.findByText(HISTORY[1]!.body);

		expect(screen.getByText(c.offline)).toBeTruthy();
		type('Sem na poti.');
		fireEvent.click(sendButton());
		expect(screen.getByText(c.queued)).toBeTruthy();
		expect(sent('POST', MESSAGES)).toHaveLength(0);

		onLine.mockReturnValue(true);
		await waitFor(() => {
			if (!sent('POST', MESSAGES).length) window.dispatchEvent(new Event('online'));
			expect(sent('POST', MESSAGES)).toHaveLength(1);
		});
		expect(await screen.findByText(c.sent)).toBeTruthy();
		expect(sent('POST', MESSAGES)).toEqual([{ body: 'Sem na poti.' }]);
		expect(screen.queryByText(c.offline)).toBeNull();
	});

	it('a block from the other side refuses the message with a clear note and disables the composer', async () => {
		serve({ routes: { [`POST ${MESSAGES}`]: () => mockError('FORBIDDEN') } });
		show();
		await screen.findByText(HISTORY[1]!.body);

		type('Halo?');
		fireEvent.click(sendButton());
		expect(await screen.findByText(c.blocked_you)).toBeTruthy();
		expect(composer()).toHaveProperty('disabled', true);
		expect(sendButton()).toHaveProperty('disabled', true);
		// The thread stays readable.
		expect(screen.getByText(HISTORY[1]!.body)).toBeTruthy();
		expect(getMockEvents()).toEqual([
			{ name: 'flow_error', params: { flow: 'chat', step: 'send', error_code: 'FORBIDDEN' } },
		]);
	});

	it('read-only: the composer is replaced by the closed note', async () => {
		serve({ summary: conversation({ status: 'read_only' }) });
		show();
		await screen.findByText(HISTORY[1]!.body);

		expect(screen.getByText(c.read_only)).toBeTruthy();
		expect(screen.queryByRole('textbox', { name: c.composer_label })).toBeNull();
		expect(screen.getByText(c.row_status_closed)).toBeTruthy();
	});

	it('an empty new conversation: the prompt line and the composer focused; the anonymous session note', async () => {
		state.session = { session: { user: { id: 'anon' } }, isAnonymous: true };
		serve({ history: [HISTORY[0]!] });
		show();

		expect(await screen.findByText(c.empty_thread)).toBeTruthy();
		expect(screen.getByText(c.anon_session)).toBeTruthy();
		await waitFor(() => expect(document.activeElement).toBe(composer()));
		// Back goes to the manage page for an anonymous manager.
		expect(screen.getByRole('link', { name: sl.common.back }).getAttribute('href')).toBe('/m');
	});

	it('reports a message with the shared dialog; it folds, and focus goes to the composer', async () => {
		serve();
		show();
		await screen.findByText(HISTORY[1]!.body);

		// Only other people's messages can be reported.
		const buttons = screen.getAllByRole('button', { name: a.entry });
		expect(buttons).toHaveLength(2);
		// A click focuses the button, as in a browser.
		buttons[0]!.focus();
		fireEvent.click(buttons[0]!);
		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByText(a.target_message)).toBeTruthy();
		// The block switch is offered, off for a message report.
		expect(within(dialog).getByRole('switch').getAttribute('aria-checked')).toBe('false');
		fireEvent.click(within(dialog).getByRole('radio', { name: a.reason_scam }));
		fireEvent.click(within(dialog).getByRole('button', { name: a.send }));
		fireEvent.click(await within(dialog).findByRole('button', { name: a.done_close }));

		expect(sent('POST', '/v1/abuse-reports')).toEqual([
			{ target_type: 'message', target_id: 'm1', reason: 'scam' },
		]);
		expect(sent('POST', `/v1/conversations/${ID}/block`)).toEqual([]);
		expect(screen.getByText(a.message_folded)).toBeTruthy();
		expect(screen.queryByText(HISTORY[1]!.body)).toBeNull();
		await waitFor(() => expect(document.activeElement).toBe(composer()));
	});

	it('no other participant (null id): report targets their latest message, no Block rows', async () => {
		serve({ summary: conversation({ other_participant_id: null }) });
		show();
		await screen.findByText(HISTORY[1]!.body);

		const menu = await openMenu();
		expect(within(menu).getByRole('menuitem', { name: c.menu_report })).toBeTruthy();
		expect(within(menu).queryByRole('menuitem', { name: a.entry_block })).toBeNull();
		expect(within(menu).queryByRole('menuitem', { name: c.menu_block })).toBeNull();
		fireEvent.click(within(menu).getByRole('menuitem', { name: c.menu_report }));
		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByText(a.target_message)).toBeTruthy();
		fireEvent.click(within(dialog).getByRole('radio', { name: a.reason_scam }));
		fireEvent.click(within(dialog).getByRole('button', { name: a.send }));
		await within(dialog).findByRole('button', { name: a.done_close });
		expect(sent('POST', '/v1/abuse-reports')).toEqual([
			{ target_type: 'message', target_id: 'm3', reason: 'scam' },
		]);
	});

	it('the menu: open report, report the person (profile) with the block switch, block with a confirmation', async () => {
		serve({ summary: conversation({ other_participant_id: OTHER }) });
		show();
		await screen.findByText(HISTORY[1]!.body);

		let menu = await openMenu();
		expect(within(menu).getByRole('menuitem', { name: c.menu_open_report }).getAttribute('href')).toBe(
			'/r/Hk3vT9qP'
		);
		fireEvent.click(within(menu).getByRole('menuitem', { name: a.entry_block }));
		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByText(a.target_profile)).toBeTruthy();
		expect(within(dialog).getByRole('switch').getAttribute('aria-checked')).toBe('true');
		fireEvent.click(within(dialog).getByRole('radio', { name: a.reason_fake }));
		fireEvent.click(within(dialog).getByRole('button', { name: a.send }));
		expect(await within(dialog).findByText(a.done_blocked)).toBeTruthy();
		expect(sent('POST', '/v1/abuse-reports')).toEqual([
			{ target_type: 'profile', target_id: OTHER, reason: 'fake' },
		]);
		expect(sent('POST', `/v1/conversations/${ID}/block`)).toEqual([{ participant_id: OTHER }]);
		fireEvent.click(within(dialog).getByRole('button', { name: a.done_close }));

		expect(screen.getByText(c.blocked_by_you)).toBeTruthy();
		expect(composer()).toHaveProperty('disabled', true);
		menu = await openMenu();
		expect(within(menu).queryByRole('menuitem', { name: c.menu_block })).toBeNull();
	});

	it('the menu by keyboard (menu button pattern): Enter opens it on its first row, Escape closes it back to the button', async () => {
		serve({ summary: conversation({ other_participant_id: OTHER }) });
		show();
		await screen.findByText(HISTORY[1]!.body);

		// Exact names: no stray, leading or doubled space in any of them.
		const button = screen.getByRole('button', { name: 'Možnosti pogovora' });
		expect(button.getAttribute('aria-haspopup')).toBe('menu');
		const menu = await openMenu();
		const rows = ['Odpri prijavo', 'Prijavi zlorabo', 'Prijavi in blokiraj', 'Blokiraj'].map((name) =>
			within(menu).getByRole('menuitem', { name })
		);
		expect(within(menu).getAllByRole('menuitem')).toEqual(rows);
		await waitFor(() => expect(document.activeElement).toBe(rows[0]));
		fireEvent.keyDown(rows[0]!, { key: 'ArrowDown' });
		await waitFor(() => expect(document.activeElement).toBe(rows[1]));

		fireEvent.keyDown(rows[1]!, { key: 'Escape' });
		await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(button));
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('Blokiraj asks first, then blocks, says so and disables the composer', async () => {
		serve({ summary: conversation({ other_participant_id: OTHER }) });
		show();
		await screen.findByText(HISTORY[1]!.body);

		fireEvent.click(within(await openMenu()).getByRole('menuitem', { name: c.menu_block }));
		const confirm = await screen.findByRole('alertdialog', { name: c.block_title });
		expect(within(confirm).getByText(c.block_body)).toBeTruthy();
		expect(sent('POST', `/v1/conversations/${ID}/block`)).toHaveLength(0);
		fireEvent.click(within(confirm).getByRole('button', { name: c.block_confirm }));

		expect(await screen.findByText(c.blocked_toast)).toBeTruthy();
		expect(sent('POST', `/v1/conversations/${ID}/block`)).toEqual([{ participant_id: OTHER }]);
		expect(screen.queryByRole('alertdialog')).toBeNull();
		expect(screen.getByText(c.blocked_by_you)).toBeTruthy();
		expect(composer()).toHaveProperty('disabled', true);
	});

	it('the counter shows only in the last 100 of 2000 characters', async () => {
		serve();
		show();
		await screen.findByText(HISTORY[1]!.body);

		type('a'.repeat(1899));
		expect(screen.queryByText(/Še \d+ znak/)).toBeNull();
		type('a'.repeat(1990));
		expect(screen.getByText('Še 10 znakov')).toBeTruthy();
		expect(composer().getAttribute('maxlength')).toBe('2000');
	});
});
