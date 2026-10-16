import { toAppPath, toTargetPath } from '@/lib/deep-link';
import { registerIfGranted, requestPushPermission, unregisterPush } from '@/lib/push';

jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_PUSH_PROVIDER: 'mock' } }));

const mockRequestPermissions = jest.fn();
const mockGetPermissions = jest.fn();
const mockGetToken = jest.fn();
jest.mock('expo-notifications', () => ({
	setNotificationHandler: jest.fn(),
	requestPermissionsAsync: () => mockRequestPermissions(),
	getPermissionsAsync: () => mockGetPermissions(),
	getExpoPushTokenAsync: (options: unknown) => mockGetToken(options),
}));

type Config = {
	ios: { associatedDomains?: string[] };
	android: { intentFilters?: Record<string, unknown>[] };
	plugins: unknown[];
};
const loadConfig = (appUrl?: string) => {
	const before = process.env.EXPO_PUBLIC_APP_URL;
	if (appUrl) process.env.EXPO_PUBLIC_APP_URL = appUrl;
	else delete process.env.EXPO_PUBLIC_APP_URL;
	try {
		let config!: Config;
		jest.isolateModules(() => {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			config = (require('../app.config') as { default: Config }).default;
		});
		return config;
	} finally {
		if (before === undefined) delete process.env.EXPO_PUBLIC_APP_URL;
		else process.env.EXPO_PUBLIC_APP_URL = before;
	}
};

describe('deep link paths', () => {
	test.each([
		['https://najdimo.si/r/Hk3vT9qP', '/r/Hk3vT9qP'],
		['https://najdimo.si/en/r/Hk3vT9qP', '/r/Hk3vT9qP'],
		['https://staging.najdimo.si/en/m#token', '/m#token'],
		['zivali://m#token', '/m#token'],
		['https://najdimo.si/payments/return?x=1', '/payments/return?x=1'],
		['/en/r/abc', '/r/abc'],
		['/r/abc', '/r/abc'],
		['/energy', '/'],
		['zivali://settings/x', '/'],
		['/dev/kit', '/'],
		['zivali://auth/callback?type=recovery&code=x', '/auth/callback?type=recovery&code=x'],
		['https://najdimo.si/auth/callback?code=x', '/auth/callback?code=x'],
		['zivali://auth/new-password', '/'],
		['https://najdimo.si/auth/sign-in', '/'],
		['https://najdimo.si/en/r/ABC', '/r/ABC'],
		['https://najdimo.si/m?t=1', '/m?t=1'],
		['https://najdimo.si', '/'],
		// Pages under a listing (TASK-12.6): the email buttons (API webUrl) open their screens, never the map.
		['https://najdimo.si/r/Hk3vT9qP/ujemanja', '/r/Hk3vT9qP/matches'],
		['https://najdimo.si/en/r/Hk3vT9qP/matches', '/r/Hk3vT9qP/matches'],
		['https://najdimo.si/r/Hk3vT9qP/spet-doma', '/r/Hk3vT9qP/reunited'],
		['https://najdimo.si/en/r/Hk3vT9qP/reunited?x=1', '/r/Hk3vT9qP/reunited?x=1'],
		['https://najdimo.si/r/Hk3vT9qP/ujemanja/', '/r/Hk3vT9qP/matches'],
		['zivali://r/Hk3vT9qP/matches', '/r/Hk3vT9qP/matches'],
		// Anything else under a listing opens the listing.
		['https://najdimo.si/r/Hk3vT9qP/poster.pdf?lang=sl', '/r/Hk3vT9qP?lang=sl'],
		['https://najdimo.si/r/Hk3vT9qP/opengraph-image', '/r/Hk3vT9qP'],
		['https://najdimo.si/r/Hk3vT9qP/', '/r/Hk3vT9qP'],
		['zivali://inbox/5e1d0a2b-0000-4000-8000-000000000001', '/inbox/5e1d0a2b-0000-4000-8000-000000000001'],
		['/r/../dev/kit', '/'],
		['/r/', '/'],
		['/inbox/a/b', '/'],
	])('%s -> %s', (url, path) => {
		expect(toAppPath(url)).toBe(path);
	});
});

describe('notification targets (push data.url, C10 deep links)', () => {
	test.each([
		['/r/Pq7xK2mN/matches', '/r/Pq7xK2mN/matches'],
		['/inbox/5e1d0a2b-0000-4000-8000-000000000001', '/inbox/5e1d0a2b-0000-4000-8000-000000000001'],
		['/r/Hk3vT9qP', '/r/Hk3vT9qP'],
		// The local proximity alert (TASK-87.1).
		['zivali://r/Hk3vT9qP', '/r/Hk3vT9qP'],
		['/my-reports?r=Hk3vT9qP&action=keep', '/r/Hk3vT9qP'],
		['/my-reports', '/inbox'],
		['/account/payments', '/settings/payments'],
		['https://najdimo.si/en/r/Hk3vT9qP/matches', '/r/Hk3vT9qP/matches'],
		['/settings/account', '/inbox'],
		['/r/../dev/kit', '/inbox'],
		['/auth/new-password', '/inbox'],
		['javascript:alert(1)', '/inbox'],
	])('%s -> %s', (url, path) => {
		expect(toTargetPath(url)).toBe(path);
	});
});

describe('app.config links', () => {
	test('follow the host of APP_URL, https only', () => {
		const config = loadConfig('https://staging.najdimo.si');
		expect(config.ios.associatedDomains).toEqual(['applinks:staging.najdimo.si']);
		const [filter] = config.android.intentFilters!;
		expect(filter).toMatchObject({ action: 'VIEW', autoVerify: true });
		expect(filter.data).toEqual([
			{ scheme: 'https', host: 'staging.najdimo.si', pathPattern: '/r/........' },
			{ scheme: 'https', host: 'staging.najdimo.si', pathPattern: '/r/......../ujemanja' },
			{ scheme: 'https', host: 'staging.najdimo.si', pathPattern: '/r/......../spet-doma' },
			{ scheme: 'https', host: 'staging.najdimo.si', pathPattern: '/en/r/........' },
			{ scheme: 'https', host: 'staging.najdimo.si', pathPattern: '/en/r/......../matches' },
			{ scheme: 'https', host: 'staging.najdimo.si', pathPattern: '/en/r/......../reunited' },
			{ scheme: 'https', host: 'staging.najdimo.si', path: '/m' },
			{ scheme: 'https', host: 'staging.najdimo.si', path: '/en/m' },
			{ scheme: 'https', host: 'staging.najdimo.si', pathPrefix: '/payments/' },
		]);
	});

	test('Android claims listing pages only: the poster PDF and OG image stay in the browser (TASK-12.6)', () => {
		const [filter] = loadConfig('https://najdimo.si').android.intentFilters!;
		// Android pathPattern (simple glob, no `*` used here): each `.` is any one character; the whole path must match.
		const claimed = (path: string) =>
			(filter.data as { path?: string; pathPrefix?: string; pathPattern?: string }[]).some(
				(d) =>
					d.path === path ||
					(d.pathPrefix !== undefined && path.startsWith(d.pathPrefix)) ||
					(d.pathPattern !== undefined && new RegExp(`^${d.pathPattern.replace(/\./g, '[^]')}$`).test(path))
			);
		for (const path of [
			'/r/Hk3vT9qP',
			'/r/Hk3vT9qP/ujemanja',
			'/r/Hk3vT9qP/spet-doma',
			'/en/r/Hk3vT9qP',
			'/en/r/Hk3vT9qP/matches',
			'/en/r/Hk3vT9qP/reunited',
		])
			expect([path, claimed(path)]).toEqual([path, true]);
		for (const path of ['/r/Hk3vT9qP/poster.pdf', '/r/Hk3vT9qP/opengraph-image', '/r/Hk3vT9qP/ujemanja/x'])
			expect([path, claimed(path)]).toEqual([path, false]);
	});

	test('no generated _sitemap screen (TASK-12.7)', () => {
		expect(loadConfig().plugins).toContainEqual(['expo-router', { sitemap: false }]);
	});

	test('no host (local build): no web links, no exp:// redirect', () => {
		const config = loadConfig();
		expect(config.ios.associatedDomains).toBeUndefined();
		expect(config.android.intentFilters).toBeUndefined();
	});
});

describe('push token registration', () => {
	const api = (register = jest.fn().mockResolvedValue(undefined)) => ({
		register,
		unregister: jest.fn().mockResolvedValue(undefined),
	});

	beforeEach(async () => {
		mockRequestPermissions.mockReset();
		mockGetPermissions.mockReset();
		mockGetToken.mockReset();
		await unregisterPush();
	});

	test('mock provider: registers the placeholder token after permission, without asking Expo', async () => {
		mockRequestPermissions.mockResolvedValue({ granted: true });
		const register = jest.fn().mockResolvedValue(undefined);
		await expect(requestPushPermission(api(register), 'mock')).resolves.toBe(true);
		expect(register).toHaveBeenCalledWith({
			token: expect.stringMatching(/^ExponentPushToken\[mock-/),
			platform: 'ios',
		});
		expect(mockGetToken).not.toHaveBeenCalled();
	});

	test('expo provider: registers the Expo push token', async () => {
		mockRequestPermissions.mockResolvedValue({ granted: true });
		mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
		const register = jest.fn().mockResolvedValue(undefined);
		await requestPushPermission(api(register), 'expo');
		expect(register).toHaveBeenCalledWith({ token: 'ExponentPushToken[abc]', platform: 'ios' });
	});

	test('denied: nothing registered', async () => {
		mockRequestPermissions.mockResolvedValue({ granted: false });
		const register = jest.fn();
		await expect(requestPushPermission(api(register), 'mock')).resolves.toBe(false);
		expect(register).not.toHaveBeenCalled();
	});

	test('a failing registration still reports the permission as granted', async () => {
		mockRequestPermissions.mockResolvedValue({ granted: true });
		await expect(
			requestPushPermission(api(jest.fn().mockRejectedValue(new Error('offline'))), 'mock')
		).resolves.toBe(true);
	});

	test('sign-in: registers when already granted and never prompts; not granted registers nothing', async () => {
		mockGetPermissions.mockResolvedValue({ granted: true });
		const granted = api();
		await registerIfGranted(granted, 'mock');
		expect(granted.register).toHaveBeenCalledWith({ token: 'ExponentPushToken[mock-ios]', platform: 'ios' });

		mockGetPermissions.mockResolvedValue({ granted: false });
		const denied = api();
		await registerIfGranted(denied, 'mock');
		expect(denied.register).not.toHaveBeenCalled();
		expect(mockRequestPermissions).not.toHaveBeenCalled();
	});

	test('sign-out deletes the registered token once; a failing delete does not throw', async () => {
		mockGetPermissions.mockResolvedValue({ granted: true });
		const registered = api();
		registered.unregister.mockRejectedValueOnce(new Error('offline'));
		await registerIfGranted(registered, 'mock');

		await expect(unregisterPush()).resolves.toBeUndefined();
		expect(registered.unregister).toHaveBeenCalledWith({ token: 'ExponentPushToken[mock-ios]' });
		await unregisterPush();
		expect(registered.unregister).toHaveBeenCalledTimes(1);
	});

	test('a token kept after a failed registration is still deleted on sign-out', async () => {
		mockRequestPermissions.mockResolvedValue({ granted: true });
		const offline = api(jest.fn().mockRejectedValue(new Error('offline')));
		await requestPushPermission(offline, 'mock');
		await unregisterPush();
		expect(offline.unregister).toHaveBeenCalledWith({ token: 'ExponentPushToken[mock-ios]' });
	});
});
