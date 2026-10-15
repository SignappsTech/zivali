import { render, screen } from '@testing-library/react-native';
import { IntlProvider } from 'use-intl';

import Home from '@/app/index';
import { locale, messages } from '@/lib/messages';

test('home screen shows the app name as the heading and the placeholder text', async () => {
	await render(
		<IntlProvider locale={locale} messages={messages} timeZone="Europe/Ljubljana">
			<Home />
		</IntlProvider>
	);

	expect(screen.getByRole('heading', { name: 'Najdimo' })).toBeOnTheScreen();
	expect(screen.getByText('Aplikacija je v pripravi.')).toBeOnTheScreen();
});
