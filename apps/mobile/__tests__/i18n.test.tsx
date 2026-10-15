import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { useTranslations } from 'use-intl';

import { I18nProvider, type ProfileLocale, useLocaleSwitch } from '@/lib/i18n';

const mockStorage = new Map<string, string>();
jest.mock('expo-sqlite/localStorage/install', () => {
	globalThis.localStorage = {
		getItem: (name: string) => mockStorage.get(name) ?? null,
		setItem: (name: string, value: string) => void mockStorage.set(name, value),
		removeItem: (name: string) => void mockStorage.delete(name),
	} as Storage;
	return {};
});

const SL = 'Najdimo, na začetno stran';
const EN = 'Najdimo, home';

// A translated label that switches to the other language when pressed.
function Toggle() {
	const { locale, setLocale } = useLocaleSwitch();
	const t = useTranslations('nav');
	return (
		<Pressable onPress={() => void setLocale(locale === 'sl' ? 'en' : 'sl')}>
			<Text>{t('home_label')}</Text>
		</Pressable>
	);
}

const ui = (profile?: ProfileLocale | null) => (
	<I18nProvider profile={profile}>
		<Toggle />
	</I18nProvider>
);

const device = (locale: string) =>
	jest
		.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
		.mockReturnValue({ locale } as Intl.ResolvedDateTimeFormatOptions);

beforeEach(() => mockStorage.clear());
afterEach(() => jest.restoreAllMocks());

test.each([
	['sl-SI', SL],
	['de-AT', SL],
	['en-US', EN],
	['en', EN],
])('with no stored choice or profile, a %s device gets "%s"', async (locale, text) => {
	device(locale);
	await render(ui());

	expect(screen.getByText(text)).toBeOnTheScreen();
});

test('the stored choice beats the device language', async () => {
	device('sl-SI');
	mockStorage.set('locale', 'en');
	await render(ui());

	expect(screen.getByText(EN)).toBeOnTheScreen();
});

test('the profile locale beats the stored choice and becomes the stored choice', async () => {
	device('en-GB');
	mockStorage.set('locale', 'en');
	await render(ui({ locale: 'sl', save: jest.fn() }));

	expect(screen.getByText(SL)).toBeOnTheScreen();
	expect(mockStorage.get('locale')).toBe('sl');
});

test('signed out, setLocale() switches the UI at once and keeps the choice on the device', async () => {
	device('sl-SI');
	await render(ui(null));
	await fireEvent.press(screen.getByText(SL));

	expect(screen.getByText(EN)).toBeOnTheScreen();
	expect(mockStorage.get('locale')).toBe('en');
});

test('signed in, setLocale() switches before the profile save finishes and saves the locale', async () => {
	device('sl-SI');
	let finish = () => {};
	const save = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
	const profile: ProfileLocale = { locale: 'sl', save };
	const view = await render(ui(profile));

	await fireEvent.press(screen.getByText(SL));
	expect(screen.getByText(EN)).toBeOnTheScreen();
	expect(save).toHaveBeenCalledWith('en');

	// The profile still says sl while the save is in flight: the local switch stays.
	await view.rerender(ui({ ...profile }));
	expect(screen.getByText(EN)).toBeOnTheScreen();

	// Saved: the profile now says en too.
	await act(async () => finish());
	await view.rerender(ui({ ...profile, locale: 'en' }));
	expect(screen.getByText(EN)).toBeOnTheScreen();
	expect(mockStorage.get('locale')).toBe('en');
});

test('after sign-in the profile locale wins over a choice made while signed out', async () => {
	device('sl-SI');
	const view = await render(ui(null));
	await fireEvent.press(screen.getByText(SL));
	expect(screen.getByText(EN)).toBeOnTheScreen();

	await view.rerender(ui({ locale: 'sl', save: jest.fn() }));

	expect(screen.getByText(SL)).toBeOnTheScreen();
	expect(mockStorage.get('locale')).toBe('sl');
});
