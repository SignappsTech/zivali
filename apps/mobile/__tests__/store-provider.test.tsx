import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { Text as RNText } from 'react-native';
import { useTranslations } from 'use-intl';

import { configureAuth } from '@zivali/api/auth';
import { me } from '@zivali/api/__fixtures__/me';
import { createMockApi } from '@zivali/api/mock';
import { api, createApiStore } from '@zivali/api/rtk';
import { NavLabel, Text } from '@/lib/font-scale';
import { ProfileI18n } from '@/lib/profile-i18n';

jest.mock('expo-sqlite/localStorage/install', () => {
	const data = new Map<string, string>();
	globalThis.localStorage = {
		getItem: (name: string) => data.get(name) ?? null,
		setItem: (name: string, value: string) => void data.set(name, value),
		removeItem: (name: string) => void data.delete(name),
	} as Storage;
	return {};
});

jest.useFakeTimers();

afterEach(() => {
	// Stop RTK Query's cache timers so Jest can tear down cleanly.
	for (const s of stores) s.dispatch(api.util.resetApiState());
	stores.length = 0;
});
const stores: ReturnType<typeof createApiStore>[] = [];

function Label() {
	return <RNText>{useTranslations('nav')('home_label')}</RNText>;
}

test('a signed-in profile locale reaches I18nProvider through a Redux hook against the mock API', async () => {
	let emit: (event: string, session: unknown) => void = () => {};
	const supabase = {
		auth: {
			onAuthStateChange: (cb: typeof emit) => {
				emit = cb;
				return { data: { subscription: { unsubscribe: () => {} } } };
			},
		},
	};
	const store = createApiStore(createMockApi({ 'GET /v1/me': { ...me, locale: 'en' } }));
	stores.push(store);
	configureAuth(supabase as never, store);

	await render(
		<Provider store={store}>
			<ProfileI18n>
				<Label />
			</ProfileI18n>
		</Provider>
	);
	await act(async () => emit('INITIAL_SESSION', { user: { id: me.id } }));

	await waitFor(() => expect(screen.getByText('Najdimo, home')).toBeOnTheScreen());
});

test('text scaling is capped: 2x for text, 1.3x for nav labels', async () => {
	await render(
		<>
			<Text>body</Text>
			<NavLabel>nav</NavLabel>
		</>
	);

	expect(screen.getByText('body').props.maxFontSizeMultiplier).toBe(2);
	expect(screen.getByText('nav').props.maxFontSizeMultiplier).toBe(1.3);
});
