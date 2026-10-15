import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { IntlProvider, useTranslations } from 'use-intl';

import sl from '@zivali/i18n/dist/sl.json';

function Minutes({ n }: { n: number }) {
	return <Text>{useTranslations('errors')('RATE_LIMITED', { minutes: n })}</Text>;
}

async function expectSlovenianForms() {
	await render(
		<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			{[1, 2, 3, 5].map((n) => (
				<Minutes key={n} n={n} />
			))}
		</IntlProvider>
	);
	// one, two, few, other
	for (const form of ['čez 1 minuto.', 'čez 2 minuti.', 'čez 3 minute.', 'čez 5 minut.']) {
		expect(screen.getByText(form, { exact: false })).toBeOnTheScreen();
	}
}

const native = Intl.PluralRules;
const polyfill = '@formatjs/intl-pluralrules/polyfill-force.js';
afterEach(() => {
	Object.defineProperty(Intl, 'PluralRules', { value: native, configurable: true, writable: true });
	jest.dontMock(polyfill);
});

test('with native sl plural rules the polyfill is not loaded', async () => {
	const loaded = jest.fn();
	jest.doMock(polyfill, () => loaded());
	jest.isolateModules(() => jest.requireActual('@/lib/plural-rules'));

	expect(loaded).not.toHaveBeenCalled();
	expect(Intl.PluralRules).toBe(native);
	await expectSlovenianForms();
});

test('without Intl.PluralRules (Hermes) the polyfill loads and renders the 1, 2, 3 and 5 forms', async () => {
	// @ts-expect-error -- simulates an engine without Intl.PluralRules
	delete Intl.PluralRules;
	jest.isolateModules(() => jest.requireActual('@/lib/plural-rules'));

	expect(Intl.PluralRules).not.toBe(native);
	expect(Intl.PluralRules).toHaveProperty('polyfilled', true);
	const select = jest.spyOn(Intl.PluralRules.prototype, 'select');
	await expectSlovenianForms();
	expect(select).toHaveBeenCalled();
});
