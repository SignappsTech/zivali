import { render, screen } from '@testing-library/react-native';
import { IntlProvider } from 'use-intl';

import sl from '@zivali/i18n/dist/sl.json';
import Home from '@/app/index';

test('home screen shows the hero title as the heading and the lede', async () => {
	await render(
		<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<Home />
		</IntlProvider>
	);

	expect(screen.getByRole('heading', { name: sl.pages.home.hero_title })).toBeOnTheScreen();
	expect(screen.getByText(sl.pages.home.hero_lede)).toBeOnTheScreen();
});
