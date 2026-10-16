// Loads the jest.setup Reanimated mock before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { screen } from '@testing-library/react-native';
import { Slot, useLocalSearchParams } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { redirectSystemPath } from '@/app/+native-intent';

// TASK-12.4 (QA, C15 §Deep links): a link from outside goes through +native-intent and always lands on a screen,
// also when it is malformed; the stand-ins mirror the app routes it may open.
jest.mock('@/lib/checkout', () => ({ checkoutOpen: () => false }));

function Code() {
	const { code } = useLocalSearchParams<{ code: string }>();
	return <Text>{`report:${code}`}</Text>;
}

const routes = {
	_layout: () => <Slot />,
	'(tabs)/_layout': () => <Slot />,
	'(tabs)/index': () => <Text>map</Text>,
	'(tabs)/inbox': () => <Text>inbox</Text>,
	'r/[code]/index': Code,
	m: () => <Text>manage</Text>,
	'payments/return': () => <Text>payments-return</Text>,
	'auth/callback': () => <Text>auth-callback</Text>,
	'dev/kit': () => <Text>dev-kit</Text>,
	'settings/account': () => <Text>settings-account</Text>,
};

const land = async (url: string) => {
	const path = redirectSystemPath({ path: url, initial: true });
	const result = renderRouter(routes, { initialUrl: path });
	await result;
	expect(screen.queryByTestId('expo-router-unmatched')).toBeNull();
	return result.getPathname();
};

jest.setTimeout(30_000);

describe('a link from outside lands on a screen', () => {
	test.each([
		['https://najdimo.si/r/Hk3vT9qP', 'report:Hk3vT9qP'],
		['https://najdimo.si/en/r/Hk3vT9qP?utm_source=poster', 'report:Hk3vT9qP'],
		['zivali://r/Hk3vT9qP', 'report:Hk3vT9qP'],
		['https://najdimo.si/m#token', 'manage'],
		['https://najdimo.si/payments/return?canceled=1', 'payments-return'],
		['zivali://auth/callback?code=x', 'auth-callback'],
	])('%s opens its screen', async (url, text) => {
		await land(url);
		expect(screen.getByText(text)).toBeOnTheScreen();
	});

	test.each([
		'https://najdimo.si/dev/kit',
		'zivali://settings/account',
		'https://najdimo.si/r/',
		'https://najdimo.si/%',
		'zivali://',
		'',
		'javascript:alert(1)',
	])('%j is not allowlisted and opens the map', async (url) => {
		expect(await land(url)).toBe('/');
		expect(screen.getByText('map')).toBeOnTheScreen();
	});

	test.each([
		['https://najdimo.si/r/%E0%A4%A', /^report:/],
		['zivali://r/a%20b', 'report:a b'],
		['https://najdimo.si/r/..', /^(report:|map$)/],
		['https://najdimo.si/m#%zz', 'manage'],
	])('malformed %s renders without throwing', async (url, text) => {
		await land(url);
		expect(screen.getByText(text)).toBeOnTheScreen();
	});

	test('a 4000-character code renders without throwing', async () => {
		await land(`https://najdimo.si/r/${'x'.repeat(4000)}`);
		expect(screen.getByText(/^report:x{4000}$/)).toBeOnTheScreen();
	});
});
