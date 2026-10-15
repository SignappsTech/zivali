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
