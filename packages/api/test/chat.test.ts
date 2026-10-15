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
import { fakeRealtime, mockStore, settle } from './helpers.ts';

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
	const sent = await store.dispatch(e.sendMessage.initiate({ id, body: { body: 'Hvala!' } }));
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
	assert.equal(created.error?.status, 403);
	assert.equal(created.error?.data.code, 'UNVERIFIED_EMAIL');
	const sent = await store.dispatch(e.sendMessage.initiate({ id, body: { body: 'Hvala!' } }));
	assert.deepEqual([sent.error?.status, sent.error?.data.code], [410, 'GONE']);
});

test('subscribeConversation: private channel, live messages deduped, catch-up after every (re)subscribe', async (t) => {
	const first = messages.items[0]!;
	const missed = Array.from({ length: 50 }, (_, i): Message => ({ ...message, id: `missed-${i}` }));
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
	rt.emit('message.created', { ...message, id: 'live-1' });
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
