// P20 ad management: the form state and its checks, the status word, Ljubljana days and the statistics with their
// CSV export. Pure functions: the components translate the message keys.
import type { ApiIssue } from '@zivali/api/client';
import type messages from '@zivali/i18n/dist/sl.json';
import type { AdInput, AdminAd, AdSlot, AdStats, AdStatus, Locale, Species } from '@zivali/types';

export type AdminKey = keyof (typeof messages)['admin'];
/** A message to show: an `admin` key and its values. */
export type Problem = { key: AdminKey; values?: Record<string, string | number> };

export type Phase = 'draft' | 'scheduled' | 'running' | 'paused' | 'ended';

/** The P20 status word: the stored status and, for an active ad, now against its dates. */
export function adPhase(ad: Pick<AdminAd, 'status' | 'starts_at' | 'ends_at'>, now: number): Phase {
	if (ad.status !== 'active') return ad.status;
	if (ad.ends_at && Date.parse(ad.ends_at) <= now) return 'ended';
	if (ad.starts_at && Date.parse(ad.starts_at) > now) return 'scheduled';
	return 'running';
}

const DAY_MS = 86_400_000;
const ljubljana = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Europe/Ljubljana',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});
const partsOf = (instant: number) =>
	Object.fromEntries(ljubljana.formatToParts(instant).map((part) => [part.type, part.value]));

/** The Ljubljana calendar day (YYYY-MM-DD) of an instant. */
export function dayOf(instant: string | number): string {
	const { year, month, day } = partsOf(typeof instant === 'string' ? Date.parse(instant) : instant);
	return `${year}-${month}-${day}`;
}

/** Midnight in Ljubljana at the start of `day` (YYYY-MM-DD), as an ISO instant. */
export function dayStart(day: string): string {
	const [year, month, date] = day.split('-').map(Number) as [number, number, number];
	const utc = Date.UTC(year, month - 1, date);
	const local = partsOf(utc);
	const offset = Date.UTC(+local.year!, +local.month! - 1, +local.day!, +local.hour!, +local.minute!) - utc;
	return new Date(utc - offset).toISOString();
}

/** `day` moved by `days` calendar days. */
export const addDays = (day: string, days: number) =>
	new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** The form's dates are whole Ljubljana days; the end date is the last day the ad runs (ends_at is the next midnight). */
export const startDay = (ad: Pick<AdminAd, 'starts_at'>) => (ad.starts_at ? dayOf(ad.starts_at) : '');
export const endDay = (ad: Pick<AdminAd, 'ends_at'>) => (ad.ends_at ? dayOf(Date.parse(ad.ends_at) - 1) : '');

export const LIMITS = { title: 60, body: 120, cta: 24 } as const;
const ALT = { min: 5, max: 140 };
const MAX_LINK = 2048;

export type AdForm = {
	title: string;
	body: string;
	cta: string;
	link_url: string;
	image_alt: string;
	locales: Locale[];
	slots: AdSlot[];
	region_ids: number[];
	municipality_ids: number[];
	species: Species[];
	/** YYYY-MM-DD or empty */
	start: string;
	end: string;
	status: AdStatus;
	exclusive: boolean;
};
export type Field = keyof AdForm | 'image';
export type Problems = Partial<Record<Field, Problem>>;

/** A new ad, or the fields of `ad` (a duplicate starts as a draft). */
export function formOf(ad?: AdminAd, duplicate = false): AdForm {
	return {
		title: ad?.title ?? '',
		body: ad?.body ?? '',
		cta: ad?.cta ?? '',
		link_url: ad?.link_url ?? '',
		image_alt: ad?.image_alt ?? '',
		locales: ad?.locales ?? ['sl', 'en'],
		slots: ad?.slots ?? [],
		region_ids: ad?.region_ids ?? [],
		municipality_ids: ad?.municipality_ids ?? [],
		species: ad?.species ?? [],
		start: ad ? startDay(ad) : '',
		end: ad ? endDay(ad) : '',
		status: !ad || duplicate ? 'draft' : ad.status,
		exclusive: ad?.exclusive ?? false,
	};
}

/** C14 `link_url`: https, no whitespace or control characters (the AdInput rule). */
export function isHttpsLink(value: string): boolean {
	// eslint-disable-next-line no-control-regex
	if (value.length > MAX_LINK || /[\u0000-\u001f\u007f\s]/.test(value)) return false;
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}

const tooLong = (value: string, max: number): Problem | undefined =>
	value.trim().length > max ? { key: 'ads_err_too_long', values: { max } } : undefined;
const required = (value: string): Problem | undefined => (value.trim() ? undefined : { key: 'ads_err_required' });

/** The client checks (P20 §Validation), the same rules as the API's AdInput; a house ad has fixed slots and targeting. */
export function validate(form: AdForm, house = false): Problems {
	const alt = form.image_alt.trim();
	const problems: Problems = {
		image_alt: !alt
			? { key: 'ads_err_alt' }
			: alt.length < ALT.min || alt.length > ALT.max
				? { key: 'ads_err_alt_length' }
				: undefined,
		title: required(form.title) ?? tooLong(form.title, LIMITS.title),
		body: required(form.body) ?? tooLong(form.body, LIMITS.body),
		cta: tooLong(form.cta, LIMITS.cta),
		link_url: required(form.link_url) ?? (isHttpsLink(form.link_url.trim()) ? undefined : { key: 'ads_err_link' }),
	};
	if (!house) {
		if (!form.slots.length) problems.slots = { key: 'ads_err_slots' };
		if (!form.locales.length) problems.locales = { key: 'ads_err_required' };
		if (form.start && form.end && form.end < form.start) problems.end = { key: 'ads_err_dates' };
	}
	return Object.fromEntries(Object.entries(problems).filter(([, problem]) => problem));
}

const CONTENT = ['title', 'body', 'cta', 'image_alt', 'link_url'] as const;
const IMAGE_PATHS = ['image', 'sha256', 'width', 'height', 'bytes', 'content_type'];

/**
 * The API's VALIDATION issues (C1 `issues`, by path) as field problems. A content field the client checks pass was
 * refused for its words (the ads.blocked_terms rule, which only the API knows); an exclusive overlap names the other
 * ad. Issues on no field come back in `other`.
 */
export function serverProblems(issues: ApiIssue[], form: AdForm): { problems: Problems; other: ApiIssue[] } {
	const local = validate(form);
	const problems: Problems = {};
	const other: ApiIssue[] = [];
	for (const issue of issues) {
		const path = issue.path.split('.')[0]!;
		if ((CONTENT as readonly string[]).includes(path)) {
			const field = path as (typeof CONTENT)[number];
			problems[field] ??= local[field] ?? { key: 'ads_err_blocked' };
		} else if (IMAGE_PATHS.includes(path)) problems.image ??= { key: 'ads_err_image' };
		else if (path === 'exclusive')
			problems.exclusive ??= {
				key: 'ads_err_overlap',
				values: { title: /"(.+)"/.exec(issue.message)?.[1] ?? '' },
			};
		else if (path === 'starts_at' || path === 'ends_at') problems.end ??= { key: 'ads_err_dates' };
		else if (path === 'slots') problems.slots ??= { key: 'ads_err_slots' };
		else if (path === 'locales') problems.locales ??= { key: 'ads_err_required' };
		else other.push(issue);
	}
	return { problems, other };
}

/**
 * AdInput from the form. Empty targeting means everyone (null); a house ad sends its creative only. The button text is
 * optional in the form (P20) but required by the API: an empty one is sent as the unit's default, `ctaDefault`.
 */
export function toInput(form: AdForm, house: boolean, ctaDefault = ''): AdInput {
	const creative = {
		title: form.title.trim(),
		body: form.body.trim(),
		cta: form.cta.trim() || ctaDefault,
		link_url: form.link_url.trim(),
		image_alt: form.image_alt.trim(),
	};
	if (house) return { ...creative, slots: form.slots };
	const list = <T>(values: T[]) => (values.length ? values : null);
	return {
		...creative,
		locales: form.locales,
		slots: form.slots,
		region_ids: list(form.region_ids),
		municipality_ids: list(form.municipality_ids),
		species: list(form.species),
		starts_at: form.start ? dayStart(form.start) : null,
		ends_at: form.end ? dayStart(addDays(form.end, 1)) : null,
		status: form.status,
		exclusive: form.exclusive,
	};
}

/** AdImageInput rules (C14, P21): 4:3 at ±1 %, at least 1200 × 900, JPG or PNG under 500 KB. */
export const IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;
export type ImageMeta = { width: number; height: number; bytes: number; type: string };
export const imageOk = ({ width, height, bytes, type }: ImageMeta) =>
	(IMAGE_TYPES as readonly string[]).includes(type) &&
	bytes < 500 * 1024 &&
	width >= 1200 &&
	height >= 900 &&
	Math.abs(width / height - 4 / 3) <= 0.01;

type StatRow = AdStats['items'][number];
export type Counts = { impressions: number; clicks: number };

/** 1 to 4 show as "< 5" in the breakdowns (P20); 0 stays 0. */
export const isMasked = (n: number) => n > 0 && n < 5;
/** Clicks per impression, or null when there is nothing to divide or a count is masked. */
export const ctrOf = ({ impressions, clicks }: Counts) =>
	impressions && !isMasked(impressions) && !isMasked(clicks) ? clicks / impressions : null;

export function sum(rows: Counts[]): Counts {
	return rows.reduce(
		(total, row) => ({ impressions: total.impressions + row.impressions, clicks: total.clicks + row.clicks }),
		{
			impressions: 0,
			clicks: 0,
		}
	);
}

/** Totals per key (slot, region), most impressions first. */
export function groupBy(rows: StatRow[], key: (row: StatRow) => string): (Counts & { key: string })[] {
	const groups = new Map<string, StatRow[]>();
	for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
	return [...groups]
		.map(([name, items]) => ({ key: name, ...sum(items) }))
		.sort((a, b) => b.impressions - a.impressions);
}

/** Every day from `from` to `to` (inclusive) with its totals; days without rows are 0. */
export function byDay(rows: StatRow[], from: string, to: string): (Counts & { day: string })[] {
	const days: (Counts & { day: string })[] = [];
	for (let day = from; day <= to; day = addDays(day, 1))
		days.push({ day, ...sum(rows.filter((row) => row.day === day)) });
	return days;
}

/** A CSV cell (RFC 4180), safe to open in a spreadsheet: one that starts like a formula gets a leading '. */
export function csvCell(value: string | number): string {
	const text = String(value);
	const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
	return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

const BOM = String.fromCharCode(0xfeff);

/** The header row and the rows, with the UTF-8 byte order mark Excel needs to read č, š and ž. */
export const toCsv = (rows: (string | number)[][]) =>
	`${BOM}${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
