import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import SignInPage from './page';

const catalogues = { sl, en };

// Server translations from the same catalogues (next-intl/server needs the Next request scope).
vi.mock('next-intl/server', async () => {
	const { createTranslator } = await import('next-intl');
	return {
		getTranslations: async ({ locale, namespace }: { locale: 'sl' | 'en'; namespace: string }) =>
			createTranslator({ locale, messages: catalogues[locale], namespace: namespace as 'auth' }),
		getMessages: async ({ locale }: { locale: 'sl' | 'en' }) => catalogues[locale],
	};
});
const viewer = vi.hoisted(() => ({ current: null as null | { initials: string; aal2: boolean } }));
vi.mock('@/lib/viewer', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/viewer')>()),
	getVerifiedViewer: async () => viewer.current,
}));

async function show(locale: 'sl' | 'en', query: Record<string, string>) {
	const page = await SignInPage({
		params: Promise.resolve({ locale }),
		searchParams: Promise.resolve(query),
	} as PageProps<'/[locale]/sign-in'>);
	const { common, consent, errors, nav } = catalogues[locale];
	render(
		<NextIntlClientProvider locale={locale} messages={{ common, consent, errors, nav }}>
			{page}
		</NextIntlClientProvider>
	);
}

afterEach(() => {
	cleanup();
	viewer.current = null;
});

describe('SignInPage, the "E-naslov je potrjen" view', () => {
	it('keeps its copy and Nadaljuj for a link without a report hand-off', async () => {
		await show('sl', { confirmed: '1', next: '/racun' });
		expect(screen.getByRole('heading', { level: 1, name: sl.auth.verified_title })).toBeTruthy();
		expect(screen.getByText(sl.auth.verified_body)).toBeTruthy();
		expect(screen.getByRole('link', { name: sl.auth.verified_continue }).getAttribute('href')).toBe(
			'/vpis?next=%2Fracun'
		);
	});

	it('says the draft is in the browser where it was started, with sign-in, when the link opened elsewhere (C3)', async () => {
		const next = '/prijava/izgubljena-zival?handoff=n1';
		await show('sl', { confirmed: '1', next });
		expect(screen.getByText(sl.auth.verified_draft_elsewhere)).toBeTruthy();
		expect(screen.queryByText(sl.auth.verified_body)).toBeNull();
		// Signed in here, the hand-off still publishes if the draft is in this browser after all.
		expect(screen.getByRole('link', { name: sl.auth.signin_button }).getAttribute('href')).toBe(
			`/vpis?next=${encodeURIComponent(next)}`
		);
		cleanup();

		const enNext = '/en/report/lost?handoff=n2';
		await show('en', { confirmed: '1', next: enNext });
		expect(screen.getByText(en.auth.verified_draft_elsewhere)).toBeTruthy();
		expect(screen.getByRole('link', { name: en.auth.signin_button }).getAttribute('href')).toBe(
			`/en/sign-in?next=${encodeURIComponent(enNext)}`
		);
	});
});
