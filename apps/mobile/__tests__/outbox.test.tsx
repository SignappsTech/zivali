/// <reference types="node" />
// node:sqlite and node:fs stand in for the native modules, so this test runs with Node types.
import fs from 'node:fs';
import path from 'node:path';

import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { ApiError } from '@zivali/api/client';
import { createMockApi, type MockRequest, mockError } from '@zivali/api/mock';
import type { PutFile } from '@zivali/api/photos';
import type { CreateReportResponse } from '@zivali/types';
import { getDb } from '@/lib/db';
import { outboxDir } from '@/lib/db/files';
import * as outbox from '@/lib/offline/outbox';

type Outbox = typeof outbox;

// One database and one temp folder for the whole file, like the files on the device: an app restart
// (jest.resetModules) opens the same data again.
let mockConnection: unknown;
let mockFiles: unknown;
jest.mock('expo-sqlite', () => {
	const sqlite = jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').sqlite();
	return { ...sqlite, openDatabaseAsync: async () => (mockConnection ??= await sqlite.openDatabaseAsync()) };
});
jest.mock(
	'expo-file-system',
	() => (mockFiles ??= jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').fileSystem())
);
const mockKeychain = new Map<string, string>();
let mockKeychainFailures = 0;
jest.mock('expo-secure-store', () => ({
	getItemAsync: async (name: string) => mockKeychain.get(name) ?? null,
	setItemAsync: async (name: string, value: string) => {
		if (mockKeychainFailures > 0) {
			mockKeychainFailures -= 1;
			throw new Error('keychain locked');
		}
		mockKeychain.set(name, value);
	},
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual('node:crypto').randomUUID() }));
const ONLINE = { isConnected: true, isInternetReachable: true };
const mockNetwork: { listener?: (state: object) => void; state: object } = { state: ONLINE };
jest.mock('expo-network', () => ({
	getNetworkStateAsync: async () => mockNetwork.state,
	addNetworkStateListener: (listener: (state: object) => void) => {
		mockNetwork.listener = listener;
		return { remove: () => {} };
	},
}));

const T0 = Date.parse('2026-10-15T08:00:00Z');
const CAPTURED_AT = '2026-10-15T07:42:10Z';
const MINUTE = 60_000;
let now = T0;
jest.spyOn(Date, 'now').mockImplementation(() => now);

/** A picked photo in the app cache (the PhotoPicker's file), copied by submitReport. */
function pickedPhoto(name: string) {
	const dir = path.resolve(outboxDir.uri, '../../cache/ImagePicker');
	fs.mkdirSync(dir, { recursive: true });
	const uri = path.join(dir, `${name}.jpg`);
	fs.writeFileSync(uri, Buffer.from(name));
	return { sha256: name.padEnd(64, '0'), width: 1600, height: 1200, bytes: 900_000, file: { uri } };
}
const input = () => ({
	type: 'found' as const,
	species: 'cat' as const,
	location: { lat: 46.0511, lng: 14.5051 },
	finder_email: 'finder@zivali.test',
	photos: [pickedPhoto('a'), pickedPhoto('b')],
});

/**
 * The API as apps/api answers it: photos deduped per sha256, POST /v1/reports replaying the first response for the
 * same Idempotency-Key (C1). `offline` makes every request fail like a dead connection; `reports` overrides one
 * POST /v1/reports answer.
 */
function server(mockApi = createMockApi) {
	const state = {
		offline: false,
		created: 0,
		replies: new Map<string, CreateReportResponse>(),
		reports: [] as ((request: MockRequest) => unknown)[],
	};
	const online = (handler: (request: MockRequest) => unknown) => (request: MockRequest) => {
		if (state.offline) throw new TypeError('Network request failed');
		return handler(request);
	};
	/** A new report, or the stored reply for a key seen before. */
	const reply = (request: MockRequest) => {
		const key = request.headers['Idempotency-Key'];
		let stored = state.replies.get(key);
		if (!stored) {
			state.created += 1;
			stored = {
				id: `report-${state.created}`,
				short_code: `CODE${state.created}`,
				moderation_state: 'visible',
				manage_token: `token-${state.created}`,
				warnings: [],
			};
			state.replies.set(key, stored);
		}
		return stored;
	};
	const api = mockApi({
		'POST /v1/photos': online(({ body }) => ({
			photo_id: `photo-${(body as { sha256: string }).sha256[0]}`,
			upload: {
				url: 'https://r2.test/put',
				method: 'PUT',
				headers: { 'Content-Type': 'image/jpeg' },
				expires_at: '',
			},
		})),
		'POST /v1/photos/:id/complete': online(() => ({ status: 'uploaded' })),
		'POST /v1/reports': online((request) => (state.reports.shift() ?? reply)(request)),
	});
	const reportCalls = () => api.calls.filter((call) => call.path === '/v1/reports');
	return { api, state, reply, reportCalls };
}

const ensureSession = jest.fn(async (): Promise<unknown> => ({}));
const put = jest.fn<ReturnType<PutFile>, Parameters<PutFile>>(async () => {});
let stop = () => {};
let lib: Outbox = outbox;

function start(api: ReturnType<typeof server>['api'], fresh: Outbox = outbox) {
	lib = fresh;
	stop = fresh.startOutbox({ api, ensureSession, put });
}
async function row(id: string) {
	const db = await getDb();
	return db.getFirstAsync<Record<string, unknown>>('select * from outbox where id = ?', id);
}
const photoFiles = (id: string) => {
	const dir = path.join(outboxDir.uri, id);
	return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
};

beforeEach(async () => {
	now = T0;
	mockKeychain.clear();
	mockKeychainFailures = 0;
	mockNetwork.state = ONLINE;
	ensureSession.mockClear();
	put.mockClear();
	const db = await getDb();
	await db.execAsync('delete from outbox_photos; delete from outbox;');
});
afterEach(async () => {
	await cleanup();
	await lib.send();
	stop();
});
afterAll(() => fs.rmSync(path.resolve(outboxDir.uri, '../..'), { recursive: true }));

describe('submitReport', () => {
	test('stores the item with copied photos, returns at once and online sends it once', async () => {
		const { api, state, reply, reportCalls } = server();
		let answer = () => {};
		const answered = new Promise<void>((resolve) => (answer = resolve));
		state.reports.push(async (request) => {
			await answered;
			return reply(request);
		});
		start(api);
		const photos = input().photos;

		const { outboxId } = await outbox.submitReport({ ...input(), photos }, { capturedAt: CAPTURED_AT });

		// Stored before anything was sent; the picked files stay where they were (the draft owns them).
		await waitFor(() => expect(reportCalls()).toHaveLength(1));
		expect((await row(outboxId))?.status).toBe('sending');
		expect(photoFiles(outboxId)).toEqual(['0.jpg', '1.jpg']);
		for (const photo of photos) expect(fs.existsSync(photo.file.uri)).toBe(true);

		answer();
		await Promise.all([outbox.send(), outbox.send()]);

		const sent = await row(outboxId);
		expect(sent).toMatchObject({ status: 'sent', kind: 'found', captured_at: CAPTURED_AT, last_error_code: null });
		expect(JSON.parse(sent?.result as string)).toEqual({ report_id: 'report-1', short_code: 'CODE1' });
		// A sent row outlives sign-out: the email and the place are gone from it.
		expect(JSON.parse(sent?.payload as string)).toEqual({ type: 'found', species: 'cat' });
		expect(reportCalls()).toHaveLength(1);
		const [call] = reportCalls();
		expect(call.headers['Idempotency-Key']).toBe(outboxId);
		expect(call.body).toEqual({
			type: 'found',
			species: 'cat',
			location: { lat: 46.0511, lng: 14.5051 },
			finder_email: 'finder@zivali.test',
			photo_ids: ['photo-a', 'photo-b'],
			event_at: CAPTURED_AT,
		});
		// Registered with what POST /v1/photos needs, and the queued copy is what was PUT.
		const photoCalls = api.calls.filter((c) => c.path === '/v1/photos');
		expect(photoCalls.map((c) => c.body)).toEqual([
			{ sha256: 'a'.padEnd(64, '0'), width: 1600, height: 1200, bytes: 900_000 },
			{ sha256: 'b'.padEnd(64, '0'), width: 1600, height: 1200, bytes: 900_000 },
		]);
		expect(put.mock.calls.map(([, file]) => (file as { uri: string }).uri)).toEqual([
			path.join(outboxDir.uri, outboxId, '0.jpg'),
			path.join(outboxDir.uri, outboxId, '1.jpg'),
		]);
		// The token through saveManageToken (the wipe finds it by the index); the queued photos are gone.
		expect(mockKeychain.get(outbox.manageTokenKey('report-1'))).toBe('token-1');
		expect(await outbox.listManageTokenIds()).toEqual(['report-1']);
		expect(photoFiles(outboxId)).toEqual([]);
		expect(await (await getDb()).getFirstAsync('select 1 from outbox_photos')).toBeNull();
		expect(await outbox.pendingCount()).toBe(0);
	});
});

describe('send', () => {
	test('offline the item stays queued with a network backoff; after an app kill and restart it is sent', async () => {
		const { api, state } = server();
		state.offline = true;
		start(api);

		const { outboxId } = await outbox.submitReport(input(), { capturedAt: CAPTURED_AT });
		await outbox.send();

		expect(await row(outboxId)).toMatchObject({
			status: 'queued',
			attempts: 1,
			last_error_code: 'NETWORK',
			next_attempt_at: T0 + MINUTE,
		});
		expect(photoFiles(outboxId)).toEqual(['0.jpg', '1.jpg']);
		expect(await outbox.pendingCount()).toBe(1);

		// Killed during the next attempt: the module state goes; the database (the row still `sending`) and the files
		// stay. Relaunched two minutes later, online.
		await (await getDb()).runAsync(`update outbox set status = 'sending' where id = ?`, outboxId);
		stop();
		now = T0 + 2 * MINUTE;
		jest.resetModules();
		const relaunched = jest.requireActual<Outbox>('@/lib/offline/outbox');
		const back = jest.requireActual<typeof import('@zivali/api/mock')>('@zivali/api/mock');
		const { api: replay, reportCalls } = server(back.createMockApi);
		start(replay, relaunched);
		await relaunched.send();

		expect(await row(outboxId)).toMatchObject({ status: 'sent', attempts: 1 });
		expect(reportCalls()).toHaveLength(1);
		expect(mockKeychain.get(relaunched.manageTokenKey('report-1'))).toBe('token-1');
	});

	test('a lost response and the retry give one report and the same manage token', async () => {
		const { api, state, reply, reportCalls } = server();
		// The server creates the report, but the answer never arrives.
		state.reports.push((request) => {
			reply(request);
			throw new TypeError('Network request failed');
		});
		start(api);

		const { outboxId } = await outbox.submitReport(input(), { capturedAt: CAPTURED_AT });
		await outbox.send();
		expect(await row(outboxId)).toMatchObject({ status: 'queued', attempts: 1, last_error_code: 'NETWORK' });

		// Back online: the network backoff is skipped.
		mockNetwork.listener?.({ isConnected: true, isInternetReachable: true });
		await waitFor(async () => expect((await row(outboxId))?.status).toBe('sent'));

		expect(state.created).toBe(1);
		const [first, retry] = reportCalls();
		expect(retry.headers['Idempotency-Key']).toBe(first.headers['Idempotency-Key']);
		expect(retry.body).toEqual(first.body);
		expect(mockKeychain.get(outbox.manageTokenKey('report-1'))).toBe('token-1');
		expect(JSON.parse((await row(outboxId))?.result as string).report_id).toBe('report-1');
	});

	test('a rate limit waits retry_after and shows the reason; reconnecting does not skip it', async () => {
		const { api, state, reportCalls } = server();
		state.reports.push(() => mockError('RATE_LIMITED', 'Too many reports', { retry_after_s: 1800 }));
		start(api);
		const { result } = await renderHook(() => outbox.useOutbox());

		const { outboxId } = await act(() => outbox.submitReport(input(), { capturedAt: CAPTURED_AT }));
		await act(() => outbox.send());

		await waitFor(() =>
			expect(result.current.items).toEqual([
				expect.objectContaining({
					id: outboxId,
					status: 'queued',
					last_error_code: 'RATE_LIMITED',
					next_attempt_at: T0 + 1800_000,
					payload: expect.objectContaining({ type: 'found', species: 'cat' }),
					result: null,
				}),
			])
		);

		now = T0 + 20 * MINUTE;
		mockNetwork.listener?.({ isConnected: true, isInternetReachable: true });
		await act(() => outbox.send());
		expect(reportCalls()).toHaveLength(1);

		now = T0 + 31 * MINUTE;
		await act(() => outbox.send());
		await waitFor(() => expect(result.current.items[0]).toMatchObject({ status: 'sent', last_error_code: null }));
		expect(reportCalls()).toHaveLength(2);
	});

	test('network and server faults back off 1, 5, 15 and then 60 minutes', async () => {
		const { api, state } = server();
		state.offline = true;
		start(api);
		const { outboxId } = await outbox.submitReport(input(), { capturedAt: CAPTURED_AT });
		await outbox.send();

		const waits = [];
		for (let attempt = 0; attempt < 5; attempt++) {
			const { next_attempt_at } = (await row(outboxId)) as { next_attempt_at: number };
			waits.push((next_attempt_at - now) / MINUTE);
			now = next_attempt_at;
			await outbox.send();
		}

		expect(waits).toEqual([1, 5, 15, 60, 60]);
		expect(await row(outboxId)).toMatchObject({ status: 'queued', attempts: 6 });
	});

	test('a captcha that needs the person waits in needs_action until retry', async () => {
		const { api, reportCalls } = server();
		ensureSession.mockRejectedValueOnce(new ApiError('CAPTCHA_FAILED', 'CAPTCHA_FAILED'));
		start(api);
		const { result } = await renderHook(() => outbox.useOutbox());

		const { outboxId } = await act(() => outbox.submitReport(input(), { capturedAt: CAPTURED_AT }));
		await act(() => outbox.send());
		expect(await row(outboxId)).toMatchObject({ status: 'needs_action', last_error_code: 'CAPTCHA_REQUIRED' });

		// Not on its own: the sheet would pop up again.
		now = T0 + 120 * MINUTE;
		await act(() => outbox.send());
		expect(reportCalls()).toHaveLength(0);

		await act(() => result.current.retry(outboxId));
		expect(await row(outboxId)).toMatchObject({ status: 'sent' });
		expect(reportCalls()).toHaveLength(1);
	});

	test('VALIDATION fails with the reason and keeps everything until the person deletes it', async () => {
		const { api, state } = server();
		state.reports.push(() => mockError('VALIDATION', 'photo_ids: unknown photo'));
		start(api);
		const { result } = await renderHook(() => outbox.useOutbox());

		const { outboxId } = await act(() => outbox.submitReport(input(), { capturedAt: CAPTURED_AT }));
		await act(() => outbox.send());

		expect(await row(outboxId)).toMatchObject({
			status: 'failed',
			last_error_code: 'VALIDATION',
			last_error_message: 'photo_ids: unknown photo',
			next_attempt_at: null,
		});
		now = T0 + 120 * MINUTE;
		await act(() => outbox.send());
		expect(await row(outboxId)).toMatchObject({ status: 'failed' });
		expect(photoFiles(outboxId)).toEqual(['0.jpg', '1.jpg']);
		expect(await outbox.pendingCount()).toBe(1);

		await act(() => result.current.remove(outboxId));
		expect(await row(outboxId)).toBeNull();
		expect(photoFiles(outboxId)).toEqual([]);
		expect(await (await getDb()).getFirstAsync('select 1 from outbox_photos')).toBeNull();
		await waitFor(() => expect(result.current.items).toEqual([]));
	});

	test('offline without a session never opens the captcha sheet; reconnecting sends it', async () => {
		const { api, reportCalls } = server();
		mockNetwork.state = { isConnected: false, isInternetReachable: false };
		start(api);

		const { outboxId } = await outbox.submitReport(input(), { capturedAt: CAPTURED_AT });
		await outbox.send();

		expect(ensureSession).not.toHaveBeenCalled();
		expect(await row(outboxId)).toMatchObject({ status: 'queued', last_error_code: 'NETWORK', attempts: 1 });

		mockNetwork.state = ONLINE;
		mockNetwork.listener?.(ONLINE);
		await waitFor(async () => expect((await row(outboxId))?.status).toBe('sent'));
		expect(ensureSession).toHaveBeenCalledTimes(1);
		expect(reportCalls()).toHaveLength(1);
	});

	test('a send() at any moment of a running send is never dropped', async () => {
		const { api } = server();
		start(api);
		const db = await getDb();
		for (let ticks = 0; ticks < 40; ticks++) {
			const id = `late-${ticks}`;
			const first = outbox.send();
			for (let i = 0; i < ticks; i++) await Promise.resolve();
			await db.runAsync(
				`insert into outbox (id, kind, payload, captured_at, status, created_at, updated_at)
				values (?, 'found', ?, ?, 'queued', ?, ?)`,
				id,
				JSON.stringify({ type: 'found', species: 'cat', location: { lat: 46, lng: 14 } }),
				CAPTURED_AT,
				now,
				now
			);
			const second = outbox.send();
			await Promise.all([first, second]);
			await waitFor(async () => expect((await row(id))?.status).toBe('sent'));
		}
	});

	test('the sender runs on app resume', async () => {
		const { api, state, reportCalls } = server();
		state.offline = true;
		let onChange: (state: string) => void = () => {};
		const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
			onChange = listener as (state: string) => void;
			return { remove: () => {} };
		});
		start(api);
		const { outboxId } = await outbox.submitReport(input(), { capturedAt: CAPTURED_AT });
		await outbox.send();
		expect(await row(outboxId)).toMatchObject({ status: 'queued', last_error_code: 'NETWORK' });

		state.offline = false;
		now = T0 + 2 * MINUTE;
		onChange('active');

		await waitFor(async () => expect((await row(outboxId))?.status).toBe('sent'));
		expect(reportCalls()).toHaveLength(1);
		spy.mockImplementation(() => ({ remove: () => {} }));
	});

	test('the sender runs when the backoff timer fires', async () => {
		const { api, state } = server();
		state.offline = true;
		const timers: [() => void, number | undefined][] = [];
		const realSetTimeout = global.setTimeout;
		const spy = jest.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void, delay?: number) => {
			timers.push([fn, delay]);
			return realSetTimeout(() => {}, 0);
		}) as unknown as typeof setTimeout);
		start(api);
		const { outboxId } = await outbox.submitReport(input(), { capturedAt: CAPTURED_AT });
		await outbox.send();
		const timer = timers.filter(([, delay]) => delay === MINUTE).pop();
		expect(timer).toBeDefined();
		spy.mockRestore();

		state.offline = false;
		now = T0 + MINUTE;
		timer?.[0]();

		await waitFor(async () => expect((await row(outboxId))?.status).toBe('sent'));
	});

	test('once the report exists, a keychain failure keeps the item queued and the retry saves the token', async () => {
		const { api, state, reportCalls } = server();
		start(api);
		mockKeychainFailures = 1;

		const { outboxId } = await outbox.submitReport(input(), { capturedAt: CAPTURED_AT });
		await outbox.send();

		expect(await row(outboxId)).toMatchObject({ status: 'queued', attempts: 1, next_attempt_at: T0 + MINUTE });
		expect(photoFiles(outboxId)).toEqual(['0.jpg', '1.jpg']);
		now = T0 + MINUTE;
		await outbox.send();

		expect(await row(outboxId)).toMatchObject({ status: 'sent' });
		expect(state.created).toBe(1);
		expect(reportCalls()).toHaveLength(2);
		expect(mockKeychain.get(outbox.manageTokenKey('report-1'))).toBe('token-1');
	});

	test('folders without an unsent row (left by a kill or a delete) are swept at the next run', async () => {
		const { api, state } = server();
		state.offline = true;
		start(api);
		const orphan = path.join(outboxDir.uri, 'orphan');
		fs.mkdirSync(orphan, { recursive: true });
		fs.writeFileSync(path.join(orphan, '0.jpg'), 'x');
		const kept = await outbox.submitReport(input(), { capturedAt: CAPTURED_AT });

		await outbox.send();

		expect(fs.existsSync(orphan)).toBe(false);
		expect(photoFiles(kept.outboxId)).toEqual(['0.jpg', '1.jpg']);
	});

	test('an item deleted while an earlier one is sending is never sent', async () => {
		const { api, state, reply, reportCalls } = server();
		state.offline = true;
		start(api);
		// The queue UI's delete, without a mounted screen re-rendering during the send.
		const { result, unmount } = await renderHook(() => outbox.useOutbox());
		const { remove } = result.current;
		await unmount();
		const first = await outbox.submitReport(input(), { capturedAt: CAPTURED_AT });
		const second = await outbox.submitReport({ ...input(), type: 'sighted' }, { capturedAt: CAPTURED_AT });
		await outbox.send();

		state.offline = false;
		now = T0 + 2 * MINUTE;
		let answer = () => {};
		const answered = new Promise<void>((resolve) => (answer = resolve));
		state.reports.push(async (request) => {
			await answered;
			return reply(request);
		});
		const sending = outbox.send();
		await waitFor(() => expect(reportCalls()).toHaveLength(1));
		await remove(second.outboxId);
		answer();
		await sending;

		expect(await row(first.outboxId)).toMatchObject({ status: 'sent' });
		expect(await row(second.outboxId)).toBeNull();
		expect(reportCalls()).toHaveLength(1);
		expect(state.created).toBe(1);
	});
});
