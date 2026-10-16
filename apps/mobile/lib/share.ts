import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking, Share } from 'react-native';
import { createTranslator } from 'use-intl';
import { z } from 'zod';

import { type EventParams, track } from '@zivali/analytics';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { formatDayMonth, type Locale } from '@zivali/i18n/format';
import type { DetailReport } from '@/components/report/slots/types';
import { env } from '@/lib/env';

// P18 sharing (FR-011). Every text carries only the short public link and the area name (the reverse lookup of the
// fuzzed circle): never a phone, email, chip number, exact point or holding place.

const catalogues = { sl, en };
const translator = (locale: Locale) => createTranslator({ locale, messages: catalogues[locale] });

/** The short canonical link of a report (C15): posters and shares use `https://<APP_HOST>/r/<code>`. */
export const reportLink = (code: string) => `${env.EXPO_PUBLIC_APP_URL}/r/${code}`;
/** Web server endpoints (C15): the A4 poster PDF and the 1080 × 1080 Facebook image, in the poster language. */
export const posterUrl = (code: string, lang: Locale) => `${reportLink(code)}/poster.pdf?lang=${lang}`;
export const squareImageUrl = (code: string, lang: Locale) => `${reportLink(code)}/square.png?lang=${lang}`;
/** No pet name in the file name, so the file is safe to forward (content P18 §1). */
export const posterFileName = (code: string) => `najdimo-${code}.pdf`;

/** What the texts need besides the report: the area name, when the lookup has it, and the text language. */
export type ShareContext = { report: DetailReport; area: string | undefined; locale: Locale };

/**
 * The share sheet and WhatsApp text (content P18 §4) with the short link. Without an area name (offline, outside
 * Slovenia, lookup failed) it is the link alone, as the texts need the area.
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

/** The poster's top band ("Pogrešan pes"), used by the preview and its alt text. */
export function posterBand(report: DetailReport, locale: Locale): string {
	const t = translator(locale);
	if (report.status === 'reunited') return t('poster.top_home');
	if (report.type === 'lost') return t('poster.top_lost', { species: report.species });
	if (report.type === 'found') return t('poster.top_found', { species: report.species });
	return t('browse.row_title_sighted', { species: report.species });
}

/** C12 `share`; a no-op without analytics consent. */
export const trackShare = (method: EventParams['share']['method'], report: DetailReport) =>
	track('share', { method, report_type: report.type, species: report.species });

/** C12 `poster_download` needs the region; a report outside the 12 regions sends none. */
export function trackPosterDownload(report: DetailReport) {
	const region = report.region_slug as EventParams['poster_download']['region'] | undefined;
	if (region) track('poster_download', { species: report.species, region });
}

/** The system share sheet with the text; counted only when the user picked a target (iOS; Android always says so). */
export async function shareNative(report: DetailReport, message: string): Promise<void> {
	try {
		const result = await Share.share({ message });
		if (result.action === Share.sharedAction) trackShare('native', report);
	} catch {
		// The sheet could not open; nothing was shared.
	}
}

/** WhatsApp's own share link (the app when installed, else its web page); the system sheet if neither opens. */
export async function shareWhatsApp(report: DetailReport, message: string): Promise<void> {
	try {
		await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
		trackShare('whatsapp', report);
	} catch {
		await shareNative(report, message);
	}
}

export const copyText = (text: string) => Clipboard.setStringAsync(text);

/**
 * Downloads a public file of the report (the poster PDF, the square image) into the cache, replacing the last one,
 * and opens the share sheet with it (print, save, send). Throws when the download fails (network, non-2xx).
 */
export async function shareFile(url: string, name: string, type: 'pdf' | 'png'): Promise<void> {
	const file = await File.downloadFileAsync(url, new File(Paths.cache, name), { idempotent: true });
	await Sharing.shareAsync(
		file.uri,
		type === 'pdf'
			? { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }
			: { mimeType: 'image/png', UTI: 'public.png' }
	);
}

// C1 public config (admin-edited JSON): lost-pet groups on Facebook (`[{ name, url, regions? }]`, regions as C6 slugs)
// and the local radio's announcement form (`share.radio_form_url`). Only https links open; a malformed entry is left
// out rather than breaking the screen.
const https = z.url({ protocol: /^https$/ });
const group = z.object({ name: z.string().min(1), url: https, regions: z.array(z.string()).optional() });
export type FacebookGroup = z.infer<typeof group>;

/** The groups, the report's region first, and the radio form link. */
export function parseShareConfig(config: Record<string, unknown> | undefined, region: string | undefined) {
	const entries = config?.['share.facebook_groups'];
	const groups = (Array.isArray(entries) ? entries : []).flatMap((entry) => {
		const parsed = group.safeParse(entry);
		return parsed.success ? [parsed.data] : [];
	});
	const local = (g: FacebookGroup) => (region && g.regions?.includes(region) ? 0 : 1);
	const radio = https.safeParse(config?.['share.radio_form_url']);
	return {
		groups: groups.sort((a, b) => local(a) - local(b)),
		radioFormUrl: radio.success ? radio.data : undefined,
	};
}
