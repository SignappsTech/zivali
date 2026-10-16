import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { evaluate } from '@mdx-js/mdx';
import { renderToStaticMarkup } from 'react-dom/server';
import * as runtime from 'react/jsx-runtime';
import { describe, expect, it } from 'vitest';

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

	it('lists the sessionStorage key manage_token in the cookie policy', async () => {
		for (const locale of locales) expect(await html(locale, 'cookies')).toContain('manage_token');
	});
});
