import assert from 'node:assert/strict';
import { test } from 'node:test';

import { conversations } from '../src/__fixtures__/chat.ts';
import { alertSubscription, notification, notifications, prefs } from '../src/__fixtures__/notifications.ts';
import { alertsApi } from '../src/alerts.ts';
import { chatApi } from '../src/chat.ts';
import { mockError } from '../src/mock.ts';
import { type InboxEvent, notificationsApi, subscribeInbox } from '../src/notifications.ts';
import { failure, fakeRealtime, mockStore, settle } from './helpers.ts';

const n = notificationsApi.endpoints;
const a = alertsApi.endpoints;
const none = () => undefined;

test('notification endpoints map their arguments to the C10 routes', async (t) => {
	const { store, calls } = mockStore(t, {
		'GET /v1/notifications': notifications,
		'POST /v1/notifications/read': none,
		'GET /v1/notification-prefs': prefs,
		'PUT /v1/notification-prefs/:type': ({ params, body }) => ({ type: params.type, ...(body as object) }),
		'PATCH /v1/me': {},
		'POST /v1/push-tokens': none,
		'DELETE /v1/push-tokens': none,
	});

	const list = await store.dispatch(n.listNotifications.initiate({ cursor: 'n2', limit: 20 }, { subscribe: false }));
	assert.deepEqual(list.data, notifications);
	await store.dispatch(n.markRead.initiate({ all: true }));
	assert.deepEqual((await store.dispatch(n.getPrefs.initiate(undefined, { subscribe: false }))).data, prefs);
	const pref = await store.dispatch(n.setPref.initiate({ type: 'nearby_lost', body: { email: true } }));
	assert.deepEqual(pref.data, { type: 'nearby_lost', email: true });
	await store.dispatch(n.setQuietHours.initiate({ quiet_from: '22:00', quiet_to: '07:00' }));
	await store.dispatch(n.registerPushToken.initiate({ token: 'ExponentPushToken[abc]', platform: 'android' }));
	await store.dispatch(n.unregisterPushToken.initiate({ token: 'ExponentPushToken[abc]' }));

	assert.deepEqual(calls(), [
		{ method: 'GET', path: '/v1/notifications', query: { cursor: 'n2', limit: '20' }, body: undefined },
		{ method: 'POST', path: '/v1/notifications/read', query: {}, body: { all: true } },
		{ method: 'GET', path: '/v1/notification-prefs', query: {}, body: undefined },
		{ method: 'PUT', path: '/v1/notification-prefs/nearby_lost', query: {}, body: { email: true } },
		{ method: 'PATCH', path: '/v1/me', query: {}, body: { quiet_from: '22:00', quiet_to: '07:00' } },
		{
			method: 'POST',
			path: '/v1/push-tokens',
			query: {},
			body: { token: 'ExponentPushToken[abc]', platform: 'android' },
		},
		{ method: 'DELETE', path: '/v1/push-tokens', query: {}, body: { token: 'ExponentPushToken[abc]' } },
	]);
});

test('alert subscription endpoints map to C10 §Nearby alerts; null when there is none', async (t) => {
	let saved: object | null = null;
	const { store, calls } = mockStore(t, {
		'GET /v1/alert-subscription': () => saved,
		'PUT /v1/alert-subscription': () => (saved = alertSubscription),
		'DELETE /v1/alert-subscription': () => void (saved = null),
	});
	const { center, radius_km, species, paused } = alertSubscription;

	assert.equal((await store.dispatch(a.getAlertSubscription.initiate(undefined, { subscribe: false }))).data, null);
	const put = await store.dispatch(a.saveAlertSubscription.initiate({ center, radius_km, species, paused }));
	assert.deepEqual(put.data, alertSubscription);
	await store.dispatch(a.deleteAlertSubscription.initiate());

	assert.deepEqual(
		calls().map(({ method, path, body }) => [method, path, body]),
		[
			['GET', '/v1/alert-subscription', undefined],
			['PUT', '/v1/alert-subscription', { center, radius_km, species, paused }],
			['DELETE', '/v1/alert-subscription', undefined],
		]
	);
});

test('notification and alert errors arrive as { status, data.code }', async (t) => {
	const { store } = mockStore(t, {
		'PUT /v1/alert-subscription': () => mockError('UNVERIFIED_EMAIL'),
		'GET /v1/notifications': () => mockError('UNAUTHENTICATED'),
	});
	const { center, radius_km, species, paused } = alertSubscription;
	const put = await store.dispatch(a.saveAlertSubscription.initiate({ center, radius_km, species, paused }));
	assert.deepEqual(failure(put), [403, 'UNVERIFIED_EMAIL']);
	const list = await store.dispatch(n.listNotifications.initiate(undefined, { subscribe: false }));
	assert.deepEqual(failure(list), [401, 'UNAUTHENTICATED']);
});

test('reading a conversation re-fetches the notifications too: the API read its chat_message rows', async (t) => {
	const { store, client } = mockStore(t, {
		'GET /v1/notifications': notifications,
		'GET /v1/conversations': conversations,
		'POST /v1/conversations/:id/read': none,
	});
	const views = [
		store.dispatch(n.listNotifications.initiate({ limit: 1 })),
		store.dispatch(chatApi.endpoints.listConversations.initiate()),
	];
	await Promise.all(views);
	await store.dispatch(chatApi.endpoints.markConversationRead.initiate({ id: 'c1' }));
	await settle();
	assert.deepEqual(
		client.calls
			.map((call) => call.path)
			.slice(2)
			.sort(),
		['/v1/conversations', '/v1/conversations/c1/read', '/v1/notifications']
	);
	for (const view of views) view.unsubscribe();
});

test('subscribeInbox: user:<id> events and every (re)subscribe re-fetch notifications and conversations', async (t) => {
	const { store, client } = mockStore(t, {
		'GET /v1/notifications': notifications,
		'GET /v1/conversations': conversations,
	});
	const views = [
		store.dispatch(n.listNotifications.initiate()),
		store.dispatch(chatApi.endpoints.listConversations.initiate()),
	];
	await Promise.all(views);
	const fetched = () => client.calls.map((call) => call.path);
	const events: InboxEvent[] = [];
	const rt = fakeRealtime();
	const off = subscribeInbox(rt.realtime, store.dispatch, 'u1', (event) => events.push(event));

	assert.equal(rt.state.topic, 'user:u1');
	assert.deepEqual(rt.state.options, { config: { private: true } });
	rt.emit('notification.created', notification);
	await settle();
	assert.deepEqual(fetched().slice(2), ['/v1/notifications']);
	rt.emit('conversation.updated', { id: 'c1' });
	await settle();
	assert.deepEqual(fetched().slice(3), ['/v1/conversations']);
	rt.status('SUBSCRIBED');
	await settle();
	assert.deepEqual(fetched().slice(4).sort(), ['/v1/conversations', '/v1/notifications']);
	assert.deepEqual(events, [
		{ event: 'notification.created', payload: notification },
		{ event: 'conversation.updated', payload: { id: 'c1' } },
	]);

	off();
	assert.equal(rt.state.removed, true);
	for (const view of views) view.unsubscribe();
});
