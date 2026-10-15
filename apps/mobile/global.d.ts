import type messages from '@zivali/i18n/dist/sl.json';
import type { Locale } from '@zivali/i18n/format';

// Typed locales and message keys for use-intl: useLocale() is 'sl' | 'en', t('…') keys are checked.
declare module 'use-intl' {
	interface AppConfig {
		Locale: Locale;
		Messages: typeof messages;
	}
}
