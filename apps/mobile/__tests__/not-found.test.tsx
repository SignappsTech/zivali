// Loads the jest.setup Reanimated mock before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { fireEvent, screen } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import NotFound from '@/app/+not-found';
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

// The app's top of the tree as on main: the tabs and a listing exist, a conversation screen does not (TASK-21.4).
const routes = {
	_layout: () => <Stack screenOptions={{ headerShown: false }} />,
	'+not-found': NotFound,
	'(tabs)/index': () => null,
	'(tabs)/inbox': () => null,
	'r/[code]/index': () => null,
};

// renderRouter's result is a promise with the router getters attached; awaiting it would drop them.
const open = async (initialUrl: string) => {
	const result = renderRouter(routes, {
		initialUrl,
		wrapper: ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>,
	});
	await result;
	return { getPathname: result.getPathname };
};

beforeEach(() => mockStorage.set('locale', 'sl'));

describe('route without a screen (P2 invalid link, TASK-12.7)', () => {
	test.each(['/inbox/x', '/no/such/screen', '/report/found?type=sighted'])(
		'%s shows the localised page, not the Unmatched view',
		async (url) => {
			await open(url);
			expect(screen.getByRole('heading', { name: sl.deeplink.invalid_title })).toBeOnTheScreen();
			expect(screen.getByText(sl.deeplink.invalid_body)).toBeOnTheScreen();
			expect(screen.queryByTestId('expo-router-unmatched')).toBeNull();
			expect(screen.queryByText(/sitemap/i)).toBeNull();
		}
	);

	test('"Odpri zemljevid" opens the map', async () => {
		const result = await open('/inbox/x');
		await fireEvent.press(screen.getByRole('button', { name: sl.deeplink.invalid_action }));
		expect(result.getPathname()).toBe('/');
	});

	test('back with no history opens the map too', async () => {
		const result = await open('/no/such/screen');
		await fireEvent.press(screen.getByRole('button', { name: sl.common.back }));
		expect(result.getPathname()).toBe('/');
	});

	test('in English', async () => {
		mockStorage.set('locale', 'en');
		await open('/no/such/screen');
		expect(screen.getByRole('heading', { name: en.deeplink.invalid_title })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: en.deeplink.invalid_action })).toBeOnTheScreen();
	});
});
