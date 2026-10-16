// @vitest-environment node
import { describe, expect, it } from 'vitest';

import robots from './robots';

describe('robots.txt', () => {
	it('allows all but disallows the admin console in both locales, and points at the sitemap on the app URL', () => {
		const result = robots();
		expect(result.rules).toEqual({ userAgent: '*', allow: '/', disallow: ['/admin', '/en/admin'] });
		expect(result.sitemap).toBe('https://najdimo.si/sitemap.xml');
	});
});
