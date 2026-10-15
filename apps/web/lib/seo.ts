import type { Metadata } from 'next';
import type { Locale } from 'next-intl';

import { getPathname } from '@/i18n/navigation';
import { env } from '@/lib/env';

type Href = Parameters<typeof getPathname>[0]['href'];

/** Absolute URL of a page on the validated app URL (canonical, sitemap, JSON-LD); never built from request headers. */
export const absoluteUrl = (locale: Locale, href: Href) =>
	`${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}${getPathname({ locale, href })}`;

/** JSON-LD for `<script type="application/ld+json">`; `<` escaped so data can never close the script element. */
export const jsonLd = (data: object) =>
	JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c');

/** The P3 pages with a generated Open Graph image (app/og/[image]/route.tsx). */
export const OG_PAGES = ['home', 'how-it-works', 'safety', 'faq', 'for-shelters', 'about'] as const;
export type OgPage = (typeof OG_PAGES)[number];

/**
 * Metadata of a public content page: the title carries its own " · Najdimo" (content slice), so it skips the layout
 * template; canonical and og:url on the app URL; the page's Open Graph image shows `heading`.
 */
export function pageMetadata(
	locale: Locale,
	href: Href,
	og: OgPage,
	{ title, description, heading }: { title: string; description: string; heading: string }
): Metadata {
	const url = absoluteUrl(locale, href);
	return {
		title: { absolute: title },
		description,
		alternates: { canonical: url },
		openGraph: {
			type: 'website',
			siteName: 'Najdimo',
			locale: locale === 'sl' ? 'sl_SI' : 'en_GB',
			url,
			title,
			description,
			images: [{ url: `/og/${locale}-${og}.png`, width: 1200, height: 630, alt: `Najdimo – ${heading}` }],
		},
	};
}

/** schema.org BreadcrumbList: Najdimo › the page. */
export const breadcrumbLd = (locale: Locale, name: string, href: Href) => ({
	'@type': 'BreadcrumbList',
	itemListElement: [
		{ '@type': 'ListItem', position: 1, name: 'Najdimo', item: absoluteUrl(locale, '/') },
		{ '@type': 'ListItem', position: 2, name, item: absoluteUrl(locale, href) },
	],
});
