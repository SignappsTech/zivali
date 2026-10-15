import { cache } from 'react';

import { ApiError, createApiClient, type Locale } from '@zivali/api/client';
import type { MunicipalityRef, OpeningHours, ShelterPage, ShelterSummary } from '@zivali/api/directory';
import { env } from '@/lib/env';

// C18 public directory for server components: no session token, one call per request (React cache).
const client = (locale: Locale) => createApiClient({ baseUrl: env.NEXT_PUBLIC_API_URL, locale });

export type MunicipalityItem = MunicipalityRef & { shelter_slug: string | null };

export const getShelters = cache((locale: Locale) =>
	client(locale).request<{ items: ShelterSummary[] }>('GET', '/v1/shelters')
);

export const getMunicipalities = cache((locale: Locale) =>
	client(locale).request<{ items: MunicipalityItem[] }>('GET', '/v1/shelters/municipalities')
);

/** null for an unknown or inactive slug (the page answers 404). */
export const getShelter = cache(async (locale: Locale, slug: string) => {
	try {
		return await client(locale).request<ShelterPage>('GET', `/v1/shelters/${encodeURIComponent(slug)}`);
	} catch (error) {
		if (error instanceof ApiError && (error.code === 'NOT_FOUND' || error.code === 'VALIDATION')) return null;
		throw error;
	}
});

/** E.164 from the published form ("01 234 56 78" → +38612345678): ShelterSummary carries no `phone` (C18). */
export function e164(phone: string): string {
	const digits = phone.replace(/[^\d+]/g, '');
	if (digits.startsWith('+')) return digits;
	return `+${digits.startsWith('00') ? digits.slice(2) : `386${digits.replace(/^0/, '')}`}`;
}

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Day = (typeof DAYS)[number];
const isDay = (code: string): code is Day => (DAYS as readonly string[]).includes(code);

/** "tue,thu-sat" → "tor, čet–sob" with the catalogue's day names; unknown codes stay as they are. */
export function formatDays(days: string, dayName: (day: Day) => string): string {
	const name = (code: string) => (isDay(code) ? dayName(code) : code);
	return days
		.split(',')
		.map((part) => part.trim().split('-').map(name).join('–'))
		.join(', ');
}

/** "08:00" → "8.00" (SL) or "8:00" (EN). */
export const formatTime = (time: string, locale: Locale) =>
	time.replace(/^0(?=\d)/, '').replace(':', locale === 'sl' ? '.' : ':');

const SCHEMA_DAYS: Record<Day, string> = {
	mon: 'Monday',
	tue: 'Tuesday',
	wed: 'Wednesday',
	thu: 'Thursday',
	fri: 'Friday',
	sat: 'Saturday',
	sun: 'Sunday',
};

/**
 * schema.org openingHoursSpecification. Round-the-clock rows are the shelters' phone lines for reports, not visiting
 * hours, so they are left out rather than telling search engines the shelter is open 24 hours.
 */
export function openingHoursSpecification(hours: OpeningHours[]) {
	return hours
		.filter((row) => row.from && row.to && !(row.from === '00:00' && row.to >= '23:59'))
		.map((row) => ({
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: row.days.split(',').flatMap((part) => {
				const [first = '', last = first] = part.trim().split('-');
				const [a, b] = [DAYS.indexOf(first as Day), DAYS.indexOf(last as Day)];
				return a < 0 || b < a
					? []
					: DAYS.slice(a, b + 1).map((day) => `https://schema.org/${SCHEMA_DAYS[day]}`);
			}),
			opens: row.from,
			closes: row.to,
		}));
}

/** Last checked more than 12 months ago (T6 stale note). */
export function isStale(verifiedAt: string, now = new Date()): boolean {
	const yearAgo = new Date(now);
	yearAgo.setFullYear(yearAgo.getFullYear() - 1);
	return new Date(verifiedAt) < yearAgo;
}
