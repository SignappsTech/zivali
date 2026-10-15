import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import { SiteFooter } from './footer';
import { SiteHeader } from './header';
import { ContentPage, ErrorPage, InlineError, PageSkeleton } from './page';
import { shellVariant } from './parts';

// next-intl maps the browser path (next/navigation) to the internal route, as on a real page.
const nav = vi.hoisted(() => ({ pathname: '/', params: {} as Record<string, string> }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => nav.pathname,
	useParams: () => nav.params,
}));
vi.mock('@zivali/api/auth', () => ({ useSession: () => ({ session: null, me: null, loading: false }) }));
vi.mock('@zivali/api/me', () => ({ useUpdateMeMutation: () => [vi.fn()] }));
// The inbox link's unread state has its own test (components/notifications/unread-dot.test.tsx).
vi.mock('@/components/notifications/unread-dot', () => ({
	UnreadDot: ({ label }: { label: string }) => <span>{label}</span>,
}));

const catalogues = { sl, en };

function renderAt(path: string, node: React.ReactNode, locale: 'sl' | 'en' = 'sl', params = {}) {
	nav.pathname = path;
	nav.params = { locale, ...params };
	return render(
		<NextIntlClientProvider locale={locale} messages={catalogues[locale]}>
			{node}
		</NextIntlClientProvider>
	);
}

const hrefs = (links: HTMLElement[]) => links.map((link) => [link.textContent, link.getAttribute('href')]);

afterEach(cleanup);

describe('shellVariant', () => {
	it.each([
		['/', 'content'],
		['/shelters/[slug]', 'content'],
		['/no/such/page', 'content'],
		['/report/lost', 'flow'],
		['/report/found', 'flow'],
		['/sign-in', 'flow'],
		['/inbox/[id]', 'flow'],
		['/payments/return', 'flow'],
		['/admin/shelters', 'none'],
		['/portal', 'none'],
		['/dev/kit', 'none'],
	])('%s → %s', (pathname, variant) => {
		expect(shellVariant(pathname)).toBe(variant);
	});
});

describe('SiteHeader', () => {
	it('signed out: four links with the current page, language, Vpis and the report choices (SL)', () => {
		renderAt('/kako-deluje', <SiteHeader viewer={null} />);
		const header = screen.getByRole('banner');

		expect(within(header).getByRole('link', { name: sl.nav.home_label }).getAttribute('href')).toBe('/');
		const main = within(header).getByRole('navigation', { name: sl.nav.main_label });
		expect(hrefs(within(main).getAllByRole('link'))).toEqual([
			['Zemljevid', '/zemljevid'],
			['Izgubljene', '/zemljevid?type=lost'],
			['Najdene', '/zemljevid?type=found'],
			['Kako deluje', '/kako-deluje'],
		]);
		expect(within(main).getByRole('link', { current: 'page' }).textContent).toBe('Kako deluje');
		expect(within(header).getByRole('link', { name: sl.nav.sign_in }).getAttribute('href')).toBe('/vpis');
		const language = within(header).getByRole('group', { name: 'Jezik: Slovenščina' });
		expect(within(language).getByRole('link', { name: 'English' }).getAttribute('href')).toBe('/en/how-it-works');
		expect(within(language).getByRole('link', { name: 'English' }).getAttribute('hreflang')).toBe('en');
		expect(within(language).getByRole('link', { name: 'Slovenščina' }).getAttribute('aria-current')).toBe('true');
		// One "Prijavi" per breakpoint (popover from md, sheet below); the popover holds the three choices. Secondary
		// here: the How it works closing row has the page's primary (P3 W5).
		for (const button of within(header).getAllByRole('button', { name: sl.nav.report }))
			expect(button.dataset.variant).toBe('secondary');
		// The closed popover is in the DOM, hidden until its button opens it.
		const menu = header.querySelector<HTMLElement>('#report-menu')!;
		expect(menu.getAttribute('popover')).toBe('auto');
		expect(hrefs(within(menu).getAllByRole('link', { hidden: true }))).toEqual([
			[`${sl.nav.report_lost_title}${sl.nav.report_lost_desc}`, '/prijava/izgubljena-zival'],
			[`${sl.nav.report_found_title}${sl.nav.report_found_desc}`, '/prijava/najdena-zival'],
			[`${sl.nav.report_sighted_title}${sl.nav.report_sighted_desc}`, '/prijava/najdena-zival'],
		]);
	});

	it('makes "Prijavi" secondary on pages with their own primary action', () => {
		renderAt('/en/shelters/zavetisce-ljubljana', <SiteHeader viewer={null} />, 'en', {
			slug: 'zavetisce-ljubljana',
		});

		for (const button of screen.getAllByRole('button', { name: en.nav.report }))
			expect(button.dataset.variant).toBe('secondary');
	});

	it('signed in: My pets and reports, inbox and the account menu instead of Sign in (EN)', () => {
		renderAt('/en/my-pets', <SiteHeader viewer={{ initials: 'AN', aal2: false }} />, 'en');
		const header = screen.getByRole('banner');

		const main = within(header).getByRole('navigation', { name: en.nav.main_label });
		expect(within(main).getByRole('link', { current: 'page' })).toHaveProperty(
			'textContent',
			'My pets and reports'
		);
		expect(within(header).getByRole('link', { name: en.nav.inbox }).getAttribute('href')).toBe('/en/inbox');
		expect(within(header).getByRole('button', { name: en.nav.account_menu }).textContent).toBe('AN');
		const account = header.querySelector<HTMLElement>('#account-menu')!;
		expect(hrefs(within(account).getAllByRole('link', { hidden: true })).slice(0, 3)).toEqual([
			['Profile', '/en/account'],
			['Nearby alerts', '/en/account/alerts'],
			['Payments', '/en/account/payments'],
		]);
		expect(within(account).getByRole('button', { name: en.nav.account_sign_out, hidden: true })).toBeTruthy();
		expect(within(header).queryByRole('link', { name: en.nav.sign_in })).toBeNull();
	});

	it('opens the menu sheet with the links, Vpis and the language; a followed link closes it', () => {
		renderAt('/', <SiteHeader viewer={null} />);
		const sheet = document.querySelector<HTMLDialogElement>('#menu-sheet')!;
		// jsdom has no showModal; the browser behaviour (focus, Escape, backdrop) is in e2e/shell.spec.ts.
		const showModal = vi.fn(() => sheet.setAttribute('open', ''));
		sheet.showModal = showModal;
		sheet.close = () => sheet.removeAttribute('open');

		fireEvent.click(screen.getByRole('button', { name: sl.nav.menu_open }));
		expect(showModal).toHaveBeenCalledOnce();
		expect(screen.getByRole('dialog', { name: sl.nav.main_label })).toBe(sheet);
		expect(
			within(sheet)
				.getAllByRole('link')
				.map((link) => link.textContent)
		).toContain('Kako deluje');
		expect(within(sheet).getByRole('link', { name: sl.nav.sign_in }).getAttribute('href')).toBe('/vpis');
		expect(within(sheet).getByRole('group', { name: 'Jezik: Slovenščina' })).toBeTruthy();

		fireEvent.click(within(sheet).getByRole('link', { name: 'Zemljevid' }));
		expect(sheet.open).toBe(false);
	});

	it('flows get the reduced header: logo and close, no links', () => {
		renderAt('/prijava/izgubljena-zival', <SiteHeader viewer={null} />);
		const header = screen.getByRole('banner');

		expect(within(header).getByRole('link', { name: sl.common.close }).getAttribute('href')).toBe('/');
		expect(within(header).queryByRole('navigation')).toBeNull();
		expect(within(header).queryByRole('button', { name: sl.nav.report })).toBeNull();
	});

	it('leaves admin pages to their own shell', () => {
		const { container } = renderAt('/admin/zavetisca', <SiteHeader viewer={{ initials: 'AN', aal2: false }} />);

		expect(container.innerHTML).toBe('');
	});
});

describe('SiteFooter', () => {
	it('has the 13 links in the system order, language and the copyright (SL)', () => {
		renderAt('/', <SiteFooter />);
		const footer = screen.getByRole('contentinfo');
		const links = within(within(footer).getByRole('navigation', { name: sl.footer.nav_label })).getAllByRole(
			'link'
		);

		expect(hrefs(links)).toEqual([
			['Kako deluje', '/kako-deluje'],
			['Nasveti za varnost', '/varnost'],
			['Pogosta vprašanja', '/pogosta-vprasanja'],
			['Za zavetišča', '/za-zavetisca'],
			['Zavetišča', '/zavetisca'],
			['Oglašujte pri nas', '/oglasevanje'],
			['O nas', '/o-nas'],
			['Zasebnost', '/zasebnost'],
			['Piškotki', '/piskotki'],
			['Pogoji uporabe', '/pogoji-uporabe'],
			['Impresum', '/impresum'],
			['Dostopnost', '/dostopnost'],
			['SL', '/'],
			['EN', '/en'],
		]);
		expect(within(footer).getByRole('button', { name: 'Nastavitve piškotkov' }).getAttribute('aria-haspopup')).toBe(
			'dialog'
		);
		expect(within(footer).getByText(sl.footer.tagline)).toBeTruthy();
		expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Signapps.`);
	});

	it('flows get one quiet row: privacy, terms, cookie settings, accessibility (EN)', () => {
		renderAt('/en/report/found', <SiteFooter />, 'en');

		expect(
			within(screen.getByRole('contentinfo'))
				.getAllByRole('link')
				.map((link) => link.textContent)
		).toEqual(['Privacy', 'Terms of use', 'Accessibility']);
		expect(screen.getByRole('button', { name: 'Cookie settings' })).toBeTruthy();
	});
});

describe('page patterns', () => {
	it('ContentPage is the skip-link target and reserves the sidebar region on request', () => {
		renderAt(
			'/',
			<ContentPage sidebar>
				<h1>Page</h1>
			</ContentPage>
		);

		expect(screen.getByRole('main').id).toBe('main');
		expect(screen.getByRole('complementary', { name: sl.common.sidebar_label })).toBeTruthy();
		cleanup();

		renderAt('/', <ContentPage>x</ContentPage>);
		expect(screen.queryByRole('complementary')).toBeNull();
	});

	it.each([
		[404, sl.errors.page_404_title, sl.errors.page_404_body],
		[410, sl.errors.page_410_title, sl.errors.page_410_body],
	] as const)('the %s page leads back to the map and home', (status, title, body) => {
		renderAt('/', <ErrorPage status={status} />);

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
		expect(screen.getByText(body)).toBeTruthy();
		expect(hrefs(screen.getAllByRole('link'))).toEqual([
			[sl.common.go_to_map, '/zemljevid'],
			[sl.common.go_home, '/'],
		]);
	});

	it('the 500 page retries in place (EN)', () => {
		const retry = vi.fn();
		renderAt('/en', <ErrorPage status={500} onRetry={retry} />, 'en');

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en.errors.page_500_title);
		fireEvent.click(screen.getByRole('button', { name: en.common.try_again }));
		expect(retry).toHaveBeenCalledOnce();
	});

	it('the inline error announces itself and keeps the retry label while retrying', () => {
		const retry = vi.fn();
		renderAt('/', <InlineError onRetry={retry} retrying />);

		expect(screen.getByRole('alert').textContent).toContain(sl.common.inline_error);
		expect(screen.getByRole('button', { name: sl.common.inline_error_retry }).getAttribute('aria-busy')).toBe(
			'true'
		);
	});

	it('the page skeleton is announced once and hidden from assistive tech', () => {
		renderAt('/', <PageSkeleton />);

		expect(screen.getByRole('status').textContent).toBe(sl.common.loading_page);
	});
});
