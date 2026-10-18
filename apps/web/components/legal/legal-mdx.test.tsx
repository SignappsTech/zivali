import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { evaluate } from '@mdx-js/mdx';
import { renderToStaticMarkup } from 'react-dom/server';
import * as runtime from 'react/jsx-runtime';
import { describe, expect, it } from 'vitest';

import { legalBodyClass } from '@/components/legal/legal-page';
import { useMDXComponents as getComponents } from '@/mdx-components';

const locales = ['sl', 'en'];
const slugs = ['privacy', 'cookies', 'terms', 'imprint', 'accessibility'];

async function html(locale: string, slug: string) {
	const source = readFileSync(join(process.cwd(), 'content/legal', locale, `${slug}.mdx`), 'utf8');
	const { default: Body } = await evaluate(source, { ...runtime, baseUrl: import.meta.url });
	return renderToStaticMarkup(<Body components={getComponents()} />);
}

describe('legal MDX', () => {
	for (const locale of locales)
		for (const slug of slugs)
			it(`${locale}/${slug} has no <p> inside <p>`, async () => {
				const out = await html(locale, slug);
				expect(out).toContain('<p');
				expect(out).not.toMatch(/<p[^>]*>(?:(?!<\/p>)[\s\S])*<p[\s>]/);
			});

	it('styles raw HTML headings and lists through the body container', async () => {
		for (const cls of ['[&_h2]:font-display', '[&_h2]:text-2xl', '[&_h3]:font-display', '[&_p]:mt-4', '[&_ul]:list-disc'])
			expect(legalBodyClass).toContain(cls);
		for (const locale of locales) for (const slug of slugs) expect(await html(locale, slug)).toMatch(/<h2 id="s1"/);
	});

	it('renders every legal table through LegalTable: header row, label column, dividers, cards with header association', async () => {
		const tableCounts: Record<string, number> = { privacy: 4, cookies: 2, imprint: 1, terms: 0, accessibility: 0 };
		for (const locale of locales)
			for (const slug of slugs) {
				const host = document.createElement('div');
				host.innerHTML = await html(locale, slug);
				const tables = [...host.querySelectorAll('table')];
				expect(tables, `${locale}/${slug}`).toHaveLength(tableCounts[slug]);
				for (const table of tables) {
					expect(table.getAttribute('role')).toBe('table');
					expect(table.className).toContain('table-fixed');
					expect(table.className).toContain('cards:block');
					expect(table.className).not.toContain('min-w-');
					expect(table.querySelector('thead')?.className).toBe('cards:sr-only');
					const headers = [...table.querySelectorAll('thead th')];
					const labels = headers.map((th) => th.textContent);
					for (const th of headers) {
						expect(th.getAttribute('role')).toBe('columnheader');
						expect(th.getAttribute('scope')).toBe('col');
						expect(th.className).toContain('bg-muted');
					}
					expect(headers[0].className).toContain('first:w-[30%]');
					for (const tr of table.querySelectorAll('tbody tr')) {
						expect(tr.getAttribute('role')).toBe('row');
						expect(tr.className).toContain('cards:bg-card');
						const cells = [...tr.children];
						expect(cells).toHaveLength(headers.length);
						cells.forEach((td, i) => {
							expect(td.getAttribute('role')).toBe(i ? 'cell' : 'rowheader');
							expect(td.className).toContain('border-b-2');
							const label = td.querySelector(':scope > span[aria-hidden="true"]');
							// Two columns: the label is the card heading. More: each value carries its column name.
							if (i && headers.length > 2) expect(label?.textContent).toBe(`${labels[i]}: `);
							else expect(label).toBeNull();
						});
					}
				}
			}
	});

	it('stacks tables as cards on narrow screens only, so print keeps the table', () => {
		const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
		expect(css).toContain('@custom-variant cards (@media screen and (width < 40rem));');
	});

	it('lists the sessionStorage key manage_token in the cookie policy', async () => {
		for (const locale of locales) expect(await html(locale, 'cookies')).toContain('manage_token');
	});
});
