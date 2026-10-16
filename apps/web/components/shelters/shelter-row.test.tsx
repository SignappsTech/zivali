import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	responsibleConfirmed,
	responsibleLikely,
	responsibleOutside,
	responsibleUnconfirmed,
} from '@zivali/api/__fixtures__/directory';
import { createMockApi, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';

import { type Kind, ShelterRow } from './shelter-row';

vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	usePathname: () => '/prijava/najdena-zival',
	useParams: () => ({ locale: 'sl' }),
}));

const POINT = { lat: 46.0612, lng: 14.4977 };

function show(kind: Kind, answer: object | (() => Response)) {
	const api = createMockApi({ 'GET /v1/shelters/responsible': answer });
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<Provider store={createApiStore(api)}>
				<ShelterRow point={POINT} kind={kind} />
			</Provider>
		</NextIntlClientProvider>
	);
	return api;
}
afterEach(cleanup);

describe('ShelterRow (C18, P7 web)', () => {
	it('asks the directory for the point rounded to 2 decimals and offers the confirmed shelter for a find', async () => {
		const api = show('found', responsibleConfirmed);
		expect(
			await screen.findByText(
				'Najdbo čim prej sporočite zavetišču, pristojnemu za občino Ljubljana. Prijava na Najdimo tega ne nadomesti.'
			)
		).toBeTruthy();
		expect(api.calls[0]!.query).toEqual({ lat: '46.06', lng: '14.5' });
		expect(screen.getByText('Zavetišče Ljubljana')).toBeTruthy();
		expect(screen.getByText('01 234 56 78')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Pokliči Zavetišče Ljubljana' }).getAttribute('href')).toBe(
			'tel:+38612345678'
		);
		expect(screen.getByRole('link', { name: 'Delovni čas in naslov' }).getAttribute('href')).toBe(
			'/zavetisca/zavetisce-ljubljana'
		);
		expect(screen.getByText('Čip lahko prebere katero koli zavetišče ali veterinar.')).toBeTruthy();
	});

	it('marks a likely shelter "Ni potrjeno" and keeps its number', async () => {
		show('found', responsibleLikely);
		expect(await screen.findByText('Morda pristojno zavetišče')).toBeTruthy();
		expect(screen.getByText('Ni potrjeno')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Pokliči Zavetišče Ljubljana' })).toBeTruthy();
	});

	it('lists the nearest shelters without a number when none is confirmed', async () => {
		show('sighted', responsibleUnconfirmed);
		expect(await screen.findByText('Najbližji zavetišči')).toBeTruthy();
		expect(screen.getByText('Zavetišče Kočevje')).toBeTruthy();
		expect(screen.queryByRole('link', { name: /Pokliči/ })).toBeNull();
		expect(screen.getByRole('link', { name: 'Imenik zavetišč' }).getAttribute('href')).toBe('/zavetisca');
		expect(screen.queryByText('Čip lahko prebere katero koli zavetišče ali veterinar.')).toBeNull();
	});

	it('says so with the directory link, never a guessed number, outside Slovenia or on an error', async () => {
		show('found', responsibleOutside);
		expect(await screen.findByText(sl.shelter_row.unknown_municipality)).toBeTruthy();
		cleanup();
		show('found', () => mockError('VALIDATION'));
		expect(await screen.findByText(sl.shelter_row.unknown_municipality)).toBeTruthy();
		expect(screen.queryByRole('link', { name: /Pokliči/ })).toBeNull();
		cleanup();
		show('found', { ...responsibleUnconfirmed, nearest: [] });
		expect(
			await screen.findByText(
				'Za občino Osilnica še nimamo potrjenega zavetišča. Pokličite občino ali poglejte imenik zavetišč.'
			)
		).toBeTruthy();
	});
});
