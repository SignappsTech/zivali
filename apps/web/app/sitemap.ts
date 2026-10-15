import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';
import { getShelters } from '@/lib/directory';
import { absoluteUrl } from '@/lib/seo';

// Read from the directory API per request: the build has no API, and shelters change between deploys.
export const dynamic = 'force-dynamic';

type Href = Parameters<typeof absoluteUrl>[1];

/** Every page in both locales with its hreflang alternates, on the app URL (C15). The SEO story adds the rest. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const shelters = (await getShelters(routing.defaultLocale)).items;
	const pages: Href[] = [
		'/',
		'/shelters',
		...shelters.map(({ slug }) => ({ pathname: '/shelters/[slug]', params: { slug } }) as const),
	];
	return pages.flatMap((href) => {
		const languages = Object.fromEntries(routing.locales.map((locale) => [locale, absoluteUrl(locale, href)]));
		return routing.locales.map((locale) => ({ url: languages[locale]!, alternates: { languages } }));
	});
}
