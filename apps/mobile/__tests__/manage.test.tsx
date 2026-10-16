// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import * as React from 'react';
import { Text } from 'react-native';
import { Provider } from 'react-redux';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { ownerReport } from '@zivali/api/__fixtures__/reports';
import { ApiError, createApiClient } from '@zivali/api/client';
import { type MockRequest, mockError } from '@zivali/api/mock';
import { type ApiStore, createApiStore } from '@zivali/api/rtk';
import type { ReportOwnerView } from '@zivali/types';
import ManageScreen from '@/app/m';
import { CaptchaSheet } from '@/components/anonymous/captcha-sheet';
import { answerCaptcha, ensureSession } from '@/lib/anonymous';
import { env } from '@/lib/env';
import { I18nProvider } from '@/lib/i18n';

const mockStorage = new Map<string, string>();
jest.mock('expo-sqlite/localStorage/install', () => {
	globalThis.localStorage = {
		getItem: (name: string) => mockStorage.get(name) ?? null,
		setItem: (name: string, value: string) => void mockStorage.set(name, value),
		removeItem: (name: string) => void mockStorage.delete(name),
	} as Storage;
	return {};
});
// Read while modules load (device id, network listeners, env), so their state lives inside the mocks.
jest.mock('expo-secure-store', () => {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (key: string) => data.get(key) ?? null,
		getItemAsync: jest.fn(async (key: string) => data.get(key) ?? null),
		setItem: (key: string, value: string) => void data.set(key, value),
		setItemAsync: jest.fn(async (key: string, value: string) => void data.set(key, value)),
	};
});
jest.mock('expo-crypto', () => {
	let n = 0;
	return { randomUUID: () => `1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7633${n++}` };
});
jest.mock('expo-network', () => {
	const listeners = new Set();
	return {
		listeners,
		addNetworkStateListener: (listener: (state: object) => void) => {
			listeners.add(listener);
			return { remove: () => listeners.delete(listener) };
		},
		getNetworkStateAsync: jest.fn(),
	};
});
jest.mock('@/lib/env', () => ({
	env: {
		EXPO_PUBLIC_APP_URL: 'https://najdimo.test',
		EXPO_PUBLIC_API_URL: 'https://api.najdimo.test',
		EXPO_PUBLIC_CAPTCHA: false,
	},
}));
const secure = (SecureStore as unknown as { data: Map<string, string> }).data;
const networkListeners = (Network as unknown as { listeners: Set<(state: object) => void> }).listeners;
const mockEnv = env as { EXPO_PUBLIC_CAPTCHA: boolean };

// The real store (device id test) subscribes the session-end wipe, whose offline modules are not under test here.
jest.mock('@/lib/offline/wipe', () => ({ wipeOnSessionEnd: () => () => {} }));
const mockSupabase = { session: null as { access_token: string } | null };
jest.mock('@/lib/supabase', () => ({
	supabase: {
		auth: {
			getSession: async () => ({ data: { session: mockSupabase.session } }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
		},
	},
}));
const mockSignIn = jest.fn();
jest.mock('@zivali/api/auth', () => ({
	...jest.requireActual('@zivali/api/auth'),
	signInAnonymously: (token?: string) => mockSignIn(token),
}));

// A fresh API client and store per test (the app's are module singletons), over a fake fetch that answers like apps/api.
type Handler = (request: MockRequest) => unknown;
const mockApi: { routes: Record<string, Handler>; calls: MockRequest[]; store?: ApiStore } = { routes: {}, calls: [] };
const fakeFetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
	const [path = ''] = String(input)
		.replace(/^https:\/\/[^/]+/, '')
		.split('?');
	const method = init.method ?? 'GET';
	const request: MockRequest = {
		method,
		path,
		params: {},
		query: {},
		headers: init.headers as Record<string, string>,
		body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
	};
	mockApi.calls.push(request);
	const handler = mockApi.routes[`${method} ${path}`];
	const result = handler ? await handler(request) : mockError('NOT_FOUND');
	return result instanceof Response ? result : new Response(JSON.stringify(result), { status: 200 });
}) as typeof fetch;
const mockClient = createApiClient({
	baseUrl: 'https://api.najdimo.test',
	getAccessToken: () => mockSupabase.session?.access_token,
	deviceId: 'install-id',
	locale: 'sl',
	fetch: fakeFetch,
});
jest.mock('@/lib/store', () => ({
	get apiClient() {
		return mockClient;
	},
	get store() {
		return mockApi.store;
	},
}));

const mockWebView: { props: Record<string, (event: unknown) => void> | null } = { props: null };
jest.mock('react-native-webview', () => {
	const { createElement } = jest.requireActual<typeof import('react')>('react');
	const { View } = jest.requireActual<typeof import('react-native')>('react-native');
	return {
		WebView: (props: Record<string, (event: unknown) => void>) => {
			mockWebView.props = props;
			return createElement(View, { testID: 'webview' });
		},
	};
});

const TOKEN = 'q7Vt-manage-token';
const DAY = 86_400_000;
const report = (patch: Partial<ReportOwnerView> = {}): ReportOwnerView => ({
	...ownerReport,
	last_owner_update_at: new Date().toISOString(),
	...patch,
});

function serve({
	claim = () => ({ report_id: ownerReport.id, short_code: ownerReport.short_code }),
	view = report(),
	unread = 0,
	threads = 0,
}: { claim?: Handler; view?: ReportOwnerView; unread?: number; threads?: number } = {}) {
	mockApi.routes = {
		'POST /v1/manage/claim': claim,
		[`GET /v1/reports/${ownerReport.short_code}`]: () => view,
		'GET /v1/conversations': () => ({
			items: Array.from({ length: threads }, (_, i) => ({
				id: `c${i}`,
				about_report: { short_code: ownerReport.short_code, type: 'found', species: 'dog', thumb_url: null },
				my_alias_key: 'finder',
				other_alias_key: 'owner',
				last_message_preview: null,
				unread: i === 0 ? unread : 0,
				status: 'open',
			})),
			next_cursor: null,
		}),
		'POST /v1/geo/reverse': () => ({
			place: {
				label: 'Bežigrad, Ljubljana',
				lat: 46.07,
				lng: 14.51,
				kind: 'district',
				municipality_slug: 'ljubljana',
			},
		}),
		[`POST /v1/reports/${ownerReport.short_code}/transitions`]: () => view,
	};
}

function Providers({ children }: { children: React.ReactNode }) {
	return (
		<Provider store={mockApi.store!}>
			<I18nProvider>
				{children}
				<CaptchaSheet />
				<PortalHost />
			</I18nProvider>
		</Provider>
	);
}

const openLink = async (url = `/m#${TOKEN}`) => {
	const result = renderRouter(
		{
			_layout: () => <Stack screenOptions={{ headerShown: false }} />,
			index: () => null,
			m: ManageScreen,
			'inbox/[id]': () => null,
			'r/[code]/edit': () => <Text>edit screen</Text>,
		},
		{ initialUrl: url, wrapper: Providers }
	);
	// The result is a promise with the router getters attached; awaiting it would drop them.
	await result;
	return { getPathname: result.getPathname, page: { getPathname: result.getPathname } };
};
const claimCalls = () => mockApi.calls.filter((call) => call.path === '/v1/manage/claim');
const transitions = () => mockApi.calls.filter((call) => call.path.endsWith('/transitions')).map((call) => call.body);
const fromPage = (message: object, url = 'https://najdimo.test/captcha?lang=sl') =>
	act(async () => mockWebView.props!.onMessage({ nativeEvent: { url, data: JSON.stringify(message) } }));
/** Renders the sheet host and starts a sign-in; `session` settles with the session or the error. */
const startSignIn = async () => {
	await render(<Providers>{null}</Providers>);
	let session: Promise<unknown> = Promise.resolve();
	await act(async () => {
		session = ensureSession().catch((error: unknown) => error);
	});
	// Wrapped: an async function returning the promise itself would wait for it.
	return { session };
};

jest.setTimeout(30_000);

beforeEach(() => {
	mockStorage.clear();
	mockStorage.set('locale', 'sl');
	mockApi.calls = [];
	mockApi.store = createApiStore(mockClient);
	mockSupabase.session = null;
	mockEnv.EXPO_PUBLIC_CAPTCHA = false;
	mockWebView.props = null;
	mockSignIn.mockReset().mockImplementation(async () => {
		mockSupabase.session = { access_token: 'anon-jwt' };
		return { session: mockSupabase.session };
	});
	serve();
});
afterEach(() => jest.useRealTimers());

test('the app API client sends one x-device-id per install on every request (C7)', async () => {
	const realFetch = global.fetch;
	global.fetch = jest.fn(fakeFetch);
	mockApi.routes['GET /v1/config/public'] = () => ({});
	type Store = typeof import('@/lib/store');
	const load = () => {
		let loaded!: Store;
		jest.isolateModules(() => {
			loaded = jest.requireActual<Store>('@/lib/store');
		});
		return loaded;
	};
	try {
		await load().apiClient.request('GET', '/v1/config/public');
		const id = secure.get('device_id');
		expect(id).toMatch(/^[0-9a-f-]{36}$/);
		// The next start (a fresh module load) keeps the same id.
		await load().apiClient.request('GET', '/v1/config/public');
		expect(mockApi.calls.map((call) => call.headers['x-device-id'])).toEqual([id, id]);
	} finally {
		global.fetch = realFetch;
	}
});

describe('anonymous session (C7)', () => {
	test('keeps an existing session: no captcha, no new user', async () => {
		mockSupabase.session = { access_token: 'user-jwt' };
		await expect(ensureSession()).resolves.toEqual({ access_token: 'user-jwt' });
		expect(mockSignIn).not.toHaveBeenCalled();
	});

	test('captcha off: signs in anonymously without a token; concurrent callers share one sign-in', async () => {
		await Promise.all([ensureSession(), ensureSession()]);
		expect(mockSignIn).toHaveBeenCalledTimes(1);
		expect(mockSignIn).toHaveBeenCalledWith(undefined);
		expect(mockWebView.props).toBeNull();
	});

	test('captcha on: the Turnstile token comes from the web /captcha page in a WebView', async () => {
		mockEnv.EXPO_PUBLIC_CAPTCHA = true;
		const { session } = await startSignIn();

		expect(mockWebView.props!.source).toEqual({ uri: 'https://najdimo.test/captcha?lang=sl' });
		// Invisible while Turnstile works on its own.
		expect(screen.getByTestId('captcha-sheet', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
		// Another origin cannot answer.
		await fromPage({ type: 'captcha', token: 'forged' }, 'https://evil.test/captcha');
		expect(mockSignIn).not.toHaveBeenCalled();

		await fromPage({ type: 'captcha', token: 'turnstile-ok' });
		await session;
		expect(mockSignIn).toHaveBeenCalledWith('turnstile-ok');
		expect(screen.queryByTestId('captcha-sheet', { includeHiddenElements: true })).toBeNull();
	});

	test('the WebView refuses other URLs and opens no windows or files', async () => {
		mockEnv.EXPO_PUBLIC_CAPTCHA = true;
		await startSignIn();
		const props = mockWebView.props as unknown as {
			onShouldStartLoadWithRequest: (request: { url: string }) => boolean;
		} & Record<string, unknown>;
		for (const url of [
			'https://najdimo.test/captcha?lang=sl',
			'https://challenges.cloudflare.com/cdn-cgi/challenge-platform/x',
			'about:blank',
		]) {
			expect(props.onShouldStartLoadWithRequest({ url })).toBe(true);
		}
		for (const url of ['https://evil.test/captcha', 'https://najdimo.test/other', 'file:///etc/passwd']) {
			expect(props.onShouldStartLoadWithRequest({ url })).toBe(false);
		}
		expect(props).toMatchObject({
			setSupportMultipleWindows: false,
			allowFileAccess: false,
			javaScriptCanOpenWindowsAutomatically: false,
		});
	});

	test('a sheet nobody answers fails with CAPTCHA_FAILED after 60 s', async () => {
		jest.useFakeTimers();
		mockEnv.EXPO_PUBLIC_CAPTCHA = true;
		const { session } = await startSignIn();
		await act(async () => void jest.advanceTimersByTime(60_000));
		expect(await session).toMatchObject({ code: 'CAPTCHA_FAILED' });
	});

	test('an answer from an older sheet does not resolve the newer request', async () => {
		mockEnv.EXPO_PUBLIC_CAPTCHA = true;
		const { session } = await startSignIn();
		answerCaptcha.token(-1, 'stale');
		answerCaptcha.fail(-1);
		await act(async () => {});
		expect(mockSignIn).not.toHaveBeenCalled();
		await fromPage({ type: 'captcha', token: 'turnstile-ok' });
		await session;
		expect(mockSignIn).toHaveBeenCalledWith('turnstile-ok');
	});

	test('captcha on, but off on the web (token null): signs in without a token', async () => {
		mockEnv.EXPO_PUBLIC_CAPTCHA = true;
		const { session } = await startSignIn();
		await fromPage({ type: 'captcha', token: null });
		await session;
		expect(mockSignIn).toHaveBeenCalledWith(undefined);
	});

	test('a page error fails with CAPTCHA_FAILED, so the caller keeps its draft and retries', async () => {
		mockEnv.EXPO_PUBLIC_CAPTCHA = true;
		const { session } = await startSignIn();
		await fromPage({ type: 'captcha_error' });
		expect(await session).toMatchObject({ code: 'CAPTCHA_FAILED' });
		expect(mockSignIn).not.toHaveBeenCalled();
	});

	test('a challenge that does not pass on its own shows the sheet; cancel fails with CAPTCHA_FAILED', async () => {
		jest.useFakeTimers();
		mockEnv.EXPO_PUBLIC_CAPTCHA = true;
		const { session } = await startSignIn();
		const sheet = () => screen.getByTestId('captcha-sheet', { includeHiddenElements: true });
		expect(sheet().props.pointerEvents).toBe('none');

		await act(async () => void jest.advanceTimersByTime(3000));
		expect(sheet().props.pointerEvents).toBe('auto');
		await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Prekliči' })));
		const error = await session;
		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).code).toBe('CAPTCHA_FAILED');
		expect(mockSignIn).not.toHaveBeenCalled();
	});
});

describe('manage link screen (P7)', () => {
	test('zivali://m#token signs in, claims with x-device-id, stores the token and shows the manage page', async () => {
		await openLink();

		expect(await screen.findByRole('heading', { name: 'Vaša prijava' })).toBeOnTheScreen();
		expect(mockSignIn).toHaveBeenCalledTimes(1);
		const [claim] = claimCalls();
		expect(claim.body).toEqual({ token: TOKEN });
		expect(claim.headers.Authorization).toBe('Bearer anon-jwt');
		expect(mockApi.calls.every((call) => call.headers['x-device-id'] === 'install-id')).toBe(true);
		expect(SecureStore.setItemAsync).toHaveBeenCalledWith(`manage_token.${ownerReport.id}`, TOKEN);
		expect(JSON.parse(secure.get('manage_tokens')!)).toEqual([ownerReport.id]);

		expect(screen.getByText('Najdena')).toBeOnTheScreen();
		expect(screen.getByText('Pes')).toBeOnTheScreen();
		expect(screen.getByText('pri meni')).toBeOnTheScreen();
		expect(await screen.findByText('Bežigrad, Ljubljana')).toBeOnTheScreen();
		expect(screen.getByText('Ta stran je zasebna. Povezave ne delite z neznanci.')).toBeOnTheScreen();
		// No messages yet: "Sporočila" is a text row and the page has no primary; no ad on a protected flow.
		expect(screen.getByRole('button', { name: 'Sporočila' })).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: 'Odpri sporočila' })).toBeNull();
		expect(screen.queryByTestId(/ad-slot/i)).toBeNull();
	});

	test.each([
		['an unknown token', mockError('NOT_FOUND')],
		['a closed report beyond reopen', mockError('GONE')],
	])('%s shows the link error', async (_, response) => {
		serve({ claim: () => response });
		await openLink();
		expect(await screen.findByRole('heading', { name: 'Ta povezava ne deluje več' })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: 'Na zemljevid' })).toBeOnTheScreen();
	});

	test('a link without a token shows the link error and claims nothing', async () => {
		await openLink('/m');
		expect(await screen.findByRole('heading', { name: 'Ta povezava ne deluje več' })).toBeOnTheScreen();
		expect(claimCalls()).toHaveLength(0);
	});

	test('offline: a calm note, then retries every 60 s and as soon as the network is back', async () => {
		let offline = true;
		serve({
			claim: () => {
				if (offline) throw new TypeError('Network request failed');
				return { report_id: ownerReport.id, short_code: ownerReport.short_code };
			},
		});
		await openLink();
		expect(await screen.findByRole('heading', { name: 'Ni povezave z internetom' })).toBeOnTheScreen();
		expect(claimCalls()).toHaveLength(1);

		await act(async () => jest.advanceTimersByTime(60_000));
		await waitFor(() => expect(claimCalls()).toHaveLength(2));
		expect(await screen.findByRole('heading', { name: 'Ni povezave z internetom' })).toBeOnTheScreen();

		offline = false;
		await act(async () => {
			for (const listener of networkListeners) listener({ isConnected: true, isInternetReachable: true });
		});
		expect(await screen.findByRole('heading', { name: 'Vaša prijava' })).toBeOnTheScreen();
		expect(claimCalls()).toHaveLength(3);
	});

	test('rate limited: says so, without a retry loop', async () => {
		serve({ claim: () => mockError('RATE_LIMITED') });
		await openLink();
		expect(
			await screen.findByText('V kratkem času je bilo poslanih več zahtev. Poskusite znova malo pozneje.')
		).toBeOnTheScreen();
	});

	test('messages: the unread count and each conversation, opened right here (no account inbox)', async () => {
		serve({ threads: 2, unread: 2 });
		const page = await openLink();
		expect(await screen.findByText('2 neprebrani sporočili')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: 'Najdena žival' })).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: 'Sporočila' })).toBeNull();

		await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Najdena žival, neprebrano' })));
		await waitFor(() => expect(page.getPathname()).toBe('/inbox/c0'));
	});

	test('from day 25 the expiry note offers 30 more days (extend)', async () => {
		serve({ view: report({ last_owner_update_at: new Date(Date.now() - 26 * DAY).toISOString() }) });
		await openLink();
		expect(
			await screen.findByText(
				'Prijava bo potekla čez 4 dni. Če je žival še pri vas ali jo še vedno vidite, prijavo podaljšajte.'
			)
		).toBeOnTheScreen();

		await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Podaljšaj za 30 dni' })));
		await waitFor(() => expect(transitions()).toEqual([{ action: 'extend' }]));
	});

	test('"Uredi" opens the edit screen for an open report, and is gone once closed (TASK-17.8)', async () => {
		const { page } = await openLink();
		await act(async () => fireEvent.press(await screen.findByRole('button', { name: 'Uredi' })));
		expect(await screen.findByText('edit screen')).toBeOnTheScreen();
		expect(page.getPathname()).toBe(`/r/${report().short_code}/edit`);
	});

	test('a closed report has no "Uredi"', async () => {
		serve({ view: report({ status: 'closed', closed_at: new Date(Date.now() - 2 * DAY).toISOString() }) });
		await openLink();
		await screen.findByRole('button', { name: 'Ponovno odpri' });
		expect(screen.queryByRole('button', { name: 'Uredi' })).toBeNull();
	});

	test('close report from the action rows', async () => {
		await openLink();
		await act(async () => fireEvent.press(await screen.findByRole('button', { name: 'Zaključi prijavo' })));
		await waitFor(() => expect(transitions()).toEqual([{ action: 'close', reason: 'other' }]));
	});

	test('"Žival je spet doma" asks first (P14 §5), then marks it reunited and thanks the finder', async () => {
		await openLink();
		await act(async () => fireEvent.press(await screen.findByRole('button', { name: 'Žival je spet doma' })));
		expect(await screen.findByRole('heading', { name: 'Je žival spet doma?' })).toBeOnTheScreen();
		expect(transitions()).toEqual([]);

		await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Da, žival je doma' })));
		expect(await screen.findByRole('heading', { name: 'Hvala, ker ste pomagali' })).toBeOnTheScreen();
		expect(transitions()).toEqual([{ action: 'mark_reunited' }]);
	});

	test('marking returned fires `reunited` (species, region, municipality) with consent, only after it worked', async () => {
		initAnalytics({ provider: 'mock', storage: { get: () => null, set: () => undefined } });
		resetMockEvents();
		setConsent({ analytics: true });
		await openLink();
		await act(async () => fireEvent.press(await screen.findByRole('button', { name: 'Žival je spet doma' })));
		await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Da, žival je doma' })));
		expect(await screen.findByRole('heading', { name: 'Hvala, ker ste pomagali' })).toBeOnTheScreen();
		expect(getMockEvents()).toEqual([
			{ name: 'reunited', params: { species: 'dog', region: 'osrednjeslovenska', municipality: 'ljubljana' } },
		]);
	});

	test('closed within 7 days: read-only with Reopen, no close action', async () => {
		serve({
			view: report({ status: 'closed', closed_at: new Date(Date.now() - 2 * DAY).toISOString() }),
		});
		await openLink();
		expect(await screen.findByText('Prijava je zaključena. V 7 dneh jo lahko ponovno odprete.')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: 'Ponovno odpri' })).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: 'Zaključi prijavo' })).toBeNull();
	});

	test('held by moderation: the under-review note', async () => {
		serve({ view: report({ moderation_state: 'held' }) });
		await openLink();
		expect(await screen.findByText('Prijava je v pregledu')).toBeOnTheScreen();
		expect(screen.getByText('Prijavo pregleduje naša ekipa. Do takrat ni javno vidna.')).toBeOnTheScreen();
	});
});
