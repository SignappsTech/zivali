import { getMessages } from 'next-intl/server';

import { regionOptions } from '@/lib/partners';

/**
 * Server props of the P20 pages: the region names in the page's language and the `ads` strings of both languages,
 * for the preview's SL / EN switch (the console's client catalogue has only its own language).
 */
export async function adPageProps(locale: string) {
	const [sl, en] = await Promise.all([getMessages({ locale: 'sl' }), getMessages({ locale: 'en' })]);
	return {
		regions: Object.fromEntries(regionOptions(locale === 'en' ? 'en' : 'sl').map(({ slug, name }) => [slug, name])),
		messages: { sl: sl.ads, en: en.ads },
	};
}
