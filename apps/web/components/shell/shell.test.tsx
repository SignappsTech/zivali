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
const nav = vi.hoisted(() => ({ pathname: '/', search: '', params: {} as Record<string, string> }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => nav.pathname,
	useParams: () => nav.params,
	useSearchParams: () => new URLSearchParams(nav.search),
}));
vi.mock('@zivali/api/auth', () => ({ useSession: () => ({ session: null, me: null, loading: false }) }));
vi.mock('@zivali/api/me', () => ({ useUpdateMeMutation: () => [vi.fn()] }));
// The inbox link's unread state has its own test (components/notifications/unread-dot.test.tsx).
vi.mock('@/components/notifications/unread-dot', () => ({
	UnreadDotIsland: ({ label }: { label: string }) => <span>{label}</span>,
}));

const catalogues = { sl, en };

const page = (node: React.ReactNode, locale: 'sl' | 'en') => (
	<NextIntlClientProvider locale={locale} messages={catalogues[locale]}>
		{node}
	</NextIntlClientProvider>
);

/** Renders `node` at the browser `path` (with an optional `?query`). */
function renderAt(path: string, node: React.ReactNode, locale: 'sl' | 'en' = 'sl', params = {}) {
	[nav.pathname, nav.search = ''] = path.split('?') as [string, string?];
	nav.params = { locale, ...params };
	return render(page(node, locale));
}

const hrefs = (links: HTMLElement[]) => links.map((link) => [link.textContent, link.getAttribute('href')]);

/** The current link of each main navigation: the bar from lg and the menu sheet below. */
const currentLinks = (name: string) =>
	screen.getAllByRole('navigation', { name, hidden: true }).map((main) =>
		within(main)
			.getAllByRole('link', { current: 'page', hidden: true })
			.map((link) => link.textContent)
	);

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

	it('on the map marks Zemljevid, Izgubljene or Najdene by the type filter and follows it (SL, bar and menu)', () => {
		const current = () => currentLinks(sl.nav.main_label);
		const { rerender } = renderAt('/zemljevid', <SiteHeader viewer={null} />);
		expect(current()).toEqual([[sl.nav.map], [sl.nav.map]]);

		// The drawer writes the filter to the URL (browse.tsx); the header re-renders with the new search params.
		for (const [search, label] of [
			['type=lost', sl.nav.lost],
			['type=found', sl.nav.found],
			['type=lost,found', sl.nav.map],
			['type=found&species=dog', sl.nav.found],
			['', sl.nav.map],
		] as const) {
			nav.search = search;
			rerender(page(<SiteHeader viewer={null} />, 'sl'));
			expect(current()).toEqual([[label], [label]]);
		}
	});

	it.each([
		['/en/map', en.nav.map],
		['/en/map?type=lost', en.nav.lost],
		['/en/map?type=found', en.nav.found],
	])('%s marks %s (EN)', (path, label) => {
		renderAt(path, <SiteHeader viewer={{ initials: 'AN', aal2: false }} />, 'en');

		expect(currentLinks(en.nav.main_label)).toEqual([[label], [label]]);
	});

	it('makes "Prijavi" secondary on pages with their own primary action', () => {
		renderAt('/en/shelters/zavetisce-ljubljana', <SiteHeader viewer={null} />, 'en', {
			slug: 'zavetisce-ljubljana',
		});

		for (const button of screen.getAllByRole('button', { name: en.nav.report }))
			expect(button.dataset.variant).toBe('secondary');
	});

	it('signed in: My pets (full label in the menu sheet), inbox and the account menu instead of Sign in (EN)', async () => {
		renderAt('/en/my-pets', <SiteHeader viewer={{ initials: 'AN', aal2: false }} />, 'en');
		const header = screen.getByRole('banner');

		// The lg bar has the short label, the menu sheet the full one (CH-150).
		expect(currentLinks(en.nav.main_label)).toEqual([['My pets'], ['My pets and reports']]);
		// The inbox label comes with the lazily loaded unread dot (TASK-90.5).
		expect((await within(header).findByRole('link', { name: en.nav.inbox })).getAttribute('href')).toBe(
			'/en/inbox'
		);
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
	it('has the 13 links in four headed columns, language under the logo, copyright and operator (SL)', () => {
		renderAt('/', <SiteFooter />);
		const footer = screen.getByRole('contentinfo');
		const nav = within(footer).getByRole('navigation', { name: sl.footer.nav_label });
		const column = (name: string) =>
			within(within(nav).getByRole('list', { name }))
				.getAllByRole('listitem')
				.map((item) => {
					const link = within(item).queryByRole('link');
					return link ? [link.textContent, link.getAttribute('href')] : [item.textContent, 'button'];
				});

		expect(
			within(nav)
				.getAllByRole('heading', { level: 2 })
				.map((h) => h.textContent)
		).toEqual(['Pomoč', 'Za organizacije', 'Najdimo', 'Pravno']);
		expect(column('Pomoč')).toEqual([
			['Kako deluje', '/kako-deluje'],
			['Nasveti za varnost', '/varnost'],
			['Pogosta vprašanja', '/pogosta-vprasanja'],
		]);
		expect(column('Za organizacije')).toEqual([
			['Za zavetišča', '/za-zavetisca'],
			['Zavetišča', '/zavetisca'],
			['Oglašujte pri nas', '/oglasevanje'],
		]);
		expect(column('Najdimo')).toEqual([
			['O nas', '/o-nas'],
			['Podatki o podjetju', '/podatki-o-podjetju'],
			['Dostopnost', '/dostopnost'],
		]);
		expect(column('Pravno')).toEqual([
			['Zasebnost', '/zasebnost'],
			['Piškotki', '/piskotki'],
			['Pogoji uporabe', '/pogoji-uporabe'],
			['Nastavitve piškotkov', 'button'],
		]);
		expect(within(nav).getAllByRole('link')).toHaveLength(12);
		expect(within(footer).getByRole('button', { name: 'Nastavitve piškotkov' }).getAttribute('aria-haspopup')).toBe(
			'dialog'
		);
		expect(within(footer).getByText(sl.footer.tagline)).toBeTruthy();
		expect(
			hrefs(within(within(footer).getByRole('group', { name: 'Jezik: Slovenščina' })).getAllByRole('link'))
		).toEqual([
			['SL', '/'],
			['EN', '/en'],
		]);
		expect(footer.textContent).toContain(`© ${new Date().getFullYear()} SIGNAPPS d.o.o.`);
		expect(within(footer).getByText(sl.footer.operator).textContent).toContain(
			'SIGNAPPS d.o.o., Kolomban 34B, 6280 Ankaran'
		);
	});

	it('EN: the same columns with English headings, the operator line and the switch on this page', () => {
		renderAt('/en/company-information', <SiteFooter />, 'en');
		const footer = screen.getByRole('contentinfo');

		expect(
			within(footer)
				.getAllByRole('heading', { level: 2 })
				.map((h) => h.textContent)
		).toEqual(['Help', 'For organisations', 'Najdimo', 'Legal']);
		expect(
			within(within(footer).getByRole('list', { name: 'Najdimo' }))
				.getAllByRole('link')
				.map((link) => link.getAttribute('href'))
		).toEqual(['/en/about', '/en/company-information', '/en/accessibility']);
		expect(within(footer).getByText(en.footer.operator)).toBeTruthy();
		expect(hrefs(within(within(footer).getByRole('group', { name: /^Language/ })).getAllByRole('link'))).toEqual([
			['SL', '/podatki-o-podjetju'],
			['EN', '/en/company-information'],
		]);
	});

	it('flows get one quiet row: privacy, terms, cookie settings, accessibility (EN)', () => {
		renderAt('/en/report/found', <SiteFooter />, 'en');

		const footer = screen.getByRole('contentinfo');
		expect(
			within(footer)
				.getAllByRole('listitem')
				.map((item) => item.textContent)
		).toEqual(['Privacy', 'Terms of use', 'Cookie settings', 'Accessibility']);
		expect(within(footer).getAllByRole('link')).toHaveLength(3);
		expect(within(footer).queryByRole('heading')).toBeNull();
		expect(within(footer).queryByRole('group')).toBeNull();
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
