import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

// Placeholder catalogues in apps/web/messages until the shared @zivali/i18n package exists (TASK-10.2).
export default getRequestConfig(async ({ requestLocale }) => {
	const requested = await requestLocale;
	const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

	return {
		locale,
		timeZone: 'Europe/Ljubljana',
		messages: (await import(`../messages/${locale}.json`)).default,
	};
});
