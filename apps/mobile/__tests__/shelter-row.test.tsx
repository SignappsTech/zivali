import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { Linking } from 'react-native';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import {
	responsibleConfirmed,
	responsibleLikely,
	responsibleOutside,
	responsibleUnconfirmed,
} from '@zivali/api/__fixtures__/directory';
import { createMockApi } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import { type Kind, ShelterRow } from '@/components/shelter/shelter-row';
import { getCachedShelter } from '@/lib/offline/sync';

const mockNet = { state: { isConnected: true, isInternetReachable: true } };
jest.mock('expo-network', () => ({ useNetworkState: () => mockNet.state }));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test' } }));
jest.mock('@/lib/offline/sync', () => ({ getCachedShelter: jest.fn(async () => null), lastSyncAt: jest.fn() }));

const ts = sl.shelter_row;
const point = { lat: 46.0512, lng: 14.5061 };

async function show(answer: object, kind: Kind = 'found') {
	const store = createApiStore(createMockApi({ 'GET /v1/shelters/responsible': answer }));
	await render(
		<Provider store={store}>
			<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				<ShelterRow point={point} kind={kind} />
			</IntlProvider>
		</Provider>
	);
}

beforeEach(() => {
	mockNet.state = { isConnected: true, isInternetReachable: true };
	jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

test('confirmed, found: the sentence, the shelter, its number, Pokliči (tel:) and its page; the chip line', async () => {
	await show(responsibleConfirmed);
	expect(
		await screen.findByText(`${ts.found_body.replace('{municipality}', 'Ljubljana')} ${ts.not_replace}`)
	).toBeOnTheScreen();
	expect(screen.getByText('01 234 56 78')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: 'Pokliči Zavetišče Ljubljana' }));
	expect(Linking.openURL).toHaveBeenCalledWith('tel:+38612345678');
	await fireEvent.press(screen.getByRole('button', { name: ts.details_link }));
	expect(Linking.openURL).toHaveBeenCalledWith('https://najdimo.test/zavetisca/zavetisce-ljubljana');
	expect(screen.getByText(ts.chip_line)).toBeOnTheScreen();
});

test('likely, sighted: "Morda pristojno zavetišče" and "Ni potrjeno", the softer sentence, no chip line', async () => {
	await show(responsibleLikely, 'sighted');
	expect(await screen.findByText(ts.sighted_body.replace('{municipality}', 'Kočevje'))).toBeOnTheScreen();
	expect(screen.getByText(ts.suggested_label)).toBeOnTheScreen();
	expect(screen.getByText(ts.unconfirmed_note)).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: 'Pokliči Zavetišče Ljubljana' })).toBeOnTheScreen();
	expect(screen.queryByText(ts.not_replace, { exact: false })).toBeNull();
	expect(screen.queryByText(ts.chip_line)).toBeNull();
});

test('lost: the owner sentence with "does not replace", no chip line', async () => {
	await show(responsibleConfirmed, 'lost');
	expect(
		await screen.findByText(`${ts.lost_body.replace('{municipality}', 'Ljubljana')} ${ts.not_replace}`)
	).toBeOnTheScreen();
	expect(screen.queryByText(ts.chip_line)).toBeNull();
});

test('unconfirmed: the two nearest by name, without a number, and the directory', async () => {
	await show(responsibleUnconfirmed);
	expect(await screen.findByText(ts.nearest_label)).toBeOnTheScreen();
	expect(screen.getByText('Zavetišče Kočevje')).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: /^Pokliči/ })).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: ts.directory_link }));
	expect(Linking.openURL).toHaveBeenCalledWith('https://najdimo.test/zavetisca');
});

test('no municipality or none confirmed: the directory note, never a guessed number', async () => {
	await show(responsibleOutside);
	expect(await screen.findByText(ts.unknown_municipality)).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: ts.directory_link })).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: /^Pokliči/ })).toBeNull();
});

test('offline without a saved directory there is no row', async () => {
	mockNet.state = { isConnected: false, isInternetReachable: false };
	await show(responsibleConfirmed);
	expect(getCachedShelter).toHaveBeenCalledWith('current');
	// The skeleton while the cache is read, then nothing (no live request offline).
	await waitFor(() => expect(screen.queryByLabelText(sl.common.loading)).toBeNull());
	expect(screen.queryByText(ts.found_body, { exact: false })).toBeNull();
	expect(screen.queryByText(ts.unknown_municipality)).toBeNull();
});
