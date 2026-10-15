import { defineRouting } from 'next-intl/routing';

// SL unprefixed, EN under /en (C15, C16). Localised `pathnames`, the cookie and hreflang come with TASK-10.2.
export const routing = defineRouting({
	locales: ['sl', 'en'],
	defaultLocale: 'sl',
	localePrefix: 'as-needed',
	// Locale comes from the path, so an English browser still gets the SL page at `/`.
	localeDetection: false,
});
