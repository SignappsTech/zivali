import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useMessages, useTranslations } from 'next-intl';
import { afterEach, expect, it } from 'vitest';

import { PageMessages } from './page-messages';

afterEach(cleanup);

function Probe() {
	const common = useTranslations('common');
	const auth = useTranslations('auth');
	return <p>{`${common('try_again')} | ${auth('signin_title')} | ${Object.keys(useMessages()).join(',')}`}</p>;
}

// On a page the catalogue comes from the request config (next-intl's server hooks); here from a provider.
it("gives a page's client components the shell's namespaces and the page's own, not the rest of the catalogue", () => {
	render(
		<NextIntlClientProvider
			locale="sl"
			messages={{
				common: { try_again: 'Poskusi znova' },
				consent: {},
				errors: {},
				nav: {},
				auth: { signin_title: 'stari' },
				pages: {},
			}}
		>
			<PageMessages messages={{ auth: { signin_title: 'Vpis' } }}>
				<Probe />
			</PageMessages>
		</NextIntlClientProvider>
	);
	expect(screen.getByText('Poskusi znova | Vpis | common,consent,errors,nav,auth')).toBeTruthy();
});
