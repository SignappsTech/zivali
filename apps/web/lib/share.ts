import { createTranslator } from 'next-intl';

import { ApiError, createApiClient } from '@zivali/api/client';
import { formatDayMonth, type Locale } from '@zivali/i18n/format';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { PublicReport } from '@zivali/types';
import type { DetailReport } from '@/components/report/slots/types';
import { ShortCode } from '@zivali/validation/common.schema';
import { env } from '@/lib/env';

// P18 sharing (FR-011), server side: the texts of slot B and what the poster PDF and the Facebook square need. Every
// text carries only the short public link and the area name (the reverse lookup of the fuzzed circle): never a phone,
// email, chip number, exact point or holding place. Same texts as mobile (apps/mobile/lib/share.ts).

const catalogues = { sl, en };
export const translator = (locale: Locale) => createTranslator({ locale, messages: catalogues[locale] });

/** The short canonical link of a report (C15): posters and shares use `https://<APP_HOST>/r/<code>`. */
export const reportLink = (code: string) => `${env.NEXT_PUBLIC_APP_URL}/r/${code}`;
/** The link as printed under the QR and on the square: host and path, no scheme ("najdimo.si/r/k7m2qx"). */
export const printedLink = (code: string) => reportLink(code).replace(/^https?:\/\//, '');
/** Web server endpoints (C15), same origin: the A4 poster PDF and the 1080 × 1080 Facebook image. */
export const posterPath = (code: string, lang: Locale) => `/r/${encodeURIComponent(code)}/poster.pdf?lang=${lang}`;
export const squarePath = (code: string, lang: Locale) => `/r/${encodeURIComponent(code)}/square.png?lang=${lang}`;
/** No pet name in the file name, so the file is safe to forward (content P18 §1). */
export const posterFileName = (code: string) => `najdimo-${code}.pdf`;

/** What the texts need besides the report: the area name, when the lookup has it, and the text language. */
export type ShareContext = { report: DetailReport; area: string | undefined; locale: Locale };

/**
 * The share sheet and WhatsApp text (content P18 §4) with the short link. Without an area name (outside Slovenia,
 * lookup failed) it is the link alone, as the texts need the area.
 */
export function shareMessage({ report, area, locale }: ShareContext): string {
	const t = translator(locale);
	const url = reportLink(report.short_code);
	const { species, name } = report;
	if (report.status === 'reunited') return name ? t('share.text_home', { name, url }) : url;
	if (!area) return url;
	if (report.type === 'found') return t('share.text_found', { species, area, url });
	if (report.type === 'sighted') return t('share.text_sighted', { species, area, url });
	const date = formatDayMonth(report.event_at, locale);
	return name
		? t('share.text_lost', { species, name, date, area, url })
		: t('share.text_lost_noname', { species, date, area, url });
}

/** The owner's ready texts for Facebook groups and local radio (content P18 §4b); lost reports with an area only. */
export function kitTexts({ report, area, locale }: ShareContext): { post: string; media: string } | null {
	if (report.type !== 'lost' || !area) return null;
	const t = translator(locale);
	const url = reportLink(report.short_code);
	const { species, name } = report;
	const date = formatDayMonth(report.event_at, locale);
	if (!name) {
		const text = t('share.text_lost_noname', { species, date, area, url });
		return { post: text, media: text };
	}
	return {
		post: t('share.kit_post_text', { species, name, date, area, url }),
		media: t('share.kit_media_text', { species, name, date, area, url }),
	};
}

/** The poster's top band and the square's type line ("Pogrešan pes"); "Spet doma" once reunited. */
export function posterBand(report: Pick<PublicReport, 'status' | 'type' | 'species'>, locale: Locale): string {
	const t = translator(locale);
	if (report.status === 'reunited') return t('poster.top_home');
	if (report.type === 'lost') return t('poster.top_lost', { species: report.species });
	if (report.type === 'found') return t('poster.top_found', { species: report.species });
	return t('browse.row_title_sighted', { species: report.species });
}

/**
 * GET /v1/reports/:code as a visitor (C4), for the poster and the square: the public read model only, as everyone who
 * scans or opens them sees it. `missing` for unknown, held, gone or malformed codes; `error` when the API fails or
 * takes over 2 s (so the poster still fits in 5 s with its photo).
 */
export async function getPublicReport(code: string, locale: Locale): Promise<PublicReport | 'missing' | 'error'> {
	if (!ShortCode.safeParse(code).success) return 'missing';
	try {
		return await createApiClient({ baseUrl: env.NEXT_PUBLIC_API_URL, locale }).request<PublicReport>(
			'GET',
			`/v1/reports/${encodeURIComponent(code)}`,
			{ signal: AbortSignal.timeout(2000) }
		);
	} catch (error) {
		if (error instanceof ApiError && ['NOT_FOUND', 'GONE', 'VALIDATION'].includes(error.code)) return 'missing';
		return 'error';
	}
}

/** Photos load only from where the API serves them (C5): the media origin, or MinIO locally. */
const PHOTO_ORIGINS = new Set(
	[env.MEDIA_BASE_URL, env.R2_UPLOAD_ORIGIN].filter((url): url is string => !!url).map((url) => new URL(url).origin)
);

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/**
 * The first photo's JPEG variant (C5 `display.jpg`; PDF and PNG renderers take no WebP) as bytes, or undefined when it
 * is missing, on another origin, redirects, not a JPEG or PNG, over 4 MB, or slower than 2.5 s. Never throws.
 */
export async function fetchPhoto(report: PublicReport): Promise<{ data: Buffer; type: string } | undefined> {
	try {
		const url = report.photos[0]?.url.replace(/\/display\.webp$/, '/display.jpg');
		if (!url || !PHOTO_ORIGINS.has(new URL(url).origin)) return undefined;
		const response = await fetch(url, { signal: AbortSignal.timeout(2500), redirect: 'error' });
		const type = response.headers.get('content-type') ?? '';
		if (!response.ok || !response.body || !/^image\/(jpeg|png)$/.test(type)) return undefined;
		if (Number(response.headers.get('content-length')) > MAX_PHOTO_BYTES) return undefined;
		const chunks: Uint8Array[] = [];
		let size = 0;
		for await (const chunk of response.body) {
			size += chunk.byteLength;
			if (size > MAX_PHOTO_BYTES) {
				void response.body.cancel().catch(() => undefined);
				return undefined;
			}
			chunks.push(chunk);
		}
		return { data: Buffer.concat(chunks), type };
	} catch {
		return undefined;
	}
}
