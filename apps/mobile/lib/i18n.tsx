import 'expo-sqlite/localStorage/install';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { IntlProvider } from 'use-intl';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { type Locale, timeZone } from '@zivali/i18n/format';

const catalogues = { sl, en };
// A UI preference, not private data, kept in the SQLite-backed localStorage like the encrypted session.
const STORAGE_KEY = 'locale';

/** The OS language, which Hermes reports as the default Intl locale: en* is English, anything else Slovenian (C16). */
const deviceLocale = (): Locale =>
	Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('en') ? 'en' : 'sl';

function storedLocale(): Locale | null {
	const value = localStorage.getItem(STORAGE_KEY);
	return value === 'sl' || value === 'en' ? value : null;
}

/** A signed-in user's profile locale and its save: `{ locale: me.locale, save: (l) => updateMe({ locale: l }) }`. */
export type ProfileLocale = { locale: Locale; save: (locale: Locale) => Promise<unknown> };

type LocaleSwitch = {
	locale: Locale; /** Resolves `{ ok: false }` when the profile save failed; the UI has switched anyway. */
	setLocale: (locale: Locale) => Promise<{ ok: boolean }>;
};

const LocaleContext = createContext<LocaleSwitch | null>(null);

/**
 * use-intl with the @zivali/i18n catalogues (C16, FR-036). The locale is the profile's, else the choice stored on this
 * device, else the device language. Pass `profile` for a signed-in, non-anonymous user (null when signed out).
 */
export function I18nProvider({ profile, children }: { profile?: ProfileLocale | null; children: ReactNode }) {
	const profileLocale = profile?.locale;
	const [locale, setCurrent] = useState<Locale>(() => profileLocale ?? storedLocale() ?? deviceLocale());

	// The profile wins when its locale arrives or changes (sign-in, a switch on the web), not on every render, so a
	// local switch is not undone while its profile save is in flight.
	const [seenProfileLocale, setSeenProfileLocale] = useState(profileLocale);
	if (profileLocale !== seenProfileLocale) {
		setSeenProfileLocale(profileLocale);
		if (profileLocale) setCurrent(profileLocale);
	}
	useEffect(() => {
		if (profileLocale) localStorage.setItem(STORAGE_KEY, profileLocale);
	}, [profileLocale]);

	const setLocale = useCallback(
		async (next: Locale) => {
			if (next === locale) return { ok: true };
			setCurrent(next);
			localStorage.setItem(STORAGE_KEY, next);
			// The UI has switched already; a failed save leaves the profile as it was and is reported, not thrown.
			if (!profile) return { ok: true };
			try {
				await profile.save(next);
				return { ok: true };
			} catch {
				return { ok: false };
			}
		},
		[locale, profile]
	);

	const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

	return (
		<LocaleContext.Provider value={value}>
			<IntlProvider locale={locale} messages={catalogues[locale]} timeZone={timeZone}>
				{children}
			</IntlProvider>
		</LocaleContext.Provider>
	);
}

/** `setLocale(l)` switches the UI at once, stores the choice on the device and, signed in, saves it to the profile. */
export function useLocaleSwitch(): LocaleSwitch {
	const value = useContext(LocaleContext);
	if (!value) throw new Error('useLocaleSwitch() needs <I18nProvider>');
	return value;
}
