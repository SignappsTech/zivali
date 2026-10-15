import { toAppPath } from '@/lib/deep-link';
import { requestPushPermission } from '@/lib/push';

jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_PUSH_PROVIDER: 'mock' } }));

const mockRequestPermissions = jest.fn();
const mockGetToken = jest.fn();
jest.mock('expo-notifications', () => ({
	requestPermissionsAsync: () => mockRequestPermissions(),
	getExpoPushTokenAsync: (options: unknown) => mockGetToken(options),
}));

type Config = { ios: { associatedDomains?: string[] }; android: { intentFilters?: Record<string, unknown>[] } };
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
		['https://najdimo.si/payments/return?x=1', '/payments/return?x=1'],
		['/en/r/abc', '/r/abc'],
		['/r/abc', '/r/abc'],
		['/energy', '/'],
		['zivali://settings/x', '/'],
		['/dev/kit', '/'],
		['https://najdimo.si/en/r/ABC', '/r/ABC'],
		['https://najdimo.si/m?t=1', '/m?t=1'],
		['https://najdimo.si', '/'],
	])('%s -> %s', (url, path) => {
		expect(toAppPath(url)).toBe(path);
	});
});

describe('app.config links', () => {
	test('follow the host of APP_URL, https only', () => {
		const config = loadConfig('https://staging.najdimo.si');
		expect(config.ios.associatedDomains).toEqual(['applinks:staging.najdimo.si']);
		const [filter] = config.android.intentFilters!;
		expect(filter).toMatchObject({ action: 'VIEW', autoVerify: true });
		expect(filter.data).toEqual([
			{ scheme: 'https', host: 'staging.najdimo.si', pathPrefix: '/r/' },
			{ scheme: 'https', host: 'staging.najdimo.si', pathPrefix: '/en/r/' },
			{ scheme: 'https', host: 'staging.najdimo.si', path: '/m' },
			{ scheme: 'https', host: 'staging.najdimo.si', path: '/en/m' },
			{ scheme: 'https', host: 'staging.najdimo.si', pathPrefix: '/payments/' },
		]);
	});

	test('no host (local build): no web links, no exp:// redirect', () => {
		const config = loadConfig();
		expect(config.ios.associatedDomains).toBeUndefined();
		expect(config.android.intentFilters).toBeUndefined();
	});
});

describe('push token registration', () => {
	beforeEach(() => {
		mockRequestPermissions.mockReset();
		mockGetToken.mockReset();
	});

	test('mock provider: registers the placeholder token after permission, without asking Expo', async () => {
		mockRequestPermissions.mockResolvedValue({ granted: true });
		const register = jest.fn().mockResolvedValue(undefined);
		await expect(requestPushPermission(register, 'mock')).resolves.toBe(true);
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
		await requestPushPermission(register, 'expo');
		expect(register).toHaveBeenCalledWith({ token: 'ExponentPushToken[abc]', platform: 'ios' });
	});

	test('denied: nothing registered', async () => {
		mockRequestPermissions.mockResolvedValue({ granted: false });
		const register = jest.fn();
		await expect(requestPushPermission(register, 'mock')).resolves.toBe(false);
		expect(register).not.toHaveBeenCalled();
	});

	test('a failing registration still reports the permission as granted', async () => {
		mockRequestPermissions.mockResolvedValue({ granted: true });
		await expect(requestPushPermission(jest.fn().mockRejectedValue(new Error('offline')), 'mock')).resolves.toBe(
			true
		);
	});
});
