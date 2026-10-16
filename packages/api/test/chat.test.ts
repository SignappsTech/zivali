import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Message } from '@zivali/types';

import {
	conversationCreated,
	conversationId as id,
	conversations,
	message,
	messages,
} from '../src/__fixtures__/chat.ts';
import { chatApi, subscribeConversation } from '../src/chat.ts';
import { mockError } from '../src/mock.ts';
import { failure, fakeRealtime, mockStore, settle } from './helpers.ts';

const e = chatApi.endpoints;

test('chat endpoints map their arguments to the C9 routes', async (t) => {
	const { store, calls } = mockStore(t, {
		'POST /v1/conversations': conversationCreated,
		'GET /v1/conversations': conversations,
		'GET /v1/conversations/:id/messages': messages,
		'POST /v1/conversations/:id/messages': message,
		'POST /v1/conversations/:id/read': () => undefined,
		'POST /v1/conversations/:id/block': () => undefined,
	});

	const created = await store.dispatch(e.createConversation.initiate({ about_report_code: 'Hk3vT9qP' }));
	assert.deepEqual(created.data, conversationCreated);
	const list = await store.dispatch(e.listConversations.initiate({ cursor: 'c2' }, { subscribe: false }));
	assert.deepEqual(list.data, conversations);
	await store.dispatch(e.listMessages.initiate({ id, before: 'm1', limit: 20 }, { subscribe: false }));
	const sent = await store.dispatch(e.sendMessage.initiate({ id, body: { body: 'Hvala!' }, idempotencyKey: KEY }));
	assert.deepEqual(sent.data, message);
	await store.dispatch(e.markConversationRead.initiate({ id }));
	await store.dispatch(e.blockParticipant.initiate({ id, body: { participant_id: 'u2' } }));

	assert.deepEqual(calls(), [
		{ method: 'POST', path: '/v1/conversations', query: {}, body: { about_report_code: 'Hk3vT9qP' } },
		{ method: 'GET', path: '/v1/conversations', query: { cursor: 'c2' }, body: undefined },
		{
			method: 'GET',
			path: `/v1/conversations/${id}/messages`,
			query: { before: 'm1', limit: '20' },
			body: undefined,
		},
		{ method: 'POST', path: `/v1/conversations/${id}/messages`, query: {}, body: { body: 'Hvala!' } },
		{ method: 'POST', path: `/v1/conversations/${id}/read`, query: {}, body: undefined },
		{ method: 'POST', path: `/v1/conversations/${id}/block`, query: {}, body: { participant_id: 'u2' } },
	]);
});

test('chat errors arrive as { status, data.code }', async (t) => {
	const { store } = mockStore(t, {
		'POST /v1/conversations': () => mockError('UNVERIFIED_EMAIL'),
		'POST /v1/conversations/:id/messages': () => mockError('GONE', 'Read-only'),
	});
	const created = await store.dispatch(e.createConversation.initiate({ about_report_code: 'Hk3vT9qP' }));
	assert.deepEqual(failure(created), [403, 'UNVERIFIED_EMAIL']);
	const sent = await store.dispatch(e.sendMessage.initiate({ id, body: { body: 'Hvala!' }, idempotencyKey: KEY }));
	assert.deepEqual(failure(sent), [410, 'GONE']);
});

test('subscribeConversation: private channel, live messages deduped, catch-up after every (re)subscribe', async (t) => {
	const first = messages.items[0]!;
	const missed = Array.from({ length: 50 }, (_, i): Message => ({
		...message,
		id: `missed-${String(i).padStart(2, '0')}`,
		created_at: `2026-10-14T16:00:${String(i).padStart(2, '0')}Z`,
	}));
	const { store, client } = mockStore(t, {
		'GET /v1/conversations/:id/messages': ({ query }) =>
			query.after === first.id
				? { items: missed, next_cursor: null } // a full page: ask again after its last id
				: query.after
					? { items: [message], next_cursor: null }
					: messages,
	});
	const view = store.dispatch(e.listMessages.initiate({ id }));
	await view;
	const ids = () =>
		e.listMessages
			.select({ id })(store.getState() as never)
			.data?.items.map((m) => m.id);
	const rt = fakeRealtime();
	const off = subscribeConversation(rt.realtime, store, id);

	assert.equal(rt.state.topic, `conversation:${id}`);
	assert.deepEqual(rt.state.options, { config: { private: true } });

	rt.status('SUBSCRIBED');
	await settle();
	assert.deepEqual(
		client.calls.slice(1).map((call) => call.query),
		[
			{ after: first.id, limit: '50' },
			{ after: 'missed-49', limit: '50' },
		]
	);
	assert.deepEqual(ids(), [first.id, ...missed.map((m) => m.id), message.id]);

	rt.emit('message.created', message);
	rt.emit('message.created', { ...message, id: 'live-1', created_at: '2026-10-14T16:03:00Z' });
	assert.deepEqual(ids()!.slice(-2), [message.id, 'live-1']);

	off();
	assert.equal(rt.state.removed, true);
	view.unsubscribe();
});

test('subscribeConversation passes conversation.read through and skips catch-up without a cached view', async (t) => {
	const { store, client } = mockStore(t, {});
	const rt = fakeRealtime();
	const reads: unknown[] = [];
	subscribeConversation(rt.realtime, store, id, { read: (payload) => reads.push(payload) });

	rt.status('SUBSCRIBED');
	rt.emit('conversation.read', { conversation_id: id });
	await settle();
	assert.deepEqual(reads, [{ conversation_id: id }]);
	assert.equal(client.calls.length, 0);
});

test('live messages are inserted in created_at order and stay idempotent', async (t) => {
	const { store } = mockStore(t, { 'GET /v1/conversations/:id/messages': messages });
	const view = store.dispatch(e.listMessages.initiate({ id }));
	await view;
	const rt = fakeRealtime();
	subscribeConversation(rt.realtime, store, id);
	const older = { ...message, id: 'older', created_at: '2026-10-14T15:59:00Z' };
	rt.emit('message.created', message);
	rt.emit('message.created', older);
	rt.emit('message.created', older);
	const ids = e.listMessages
		.select({ id })(store.getState() as never)
		.data?.items.map((m) => m.id);
	assert.deepEqual(ids, [messages.items[0]!.id, 'older', message.id]);
	view.unsubscribe();
});

test('catch-up waits for a first load still in flight', async (t) => {
	const { store, client } = mockStore(t, {
		'GET /v1/conversations/:id/messages': ({ query }) =>
			query.after ? { items: [message], next_cursor: null } : messages,
	});
	const view = store.dispatch(e.listMessages.initiate({ id }));
	const rt = fakeRealtime();
	subscribeConversation(rt.realtime, store, id);
	rt.status('SUBSCRIBED'); // before the load resolved
	await view;
	await settle();
	assert.deepEqual(
		client.calls.slice(1).map((c) => c.query),
		[{ after: messages.items[0]!.id, limit: '50' }]
	);
	view.unsubscribe();
});

test('catch-up stops when the server ignores `after`', async (t) => {
	const page = Array.from({ length: 50 }, (_, i): Message => ({ ...message, id: `p-${i}` }));
	const { store, client } = mockStore(t, {
		'GET /v1/conversations/:id/messages': ({ query }) =>
			query.after ? { items: page, next_cursor: null } : { items: [page.at(-1)!], next_cursor: null },
	});
	const view = store.dispatch(e.listMessages.initiate({ id }));
	await view;
	const rt = fakeRealtime();
	subscribeConversation(rt.realtime, store, id);
	rt.status('SUBSCRIBED');
	await settle();
	assert.equal(client.calls.length, 2);
	view.unsubscribe();
});

const KEY = '1b4e28ba-2fa1-4d3b-a3f5-ef19b5a76330';

test('sendMessage puts the returned message in the cache without Realtime', async (t) => {
	const { store } = mockStore(t, {
		'GET /v1/conversations/:id/messages': messages,
		'POST /v1/conversations/:id/messages': message,
	});
	const view = store.dispatch(e.listMessages.initiate({ id }));
	await view;
	await store.dispatch(e.sendMessage.initiate({ id, body: { body: 'x' }, idempotencyKey: KEY }));
	const ids = e.listMessages
		.select({ id })(store.getState() as never)
		.data?.items.map((m) => m.id);
	assert.deepEqual(ids, [messages.items[0]!.id, message.id]);
	view.unsubscribe();
});

test('sendMessage sends the Idempotency-Key header; a retry sends the same key', async (t) => {
	let fail = true;
	const { store, client } = mockStore(t, {
		'POST /v1/conversations/:id/messages': () => (fail ? mockError('INTERNAL') : message),
	});
	await store.dispatch(e.sendMessage.initiate({ id, body: { body: 'x' }, idempotencyKey: KEY }));
	fail = false;
	await store.dispatch(e.sendMessage.initiate({ id, body: { body: 'x' }, idempotencyKey: KEY }));
	assert.deepEqual(
		client.calls.map((c) => c.headers['Idempotency-Key']),
		[KEY, KEY]
	);
});
