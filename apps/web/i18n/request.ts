import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { timeZone } from '@zivali/i18n/format';

import { routing } from './routing';

// The merged catalogues of @zivali/i18n (C16), shared with mobile and the API worker.
const catalogues = {
	sl: () => import('@zivali/i18n/dist/sl.json'),
	en: () => import('@zivali/i18n/dist/en.json'),
};

export default getRequestConfig(async ({ requestLocale }) => {
	const requested = await requestLocale;
	const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

	return { locale, timeZone, messages: (await catalogues[locale]()).default };
});
