// Intl formatting for SL and EN in the Europe/Ljubljana time zone (contract C16). No date library (ADR-008).
// Erasable TypeScript only, so Node runs this file as is (type stripping) for the tests and the API worker.
// Hermes (mobile) lacks Intl.RelativeTimeFormat and NumberFormat.formatRange, so neither is used here.

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

// Relative time words (glossary §8). Counts stay below 100, so SL needs one (1), two (2), few (3–4), other.
const relative = {
	sl: {
		now: 'zdaj',
		yesterday: 'včeraj',
		minute: ['pred # minuto', 'pred # minutama', 'pred # minutami', 'pred # minutami'],
		hour: ['pred # uro', 'pred # urama', 'pred # urami', 'pred # urami'],
		day: ['pred # dnevom', 'pred # dnevoma', 'pred # dnevi', 'pred # dnevi'],
	},
	en: {
		now: 'now',
		yesterday: 'yesterday',
		minute: ['# minute ago', '# minutes ago'],
		hour: ['# hour ago', '# hours ago'],
		day: ['# day ago', '# days ago'],
	},
};

// Words around the kilometres for the open-ended bands, as in glossary §9.
const bandWords: Record<Locale, [under: string, over: string]> = {
	sl: ['manj kot', 'več kot'],
	en: ['under', 'over'],
};

const ljubljanaDate = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' });

/** Day number of the Ljubljana calendar date, so differences count midnights, not 24-hour blocks. */
function ljubljanaDay(date: Date): number {
	const parts = Object.fromEntries(ljubljanaDate.formatToParts(date).map((p) => [p.type, p.value]));
	return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86_400_000;
}

function counted(forms: string[], n: number, locale: Locale): string {
	const index = locale === 'en' ? Number(n !== 1) : n === 1 ? 0 : n === 2 ? 1 : n <= 4 ? 2 : 3;
	return forms[index].replace('#', String(n));
}

/** short "15. 10. 2026" / "15/10/2026", long "15. oktober 2026" / "15 October 2026", time "14:30". */
export function formatDate(date: Date | string | number, locale: Locale, style: DateStyle = 'short'): string {
	return new Intl.DateTimeFormat(intlLocale[locale], { ...dateOptions[style], timeZone }).format(new Date(date));
}

// Slovenian dates read "12. oktobra": the month in the genitive, which Intl (CLDR) does not decline.
const slMonthsGenitive = [
	'januarja',
	'februarja',
	'marca',
	'aprila',
	'maja',
	'junija',
	'julija',
	'avgusta',
	'septembra',
	'oktobra',
	'novembra',
	'decembra',
];

/** "12. oktobra" / "12 October" in the Ljubljana calendar, with the year when it is not the current one. */
export function formatDayMonth(date: Date | string | number, locale: Locale, now: Date | number = Date.now()): string {
	const parts = (d: Date) => Object.fromEntries(ljubljanaDate.formatToParts(d).map((p) => [p.type, p.value]));
	const { day, month, year } = parts(new Date(date));
	const withYear = year !== parts(new Date(now)).year;
	if (locale === 'sl') return `${Number(day)}. ${slMonthsGenitive[Number(month) - 1]}${withYear ? ` ${year}` : ''}`;
	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'long',
		year: withYear ? 'numeric' : undefined,
		timeZone,
	}).format(new Date(date));
}

/**
 * "zdaj" (under a minute, or a future time from clock skew), "pred 5 minutami", "pred 2 urama" (same Ljubljana
 * day), "včeraj", "pred 3 dnevi" (up to 6 days), then the short date. EN: "now", "5 minutes ago", "yesterday" ….
 */
export function formatRelative(date: Date | string | number, locale: Locale, now: Date | number = Date.now()): string {
	const then = new Date(date);
	const current = new Date(now);
	const forms = relative[locale];
	const minutes = Math.floor((current.getTime() - then.getTime()) / 60_000);
	if (minutes < 1) return forms.now;
	if (minutes < 60) return counted(forms.minute, minutes, locale);
	const days = ljubljanaDay(current) - ljubljanaDay(then);
	if (days === 0) return counted(forms.hour, Math.floor(minutes / 60), locale);
	if (days === 1) return forms.yesterday;
	if (days < 7) return counted(forms.day, days, locale);
	return formatDate(then, locale);
}

/** Cents to euros: "5,00 €" in SL, "€5.00" in EN. */
export function formatEur(cents: number, locale: Locale): string {
	return new Intl.NumberFormat(intlLocale[locale], { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** "manj kot 1 km", "1–3 km", "3–10 km", "več kot 10 km" (EN "under 1 km" … "over 10 km"). */
export function formatDistanceBand(band: DistanceBand, locale: Locale): string {
	const n = (value: number) => formatCount(value, locale);
	const [under, over] = bandWords[locale];
	switch (band) {
		case 'lt1':
			return `${under} ${n(1)} km`;
		case '1to3':
			return `${n(1)}–${n(3)} km`;
		case '3to10':
			return `${n(3)}–${n(10)} km`;
		case 'gt10':
			return `${over} ${n(10)} km`;
	}
}

/** Plain counts: "12.345" in SL, "12,345" in EN. Counted nouns ("2 prijavi") are ICU plural messages. */
export function formatCount(n: number, locale: Locale): string {
	return new Intl.NumberFormat(intlLocale[locale]).format(n);
}
