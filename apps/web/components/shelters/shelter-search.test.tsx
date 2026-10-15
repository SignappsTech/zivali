import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it } from 'vitest';

import {
	municipalityList,
	responsibleConfirmed,
	responsibleLikely,
	responsibleUnconfirmed,
} from '@zivali/api/__fixtures__/directory';
import { createMockApi, mockError, type MockRoutes } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import { ShelterSearch } from './shelter-search';

const t = sl.shelters;
const municipalities = [
	...municipalityList.items,
	{ slug: 'kocevje', name: 'Kočevje', shelter_slug: null },
	{ slug: 'skofja-loka', name: 'Škofja Loka', shelter_slug: null },
	{ slug: 'skofljica', name: 'Škofljica', shelter_slug: null },
	{ slug: 'loski-potok', name: 'Loški Potok', shelter_slug: null },
];
const responsible: Record<string, object> = {
	ljubljana: responsibleConfirmed,
	kocevje: responsibleLikely,
	osilnica: responsibleUnconfirmed,
};

function renderSearch(routes: MockRoutes = {}, locale: 'sl' | 'en' = 'sl') {
	const store = createApiStore(
		createMockApi(
			{
				'GET /v1/shelters/responsible': ({ query }) => responsible[query.municipality!],
				...routes,
			},
			{ locale }
		)
	);
	render(
		<NextIntlClientProvider locale={locale} messages={locale === 'sl' ? sl : en}>
			<Provider store={store}>
				<ShelterSearch municipalities={municipalities} />
			</Provider>
		</NextIntlClientProvider>
	);
	return screen.getByRole('combobox', { name: locale === 'sl' ? t.search_label : en.shelters.search_label });
}

function choose(input: HTMLElement, text: string, option: string) {
	fireEvent.change(input, { target: { value: text } });
	fireEvent.mouseDown(screen.getByRole('option', { name: option }));
}

const callLinks = () => screen.queryAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('tel:'));

afterEach(cleanup);

describe('ShelterSearch', () => {
	it('suggests municipalities ignoring case and diacritics, prefix matches first', () => {
		const input = renderSearch();
		fireEvent.change(input, { target: { value: 'skof' } });

		expect(input.getAttribute('aria-expanded')).toBe('true');
		const names = screen.getAllByRole('option').map((option) => option.textContent);
		expect(names).toEqual(['Škofja Loka', 'Škofljica']);
		expect(screen.getByRole('status').textContent).toBe('2 občini ustrezata vnosu');

		fireEvent.change(input, { target: { value: 'lo' } });
		expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
			'Loški Potok',
			'Škofja Loka',
		]);
	});

	it('moves through the options with the keyboard and picks one with Enter', async () => {
		const input = renderSearch();
		fireEvent.change(input, { target: { value: 'skof' } });
		fireEvent.keyDown(input, { key: 'ArrowDown' });

		const second = screen.getByRole('option', { name: 'Škofljica' });
		expect(input.getAttribute('aria-activedescendant')).toBe(second.id);
		expect(second.getAttribute('aria-selected')).toBe('true');

		fireEvent.keyDown(input, { key: 'Enter' });
		expect((input as HTMLInputElement).value).toBe('Škofljica');
		expect(input.getAttribute('aria-expanded')).toBe('false');
	});

	it('says when nothing matches the typed text', () => {
		const input = renderSearch();
		fireEvent.change(input, { target: { value: 'Kamnk' } });

		expect(
			screen.getByText('Občine »Kamnk« ne najdemo. Preverite zapis ali jo poiščite na seznamu spodaj.')
		).toBeTruthy();
		expect(screen.queryByRole('option')).toBeNull();

		fireEvent.click(screen.getByRole('button', { name: t.search_clear }));
		expect((input as HTMLInputElement).value).toBe('');
		expect(document.activeElement).toBe(input);
	});

	it('answers a confirmed municipality with the number and the one primary call button', async () => {
		choose(renderSearch(), 'ljub', 'Ljubljana');

		const call = await screen.findByRole('link', { name: 'Pokliči Zavetišče Ljubljana' });
		expect(call.getAttribute('href')).toBe('tel:+38612345678');
		expect(call.dataset.variant).toBe('default');
		expect(screen.getByText('Za občino Ljubljana je pristojno')).toBeTruthy();
		expect(screen.getByText('01 234 56 78')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Zavetišče Ljubljana' }).getAttribute('href')).toBe(
			'/zavetisca/zavetisce-ljubljana'
		);
	});

	it('shows a likely shelter as not confirmed, with only a secondary call and no number', async () => {
		choose(renderSearch(), 'koc', 'Kočevje');

		const call = await screen.findByRole('link', { name: 'Pokliči Zavetišče Ljubljana. Pristojnost ni potrjena.' });
		expect(call.textContent).toBe(t.call_unconfirmed);
		expect(call.dataset.variant).toBe('secondary');
		expect(callLinks()).toHaveLength(1);
		expect(screen.getByText(t.not_confirmed)).toBeTruthy();
		expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(t.maybe_responsible);
		expect(screen.queryByText(/Za občino Kočevje je pristojno/)).toBeNull();
		expect(screen.queryByText(/\d{2} \d{3} \d{2} \d{2}/)).toBeNull();
	});

	it('gives an unconfirmed municipality no phone at all, only the two nearest shelters', async () => {
		choose(renderSearch(), 'osil', 'Osilnica');

		await screen.findByText(t.nearest_title);
		expect(callLinks()).toHaveLength(0);
		expect(screen.getByText(/Za občino Osilnica še nimamo potrjenega zavetišča/)).toBeTruthy();
		const nearest = within(screen.getByRole('list'));
		expect(nearest.getByRole('link', { name: 'Zavetišče Kočevje' }).getAttribute('href')).toBe(
			'/zavetisca/zavetisce-kocevje'
		);
		expect(nearest.getByText('71 km od središča občine')).toBeTruthy();
		expect(screen.getByRole('link', { name: /Vsa zavetišča/ }).getAttribute('href')).toBe('#all');
	});

	it('shows the inline error with a retry when the lookup fails', async () => {
		let fail = true;
		const input = renderSearch({
			'GET /v1/shelters/responsible': () => (fail ? mockError('NOT_FOUND') : responsibleConfirmed),
		});
		choose(input, 'ljub', 'Ljubljana');

		expect((await screen.findByRole('alert')).textContent).toContain(t.error);
		fail = false;
		fireEvent.click(screen.getByRole('button', { name: sl.common.try_again }));
		expect(await screen.findByRole('link', { name: 'Pokliči Zavetišče Ljubljana' })).toBeTruthy();
	});

	it('speaks English on the EN page', async () => {
		choose(renderSearch({}, 'en'), 'koc', 'Kočevje');

		expect(
			await screen.findByRole('link', { name: 'Call Zavetišče Ljubljana. Responsibility is not confirmed.' })
		).toBeTruthy();
		expect(screen.getByText('Not confirmed')).toBeTruthy();
	});
});
