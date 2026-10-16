// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

// searchIndexing() itself: lib/env.test.ts.
const state = vi.hoisted(() => ({ indexing: true }));
vi.mock('@/lib/env', () => ({
	env: { NEXT_PUBLIC_APP_URL: 'https://najdimo.si/' },
	searchIndexing: () => state.indexing,
}));

import robots from './robots';

const rules = { userAgent: '*', allow: '/', disallow: ['/admin', '/en/admin'] };

describe('robots.txt', () => {
	it('allows all but disallows the admin console in both locales, and points at the sitemap on the app URL', () => {
		state.indexing = true;
		expect(robots()).toEqual({ rules, sitemap: 'https://najdimo.si/sitemap.xml' });
	});

	it('with indexing off (staging, the pilot) names no sitemap but still lets crawlers read the noindex', () => {
		state.indexing = false;
		expect(robots()).toEqual({ rules });
	});
});
