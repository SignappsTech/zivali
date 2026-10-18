import { describe, expect, it } from 'vitest';

import { legacyRedirects } from './legacy-redirects';
import { getPathname } from './navigation';

describe('legacyRedirects', () => {
	it('301 the old imprint paths to the current route', () => {
		for (const { source, destination, statusCode } of legacyRedirects) {
			expect(statusCode).toBe(301);
			const locale = source.startsWith('/en/') ? 'en' : 'sl';
			expect(getPathname({ href: '/imprint', locale })).toBe(destination);
		}
	});
});
