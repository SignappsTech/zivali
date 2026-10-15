import type messages from '@zivali/i18n/dist/sl.json';
import type { routing } from '@/i18n/routing';

// Typed locales and message keys for next-intl: useLocale() is 'sl' | 'en', t('…') keys are checked.
declare module 'next-intl' {
	interface AppConfig {
		Locale: (typeof routing.locales)[number];
		Messages: typeof messages;
	}
}
