// Intl formatting for SL and EN in the Europe/Ljubljana time zone (contract C16). No date library (ADR-008).
// Erasable TypeScript only, so Node runs this file as is (type stripping) for the tests and the API worker.

export type Locale = 'sl' | 'en';
export type DateStyle = 'short' | 'long' | 'time';
/** Distance bands from contract C6. */
export type DistanceBand = 'lt1' | '1to3' | '3to10' | 'gt10';

export const timeZone = 'Europe/Ljubljana';

// EN copy is British-leaning (voice and tone guide): "15 October 2026", "14:30", "€5.00".
const intlLocale: Record<Locale, string> = { sl: 'sl', en: 'en-GB' };

const dateOptions: Record<DateStyle, Intl.DateTimeFormatOptions> = {
	short: { day: 'numeric', month: 'numeric', year: 'numeric' },
	long: { day: 'numeric', month: 'long', year: 'numeric' },
	time: { hour: '2-digit', minute: '2-digit' },
};

const relativeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 86400],
	['month', 30 * 86400],
	['week', 7 * 86400],
	['day', 86400],
	['hour', 3600],
	['minute', 60],
];

// Words around the kilometres for the open-ended bands, as in glossary §9.
const bandWords: Record<Locale, [under: string, over: string]> = {
	sl: ['manj kot', 'več kot'],
	en: ['under', 'over'],
};

/** short "15. 10. 2026" / "15/10/2026", long "15. oktober 2026" / "15 October 2026", time "14:30". */
export function formatDate(date: Date | string | number, locale: Locale, style: DateStyle = 'short'): string {
	return new Intl.DateTimeFormat(intlLocale[locale], { ...dateOptions[style], timeZone }).format(new Date(date));
}

/** "pred 5 minutami", "včeraj", "in 2 hours"; less than a minute is "zdaj" / "now". */
export function formatRelative(date: Date | string | number, locale: Locale, now: Date | number = Date.now()): string {
	const seconds = (new Date(date).getTime() - new Date(now).getTime()) / 1000;
	const rtf = new Intl.RelativeTimeFormat(intlLocale[locale], { numeric: 'auto' });
	for (const [unit, size] of relativeUnits) {
		if (Math.abs(seconds) >= size) return rtf.format(Math.trunc(seconds / size), unit);
	}
	return rtf.format(0, 'second');
}

/** Cents to euros: "5,00 €" in SL, "€5.00" in EN. */
export function formatEur(cents: number, locale: Locale): string {
	return new Intl.NumberFormat(intlLocale[locale], { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** "manj kot 1 km", "1–3 km", "3–10 km", "več kot 10 km" (EN "under 1 km" … "over 10 km"). */
export function formatDistanceBand(band: DistanceBand, locale: Locale): string {
	const km = new Intl.NumberFormat(intlLocale[locale], { style: 'unit', unit: 'kilometer' });
	const [under, over] = bandWords[locale];
	switch (band) {
		case 'lt1':
			return `${under} ${km.format(1)}`;
		case '1to3':
			return km.formatRange(1, 3);
		case '3to10':
			return km.formatRange(3, 10);
		case 'gt10':
			return `${over} ${km.format(10)}`;
	}
}

/** Plain counts: "12.345" in SL, "12,345" in EN. Counted nouns ("2 prijavi") are ICU plural messages. */
export function formatCount(n: number, locale: Locale): string {
	return new Intl.NumberFormat(intlLocale[locale]).format(n);
}
