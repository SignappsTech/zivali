import type { MetadataRoute } from 'next';

import { env, searchIndexing } from '@/lib/env';

// Per request, like the sitemap: one image runs on staging and production, each with its own app URL (unset at build).
export const dynamic = 'force-dynamic';

/**
 * Allow all, but keep the staff console (both locales) out of search results. With indexing off (searchIndexing:
 * staging, the pilot until launch) no sitemap either; crawling stays allowed so crawlers read the pages' noindex
 * (X-Robots-Tag, proxy.ts), which a disallow would hide. The SEO story (TASK-72) extends this.
 */
export default function robots(): MetadataRoute.Robots {
	const rules = { userAgent: '*', allow: '/', disallow: ['/admin', '/en/admin'] };
	if (!searchIndexing()) return { rules };
	return { rules, sitemap: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/sitemap.xml` };
}
