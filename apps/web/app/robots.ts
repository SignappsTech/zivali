import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

// Per request, like the sitemap: one image runs on staging and production, each with its own app URL (unset at build).
export const dynamic = 'force-dynamic';

/** Allow all, but keep the staff console (both locales) out of search results. The SEO story (TASK-72) extends this. */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/en/admin'] },
		sitemap: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/sitemap.xml`,
	};
}
