// Pure helpers for the shelter directory admin (P19, C18): dates, stale entries, phone numbers, opening hours, diffs.
import type { AdminOpeningHours } from '@zivali/api/directory-admin';
import { timeZone, type Locale } from '@zivali/i18n/format';

/** Today's date in Ljubljana, `YYYY-MM-DD`. */
export const todayIso = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone }).format(now);

/** Checked more than 12 months before `today` (ISO dates compare as strings). */
export const isStale = (verifiedAt: string, today: string) =>
	verifiedAt < `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;

/** Slovenian numbers as typed ("01 234 56 78", "+386 1 234 56 78", "00386 41 …") to E.164, or null if not valid. */
export function toE164(input: string): string | null {
	const digits = input.replace(/[\s()./-]/g, '');
	const international = /^(?:\+|00)386(.*)$/.exec(digits);
	const national = international ? international[1]!.replace(/^0/, '') : digits.replace(/^0/, '');
	return (international || digits.startsWith('0')) && /^[1-9]\d{7}$/.test(national) ? `+386${national}` : null;
}

/** "08:00" as SL "8.00" or EN "08:00" (content slice §8). */
export const formatTime = (value: string, locale: Locale) =>
	locale === 'sl' ? value.replace(/^0(?=\d)/, '').replace(':', '.') : value;

/** "8", "8.00", "8:00", "08.30" to "08:00"; null when it is not a time of day. */
export function parseTime(input: string): string | null {
	const match = /^(\d{1,2})(?:[.:](\d{2}))?$/.exec(input.trim());
	if (!match) return null;
	const [hours, minutes] = [Number(match[1]), Number(match[2] ?? 0)];
	return hours > 23 || minutes > 59 ? null : `${match[1]!.padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'holidays'] as const;
export type Day = (typeof DAYS)[number];
/** The day-range options of the hours rows (content slice §8). */
export const DAY_OPTIONS = ['mon-fri', 'mon-sat', ...DAYS];

/** Any stored days value ("mon-fri", "tue,thu-sat") with the day labels: "tor, čet–sob". */
export const formatDays = (days: string, label: (day: Day) => string) =>
	days
		.split(',')
		.map((part) =>
			part
				.split('-')
				.map((day) => (DAYS.includes(day.trim() as Day) ? label(day.trim() as Day) : day.trim()))
				.join('–')
		)
		.join(', ');

export const formatHours = (row: AdminOpeningHours, locale: Locale, closed: string) =>
	row.closed ? closed : `${formatTime(row.from, locale)}–${formatTime(row.to, locale)}`;

/** Fields shown in history and import diffs, in form order; `phone` follows `phone_display`. */
export const DIFF_FIELDS = [
	'name',
	'address',
	'postal_code',
	'city',
	'phone_display',
	'website',
	'email',
	'opening_hours',
	'shelter_slug',
	'status',
	'source',
	'verified_at',
] as const;
export type DiffField = (typeof DIFF_FIELDS)[number];
export type DiffRow = { field: DiffField; days?: string; before: string | null; after: string | null };

type Row = Record<string, unknown>;
const text = (value: unknown) => (value === null || value === undefined || value === '' ? null : String(value));

/**
 * The changed fields between two rows; opening hours compare per days value. `value` formats a scalar (dates, status
 * words, shelter names); `hours` formats one opening-hours row.
 */
export function diffRows(
	before: Row,
	after: Row,
	value: (field: DiffField, raw: string) => string,
	hours: (row: AdminOpeningHours) => string
): DiffRow[] {
	const rows: DiffRow[] = [];
	for (const field of DIFF_FIELDS) {
		if (field === 'opening_hours') {
			const byDays = (list: unknown) =>
				new Map(((list as AdminOpeningHours[] | undefined) ?? []).map((row) => [row.days, hours(row)]));
			const [old, now] = [byDays(before.opening_hours), byDays(after.opening_hours)];
			for (const days of new Set([...now.keys(), ...old.keys()])) {
				if (old.get(days) !== now.get(days))
					rows.push({ field, days, before: old.get(days) ?? null, after: now.get(days) ?? null });
			}
			continue;
		}
		const [old, now] = [text(before[field]), text(after[field])];
		if (old !== now)
			rows.push({
				field,
				before: old === null ? null : value(field, old),
				after: now === null ? null : value(field, now),
			});
	}
	return rows;
}
