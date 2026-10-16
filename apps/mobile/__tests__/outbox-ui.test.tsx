/// <reference types="node" />
// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import fs from 'node:fs';
import path from 'node:path';

import { PortalHost } from '@rn-primitives/portal';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as React from 'react';
import { Pressable, Text } from 'react-native';

import { createMockApi } from '@zivali/api/mock';
import sl from '@zivali/i18n/dist/sl.json';
import { OutboxList, usePendingPrompt } from '@/components/outbox/queue';
import { toast } from '@/components/ui/sonner';
import { getDb } from '@/lib/db';
import { outboxDir } from '@/lib/db/files';
import { I18nProvider } from '@/lib/i18n';
import * as outbox from '@/lib/offline/outbox';

// Queue UI (TASK-86.2) on the real outbox engine: node:sqlite and node:fs stand in for the native modules.
let mockConnection: unknown;
jest.mock('expo-sqlite', () => {
	const sqlite = jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').sqlite();
	return { ...sqlite, openDatabaseAsync: async () => (mockConnection ??= await sqlite.openDatabaseAsync()) };
});
jest.mock('expo-file-system', () =>
	jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').fileSystem()
);
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
	getItemAsync: async (name: string) => mockKeychain.get(name) ?? null,
	setItemAsync: async (name: string, value: string) => void mockKeychain.set(name, value),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual('node:crypto').randomUUID() }));
const ONLINE = { isConnected: true, isInternetReachable: true };
const mockNetwork: { state: object } = { state: ONLINE };
jest.mock('expo-network', () => ({
	getNetworkStateAsync: async () => mockNetwork.state,
	addNetworkStateListener: () => ({ remove: () => {} }),
}));
const mockStorage = new Map<string, string>([['locale', 'sl']]);
jest.mock('expo-sqlite/localStorage/install', () => {
	globalThis.localStorage = {
		getItem: (name: string) => mockStorage.get(name) ?? null,
		setItem: (name: string, value: string) => void mockStorage.set(name, value),
		removeItem: (name: string) => void mockStorage.delete(name),
	} as Storage;
	return {};
});
jest.mock('@/components/ui/sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const t = sl.report_found;
const CAPTURED_AT = '2026-10-16T12:20:00Z';
/** 14:32 in Ljubljana (CEST). */
const AT_1432 = Date.parse('2026-10-16T12:32:00Z');

/** The API answering POST /v1/reports (rows here have no photos); each new report gets the next token. */
function startServer() {
	let created = 0;
	const api = createMockApi({
		'POST /v1/reports': () => {
			created += 1;
			return {
				id: `report-${created}`,
				short_code: `CODE${created}`,
				moderation_state: 'visible',
				manage_token: `token-${created}`,
				warnings: [],
			};
		},
	});
	stop = outbox.startOutbox({ api, ensureSession: async () => ({}), put: async () => {} });
}
let stop = () => {};

async function insert(
	id: string,
	status: outbox.OutboxStatus,
	{
		code = null,
		created = Date.now(),
		updated = Date.now(),
	}: { code?: string | null; created?: number; updated?: number } = {}
) {
	const db = await getDb();
	const sent = status === 'sent';
	await db.runAsync(
		`insert into outbox (id, kind, payload, captured_at, status, last_error_code, result, created_at, updated_at)
		values (?, 'found', ?, ?, ?, ?, ?, ?, ?)`,
		id,
		JSON.stringify(
			// A sent row keeps only type and species (TASK-86.1).
			sent
				? { type: 'found', species: 'dog' }
				: { type: 'found', species: 'cat', location: { lat: 46.05, lng: 14.5 } }
		),
		CAPTURED_AT,
		status,
		code,
		sent ? JSON.stringify({ report_id: `report-${id}`, short_code: 'ABC123' }) : null,
		created,
		updated
	);
}
const statuses = async () => {
	const db = await getDb();
	const rows = await db.getAllAsync<{ id: string; status: string }>('select id, status from outbox order by id');
	return Object.fromEntries(rows.map(({ id, status }) => [id, status]));
};

/** What the sign-out does with the prompt: ask with the pending count, then act on the answer. */
function PromptHarness() {
	const { resolvePending, prompt } = usePendingPrompt();
	const [answer, setAnswer] = React.useState('');
	return (
		<>
			{prompt}
			<Pressable
				role="button"
				onPress={() => {
					void outbox
						.pendingCount()
						.then(resolvePending)
						.then((go) => setAnswer(String(go)));
				}}
			>
				<Text>ask</Text>
			</Pressable>
			<Text>{`answer ${answer}`}</Text>
		</>
	);
}
const routes = {
	index: () => <OutboxList heading={t.my_reports} />,
	map: () => <OutboxList recent />,
	prompt: PromptHarness,
	m: function Manage() {
		const { '#': token } = useLocalSearchParams<{ '#'?: string }>();
		return <Text>{`manage ${token}`}</Text>;
	},
};
function Providers({ children }: { children: React.ReactNode }) {
	return (
		<I18nProvider>
			{children}
			<PortalHost />
		</I18nProvider>
	);
}
const open = async (initialUrl = '/') => {
	const result = renderRouter(routes, { initialUrl, wrapper: Providers });
	await result;
	return { getPathname: result.getPathname };
};

jest.setTimeout(30_000);

beforeEach(async () => {
	mockKeychain.clear();
	mockNetwork.state = ONLINE;
	jest.mocked(toast.error).mockClear();
	const db = await getDb();
	await db.execAsync('delete from outbox_photos; delete from outbox;');
});
afterEach(async () => {
	await cleanup();
	await outbox.send();
	stop();
	stop = () => {};
});
afterAll(() => fs.rmSync(path.resolve(outboxDir.uri, '../..'), { recursive: true }));

describe('queue rows (Profile → My reports)', () => {
	test('waiting, sending, sent and stuck rows: status word, time, reason, Retry and Delete, announced', async () => {
		await insert('a-queued', 'queued', { created: AT_1432 });
		await insert('b-sending', 'sending');
		await insert('c-failed', 'failed', { code: 'VALIDATION' });
		await insert('d-captcha', 'needs_action', { code: 'CAPTCHA_REQUIRED' });
		await insert('e-sent', 'sent');
		await open();

		expect(await screen.findByRole('heading', { name: t.my_reports })).toBeOnTheScreen();
		// The list is not one screen-reader stop (its rows are), so it is found by its label.
		const list = screen.getByLabelText(t.my_reports);
		expect(within(list).getAllByRole('status')).toHaveLength(5);
		// Each row is one screen-reader stop that announces its new status word (AC #3).
		const status = (word: string) => screen.getByRole('status', { name: new RegExp(word) });
		for (const word of [t.outbox_waiting, t.outbox_sending, t.outbox_sent])
			expect(status(word)).toHaveProp('aria-live', 'polite');
		expect(status(t.outbox_waiting)).toHaveTextContent(`${sl.report_found.species_cat}${t.outbox_waiting}14:32`);
		expect(status(t.outbox_sent)).toHaveTextContent(new RegExp(sl.report_found.species_dog));
		expect(screen.getAllByRole('status', { name: new RegExp(t.outbox_failed) })).toHaveLength(2);
		expect(screen.getByText(sl.errors.VALIDATION)).toBeOnTheScreen();
		expect(screen.getByText(sl.errors.CAPTCHA_FAILED)).toBeOnTheScreen();
		// Only stuck rows get Retry and Delete.
		expect(screen.getAllByRole('button', { name: t.outbox_retry })).toHaveLength(2);
		expect(screen.getAllByRole('button', { name: t.outbox_delete })).toHaveLength(2);
	});

	test('a queued report held by a rate limit or a server error shows the reason with Retry and a confirmed Delete', async () => {
		await insert('r1', 'queued', { code: 'RATE_LIMITED' });
		await insert('s1', 'queued', { code: 'SERVICE_UNAVAILABLE' });
		await insert('n1', 'queued', { code: 'NETWORK' });
		await open();

		expect(await screen.findByText(/Poskusite znova čez 1 minuto\./)).toBeOnTheScreen();
		expect(screen.getByText(t.server_busy_queued)).toBeOnTheScreen();
		// Waiting for the network has no reason and no actions.
		expect(screen.getAllByRole('button', { name: t.outbox_retry })).toHaveLength(2);
		const deletes = screen.getAllByRole('button', { name: t.outbox_delete });
		expect(deletes).toHaveLength(2);

		await fireEvent.press(deletes[0]!);
		expect(await screen.findByText(t.cancel_queued_title)).toBeOnTheScreen();
		expect(await statuses()).toEqual({ n1: 'queued', r1: 'queued', s1: 'queued' });
		await fireEvent.press(screen.getAllByRole('button', { name: t.outbox_delete }).at(-1)!);
		await waitFor(async () => expect(Object.keys(await statuses())).toHaveLength(2));
	});

	test('Retry sends a failed report once; it switches to Sent and opens its manage page', async () => {
		await insert('f1', 'failed', { code: 'VALIDATION' });
		startServer();
		const result = await open();

		await fireEvent.press(await screen.findByRole('button', { name: t.outbox_retry }));
		expect(await screen.findByRole('status', { name: new RegExp(t.outbox_sent) })).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: t.outbox_retry })).toBeNull();
		expect(await statuses()).toEqual({ f1: 'sent' });

		await fireEvent.press(await screen.findByRole('button', { name: t.open_report }));
		expect(result.getPathname()).toBe('/m');
		expect(screen.getByText('manage token-1')).toBeOnTheScreen();
	});

	test('Delete removes a stuck report', async () => {
		await insert('f1', 'failed', { code: 'FORBIDDEN' });
		await insert('q1', 'queued');
		await open();

		await fireEvent.press(await screen.findByRole('button', { name: t.outbox_delete }));
		await waitFor(() => expect(screen.queryByRole('status', { name: new RegExp(t.outbox_failed) })).toBeNull());
		expect(await statuses()).toEqual({ q1: 'queued' });
	});

	test('a sent row without a manage token on this device has no link', async () => {
		await insert('s1', 'sent');
		mockKeychain.clear();
		await open();

		expect(await screen.findByRole('status', { name: new RegExp(t.outbox_sent) })).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: t.open_report })).toBeNull();
	});

	test('nothing shows while the outbox is empty', async () => {
		await open();
		await act(() => outbox.send());
		expect(screen.queryByRole('heading', { name: t.my_reports })).toBeNull();
		expect(screen.queryByLabelText(t.my_reports)).toBeNull();
	});
});

describe('Map tab group', () => {
	test('lists unsent rows and rows sent since this app start, not older sent ones', async () => {
		await insert('old', 'sent', { updated: Date.now() - 3_600_000 });
		await insert('new', 'sent');
		await insert('q1', 'queued');
		await open('/map');

		const list = await screen.findByLabelText(t.outbox_title);
		expect(within(list).getAllByRole('status')).toHaveLength(2);
		expect(screen.getAllByRole('status', { name: new RegExp(t.outbox_sent) })).toHaveLength(1);
	});
});

describe('pending prompt (sign-out, account deletion)', () => {
	const ask = async () => {
		await open('/prompt');
		await fireEvent.press(screen.getByRole('button', { name: 'ask' }));
		expect(await screen.findByRole('heading', { name: '2 prijavi še nista poslani' })).toBeOnTheScreen();
	};
	beforeEach(async () => {
		await insert('q1', 'queued');
		await insert('f1', 'failed', { code: 'VALIDATION' });
		await insert('s1', 'sent');
	});

	test('Send now sends every unsent report, then goes on', async () => {
		await ask();
		// Started after the question, so its launch send does not empty the queue first.
		startServer();
		await fireEvent.press(screen.getByRole('button', { name: t.outbox_send_now }));
		expect(await screen.findByText('answer true')).toBeOnTheScreen();
		expect(await statuses()).toEqual({ f1: 'sent', q1: 'sent', s1: 'sent' });
		expect(toast.error).not.toHaveBeenCalled();
	});

	test('Send now offline keeps the reports, says so and stops', async () => {
		startServer();
		mockNetwork.state = { isConnected: false, isInternetReachable: false };
		await ask();
		await fireEvent.press(screen.getByRole('button', { name: t.outbox_send_now }));
		expect(await screen.findByText('answer false')).toBeOnTheScreen();
		expect(toast.error).toHaveBeenCalledWith(t.outbox_send_failed);
		expect(await statuses()).toEqual({ f1: 'queued', q1: 'queued', s1: 'sent' });
	});

	test('Delete removes the unsent reports and keeps sent ones, then goes on', async () => {
		await ask();
		await fireEvent.press(screen.getByRole('button', { name: t.outbox_delete }));
		expect(await screen.findByText('answer true')).toBeOnTheScreen();
		expect(await statuses()).toEqual({ s1: 'sent' });
	});

	test('Cancel stops and keeps everything', async () => {
		await ask();
		await fireEvent.press(screen.getByRole('button', { name: sl.common.cancel }));
		expect(await screen.findByText('answer false')).toBeOnTheScreen();
		expect(screen.queryByRole('heading', { name: '2 prijavi še nista poslani' })).toBeNull();
		expect(await statuses()).toEqual({ f1: 'failed', q1: 'queued', s1: 'sent' });
	});
});
