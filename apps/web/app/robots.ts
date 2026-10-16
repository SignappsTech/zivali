import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

/** Allow all, but keep the staff console (both locales) out of search results. The SEO story (TASK-72) extends this. */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/en/admin'] },
		sitemap: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/sitemap.xml`,
	};
}
