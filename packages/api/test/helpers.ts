// Test helpers for the domain endpoints: a store over the mock API, and a Supabase Realtime stand-in.
import type { TestContext } from 'node:test';

import type { BroadcastChannel, RealtimeClient } from '../src/broadcast.ts';
import { createMockApi, type MockRoutes } from '../src/mock.ts';
import { api, createApiStore, type QueryError } from '../src/rtk.ts';

/** A store over createMockApi(routes); its cache timers are cleared after the test so the process can exit. */
export function mockStore(t: TestContext, routes: MockRoutes) {
	const client = createMockApi(routes);
	const store = createApiStore(client);
	t.after(() => void store.dispatch(api.util.resetApiState()));
	return {
		client,
		store,
		calls: () => client.calls.map(({ method, path, query, body }) => ({ method, path, query, body })),
	};
}

/** Records the channel and lets the test emit Broadcast events and channel statuses. */
export function fakeRealtime() {
	const handlers = new Map<string, (message: { payload?: unknown }) => void>();
	let onStatus: (status: string) => void = () => {};
	const channel: BroadcastChannel = {
		on: (_type, { event }, callback) => (handlers.set(event, callback), channel),
		subscribe: (callback) => (onStatus = callback),
	};
	const state = { topic: '', options: {} as unknown, removed: false };
	const realtime: RealtimeClient = {
		channel: (topic, options) => (Object.assign(state, { topic, options }), channel),
		removeChannel: () => (state.removed = true),
	};
	return {
		realtime,
		state,
		emit: (event: string, payload: unknown) => handlers.get(event)!({ payload }),
		status: (status: string) => onStatus(status),
	};
}

/** Lets pending dispatches and mock fetches settle. */
export const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

/** `[status, code]` of a failed query or mutation result. */
export const failure = ({ error }: { error?: unknown }) => {
	const { status, data } = error as QueryError;
	return [status, data.code];
};
