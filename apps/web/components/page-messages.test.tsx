import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useTimeZone, useTranslations } from 'next-intl';
import { afterEach, expect, it } from 'vitest';

import { PageMessages } from './page-messages';

afterEach(cleanup);

function Probe() {
	const common = useTranslations('common');
	const auth = useTranslations('auth');
	return <p>{`${common('try_again')} | ${auth('signin_title')} | ${useTimeZone()}`}</p>;
}

it("adds the page's namespaces to the layout's messages and keeps the layout's time zone", () => {
	render(
		<NextIntlClientProvider
			locale="sl"
			timeZone="Europe/Ljubljana"
			messages={{ common: { try_again: 'Poskusi znova' }, auth: { signin_title: 'stari' } }}
		>
			<PageMessages messages={{ auth: { signin_title: 'Vpis' } }}>
				<Probe />
			</PageMessages>
		</NextIntlClientProvider>
	);
	expect(screen.getByText('Poskusi znova | Vpis | Europe/Ljubljana')).toBeTruthy();
});
